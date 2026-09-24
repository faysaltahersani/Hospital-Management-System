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
const { User } = require('../../models');

const findAndCount = async ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { email: { [Op.like]: `%${search}%` } },
      { full_name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  return User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
};

const findById = (id) => User.findByPk(id);
const findByEmail = (email) => User.findOne({ where: { email } });
const create = (data, options = {}) => User.create(data, options);
const update = (user, changes, options = {}) => user.update(changes, options);
const destroy = (user, options = {}) => user.destroy(options);

// BUG-040 — an admin-initiated password reset must terminate existing sessions.
const revokeAllTokensForUser = (userId) => {
  const { RefreshToken } = require('../../models');
  return RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } }
  );
};

module.exports = {
  findAndCount,
  findById,
  findByEmail,
  create,
  update,
  destroy,
  revokeAllTokensForUser,
};
