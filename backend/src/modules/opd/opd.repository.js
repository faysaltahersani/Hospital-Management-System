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
const { OpdVisit, Patient, Doctor, Department, User , Invoice, Payment } = require('../../models');

const includes = [
  // BUG-004 - the invoice is the authoritative source of billed/paid/due.
  {
    model: Invoice,
    as: 'invoice',
    attributes: ['id', 'invoice_code', 'subtotal', 'discount', 'tax', 'total', 'paid_amount', 'status'],
    include: [
      { model: Payment, as: 'payments', attributes: ['id', 'payment_code', 'amount', 'method', 'paid_at'] },
    ],
  },
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'gender', 'phone'] },
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'doctor_code', 'specialization'],
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
  },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.visit_date = range;
  if (search) {
    where[Op.or] = [
      { visit_code: { [Op.like]: `%${search}%` } },
      { chief_complaint: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
    ];
  }
  return OpdVisit.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [['visit_date', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

// Accepts options so callers can read inside their own transaction — otherwise
// a freshly created invoice is invisible to the read-back (BUG-004).
const findById = (id, options = {}) => OpdVisit.findByPk(id, { include: includes, ...options });

const countForYear = (year, options = {}) =>
  OpdVisit.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const create = (data, options = {}) => OpdVisit.create(data, options);
const update = (visit, changes, options = {}) => visit.update(changes, options);
const destroy = (visit, options = {}) => visit.destroy(options);

module.exports = { findAndCount, findById, countForYear, create, update, destroy };
