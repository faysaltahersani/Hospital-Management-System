'use strict';

// BUG-027 / BUG-028 (bed + soft-delete integrity) and
// BUG-002 / BUG-023 / BUG-034 / BUG-040 (remaining security items).

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { sequelize, Bed, Ward, Admission, Patient, Doctor, Medicine, MedicineBatch, User, AuditLog } = models;
const { hashPassword } = require('../src/utils/password');

const ADMIN = { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' };
let server, base, token;
const cleanup = { userIds: [], wardIds: [], bedIds: [], medicineIds: [] };

const api = async (path, { method = 'GET', body, bearer } = {}) => {
  const res = await fetch(`${base}${config.apiPrefix}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...((bearer ?? token) ? { Authorization: `Bearer ${bearer ?? token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
};

test.before(async () => {
  await sequelize.authenticate();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/auth/login', { method: 'POST', body: ADMIN });
  assert.equal(login.status, 200, 'admin login must succeed');
  token = login.body.data.accessToken;
});

test.after(async () => {
  const { resetAccountThrottle } = require('../src/middlewares/rateLimit.middleware');
  resetAccountThrottle();
  if (cleanup.bedIds.length) await Bed.destroy({ where: { id: cleanup.bedIds }, force: true });
  if (cleanup.wardIds.length) await Ward.destroy({ where: { id: cleanup.wardIds }, force: true });
  if (cleanup.medicineIds.length) {
    await MedicineBatch.destroy({ where: { medicine_id: cleanup.medicineIds }, force: true });
    await Medicine.destroy({ where: { id: cleanup.medicineIds }, force: true });
  }
  if (cleanup.userIds.length) await User.destroy({ where: { id: cleanup.userIds }, force: true });
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── BUG-027: bed status integrity ───────────────────────────────────────── */

test('BUG-027: no bed contradicts its admissions', async () => {
  const [[row]] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM beds b WHERE b.deleted_at IS NULL AND b.status='occupied'
          AND NOT EXISTS (SELECT 1 FROM admissions a WHERE a.bed_id=b.id AND a.status='admitted' AND a.deleted_at IS NULL)) AS phantom,
       (SELECT COUNT(*) FROM beds b WHERE b.deleted_at IS NULL AND b.status<>'occupied'
          AND EXISTS (SELECT 1 FROM admissions a WHERE a.bed_id=b.id AND a.status='admitted' AND a.deleted_at IS NULL)) AS hidden`
  );
  assert.equal(Number(row.phantom), 0, 'no bed may be occupied with no active admission');
  assert.equal(Number(row.hidden), 0, 'no occupied bed may be advertised as available');
});

test('BUG-027: an occupied bed cannot be marked available', async () => {
  const admission = await Admission.findOne({ where: { status: 'admitted', deleted_at: null } });
  assert.ok(admission, 'fixture: an active admission is required');

  const res = await api(`/beds/${admission.bed_id}`, { method: 'PATCH', body: { status: 'available' } });
  assert.equal(res.status, 409, `expected conflict, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.match(res.body.message, /occupied by admission/i);

  const bed = await Bed.findByPk(admission.bed_id);
  assert.equal(bed.status, 'occupied', 'the bed must remain occupied');
});

test('BUG-027: a free bed cannot be marked occupied without an admission', async () => {
  const bed = await Bed.findOne({
    where: { status: 'available', deleted_at: null },
  });
  assert.ok(bed);
  const res = await api(`/beds/${bed.id}`, { method: 'PATCH', body: { status: 'occupied' } });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /without an active admission/i);
});

test('BUG-027: a bed holding a patient cannot be deleted', async () => {
  const admission = await Admission.findOne({ where: { status: 'admitted', deleted_at: null } });
  const res = await api(`/beds/${admission.bed_id}`, { method: 'DELETE' });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /still active/i);
  assert.ok(await Bed.findByPk(admission.bed_id), 'the bed must survive');
});

/* ── BUG-028: soft-delete dependency guards ─────────────────────────────── */

test('BUG-028: a patient with clinical history cannot be deleted', async () => {
  const admission = await Admission.findOne({ where: { status: 'admitted', deleted_at: null } });
  const res = await api(`/patients/${admission.patient_id}`, { method: 'DELETE' });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.match(res.body.message, /still reference this record/i);
  assert.ok(await Patient.findByPk(admission.patient_id), 'the patient must survive');
});

test('BUG-028: a patient with no dependents can still be deleted', async () => {
  const patient = await Patient.create({
    patient_code: `QA-DEL-${Date.now()}`,
    full_name: 'QA Disposable Patient',
    gender: 'other',
    blood_group: 'unknown',
  });
  const res = await api(`/patients/${patient.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(await Patient.findByPk(patient.id), null, 'it must be soft-deleted');
  await Patient.destroy({ where: { id: patient.id }, force: true });
});

test('BUG-028: a ward with beds cannot be deleted', async () => {
  const bed = await Bed.findOne({ where: { deleted_at: null } });
  const res = await api(`/beds/wards/${bed.ward_id}`, { method: 'DELETE' });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /still belong to it/i);
});

test('BUG-028: a doctor with active work cannot be deleted', async () => {
  const admission = await Admission.findOne({ where: { status: 'admitted', doctor_id: { [Op.ne]: null } } });
  if (!admission) return;
  const res = await api(`/doctors/${admission.doctor_id}`, { method: 'DELETE' });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.match(res.body.message, /still assigned/i);
  assert.ok(await Doctor.findByPk(admission.doctor_id));
});

test('BUG-028: a medicine holding stock cannot be deleted', async () => {
  const med = await Medicine.create({
    code: `QA-DEP-${Date.now()}`, name: 'QA Dependent Medicine', unit: 'piece',
    purchase_price: 5, sale_price: 9, stock_quantity: 0, reorder_level: 1, is_active: true,
  });
  cleanup.medicineIds.push(med.id);
  await MedicineBatch.create({
    medicine_id: med.id, batch_no: 'QA-STOCK', expiry_date: '2028-01-31',
    quantity_in: 10, quantity_out: 0, purchase_price: 5, sale_price: 9,
  });

  const res = await api(`/pharmacy/medicines/${med.id}`, { method: 'DELETE' });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.match(res.body.message, /still in stock/i);
  assert.ok(await Medicine.findByPk(med.id), 'the medicine must survive');
});

/* ── BUG-002: must_change_password is enforced ──────────────────────────── */

test('BUG-002: a flagged account gets a restricted session', async () => {
  const email = `qa.pwd.${Date.now()}@hms-qa.com`;
  const user = await User.create({
    email,
    password_hash: await hashPassword('QaTemp2026x'),
    full_name: 'QA Password Probe',
    role: 'receptionist',
    is_active: true,
    must_change_password: true,
  });
  cleanup.userIds.push(user.id);

  const login = await api('/auth/login', { method: 'POST', body: { email, password: 'QaTemp2026x' } });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.must_change_password, true, 'the client must be told');
  assert.equal(login.body.data.refreshToken, null, 'no refresh token may be issued');

  const restricted = login.body.data.accessToken;

  // Everything except the password change is refused.
  for (const path of ['/patients', '/reports/dashboard', '/appointments']) {
    const res = await api(path, { bearer: restricted });
    assert.equal(res.status, 403, `${path} must be blocked, got ${res.status}`);
    assert.match(res.body.message, /password must be changed/i);
  }

  // The rotation itself is allowed, and lifts the restriction.
  const changed = await api('/auth/change-password', {
    method: 'POST', bearer: restricted,
    body: { current_password: 'QaTemp2026x', new_password: 'QaRotated2026x' },
  });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));

  const relogin = await api('/auth/login', { method: 'POST', body: { email, password: 'QaRotated2026x' } });
  assert.equal(relogin.status, 200);
  assert.ok(relogin.body.data.refreshToken, 'a full session is issued after rotation');

  const ok = await api('/patients?limit=1', { bearer: relogin.body.data.accessToken });
  assert.equal(ok.status, 200, 'normal access is restored');
});

test('BUG-002: every shared-hash account is flagged for rotation', async () => {
  const [rows] = await sequelize.query(
    `SELECT u.id, u.must_change_password
       FROM users u
       JOIN (SELECT password_hash FROM users GROUP BY password_hash HAVING COUNT(*) > 1) d
         ON d.password_hash = u.password_hash`
  );
  const unflagged = rows.filter((r) => Number(r.must_change_password) !== 1);
  assert.equal(unflagged.length, 0, `${unflagged.length} shared-credential account(s) are not flagged`);
});

/* ── BUG-040: one password policy ───────────────────────────────────────── */

test('BUG-040: weak passwords are refused on every creation path', async () => {
  const weak = ['abcd', 'short1', 'alllettersonly', '12345678'];
  for (const password of weak) {
    const res = await api('/users', {
      method: 'POST',
      body: { email: `qa.weak.${Date.now()}.${Math.round(Math.random() * 1e6)}@hms-qa.com`, password, full_name: 'QA Weak', role: 'receptionist' },
    });
    assert.ok(res.status >= 400, `"${password}" must be rejected, got ${res.status}`);
  }
});

test('BUG-040: a compliant password is accepted', async () => {
  const email = `qa.strong.${Date.now()}@hms-qa.com`;
  const res = await api('/users', {
    method: 'POST',
    body: { email, password: 'StrongPass2026', full_name: 'QA Strong', role: 'receptionist' },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  cleanup.userIds.push(res.body.data.id);
});

test('BUG-040: an admin password reset forces rotation and ends sessions', async () => {
  const email = `qa.reset.${Date.now()}@hms-qa.com`;
  const created = await api('/users', {
    method: 'POST', body: { email, password: 'InitialPass2026', full_name: 'QA Reset', role: 'receptionist' },
  });
  assert.equal(created.status, 201);
  const userId = created.body.data.id;
  cleanup.userIds.push(userId);

  const before = await api('/auth/login', { method: 'POST', body: { email, password: 'InitialPass2026' } });
  assert.equal(before.status, 200);
  const oldRefresh = before.body.data.refreshToken;
  assert.ok(oldRefresh);

  const reset = await api(`/users/${userId}`, { method: 'PATCH', body: { password: 'AdminSet2026x' } });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));

  // The pre-reset refresh token must no longer work.
  const refreshed = await api('/auth/refresh', { method: 'POST', body: { refresh_token: oldRefresh } });
  assert.equal(refreshed.status, 401, 'sessions must be terminated by a reset');

  // And the user is forced to rotate the admin-chosen password.
  const after = await api('/auth/login', { method: 'POST', body: { email, password: 'AdminSet2026x' } });
  assert.equal(after.status, 200);
  assert.equal(after.body.data.must_change_password, true);
});

/* ── BUG-023: per-account login throttling ──────────────────────────────── */

test('BUG-023: repeated failures lock the account, not just the IP', async () => {
  const { resetAccountThrottle, ACCOUNT_MAX_FAILURES } = require('../src/middlewares/rateLimit.middleware');
  resetAccountThrottle();

  const email = `qa.throttle.${Date.now()}@hms-qa.com`;
  const user = await User.create({
    email, password_hash: await hashPassword('ThrottleMe2026'),
    full_name: 'QA Throttle', role: 'receptionist', is_active: true,
  });
  cleanup.userIds.push(user.id);

  let locked = false;
  for (let i = 0; i < ACCOUNT_MAX_FAILURES + 2; i += 1) {
    // A different forwarded IP each time: per-IP limiting alone would not stop this.
    const res = await fetch(`${base}${config.apiPrefix}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.0.${i + 1}` },
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });
    if (res.status === 429) { locked = true; break; }
  }
  assert.ok(locked, 'the account must lock after repeated failures from rotating IPs');

  // Even the correct password is refused while locked.
  const correct = await api('/auth/login', { method: 'POST', body: { email, password: 'ThrottleMe2026' } });
  assert.equal(correct.status, 429, 'a locked account must stay locked');

  resetAccountThrottle();
  const afterReset = await api('/auth/login', { method: 'POST', body: { email, password: 'ThrottleMe2026' } });
  assert.equal(afterReset.status, 200, 'the lock must be time/administratively clearable');
});

test('BUG-023: forwarding headers are not trusted by default', () => {
  assert.equal(config.trustProxy, false, 'trust proxy must be off unless a real proxy is configured');
});

/* ── BUG-034: audit trail captures what changed ─────────────────────────── */

test('BUG-034: a deletion records both the id and the prior state', async () => {
  const patient = await Patient.create({
    patient_code: `QA-AUD-${Date.now()}`,
    full_name: 'QA Audit Subject',
    gender: 'female',
    blood_group: 'O+',
    phone: '01700000999',
  });

  const res = await api(`/patients/${patient.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  // The audit write is fire-and-forget; give it a moment.
  await new Promise((r) => setTimeout(r, 400));

  const entry = await AuditLog.findOne({
    where: { action: 'delete', entity_type: 'patient', entity_id: String(patient.id) },
    order: [['id', 'DESC']],
  });
  assert.ok(entry, 'the deletion must be recorded against the specific id');
  assert.ok(entry.changes, 'a snapshot must be stored');
  const parsed = JSON.parse(entry.changes);
  assert.ok(parsed.previous, 'the prior state must be captured');
  assert.equal(parsed.previous.full_name, 'QA Audit Subject', 'the snapshot must hold the real values');
  assert.equal(parsed.previous.patient_code, patient.patient_code);

  await Patient.destroy({ where: { id: patient.id }, force: true });
});

test('BUG-034: an update records the prior state too', async () => {
  const patient = await Patient.create({
    patient_code: `QA-AUDU-${Date.now()}`,
    full_name: 'QA Before Name',
    gender: 'male',
    blood_group: 'A+',
  });

  const res = await api(`/patients/${patient.id}`, { method: 'PATCH', body: { full_name: 'QA After Name' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  await new Promise((r) => setTimeout(r, 400));

  const entry = await AuditLog.findOne({
    where: { action: 'update', entity_type: 'patient', entity_id: String(patient.id) },
    order: [['id', 'DESC']],
  });
  assert.ok(entry);
  const parsed = JSON.parse(entry.changes);
  assert.equal(parsed.previous.full_name, 'QA Before Name', 'the pre-change value must be recoverable');
  assert.equal(parsed.request.full_name, 'QA After Name', 'the requested change must be recorded');

  await Patient.destroy({ where: { id: patient.id }, force: true });
});

test('BUG-034: passwords are still redacted in the audit trail', async () => {
  const email = `qa.audit.pwd.${Date.now()}@hms-qa.com`;
  const res = await api('/users', {
    method: 'POST', body: { email, password: 'RedactMe2026', full_name: 'QA Redact', role: 'receptionist' },
  });
  assert.equal(res.status, 201);
  cleanup.userIds.push(res.body.data.id);
  await new Promise((r) => setTimeout(r, 400));

  const entry = await AuditLog.findOne({
    where: { action: 'create', entity_type: 'user' }, order: [['id', 'DESC']],
  });
  if (entry?.changes) {
    assert.ok(!entry.changes.includes('RedactMe2026'), 'the password must never be stored in the audit log');
    assert.match(entry.changes, /REDACTED/);
  }
});
