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
const { Referral, Patient, Doctor, User } = require('../../models');

const doctorInclude = (as) => ({
  model: Doctor,
  as,
  attributes: ['id', 'doctor_code', 'specialization'],
  include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
});

const includes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  doctorInclude('from_doctor'),
  doctorInclude('to_doctor'),
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.referred_at = range;
  if (search) {
    where[Op.or] = [
      { referral_code: { [Op.like]: `%${search}%` } },
      { external_doctor_name: { [Op.like]: `%${search}%` } },
      { external_facility: { [Op.like]: `%${search}%` } },
      { reason: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Referral.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [['referred_at', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

const findById = (id, options = {}) => Referral.findByPk(id, { include: includes, ...options });
const countForYear = (year, options = {}) =>
  Referral.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const create = (data, options = {}) => Referral.create(data, options);
const update = (referral, changes, options = {}) => referral.update(changes, options);
const destroy = (referral, options = {}) => referral.destroy(options);

module.exports = { findAndCount, findById, countForYear, create, update, destroy };
