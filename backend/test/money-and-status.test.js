'use strict';

// Regression tests for:
//   BUG-054 — money must not depend on JavaScript floating point
//   BUG-039 — invoice status/paid_amount are derived from payment records only
//   BUG-033 — the patient-balance report must not fan out into per-row queries
//
// Everything these tests create is removed in the `after` hook, so the suite is
// repeatable against a live database.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');

const app = require('../src/app');
const config = require('../src/config');
const money = require('../src/utils/money');
const { sequelize, Invoice, InvoiceItem, Payment, Patient } = require('../src/models');
const reportsRepo = require('../src/modules/reports/reports.repository');
const reportsService = require('../src/modules/reports/reports.service');

let server;
let base;
let token;
let patientId;
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

const makeInvoice = async (unitPrice, quantity = 1, extra = {}) => {
  const res = await api('/billing/invoices', {
    method: 'POST',
    body: {
      patient_id: patientId,
      items: [{ item_type: 'other', description: 'money regression', quantity, unit_price: unitPrice }],
      ...extra,
    },
  });
  if (res.status === 201) createdInvoiceIds.push(res.body.data.id);
  return res;
};

test.before(async () => {
  await sequelize.authenticate();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' },
  });
  assert.equal(login.status, 200, 'admin login must succeed');
  token = login.body.data.accessToken;
  const patient = await Patient.findOne({ order: [['id', 'ASC']] });
  assert.ok(patient, 'a patient is required for these tests');
  patientId = patient.id;
});

