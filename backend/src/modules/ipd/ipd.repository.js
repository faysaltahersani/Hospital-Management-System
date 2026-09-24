'use strict';

// Sequelize options (notably `transaction`) are forwarded by every helper below.
// They used to be dropped: a service inside `sequelize.transaction(async (t))`
// would call `repository.create(data, { transaction: t })` and the row was written
// on a DIFFERENT pooled connection, outside the transaction. Two consequences,
// both observed under a 50-user load test:
//   * the write was not rolled back with its transaction, leaving orphans (an OPD
//     visit with no invoice when the billing step failed)
//   * each request needed a second connection while holding one, so with
//     DB_POOL_MAX=10 concurrent writers deadlocked the pool until the acquire
//     timeout fired

const { Op, Sequelize } = require('sequelize');
const { dateTimeRange } = require('../../utils/dateUtils');
const { Admission, Patient, Doctor, Ward, Bed, User, AdmissionPayment } = require('../../models');

const includes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'gender', 'phone', 'date_of_birth', 'address', 'blood_group'] },
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'doctor_code', 'specialization'],
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
  },
  { model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'type'] },
  { model: Bed, as: 'bed', attributes: ['id', 'bed_number', 'room_number', 'daily_rate'] },
  { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
  // BUG-005 — payments are real rows now, not a JSON blob inside notes.
  {
    model: AdmissionPayment,
    as: 'payment_records',
    attributes: ['id', 'account_name', 'amount', 'paid_at', 'notes'],
    separate: true,
    order: [['paid_at', 'ASC']],
  },
];

const findAndCount = async ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.admitted_at = range;
  if (search) {
    where[Op.or] = [
      { admission_code: { [Op.like]: `%${search}%` } },
      { reason: { [Op.like]: `%${search}%` } },
    ];
  }

  const { rows, count } = await Admission.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });
  return { rows, count };
};

const findById = (id, options = {}) =>
  Admission.findByPk(id, { include: includes, ...options });

// Accepts options so the caller can run this inside the admission transaction
// (BUG-006): the occupancy check must see the same snapshot as the bed lock.
const findActiveByBed = (bedId, options = {}) =>
  Admission.findOne({ where: { bed_id: bedId, status: 'admitted' }, ...options });

const countForYear = (year, options = {}) =>
  Admission.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const create = (data, options = {}) => Admission.create(data, options);
const update = (admission, changes, options = {}) => admission.update(changes, options);
const destroy = (admission, options = {}) => admission.destroy(options);

module.exports = {
  findAndCount,
  findById,
  findActiveByBed,
  countForYear,
  create,
  update,
  destroy,
};
