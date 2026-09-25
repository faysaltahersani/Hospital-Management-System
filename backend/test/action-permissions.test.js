'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const app = require('../src/app');
const config = require('../src/config');
const { sequelize, User, MasterOption, AuditLog } = require('../src/models');
const { hashPassword } = require('../src/utils/password');
const { invalidateUser } = require('../src/middlewares/permission.middleware');
const auditLogService = require('../src/modules/audit-logs/audit-logs.service');

const email = `qa.action.${Date.now()}@hms.test`;
const password = 'QaAction#2026';
let server;
let base;
let user;
let token;
let profile;

const api = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${base}${config.apiPrefix}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
};

test.before(async () => {
  await sequelize.authenticate();
  user = await User.create({
    email,
    password_hash: await hashPassword(password),
    full_name: 'QA Action Permission',
    role: 'nurse',
    is_active: true,
  });
  profile = await MasterOption.create({
    type: 'user_permission',
    code: `PERM-${user.id}`,
    label: `QA action permissions ${user.id}`,
    description: JSON.stringify([
      { permission_key: 'patient_patient_entry', can_read: true, can_create: false },
    ]),
    is_active: true,
  });

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  const login = await fetch(`${base}${config.apiPrefix}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = await login.json();
  assert.equal(login.status, 200);
  token = result.data.accessToken;
});

test.after(async () => {
  await AuditLog.destroy({ where: { entity_type: 'authentication', entity_id: String(user.id) }, force: true });
  await MasterOption.destroy({ where: { id: profile.id }, force: true });
  await User.destroy({ where: { id: user.id }, force: true });
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

test('successful login is written to the security history', async () => {
  const record = await AuditLog.findOne({
    where: { entity_type: 'authentication', entity_id: String(user.id), action: 'login' },
    order: [['id', 'DESC']],
  });
  assert.ok(record);
  const changes = JSON.parse(record.changes);
  assert.equal(changes.success, true);
  assert.equal(changes.email, email);

  const history = await auditLogService.list({ entity_type: 'authentication', limit: 100 });
  const serialized = history.items.find((item) => String(item.id) === String(record.id));
  assert.ok(serialized?.created_at, 'security-history API must expose a displayable timestamp');
});

test('view permission allows GET while create permission blocks POST', async () => {
  const read = await api('/patients?limit=1');
  assert.equal(read.status, 200);

  const sensitive = await api('/patients/1/timeline');
  assert.equal(sensitive.status, 403);
  assert.match(sensitive.body.message, /sensitive-data permission/i);

  const create = await api('/patients', { method: 'POST', body: {} });
  assert.equal(create.status, 403);
  assert.match(create.body.message, /create permission/i);
});

test('changing the action matrix takes effect without a new login', async () => {
  await profile.update({
    description: JSON.stringify([
      { permission_key: 'patient_patient_entry', can_read: true, can_create: true, can_access_sensitive: true },
    ]),
  });
  invalidateUser(user.id);

  const create = await api('/patients', { method: 'POST', body: {} });
  assert.equal(create.status, 422);
  assert.match(create.body.message, /validation/i);

  const sensitive = await api('/patients/1/timeline');
  assert.notEqual(sensitive.status, 403);
});
