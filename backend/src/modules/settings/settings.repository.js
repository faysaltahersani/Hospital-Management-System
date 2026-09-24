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
const { Setting, MasterOption } = require('../../models');

const findAndCountSettings = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { group_name: { [Op.like]: `%${search}%` } },
      { key: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }
  return Setting.findAndCountAll({
    where,
    limit,
    offset,
    order: [['group_name', 'ASC'], ['key', 'ASC']],
  });
};

const findPublicSettings = () =>
  Setting.findAll({
    where: { is_public: true },
    order: [['group_name', 'ASC'], ['key', 'ASC']],
  });

const findSettingById = (id, options = {}) => Setting.findByPk(id, options);
const findSettingByKey = (groupName, key, options = {}) =>
  Setting.findOne({ where: { group_name: groupName, key }, ...options });
const createSetting = (data, options = {}) => Setting.create(data, options);
const updateSetting = (setting, changes, options = {}) => setting.update(changes, options);
const destroySetting = (setting, options = {}) => setting.destroy(options);

const findAndCountOptions = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { label: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }
  return MasterOption.findAndCountAll({
    where,
    limit,
    offset,
    order: [['type', 'ASC'], ['sort_order', 'ASC'], ['label', 'ASC']],
  });
};

const findOptionById = (id, options = {}) => MasterOption.findByPk(id, options);
const findOptionByTypeCode = (type, code, options = {}) =>
  MasterOption.findOne({ where: { type, code }, ...options });
const createOption = (data, options = {}) => MasterOption.create(data, options);
const updateOption = (option, changes, options = {}) => option.update(changes, options);
const destroyOption = (option, options = {}) => option.destroy(options);

module.exports = {
  findAndCountSettings,
  findPublicSettings,
  findSettingById,
  findSettingByKey,
  createSetting,
  updateSetting,
  destroySetting,
  findAndCountOptions,
  findOptionById,
  findOptionByTypeCode,
  createOption,
  updateOption,
  destroyOption,
};
