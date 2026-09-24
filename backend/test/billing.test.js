'use strict';

// BUG-042 / BUG-004 regression tests: every revenue stream must produce a real
// invoice with server-computed money, and must roll back cleanly on failure.
// Each test removes the records it creates so the suite is repeatable.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { sequelize, Invoice, InvoiceItem, Payment, Patient, Doctor } = models;
const { resolveTotals, normalizePaymentMethod } = require('../src/utils/encounterBilling');

let server;
let base;
let token;
const createdInvoiceIds = [];

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

const invoiceFor = async (where) => Invoice.findOne({ where, include: [{ model: InvoiceItem, as: 'items' }, { model: Payment, as: 'payments' }] });

const track = (inv) => { if (inv) createdInvoiceIds.push(inv.id); return inv; };

test.before(async () => {
  await sequelize.authenticate();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/auth/login', { method: 'POST', body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' } });
  assert.equal(login.status, 200, 'admin login must succeed for billing tests');
  token = login.body.data.accessToken;
});

test.after(async () => {
  // Remove only what these tests created.
  if (createdInvoiceIds.length) {
    await Payment.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await InvoiceItem.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await Invoice.destroy({ where: { id: createdInvoiceIds }, force: true });
  }
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── pure money maths ───────────────────────────────────────────────── */

test('BUG-042: totals are computed, not taken from the client', () => {
  const t = resolveTotals({
    lines: [{ item_type: 'lab_test', description: 'A', quantity: 2, unit_price: 100 }],
    discount_percent: 10,
    tax_rate: 5,
  });
  assert.equal(t.subtotal, 200);
  assert.equal(t.discount, 20);
  assert.equal(t.tax, 9); // 5% of 180
  assert.equal(t.total, 189);
});

test('BUG-042: absolute discount and tax take precedence over percentages', () => {
  const t = resolveTotals({
    lines: [{ item_type: 'other', description: 'X', unit_price: 1000 }],
    discount: 250,
    discount_percent: 90,
    tax: 30,
    tax_rate: 99,
  });
  assert.equal(t.discount, 250);
  assert.equal(t.tax, 30);
  assert.equal(t.total, 780);
});

test('BUG-042: a discount above the subtotal is rejected', () => {
  assert.throws(
    () => resolveTotals({ lines: [{ item_type: 'other', description: 'X', unit_price: 100 }], discount: 500 }),
    /cannot exceed the subtotal/
  );
});

test('BUG-042: negative money is rejected', () => {
  assert.throws(() => resolveTotals({ lines: [{ item_type: 'other', description: 'X', unit_price: -5 }] }), /negative/);
  assert.throws(
    () => resolveTotals({ lines: [{ item_type: 'other', description: 'X', unit_price: 10 }], tax: -1 }),
    /Tax cannot be negative/
  );
});

test('BUG-030/042: UI account labels map onto the payment enum', () => {
  assert.equal(normalizePaymentMethod('Bkash'), 'mobile_banking');
  assert.equal(normalizePaymentMethod('Bank Transfer'), 'bank_transfer');
  assert.equal(normalizePaymentMethod('cash account'), 'cash');
  assert.equal(normalizePaymentMethod('Cheque'), 'cheque');
  assert.equal(normalizePaymentMethod('nonsense'), 'cash');
  assert.equal(normalizePaymentMethod('insurance'), 'insurance');
});

/* ── laboratory ─────────────────────────────────────────────────────── */

test('BUG-042: a lab order raises an invoice with a real receivable', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const res = await api('/laboratory/orders', {
    method: 'POST',
    body: {
      patient_id: patient.id,
      items: [{ test_id: 1 }, { test_id: 2 }],
      discount_percent: 10,
      tax_rate: 5,
      payments: [{ account_name: 'Cash', amount: 200 }],
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const orderId = res.body.data.id;

  const inv = track(await invoiceFor({ lab_order_id: orderId }));
  assert.ok(inv, 'lab order must produce an invoice');
  const subtotal = Number(inv.subtotal);
  assert.equal(Number(inv.discount), Math.round(subtotal * 10) / 100);
  assert.equal(Number(inv.paid_amount), 200);
  assert.ok(Number(inv.total) > Number(inv.paid_amount), 'a part payment must leave a receivable');
  assert.equal(inv.status, 'partially_paid');
  assert.equal(inv.items.length, 2);
  assert.equal(inv.items[0].item_type, 'lab_test');
  assert.equal(inv.payments.length, 1);
  assert.equal(inv.payments[0].method, 'cash');

  await models.LabOrderItem.destroy({ where: { order_id: orderId }, force: true });
  await models.LabOrder.destroy({ where: { id: orderId }, force: true });
});

/* ── radiology ──────────────────────────────────────────────────────── */

test('BUG-042: a radiology bill raises one invoice covering every test', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const res = await api('/radiology/bill-entry', {
    method: 'POST',
    body: {
      patient_id: patient.id,
      items: [{ test_id: 1 }],
      payments: [{ account_name: 'Bkash', amount: 100 }],
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.data.invoice_code, 'response must expose the invoice');
  assert.ok(res.body.data.due_amount > 0, 'a part payment must leave a due amount');

  const inv = track(await invoiceFor({ id: res.body.data.invoice_id }));
  assert.equal(inv.items[0].item_type, 'radiology');
  assert.equal(inv.payments[0].method, 'mobile_banking');

  const orderIds = res.body.data.orders.map((o) => o.id);
  await models.RadiologyOrder.destroy({ where: { id: orderIds }, force: true });
});

/* ── ambulance ──────────────────────────────────────────────────────── */

test('BUG-042/BUG-020: an ambulance call dispatches safely and bills', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const amb = await models.Ambulance.findOne({ where: { status: 'available', deleted_at: null } });
  assert.ok(amb, 'fixture: an available ambulance is required');

  const res = await api('/ambulance/calls', {
    method: 'POST',
    body: { ambulance_id: amb.id, patient_id: patient.id, case_text: 'QA test call', total_amount: 1500 },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const trip = res.body.data;
  assert.match(trip.trip_code, /^TRIP-\d{4}-\d{6}$/, 'must use the standard sequenced code, not a timestamp');

  await amb.reload();
  assert.equal(amb.status, 'on_trip', 'the vehicle must be marked on trip');

  // A second call for the same vehicle must be refused.
  const second = await api('/ambulance/calls', {
    method: 'POST',
    body: { ambulance_id: amb.id, patient_id: patient.id, case_text: 'QA duplicate', total_amount: 900 },
  });
  assert.equal(second.status, 409, 'double-booking a vehicle must be rejected');

  const inv = track(await invoiceFor({ ambulance_trip_id: trip.id }));
  assert.ok(inv, 'a priced trip must raise an invoice');
  assert.equal(Number(inv.total), 1500);
  assert.equal(inv.items[0].item_type, 'ambulance');

  await models.AmbulanceTrip.destroy({ where: { id: trip.id }, force: true });
  await amb.update({ status: 'available' });
});

/* ── blood bank ─────────────────────────────────────────────────────── */

test('BUG-042: a priced blood issue raises an invoice', async () => {
  const bags = await models.BloodBag.findAll({ where: { status: 'available', price: { [Op.gt]: 0 } } });
  let pair = null;
  for (const bag of bags) {
    const p = await Patient.findOne({ where: { blood_group: bag.blood_group, deleted_at: null } });
    if (p) { pair = { bag, patient: p }; break; }
  }
  if (!pair) return; // no compatible fixture

  const original = pair.bag.screening_status;
  await pair.bag.update({ screening_status: 'passed' });
  try {
    const res = await api('/blood-bank/issues', {
      method: 'POST',
      body: { bag_id: pair.bag.id, patient_id: pair.patient.id, payments: [{ account_name: 'Cash', amount: 300 }] },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const issue = res.body.data;

    const inv = track(await invoiceFor({ blood_issue_id: issue.id }));
    assert.ok(inv, 'a priced blood issue must raise an invoice');
    assert.equal(Number(inv.paid_amount), 300, 'counter collection must be recorded');
    assert.ok(Number(inv.total) > 300, 'the balance must remain a receivable');

    await models.BloodIssue.destroy({ where: { id: issue.id }, force: true });
  } finally {
    await pair.bag.update({ status: 'available', screening_status: original });
  }
});

/* ── rollback ───────────────────────────────────────────────────────── */

test('BUG-042: a failed lab order creates no orphan invoice', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const before = await Invoice.count();
  const res = await api('/laboratory/orders', {
    method: 'POST',
    body: { patient_id: patient.id, items: [{ test_id: 999999 }] },
  });
  assert.ok(res.status >= 400, 'an unknown test must fail the request');
  assert.equal(await Invoice.count(), before, 'no invoice may survive a rolled-back order');
});

test('BUG-042: overpayment is refused before anything is written', async () => {
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const before = await Invoice.count();
  const res = await api('/laboratory/orders', {
    method: 'POST',
    body: { patient_id: patient.id, items: [{ test_id: 1 }], payments: [{ account_name: 'Cash', amount: 999999 }] },
  });
  assert.ok(res.status >= 400);
  assert.match(res.body.message, /exceed/i);
  assert.equal(await Invoice.count(), before);
});
