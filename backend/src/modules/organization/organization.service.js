'use strict';

const { sequelize, Hospital, Branch, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const repository = require('./organization.repository');

const list = async (entity, query = {}) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.is_active !== undefined) filters.is_active = query.is_active;
  if (entity === 'hospitals' && query.organization_id) filters.organization_id = query.organization_id;
  if (entity === 'branches' && query.hospital_id) filters.hospital_id = query.hospital_id;

  const method = {
    organizations: repository.listOrganizations,
    hospitals: repository.listHospitals,
    branches: repository.listBranches,
  }[entity];
  const { rows, count } = await method({ filters, search: query.search, limit, offset });
  return { items: rows.map((row) => row.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (entity, id) => {
  const row = await repository.findById(entity, id);
  if (!row) throw ApiError.notFound(`${entity.slice(0, -1)} not found`);
  return row.toJSON();
};

const normalizeCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const codeScope = (entity, input) => {
  if (entity === 'hospitals') return { organization_id: input.organization_id };
  if (entity === 'branches') return { hospital_id: input.hospital_id };
  return {};
};

const assertParent = async (entity, input, transaction) => {
  if (entity === 'hospitals') {
    const parent = await repository.findById('organizations', input.organization_id, { transaction });
    if (!parent || !parent.is_active) throw ApiError.badRequest('Active organization not found');
  }
  if (entity === 'branches') {
    const parent = await repository.findById('hospitals', input.hospital_id, { transaction });
    if (!parent || !parent.is_active) throw ApiError.badRequest('Active hospital not found');
  }
};

const create = async (entity, input, userId) =>
  sequelize.transaction(async (transaction) => {
    await assertParent(entity, input, transaction);
    const code = normalizeCode(input.code || input.name);
    if (!code) throw ApiError.badRequest('A valid code or name is required');
    const existing = await repository.findOne(entity, { ...codeScope(entity, input), code }, { paranoid: false, transaction });
    if (existing && !existing.deletedAt) throw ApiError.conflict(`Code ${code} already exists in this scope`);

    const data = { ...input, code, created_by: userId, updated_by: userId };
    if (existing?.deletedAt) {
      await existing.restore({ transaction });
      await repository.update(existing, data, { transaction });
      return existing.toJSON();
    }

    if (entity === 'branches') {
      const siblingCount = await Branch.count({ where: { hospital_id: input.hospital_id }, transaction });
      if (siblingCount === 0) data.is_main = true;
      if (data.is_main) {
        await Branch.update({ is_main: false }, { where: { hospital_id: input.hospital_id }, transaction });
      }
    }
    const row = await repository.create(entity, data, { transaction });
    return row.toJSON();
  });

const update = async (entity, id, changes, userId) =>
  sequelize.transaction(async (transaction) => {
    const row = await repository.findById(entity, id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw ApiError.notFound(`${entity.slice(0, -1)} not found`);
    const input = { ...row.toJSON(), ...changes };
    await assertParent(entity, input, transaction);

    if (changes.code || changes.name) {
      const code = normalizeCode(changes.code || row.code || changes.name);
      const duplicate = await repository.findOne(
        entity,
        { ...codeScope(entity, input), code, id: { [require('sequelize').Op.ne]: row.id } },
        { transaction }
      );
      if (duplicate) throw ApiError.conflict(`Code ${code} already exists in this scope`);
      changes.code = code;
    }

    if (entity === 'branches' && changes.is_main) {
      await Branch.update(
        { is_main: false },
        { where: { hospital_id: input.hospital_id, id: { [require('sequelize').Op.ne]: row.id } }, transaction }
      );
    }
    if (entity === 'branches' && row.is_main && changes.is_main === false) {
      throw ApiError.badRequest('Promote another branch to main before removing main status from this branch');
    }
    await repository.update(row, { ...changes, updated_by: userId }, { transaction });
    return row.toJSON();
  });

const remove = async (entity, id) =>
  sequelize.transaction(async (transaction) => {
    const row = await repository.findById(entity, id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw ApiError.notFound(`${entity.slice(0, -1)} not found`);

    if (entity === 'organizations') {
      const children = await Hospital.count({ where: { organization_id: id }, transaction });
      if (children) throw ApiError.conflict('Remove or reassign this organization’s hospitals first');
    }
    if (entity === 'hospitals') {
      const children = await Branch.count({ where: { hospital_id: id }, transaction });
      if (children) throw ApiError.conflict('Remove or reassign this hospital’s branches first');
    }
    if (entity === 'branches') {
      const assignedUsers = await User.count({ where: { branch_id: id }, transaction });
      if (assignedUsers) throw ApiError.conflict('This branch is assigned to users and cannot be removed');
      if (row.is_main) {
        const replacement = await Branch.findOne({
          where: { hospital_id: row.hospital_id, id: { [require('sequelize').Op.ne]: row.id } },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (replacement) await replacement.update({ is_main: true }, { transaction });
      }
    }

    await repository.destroy(row, { transaction });
    return { message: `${entity.slice(0, -1)} deleted` };
  });

const getHierarchy = async () => (await repository.hierarchy()).map((row) => row.toJSON());

module.exports = { list, getById, create, update, remove, getHierarchy };
