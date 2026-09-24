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

const { Op } = require('sequelize');
const { Department } = require('../../models');

const findAndCount = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
    ];
  }
  return Department.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
  });
};

const findById = (id) => Department.findByPk(id);
const findByName = (name) => Department.findOne({ where: { name }, paranoid: false });
const findByCode = (code) => Department.findOne({ where: { code }, paranoid: false });
const create = (data, options = {}) => Department.create(data, options);
const update = (department, changes, options = {}) => department.update(changes, options);
const destroy = (department, options = {}) => department.destroy(options);

module.exports = { findAndCount, findById, findByName, findByCode, create, update, destroy };
