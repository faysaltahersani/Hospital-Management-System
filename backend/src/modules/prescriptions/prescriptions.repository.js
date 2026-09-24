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
const {
  Prescription,
  PrescriptionItem,
  Patient,
  Doctor,
  Appointment,
  Medicine,
  User,
} = require('../../models');

const includes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'doctor_code', 'specialization'],
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
  },
  { model: Appointment, as: 'appointment', attributes: ['id', 'appointment_code', 'appointment_date'] },
  {
    model: PrescriptionItem,
    as: 'items',
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'code', 'name', 'unit'] }],
  },
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.prescribed_at = range;
  if (search) {
    where[Op.or] = [
      { prescription_code: { [Op.like]: `%${search}%` } },
      { diagnosis: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Prescription.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [['prescribed_at', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

const findById = (id, options = {}) => Prescription.findByPk(id, { include: includes, ...options });
const countForYear = (year, options = {}) =>
  Prescription.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const create = (data, options = {}) => Prescription.create(data, options);
const update = (prescription, changes, options = {}) => prescription.update(changes, options);
const destroy = (prescription, options = {}) => prescription.destroy(options);
const createItems = (items, options = {}) => PrescriptionItem.bulkCreate(items, options);
const deleteItems = (prescriptionId, options = {}) =>
  PrescriptionItem.destroy({ where: { prescription_id: prescriptionId }, ...options });

module.exports = {
  findAndCount,
  findById,
  countForYear,
  create,
  update,
  destroy,
  createItems,
  deleteItems,
};
