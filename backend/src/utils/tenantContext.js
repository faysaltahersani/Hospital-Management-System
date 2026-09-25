'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const { Op } = require('sequelize');

const storage = new AsyncLocalStorage();
const GLOBAL_ROLES = new Set(['super_admin', 'admin']);
const ORG_ROLES = new Set(['ceo', 'management']);
const HOSPITAL_ROLES = new Set(['hospital_admin']);

const runWithTenant = (user, callback) => storage.run({
  user_id: user.id,
  role: user.role,
  organization_id: user.organization_id ? Number(user.organization_id) : null,
  hospital_id: user.hospital_id ? Number(user.hospital_id) : null,
  branch_id: user.branch_id ? Number(user.branch_id) : null,
  department_id: user.department_id ? Number(user.department_id) : null,
}, callback);

const currentTenant = () => storage.getStore() || null;

const forbiddenScope = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  error.isOperational = true;
  return error;
};

const tenantWhereFor = (model) => {
  const tenant = currentTenant();
  if (!tenant || GLOBAL_ROLES.has(tenant.role)) return null;
  const attrs = model.rawAttributes || {};
  const where = {};
  if (attrs.organization_id && tenant.organization_id) where.organization_id = tenant.organization_id;
  if (model.tableName === 'patients') return where;
  if (!ORG_ROLES.has(tenant.role) && attrs.hospital_id && tenant.hospital_id) where.hospital_id = tenant.hospital_id;
  if (!ORG_ROLES.has(tenant.role) && !HOSPITAL_ROLES.has(tenant.role) && attrs.branch_id && tenant.branch_id) where.branch_id = tenant.branch_id;
  if (attrs.department_id && tenant.department_id && !ORG_ROLES.has(tenant.role) && !HOSPITAL_ROLES.has(tenant.role) && tenant.role !== 'branch_admin') {
    where.department_id = tenant.department_id;
  }
  return where;
};

const mergeScope = (options, model) => {
  const scope = tenantWhereFor(model);
  if (!scope || !Object.keys(scope).length) return;
  options.where = options.where ? { [Op.and]: [options.where, scope] } : scope;
};

const assertAndFillScope = (instance, model) => {
  const tenant = currentTenant();
  if (!tenant || GLOBAL_ROLES.has(tenant.role)) return;
  const expected = tenantWhereFor(model) || {};
  for (const [field, value] of Object.entries(expected)) {
    const supplied = instance.get(field);
    if (supplied != null && Number(supplied) !== Number(value)) throw forbiddenScope(`Cannot write outside your ${field.replace('_id','')} scope`);
    instance.set(field, value);
  }
};

const installTenantHooks = (model) => {
  if (model._tenantHooksInstalled) return;
  model._tenantHooksInstalled = true;
  model.addHook('beforeFind', (options) => mergeScope(options, model));
  model.addHook('beforeCount', (options) => mergeScope(options, model));
  model.addHook('beforeUpdate', (instance, _options) => assertAndFillScope(instance, model));
  model.addHook('beforeDestroy', (_instance, options) => mergeScope(options, model));
  model.addHook('beforeCreate', (instance) => assertAndFillScope(instance, model));
  model.addHook('beforeBulkCreate', (instances) => instances.forEach((instance) => assertAndFillScope(instance, model)));
  model.addHook('beforeBulkUpdate', (options) => {
    const scope = tenantWhereFor(model) || {};
    for (const [field, value] of Object.entries(scope)) {
      if (options.attributes?.[field] != null && Number(options.attributes[field]) !== Number(value)) throw forbiddenScope(`Cannot move records outside your ${field.replace('_id','')} scope`);
    }
    mergeScope(options, model);
  });
  model.addHook('beforeBulkDestroy', (options) => mergeScope(options, model));
};

module.exports = { runWithTenant, currentTenant, tenantWhereFor, installTenantHooks };
