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
const { Ward, Bed } = require('../../models');

const wardInclude = { model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'type', 'floor'] };

const findAndCountWards = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
    ];
  }
  return Ward.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
};

const findWardById = (id) => Ward.findByPk(id);
const findWardByCode = (code) => Ward.findOne({ where: { code } });
const createWard = (data, options = {}) => Ward.create(data, options);
const updateWard = (ward, changes, options = {}) => ward.update(changes, options);
const destroyWard = (ward, options = {}) => ward.destroy(options);

const findAndCountBeds = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { bed_number: { [Op.like]: `%${search}%` } },
      { room_number: { [Op.like]: `%${search}%` } },
    ];
  }
  return Bed.findAndCountAll({
    where,
    include: [wardInclude],
    limit,
    offset,
    order: [['ward_id', 'ASC'], ['bed_number', 'ASC']],
    distinct: true,
  });
};

const findBedById = (id, options = {}) => Bed.findByPk(id, { include: [wardInclude], ...options });
const createBed = (data, options = {}) => Bed.create(data, options);
const updateBed = (bed, changes, options = {}) => bed.update(changes, options);
const destroyBed = (bed, options = {}) => bed.destroy(options);

const countBedsByStatus = () =>
  Bed.findAll({
    attributes: ['status', [Bed.sequelize.fn('COUNT', Bed.sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

module.exports = {
  findAndCountWards,
  findWardById,
  findWardByCode,
  createWard,
  updateWard,
  destroyWard,
  findAndCountBeds,
  findBedById,
  createBed,
  updateBed,
  destroyBed,
  countBedsByStatus,
};
