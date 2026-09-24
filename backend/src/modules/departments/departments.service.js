'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const repository = require('./departments.repository');

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.is_active !== undefined) filters.is_active = query.is_active;

  const { rows, count } = await repository.findAndCount({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((d) => d.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const dept = await repository.findById(id);
  if (!dept) throw ApiError.notFound('Department not found');
  return dept.toJSON();
};

const create = async (input) => {
  const name = input.name.trim();

  // 1. Check if department with same name exists (active or soft-deleted)
  const existingByName = await repository.findByName(name);
  if (existingByName) {
    if (existingByName.deletedAt) {
      await existingByName.restore();
      await existingByName.update({
        description: input.description || existingByName.description,
        is_active: true,
      });
      return existingByName.toJSON();
    }
    throw ApiError.conflict(`A department named "${name}" already exists.`);
  }

  // 2. Generate unique code automatically if not unique or missing
  let baseCode = (input.code || name)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  if (baseCode.length < 2) baseCode = 'DEPT';

  let code = baseCode;
  let counter = 1;
  while (await repository.findByCode(code)) {
    code = `${baseCode}${counter}`;
    counter++;
  }

  const dept = await repository.create({ ...input, name, code });
  return dept.toJSON();
};

const update = async (id, changes) => {
  const dept = await repository.findById(id);
  if (!dept) throw ApiError.notFound('Department not found');
  await repository.update(dept, changes);
  return dept.toJSON();
};

const remove = async (id) => {
  const dept = await repository.findById(id);
  if (!dept) throw ApiError.notFound('Department not found');
  await repository.destroy(dept);
  return { message: 'Department deleted' };
};

module.exports = { list, getById, create, update, remove };
