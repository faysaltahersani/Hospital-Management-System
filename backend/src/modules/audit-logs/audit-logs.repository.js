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
const { dateTimeRange } = require('../../utils/dateUtils');
const { AuditLog, User } = require('../../models');

const includes = [
  { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] },
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.created_at = range;
  if (search) {
    where[Op.or] = [
      { action: { [Op.like]: `%${search}%` } },
      { entity_type: { [Op.like]: `%${search}%` } },
      { entity_id: { [Op.like]: `%${search}%` } },
      { ip_address: { [Op.like]: `%${search}%` } },
      { '$user.full_name$': { [Op.like]: `%${search}%` } },
      { '$user.email$': { [Op.like]: `%${search}%` } },
    ];
  }

  return AuditLog.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });
};

const findById = (id) => AuditLog.findByPk(id, { include: includes });

const destroy = (auditLog, options = {}) => auditLog.destroy(options);

module.exports = { findAndCount, findById, destroy };
