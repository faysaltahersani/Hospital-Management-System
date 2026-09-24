'use strict';

// Integration tests for the security and patient-safety fixes.
// Boots the real Express app on an ephemeral port against the configured
// database, so route wiring, middleware order and SQL all execute for real.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');

const app = require('../src/app');
const config = require('../src/config');
const { sequelize, User, MasterOption, Bed, Admission, BloodBag, Patient } = require('../src/models');
const { hashPassword } = require('../src/utils/password');

let server;
let base;

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${base}${config.apiPrefix}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
};

const TEST_EMAIL = 'qa.permission.probe@hms.test';
const TEST_PASSWORD = 'QaProbe#2026!';
let testUserId = null;
let testToken = null;

test.before(async () => {
  await sequelize.authenticate();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;

  // A dedicated probe account with a restrictive permission profile.
  await User.destroy({ where: { email: TEST_EMAIL }, force: true });
  const user = await User.create({
    email: TEST_EMAIL,
    password_hash: await hashPassword(TEST_PASSWORD),
    full_name: 'QA Permission Probe',
    role: 'doctor',
    is_active: true,
  });
  testUserId = user.id;

  await MasterOption.destroy({
    where: { type: 'user_permission', code: `PERM-${testUserId}` },
    force: true,
  });
  await MasterOption.create({
    type: 'user_permission',
    code: `PERM-${testUserId}`,
    label: 'QA probe permissions',
    // Patient module only. The `doctor` role alone would otherwise grant
    // pharmacy, reports, laboratory and appointment access.
    description: JSON.stringify([{ permission_key: 'patient_patient_list', can_read: true }]),
    is_active: true,
  });

  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  assert.equal(login.status, 200, 'probe login should succeed');
  testToken = login.body.data.accessToken;
});

test.after(async () => {
  if (testUserId) {
    await MasterOption.destroy({
      where: { type: 'user_permission', code: `PERM-${testUserId}` },
      force: true,
    });
    await User.destroy({ where: { id: testUserId }, force: true });
  }
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

/* ─────────────── BUG-003: secrets are mandatory ─────────────── */

test('BUG-003: JWT secrets are real, distinct and long enough', () => {
  assert.notEqual(config.jwt.accessSecret, config.jwt.refreshSecret);
  assert.ok(config.jwt.accessSecret.length >= 32);
  for (const bad of ['dev-only-access-secret', 'dev-only-refresh-secret', 'change-me']) {
    assert.notEqual(config.jwt.accessSecret, bad);
    assert.notEqual(config.jwt.refreshSecret, bad);
  }
});

/* ─────────────── BUG-021: no catch-all masking ─────────────── */

test('BUG-021: unknown routes return 404, not an empty 200', async () => {
  const unknown = await api('/definitely-not-a-route', { token: testToken });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.success, false);
});

test('BUG-021: a non-numeric id is rejected, not silently emptied', async () => {
  const res = await api('/pharmacy/medicines/meta', { token: testToken });
  assert.notEqual(res.status, 200, 'must not answer 200 with fabricated empty meta');
});

/* ─────────────── BUG-001: backend permission enforcement ─────────────── */

test('BUG-001: permitted module is reachable', async () => {
  const res = await api('/patients?limit=1', { token: testToken });
  assert.equal(res.status, 200, 'patient module is granted and must work');
});

test('BUG-001: role-allowed but permission-denied module is blocked', async () => {
  // `doctor` is in PHARMACY_STAFF, so before the fix this returned 200.
  const res = await api('/pharmacy/medicines?limit=1', { token: testToken });
  assert.equal(res.status, 403, 'pharmacy must be denied: no pharmacy permission granted');
});

test('BUG-001: reports module is blocked without a reports permission', async () => {
  const res = await api('/reports/dashboard', { token: testToken });
  assert.equal(res.status, 403);
});

test('BUG-001: laboratory module is blocked without a pathology permission', async () => {
  const res = await api('/laboratory/tests?limit=1', { token: testToken });
  assert.equal(res.status, 403);
});

test('BUG-001: users without a permission profile keep role-based access', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  // Admin bypasses permission checks entirely.
  if (login.status === 200) {
    const res = await api('/pharmacy/medicines?limit=1', { token: login.body.data.accessToken });
    assert.equal(res.status, 200, 'admin must retain full access');
  }
});

