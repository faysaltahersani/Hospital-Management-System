'use strict';

// BUG-035 / BUG-036 / BUG-037 / BUG-038 regression tests.
// Verified through the full stack: service -> API -> database columns.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { sequelize, LabTest, LabOrder, LabOrderItem, RadiologyOrder, MasterOption, Patient, Invoice, InvoiceItem, Payment } = models;

let server, base, token;
const TAG = `QADX${Date.now()}`.slice(0, 18);
const cleanup = { labTestCodes: [], labOrderIds: [], optionCodes: [], radiologyRestore: [] };

const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${base}${config.apiPrefix}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
  const login = await api('/auth/login', { method: 'POST', body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' } });
  token = login.body.data.accessToken;
});

test.after(async () => {
  for (const r of cleanup.radiologyRestore) {
    await RadiologyOrder.update(
      { status: r.status, findings: r.findings, impression: r.impression, verified_by: r.verified_by, verified_at: r.verified_at, result_notes: r.result_notes },
      { where: { id: r.id } }
    );
  }
  if (cleanup.labOrderIds.length) {
    // A lab order raises a real invoice (BUG-042). Removing only the order left
    // that invoice behind, so every run of this suite added an orphaned invoice
    // with no items reconciled against it — which the DB integrity gate then
    // reported as a subtotal mismatch. Clear the billing side first.
    const billed = await Invoice.findAll({ where: { lab_order_id: cleanup.labOrderIds }, attributes: ['id'] });
    const billedIds = billed.map((i) => i.id);
    if (billedIds.length) {
      await Payment.destroy({ where: { invoice_id: billedIds }, force: true });
      await InvoiceItem.destroy({ where: { invoice_id: billedIds }, force: true });
      await Invoice.destroy({ where: { id: billedIds }, force: true });
    }
    await LabOrderItem.destroy({ where: { order_id: cleanup.labOrderIds }, force: true });
    await LabOrder.destroy({ where: { id: cleanup.labOrderIds }, force: true });
  }
  if (cleanup.labTestCodes.length) await LabTest.destroy({ where: { code: cleanup.labTestCodes }, force: true });
  if (cleanup.optionCodes.length) await MasterOption.destroy({ where: { code: cleanup.optionCodes }, force: true });
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── BUG-035: pathology field mapping ─────────────────────────────────────── */

test('BUG-035: method and reference range land in their own columns', async () => {
  const code = `${TAG}-CBC`;
  cleanup.labTestCodes.push(code);

  const res = await api('/laboratory/pathology-test-entry', {
    method: 'POST',
    body: {
      name: 'QA Full Blood Count',
      code,
      category: 'Hematology',
      test_type: 'Quantitative',
      method: 'Flow cytometry',
      sample_type: 'Whole blood EDTA',
      normal_range: '4.0-11.0 x10^9/L',
      unit: 'x10^9/L',
      base_charge: 300,
      final_charge: 350,
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));

  // Read the row straight from the database — the API response is not the proof.
  const row = await LabTest.findOne({ where: { code } });
  assert.ok(row, 'test must be persisted');
  assert.equal(row.method, 'Flow cytometry', 'method must be stored as the method');
  assert.equal(row.normal_range, '4.0-11.0 x10^9/L', 'the reference range must be the reference range, NOT the method');
  assert.equal(row.sample_type, 'Whole blood EDTA', 'sample type must not receive the test type');
  assert.equal(row.test_type, 'Quantitative');
  assert.equal(row.unit, 'x10^9/L');
  assert.notEqual(row.normal_range, row.method, 'the original bug wrote method into normal_range');
});

test('BUG-035: a test with no name is rejected', async () => {
  const res = await api('/laboratory/pathology-test-entry', { method: 'POST', body: { code: `${TAG}-NONAME` } });
  assert.ok(res.status >= 400);
});

test('BUG-035: no surviving lab test presents its method as a reference range', async () => {
  const rows = await LabTest.findAll({
    where: { method: { [Op.ne]: null }, normal_range: { [Op.ne]: null } },
  });
  const bad = rows.filter((r) => String(r.normal_range).trim() === String(r.method).trim());
  assert.equal(bad.length, 0, `these tests still show the method as a reference range: ${bad.map((b) => b.code).join(', ')}`);
});

/* ── BUG-036: external referrer id collision ──────────────────────────────── */

test('BUG-036: external referrers are namespaced, not mixed into doctor ids', async () => {
  const code = `${TAG}-REF`;
  cleanup.optionCodes.push(code);
  await MasterOption.create({ type: 'referral_doctor', code, label: 'QA External Referrer', is_active: true });

  const res = await api('/laboratory/bill-entry/meta');
  assert.equal(res.status, 200);
  const external = res.body.data.doctors.filter((d) => d.is_external);
  assert.ok(external.length >= 1, 'the external referrer must appear');
  const entry = external.find((d) => d.doctor_code === code);
  assert.ok(entry, 'our referrer must be listed');
  assert.match(String(entry.id), /^external:\d+$/, 'the id must be namespaced so it cannot collide with a doctor id');
  assert.equal(typeof entry.external_referrer_id, 'number');

  // No real doctor may share the namespaced id form.
  const realDoctors = res.body.data.doctors.filter((d) => !d.is_external);
  for (const d of realDoctors) {
    assert.equal(typeof d.id, 'number', 'real doctors keep numeric ids');
  }
});

test('BUG-036: an unknown doctor is rejected instead of silently discarded', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const res = await api('/laboratory/orders', {
    method: 'POST',
    body: { patient_id: patient.id, doctor_id: 999999, items: [{ test_id: 1 }] },
  });
  assert.ok(res.status >= 400, 'must not accept an unknown doctor');
  assert.match(JSON.stringify(res.body), /not found|must be/i);
});

test('BUG-036: a namespaced external id is never stored as doctor_id', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const res = await api('/laboratory/orders', {
    method: 'POST',
    body: { patient_id: patient.id, doctor_id: 'external:1', items: [{ test_id: 1 }] },
  });
  assert.ok(res.status >= 400, 'the namespaced form must be refused, not coerced');
});

/* ── BUG-037: order status transitions ───────────────────────────────────── */

test('BUG-037: a lab order cannot be completed while results are missing', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const created = await api('/laboratory/orders', {
    method: 'POST',
    body: { patient_id: patient.id, items: [{ test_id: 1 }, { test_id: 2 }] },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const orderId = created.body.data.id;
  cleanup.labOrderIds.push(orderId);

  const premature = await api(`/laboratory/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(premature.status, 400);
  assert.match(premature.body.message, /no result recorded/i);

  // Fill both results, then completion succeeds.
  const items = await LabOrderItem.findAll({ where: { order_id: orderId } });
  for (const item of items) {
    const r = await api(`/laboratory/orders/${orderId}/items/${item.id}/result`, {
      method: 'PATCH', body: { result_value: '5.5' },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const done = await api(`/laboratory/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(done.status, 200);
  assert.equal(done.body.data.status, 'completed');

  // And a completed order cannot be reopened.
  const reopen = await api(`/laboratory/orders/${orderId}/status`, { method: 'PATCH', body: { status: 'ordered' } });
  assert.equal(reopen.status, 400);
  assert.match(reopen.body.message, /Cannot move a lab order/i);
});

test('BUG-037: recording a lab result stores who verified it', async () => {
  const order = await LabOrder.findOne({ where: { id: cleanup.labOrderIds[0] }, include: [{ model: LabOrderItem, as: 'items' }] });
  const item = order.items[0];
  await item.reload();
  assert.ok(item.verified_by, 'verified_by must be recorded');
  assert.ok(item.verified_at, 'verified_at must be recorded');
});

test('BUG-037/038: radiology completion requires an impression', async () => {
  const order = await RadiologyOrder.findOne({ where: { status: { [Op.in]: ['ordered', 'in_progress'] } } });
  if (!order) return;
  cleanup.radiologyRestore.push({
    id: order.id, status: order.status, findings: order.findings,
    impression: order.impression, verified_by: order.verified_by,
    verified_at: order.verified_at, result_notes: order.result_notes,
  });
  await order.update({ findings: null, impression: null });

  const premature = await api(`/radiology/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(premature.status, 400);
  assert.match(premature.body.message, /impression/i);
});

test('BUG-038: findings and impression are stored separately', async () => {
  const order = await RadiologyOrder.findOne({ where: { status: { [Op.in]: ['ordered', 'in_progress'] } } });
  if (!order) return;
  if (!cleanup.radiologyRestore.some((r) => r.id === order.id)) {
    cleanup.radiologyRestore.push({
      id: order.id, status: order.status, findings: order.findings,
      impression: order.impression, verified_by: order.verified_by,
      verified_at: order.verified_at, result_notes: order.result_notes,
    });
  }

  const res = await api(`/radiology/orders/${order.id}/result`, {
    method: 'PATCH',
    body: { findings: 'Right lower lobe consolidation', impression: 'Community-acquired pneumonia' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  await order.reload();
  assert.equal(order.findings, 'Right lower lobe consolidation');
  assert.equal(order.impression, 'Community-acquired pneumonia');
  assert.notEqual(order.findings, order.impression, 'they are clinically distinct and must not be collapsed');

  // Now completion is allowed and records the verifier.
  const done = await api(`/radiology/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(done.status, 200);
  await order.reload();
  assert.equal(order.status, 'completed');
  assert.ok(order.verified_by, 'the completing user must be recorded');
  assert.ok(order.verified_at);

  const reopen = await api(`/radiology/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'ordered' } });
  assert.equal(reopen.status, 400, 'a completed report must not be reopened silently');
});

test('BUG-038: the report endpoint exposes findings and impression', async () => {
  const order = await RadiologyOrder.findOne({ where: { impression: { [Op.ne]: null } } });
  if (!order) return;
  const res = await api(`/radiology/orders/${order.id}/report`);
  assert.equal(res.status, 200);
  const payload = JSON.stringify(res.body.data);
  assert.match(payload, /findings/, 'the report payload must carry findings');
  assert.match(payload, /impression/, 'the report payload must carry impression');
});

/* ── BUG-037: diagnostic billing fields reach the invoice ─────────────────── */

test('BUG-037: lab bill discount and tax are persisted on the invoice', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const created = await api('/laboratory/orders', {
    method: 'POST',
    body: {
      patient_id: patient.id,
      items: [{ test_id: 1 }],
      discount_percent: 10,
      tax_rate: 5,
      payments: [{ account_name: 'Cash', amount: 50 }],
    },
  });
  assert.equal(created.status, 201);
  cleanup.labOrderIds.push(created.body.data.id);

  const invoice = await models.Invoice.findOne({ where: { lab_order_id: created.body.data.id } });
  assert.ok(invoice, 'the lab bill must raise an invoice');
  assert.ok(Number(invoice.discount) > 0, 'the discount entered must be stored, not dropped');
  assert.ok(Number(invoice.tax) > 0, 'the tax entered must be stored, not dropped');
  assert.equal(Number(invoice.paid_amount), 50);
  assert.ok(
    Math.abs(Number(invoice.total) - (Number(invoice.subtotal) - Number(invoice.discount) + Number(invoice.tax))) < 0.011,
    'the invoice must be internally consistent'
  );

  await models.Payment.destroy({ where: { invoice_id: invoice.id }, force: true });
  await models.InvoiceItem.destroy({ where: { invoice_id: invoice.id }, force: true });
  await models.Invoice.destroy({ where: { id: invoice.id }, force: true });
});
