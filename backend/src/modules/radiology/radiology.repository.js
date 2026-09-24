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
const { RadiologyTest, RadiologyOrder, Patient, Doctor, User, RadiologyParameter, MasterOption } = require('../../models');

const findAndCountTests = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) {
    where.createdAt = range;
  }
  if (search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }
  return RadiologyTest.findAndCountAll({ where, limit, offset, order: [['id', 'DESC']] });
};

const findTestById = (id, options = {}) => RadiologyTest.findByPk(id, options);
const findTestByCode = (code, options = {}) => RadiologyTest.findOne({ where: { code }, ...options });
const createTest = (data, options = {}) => RadiologyTest.create(data, options);
const updateTest = (test, changes, options = {}) => test.update(changes, options);
const destroyTest = (test, options = {}) => test.destroy(options);

const orderIncludes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'doctor_code', 'specialization'],
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
  },
  { model: RadiologyTest, as: 'test', attributes: ['id', 'code', 'name', 'category', 'price'] },
];

const findAndCountOrders = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.ordered_at = range;
  if (search) {
    where[Op.or] = [
      { order_code: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
      { '$test.name$': { [Op.like]: `%${search}%` } },
    ];
  }
  return RadiologyOrder.findAndCountAll({
    where,
    include: orderIncludes,
    limit,
    offset,
    order: [['ordered_at', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

const findOrderById = (id, options = {}) => RadiologyOrder.findByPk(id, { include: orderIncludes, ...options });
const countOrdersForYear = (year, options = {}) =>
  RadiologyOrder.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createOrder = (data, options = {}) => RadiologyOrder.create(data, options);
const updateOrder = (order, changes, options = {}) => order.update(changes, options);
const destroyOrder = (order, options = {}) => order.destroy(options);

const parameterIncludes = [
  { model: MasterOption, as: 'unit_option', attributes: ['id', 'code', 'label'] },
];

const findAndCountRadiologyParameters = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }
  return RadiologyParameter.findAndCountAll({
    where,
    include: parameterIncludes,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });
};

const findRadiologyParameterById = (id, options = {}) =>
  RadiologyParameter.findByPk(id, { include: parameterIncludes, ...options });
const createRadiologyParameter = (data, options = {}) => RadiologyParameter.create(data, options);
const updateRadiologyParameter = (param, changes, options = {}) => param.update(changes, options);
const destroyRadiologyParameter = (param, options = {}) => param.destroy(options);

module.exports = {
  findAndCountTests,
  findTestById,
  findTestByCode,
  createTest,
  updateTest,
  destroyTest,
  findAndCountOrders,
  findOrderById,
  countOrdersForYear,
  createOrder,
  updateOrder,
  destroyOrder,
  findAndCountRadiologyParameters,
  findRadiologyParameterById,
  createRadiologyParameter,
  updateRadiologyParameter,
  destroyRadiologyParameter,
};