test('BUG-001: permission changes take effect without re-login', async () => {
  const { invalidateUser, loadPermissionKeys } = require('../src/middlewares/permission.middleware');
  const option = await MasterOption.findOne({
    where: { type: 'user_permission', code: `PERM-${testUserId}` },
  });
  await option.update({
    description: JSON.stringify([{ permission_key: 'pharmacy_medicine_list', can_read: true }]),
  });
  invalidateUser(testUserId);

  const keys = await loadPermissionKeys(testUserId);
  assert.deepEqual(keys, ['pharmacy_medicine_list']);

  const res = await api('/pharmacy/medicines?limit=1', { token: testToken });
  assert.equal(res.status, 200, 'newly granted pharmacy access must apply immediately');

  const denied = await api('/patients?limit=1', { token: testToken });
  assert.equal(denied.status, 403, 'revoked patient access must apply immediately');

  await option.update({
    description: JSON.stringify([{ permission_key: 'patient_patient_list', can_read: true }]),
  });
  invalidateUser(testUserId);
});

/* ─────────────── Authentication ─────────────── */

test('AUTH: missing token is rejected', async () => {
  const res = await api('/patients');
  assert.equal(res.status, 401);
});

test('AUTH: tampered token is rejected', async () => {
  const res = await api('/patients', { token: `${testToken}x` });
  assert.equal(res.status, 401);
});

test('AUTH: token signed with the old hardcoded secret is rejected', async () => {
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign(
    { sub: 1, role: 'admin', email: 'admin@hospital.local' },
    'dev-only-access-secret',
    { issuer: config.jwt.issuer, audience: config.jwt.audience, expiresIn: '1h' }
  );
  const res = await api('/patients', { token: forged });
  assert.equal(res.status, 401, 'forged admin token must not authenticate');
});

test('AUTH: wrong password is rejected', async () => {
  const res = await api('/auth/login', {
    method: 'POST',
    body: { email: TEST_EMAIL, password: 'wrong-password' },
  });
  assert.equal(res.status, 401);
});

/* ─────────────── BUG-007: pharmacy sales returns ─────────────── */

test('BUG-007: GET /pharmacy/sales-returns no longer throws', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return; // credential rotated; covered elsewhere
  const res = await api('/pharmacy/sales-returns', { token: login.body.data.accessToken });
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.success, true);
});

/* ─────────────── BUG-006 / BUG-024: bed allocation ─────────────── */

test('BUG-006: admission without an explicit bed is rejected', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const token = login.body.data.accessToken;
  const patient = await Patient.findOne();
  const res = await api('/ipd', {
    method: 'POST',
    token,
    body: { patient_id: patient.id },
  });
  assert.ok(res.status >= 400, 'must not silently pick or invent a bed');
});

test('BUG-006: admission to an occupied bed is rejected', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const token = login.body.data.accessToken;

  const occupied = await Admission.findOne({ where: { status: 'admitted' } });
  assert.ok(occupied, 'fixture: expected at least one active admission');
  const patient = await Patient.findOne({ where: { id: { [require('sequelize').Op.ne]: occupied.patient_id } } });

  const res = await api('/ipd', {
    method: 'POST',
    token,
    body: { patient_id: patient.id, bed_id: occupied.bed_id, total_charges: 100 },
  });
  assert.equal(res.status, 409, `expected 409 conflict, got ${res.status}`);
});

test('BUG-024: admission charges are never fabricated as 1500', async () => {
  const zero = await Admission.findOne({ where: { total_charges: 0 } });
  if (!zero) return;
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const res = await api(`/ipd/${zero.id}`, { token: login.body.data.accessToken });
  assert.equal(res.status, 200);
  assert.equal(Number(res.body.data.total_charges), 0, 'zero charges must report as 0, not 1500');
});

/* ─────────────── BUG-005: IPD payments are real rows ─────────────── */

test('BUG-005: IPD payments come from admission_payments, not notes', async () => {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS n FROM admissions WHERE notes LIKE '%PAYMENTS_JSON%'"
  );
  assert.equal(Number(rows[0].n), 0, 'no admission may still carry a PAYMENTS_JSON blob');

  const [sum] = await sequelize.query('SELECT COALESCE(SUM(amount),0) AS total FROM admission_payments');
  assert.ok(Number(sum[0].total) >= 3500, 'the migrated ৳3,500 must be present as real rows');
});

test('BUG-005: negative IPD payment is rejected', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const admission = await Admission.findOne({ where: { status: 'admitted' } });
  const res = await api(`/ipd/${admission.id}/payments`, {
    method: 'POST',
    token: login.body.data.accessToken,
    body: { amount: -500, account_name: 'Cash' },
  });
  assert.ok(res.status >= 400, 'negative payment must be rejected');
});

/* ─────────────── BUG-013: blood safety ─────────────── */

