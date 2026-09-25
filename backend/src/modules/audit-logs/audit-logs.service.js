'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const repository = require('./audit-logs.repository');

const parseChanges = (record) => {
  const json = record.toJSON();
  // Most HMS APIs expose snake_case timestamps. AuditLog relies on Sequelize's
  // default `createdAt` attribute, so normalize it here as well. Without this,
  // the security activity screen receives the row but renders an empty time.
  json.created_at = json.created_at || json.createdAt || null;
  if (!json.changes) return json;
  try {
    json.changes = JSON.parse(json.changes);
  } catch (_) {
    // Keep the raw value if an older row contains non-JSON text.
  }
  return json;
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.user_id) filters.user_id = query.user_id;
  if (query.action) filters.action = query.action;
  if (query.entity_type) filters.entity_type = query.entity_type;
  if (query.entity_id) filters.entity_id = query.entity_id;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });

  return {
    items: rows.map(parseChanges),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const auditLog = await repository.findById(id);
  if (!auditLog) throw ApiError.notFound('Audit log not found');
  return parseChanges(auditLog);
};

const remove = async (id) => {
  const auditLog = await repository.findById(id);
  if (!auditLog) throw ApiError.notFound('Audit log not found');
  await repository.destroy(auditLog);
  return { message: 'Audit log deleted' };
};

module.exports = { list, getById, remove };
