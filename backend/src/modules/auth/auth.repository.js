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
const { User, RefreshToken } = require('../../models');

const findUserByEmail = (identifier) =>
  User.findOne({
    where: {
      [Op.or]: [
        { email: identifier },
        { full_name: identifier },
      ],
    },
  });
const findUserById = (id) => User.findByPk(id);
const createUser = (data, options = {}) => User.create(data, options);
const updateUser = (user, changes, options = {}) => user.update(changes, options);

const createRefreshToken = (data, options = {}) => RefreshToken.create(data, options);

const findActiveRefreshToken = (tokenHash) =>
  RefreshToken.findOne({
    where: {
      token_hash: tokenHash,
      revoked_at: null,
      expires_at: { [Op.gt]: new Date() },
    },
  });

const revokeRefreshToken = (record) => record.update({ revoked_at: new Date() });

const revokeAllUserTokens = (userId) =>
  RefreshToken.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null } }
  );

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  createRefreshToken,
  findActiveRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