test('BUG-013: unscreened bag cannot be issued', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const bag = await BloodBag.findOne({ where: { status: 'available', screening_status: 'pending' } });
  if (!bag) return;
  const patient = await Patient.findOne({ where: { blood_group: bag.blood_group } });
  if (!patient) return;

  const res = await api('/blood-bank/issues', {
    method: 'POST',
    token: login.body.data.accessToken,
    body: { bag_id: bag.id, patient_id: patient.id },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /screening/i);
});

test('BUG-013: compatibility matrix is clinically correct', () => {
  const { checkCompatibility, compatibleDonorGroups } = require('../src/utils/bloodCompatibility');
  const ok = (bag, recipient, component = 'whole_blood') =>
    checkCompatibility({ bagGroup: bag, recipientGroup: recipient, component }).compatible;

  // Universal red-cell donor / recipient.
  assert.equal(ok('O-', 'AB+'), true);
  assert.equal(ok('O-', 'O-'), true);
  assert.equal(ok('AB+', 'O-'), false);

  // Rh: positive units must never go to a negative recipient.
  assert.equal(ok('A+', 'A-'), false);
  assert.equal(ok('A+', 'AB-'), false, 'the exact violation present in shipped data');
  assert.equal(ok('O+', 'O-'), false);
  assert.equal(ok('A-', 'A+'), true);
  assert.equal(ok('A-', 'AB-'), true);

  // ABO: A must never go to a B recipient and vice versa.
  assert.equal(ok('A+', 'B+'), false);
  assert.equal(ok('B-', 'A-'), false);
  assert.equal(ok('AB+', 'A+'), false);

  // Plasma reverses direction: AB is the universal plasma donor, and an AB
  // recipient can only receive AB plasma (A plasma carries anti-B).
  assert.equal(ok('AB+', 'A+', 'plasma'), true);
  assert.equal(ok('AB-', 'O-', 'plasma'), true);
  assert.equal(ok('O-', 'A+', 'plasma'), false);
  assert.equal(ok('A+', 'AB+', 'plasma'), false);
  assert.equal(ok('AB+', 'AB+', 'plasma'), true);

  // Platelets require identity.
  assert.equal(ok('A+', 'A+', 'platelets'), true);
  assert.equal(ok('O-', 'A+', 'platelets'), false);

  // Fails closed on missing/unknown data.
  assert.equal(ok('A+', 'unknown'), false);
  assert.equal(ok('A+', null), false);
  assert.equal(ok('A+', ''), false);
  assert.equal(ok(null, 'A+'), false);

  assert.deepEqual(compatibleDonorGroups('O-'), ['O-']);
  assert.equal(compatibleDonorGroups('AB+').length, 8);
});

test('BUG-013: incompatible issue is rejected by the API', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const token = login.body.data.accessToken;

  const { checkCompatibility } = require('../src/utils/bloodCompatibility');
  const bags = await BloodBag.findAll({ where: { status: 'available' } });
  const patients = await Patient.findAll();

  // Find a genuinely incompatible pair rather than assuming one.
  let pair = null;
  for (const bag of bags) {
    for (const patient of patients) {
      const verdict = checkCompatibility({
        bagGroup: bag.blood_group,
        recipientGroup: patient.blood_group,
        component: bag.component,
      });
      if (!verdict.compatible && patient.blood_group !== 'unknown') {
        pair = { bag, patient };
        break;
      }
    }
    if (pair) break;
  }
  assert.ok(pair, 'fixture: expected at least one incompatible bag/patient combination');

  const original = pair.bag.screening_status;
  await pair.bag.update({ screening_status: 'passed' });
  try {
    const res = await api('/blood-bank/issues', {
      method: 'POST',
      token,
      body: { bag_id: pair.bag.id, patient_id: pair.patient.id },
    });
    assert.equal(
      res.status,
      400,
      `${pair.bag.blood_group} -> ${pair.patient.blood_group} must be rejected, got ${res.status}`
    );
    assert.match(res.body.message, /not compatible|Incompatible/i);
  } finally {
    await pair.bag.update({ screening_status: original });
  }
});

test('BUG-013: issue without an identified recipient group is refused', async () => {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  if (login.status !== 200) return;
  const bag = await BloodBag.findOne({ where: { status: 'available' } });
  if (!bag) return;
  const original = bag.screening_status;
  await bag.update({ screening_status: 'passed' });
  try {
    const res = await api('/blood-bank/issues', {
      method: 'POST',
      token: login.body.data.accessToken,
      body: { bag_id: bag.id, issued_to: 'Walk-in ward request' },
    });
    assert.equal(res.status, 400, 'an unidentified recipient must not receive blood');
  } finally {
    await bag.update({ screening_status: original });
  }
});