test.after(async () => {
  if (createdInvoiceIds.length) {
    await Payment.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await InvoiceItem.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await Invoice.destroy({ where: { id: createdInvoiceIds }, force: true });
  }
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── BUG-054: money primitives ──────────────────────────────────────────── */

test('BUG-054: addition is exact where float addition is not', () => {
  assert.equal(0.1 + 0.2 === 0.3, false, 'precondition: float addition is inexact');
  assert.equal(money.add('0.10', '0.20'), 0.3);
  assert.equal(money.add('0.07', '0.07', '0.07'), 0.21);
  assert.equal(money.eq(money.add('0.10', '0.20'), '0.30'), true);
});

test('BUG-054: percentage and quantity maths round half-up at the cent', () => {
  assert.equal(money.percentOf('1000', 5), 50);
  assert.equal(money.percentOf('33.33', 10), 3.33);
  assert.equal(money.mulQty('10.10', 2.5), 25.25);
  assert.equal(money.mulQty('0.07', 3), 0.21);
});

test('BUG-054: a discount/tax chain stays exact', () => {
  const afterDiscount = money.sub(1200, money.percentOf(1200, 10));
  assert.equal(afterDiscount, 1080);
  assert.equal(money.add(afterDiscount, money.percentOf(afterDiscount, 5)), 1134);
});

test('BUG-054: DECIMAL strings are parsed without passing through a float', () => {
  assert.equal(money.toMinor('1234567890.05'), 123456789005);
  assert.equal(money.add('1234567890.05', '0.05'), 1234567890.1);
});

test('BUG-054: the third decimal rounds half-up and negatives keep their sign', () => {
  assert.equal(money.toMinor('1.005'), 101);
  assert.equal(money.toMinor('1.004'), 100);
  assert.equal(money.toMinor('-12.34'), -1234);
  assert.equal(money.sub(0, '12.34'), -12.34);
});

test('BUG-054: null, undefined and empty values are zero, not NaN', () => {
  assert.equal(money.add(null, undefined, '', 5), 5);
  assert.equal(money.toMinor(null), 0);
  assert.equal(money.isZero(undefined), true);
});

test('BUG-054: subFloor never returns a negative balance', () => {
  assert.equal(money.subFloor('100', '250'), 0);
  assert.equal(money.subFloor('250', '100'), 150);
});

test('BUG-054: format never emits float artefacts', () => {
  assert.equal(money.format('1234.5'), '1234.50');
  assert.equal(money.format(0.1 + 0.2), '0.30');
});

/* ── BUG-054: money through the HTTP layer ──────────────────────────────── */

test('BUG-054: invoice totals satisfy subtotal - discount + tax = total exactly', async () => {
  const res = await api('/billing/invoices', {
    method: 'POST',
    body: {
      patient_id: patientId,
      discount: 10.005,
      tax: 5.005,
      items: [{ item_type: 'other', description: 'precision', quantity: 3, unit_price: 33.33 }],
    },
  });
  assert.equal(res.status, 201);
  createdInvoiceIds.push(res.body.data.id);
  const d = res.body.data;
  assert.equal(Number(d.subtotal), 99.99);
  assert.equal(money.add(money.sub(d.subtotal, d.discount), d.tax), Number(d.total));
});

test('BUG-054: an exact final payment of a float-unfriendly total is accepted', async () => {
  const inv = await makeInvoice(0.07, 3);
  assert.equal(Number(inv.body.data.total), 0.21);
  const id = inv.body.data.id;
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pay = await api('/billing/payments', {
      method: 'POST',
      body: { invoice_id: id, amount: 0.07, method: 'cash' },
    });
    assert.equal(pay.status, 201, `payment ${i + 1} of 0.07 must be accepted`);
  }
  const after = await api(`/billing/invoices/${id}`);
  assert.equal(Number(after.body.data.paid_amount), 0.21);
  assert.equal(after.body.data.status, 'paid');
});

/* ── BUG-039: derived invoice status ────────────────────────────────────── */

test('BUG-039: a new invoice cannot be created already paid', async () => {
  const res = await makeInvoice(500, 1, { status: 'paid' });
  assert.equal(res.status, 422, 'a client-supplied status must be rejected');
  const clean = await makeInvoice(500);
  assert.equal(clean.body.data.status, 'sent');
  assert.equal(Number(clean.body.data.paid_amount), 0);
});

test('BUG-039: PATCH cannot set a payment-derived status', async () => {
  const inv = await makeInvoice(1000);
  const id = inv.body.data.id;
  for (const status of ['paid', 'partially_paid', 'overdue', 'draft', 'sent']) {
    // eslint-disable-next-line no-await-in-loop
    const res = await api(`/billing/invoices/${id}`, { method: 'PATCH', body: { status } });
    assert.equal(res.status, 422, `status=${status} must be rejected`);
  }
  const after = await api(`/billing/invoices/${id}`);
  assert.equal(after.body.data.status, 'sent', 'no forged status may reach the database');
  assert.equal(Number(after.body.data.paid_amount), 0);
});

test('BUG-039: status follows the payment records through every stage', async () => {
  const inv = await makeInvoice(1000);
  const id = inv.body.data.id;

  const partial = await api('/billing/payments', {
    method: 'POST',
    body: { invoice_id: id, amount: 400, method: 'cash' },
  });
  assert.equal(partial.status, 201);
  let now = await api(`/billing/invoices/${id}`);
  assert.equal(now.body.data.status, 'partially_paid');
  assert.equal(Number(now.body.data.paid_amount), 400);

  const settle = await api('/billing/payments', {
    method: 'POST',
    body: { invoice_id: id, amount: 600, method: 'cash' },
  });
  assert.equal(settle.status, 201);
  now = await api(`/billing/invoices/${id}`);
  assert.equal(now.body.data.status, 'paid');
  assert.equal(Number(now.body.data.paid_amount), 1000);

  const over = await api('/billing/payments', {
    method: 'POST',
    body: { invoice_id: id, amount: 0.01, method: 'cash' },
  });
  assert.equal(over.status, 400, 'overpayment must be refused');
  now = await api(`/billing/invoices/${id}`);
  assert.equal(Number(now.body.data.paid_amount), 1000, 'a refused payment must not change paid_amount');

  // Deleting a payment must recompute from what remains.
  const payments = await Payment.findAll({ where: { invoice_id: id }, order: [['id', 'ASC']] });
  const del = await api(`/billing/payments/${payments[0].id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  now = await api(`/billing/invoices/${id}`);
  assert.equal(Number(now.body.data.paid_amount), 600);
  assert.equal(now.body.data.status, 'partially_paid');
});

test('BUG-039: void is allowed only while no payment exists', async () => {
  const paidInv = await makeInvoice(300);
  const paidId = paidInv.body.data.id;
  await api('/billing/payments', { method: 'POST', body: { invoice_id: paidId, amount: 100, method: 'cash' } });
  const refused = await api(`/billing/invoices/${paidId}`, { method: 'PATCH', body: { status: 'void' } });
  assert.equal(refused.status, 400, 'voiding an invoice with payments must be refused');
  assert.match(refused.body.message, /already been paid/i);

  const cleanInv = await makeInvoice(300);
  const allowed = await api(`/billing/invoices/${cleanInv.body.data.id}`, {
    method: 'PATCH',
    body: { status: 'void' },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.data.status, 'void');
});

test('BUG-039: every live invoice agrees with its payment records', async () => {
  const [rows] = await sequelize.query(
    `SELECT i.id, i.total, i.paid_amount, i.status,
            COALESCE((SELECT SUM(p.amount) FROM payments p
                       WHERE p.invoice_id = i.id AND p.deleted_at IS NULL), 0) AS real_paid
       FROM invoices i
      WHERE i.deleted_at IS NULL AND i.status <> 'void'`
  );
  const drift = rows.filter((r) => !money.eq(r.paid_amount, r.real_paid));
  assert.equal(drift.length, 0, `invoices whose paid_amount is not backed by payments: ${JSON.stringify(drift)}`);

  const wrongStatus = rows.filter((r) => {
    const expected = money.isZero(r.real_paid)
      ? 'sent'
      : money.gte(r.real_paid, r.total) ? 'paid' : 'partially_paid';
    // 'draft' and 'overdue' are lifecycle states outside the payment derivation.
    return !['draft', 'overdue'].includes(r.status) && r.status !== expected;
  });
  assert.equal(wrongStatus.length, 0, `invoices whose status is not derivable: ${JSON.stringify(wrongStatus)}`);
});

/* ── BUG-033: bounded query cost ────────────────────────────────────────── */

test('BUG-033: patient-balance query count does not grow with page size', async () => {
  let queries = 0;
  const original = sequelize.query.bind(sequelize);
  sequelize.query = (...args) => { queries += 1; return original(...args); };
  try {
    queries = 0;
    const small = await reportsService.patientBalance({ limit: 1 });
    const smallCount = queries;

    queries = 0;
    const large = await reportsService.patientBalance({ limit: 200 });
    const largeCount = queries;

    assert.ok(large.data.length >= small.data.length);
    assert.equal(smallCount, largeCount, 'query count must be identical for 1 row and a full page');
    assert.ok(largeCount <= 6, `expected a small constant number of queries, got ${largeCount}`);
  } finally {
    sequelize.query = original;
  }
});

test('BUG-033: an excessive limit is rejected at the boundary and clamped in the service', async () => {
  const rejected = await api('/reports/patient-balance?limit=100000');
  assert.equal(rejected.status, 422);
  const atCap = await api('/reports/patient-balance?limit=200');
  assert.equal(atCap.status, 200);
  assert.equal(atCap.body.meta.pagination.limit, 200);
  const clamped = await reportsService.patientBalance({ limit: 100000 });
  assert.equal(clamped.meta.pagination.limit, 200, 'the service must clamp independently of the schema');
});

test('BUG-033: aggregated balances match an independent SQL computation', async () => {
  const report = await reportsService.patientBalance({ limit: 200 });
  for (const row of report.data) {
    // eslint-disable-next-line no-await-in-loop
    const [[truth]] = await sequelize.query(
      `SELECT
         COALESCE((SELECT SUM(total) FROM invoices
                    WHERE patient_id = ? AND deleted_at IS NULL AND status <> 'void'), 0) AS debit,
         COALESCE((SELECT SUM(p.amount) FROM payments p JOIN invoices i ON i.id = p.invoice_id
                    WHERE i.patient_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL
                      AND i.status <> 'void'), 0) AS credit`,
      { replacements: [row.id, row.id] }
    );
    assert.ok(money.eq(truth.debit, row.debit), `patient ${row.id} debit ${row.debit} != SQL ${truth.debit}`);
    assert.ok(money.eq(truth.credit, row.credit), `patient ${row.id} credit ${row.credit} != SQL ${truth.credit}`);
    assert.ok(money.eq(money.sub(truth.debit, truth.credit), row.balance), `patient ${row.id} balance mismatch`);
  }
});

test('BUG-033: pagination edges behave (page 1, page 2, last page, past the end, empty filter)', async () => {
  const total = (await reportsService.patientBalance({ limit: 1 })).meta.pagination.total;
  const pageSize = 3;
  const lastPage = Math.ceil(total / pageSize) || 1;

  const p1 = await reportsService.patientBalance({ limit: pageSize, page: 1 });
  const p2 = await reportsService.patientBalance({ limit: pageSize, page: 2 });
  assert.equal(p1.meta.pagination.total, total);
  assert.equal(p1.meta.pagination.total_pages, lastPage);
  assert.equal(p2.meta.pagination.page, 2);
  if (total > pageSize) assert.notEqual(p1.data[0].id, p2.data[0].id);

  const last = await reportsService.patientBalance({ limit: pageSize, page: lastPage });
  assert.ok(last.data.length > 0 && last.data.length <= pageSize);

  const beyond = await reportsService.patientBalance({ limit: pageSize, page: lastPage + 25 });
  assert.equal(beyond.data.length, 0);
  assert.equal(beyond.meta.pagination.total, total);

  const empty = await reportsService.patientBalance({ limit: 10, search: '___nobody_matches_this___' });
  assert.equal(empty.data.length, 0);
  assert.equal(empty.meta.totals.balance, 0);
});

test('BUG-033: the aggregate helper returns a bounded query count for a whole page', async () => {
  const { rows } = await reportsRepo.getPatientsList({ page: 1, limit: 200 });
  const ids = rows.map((r) => r.id);
  let queries = 0;
  const original = sequelize.query.bind(sequelize);
  sequelize.query = (...args) => { queries += 1; return original(...args); };
  try {
    await reportsRepo.patientBalanceAggregates(ids, { from: '2026-01-01', to: '2026-12-31' }, '2026-01-01');
  } finally {
    sequelize.query = original;
  }
  assert.ok(queries <= 4, `${ids.length} patients must cost at most 4 queries, spent ${queries}`);
});
