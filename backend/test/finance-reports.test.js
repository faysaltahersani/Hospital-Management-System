'use strict';

// BUG-029 / BUG-031 / BUG-032 regression tests.
// Every assertion is cross-checked against the database, not against another
// report — HTTP 200 and self-consistency are not evidence of correctness.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op, fn, col, literal } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { sequelize, Invoice, InvoiceItem, Payment, Patient, Expense, MedicineSale } = models;

let server, base, token;
const createdInvoiceIds = [];
const createdVisitIds = [];

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

const localToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

test.before(async () => {
  await sequelize.authenticate();
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await api('/auth/login', { method: 'POST', body: { email: 'admin@hospital.local', password: 'HmsQaAdmin2026x' } });
  assert.equal(login.status, 200);
  token = login.body.data.accessToken;
});

test.after(async () => {
  if (createdInvoiceIds.length) {
    await Payment.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await InvoiceItem.destroy({ where: { invoice_id: createdInvoiceIds }, force: true });
    await Invoice.destroy({ where: { id: createdInvoiceIds }, force: true });
  }
  if (createdVisitIds.length) {
    await models.OpdVisit.destroy({ where: { id: createdVisitIds }, force: true });
  }
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── BUG-029: dashboard tiles are computed, not hardcoded ─────────────────── */

test('BUG-029: dashboard module tiles match the database', async () => {
  const today = localToday();

  // Bill an OPD visit today so the tiles have something to report.
  const created = await api('/opd/bills', {
    method: 'POST',
    body: {
      patient_id: (await Patient.findOne({ where: { deleted_at: null } })).id,
      doctor_id: 1,
      consultation_fee: 1000,
      discount_percent: 10,
      payments: [{ account_name: 'Bkash', amount: 400 }],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  createdVisitIds.push(created.body.data.id);
  const invoice = await Invoice.findOne({ where: { opd_visit_id: created.body.data.id } });
  createdInvoiceIds.push(invoice.id);

  const res = await api('/reports/dashboard');
  assert.equal(res.status, 200);
  const tiles = res.body.data.today_billing;

  // Ground truth straight from the invoice table for the same local day.
  const { startInstant, endInstant } = require('../src/utils/timeRange');
  const [truth] = await Invoice.findAll({
    attributes: [
      [fn('COUNT', col('id')), 'count'],
      [fn('SUM', col('total')), 'amount'],
      [fn('SUM', col('paid_amount')), 'paid'],
    ],
    where: {
      opd_visit_id: { [Op.ne]: null },
      status: { [Op.ne]: 'void' },
      issued_at: { [Op.gte]: startInstant(today, config.timezone), [Op.lte]: endInstant(today, config.timezone) },
    },
    raw: true,
  });

  assert.equal(tiles.opd.count, Number(truth.count), 'OPD tile count must match the database');
  assert.equal(tiles.opd.amount, Number(truth.amount), 'OPD tile amount must match the database');
  assert.equal(tiles.opd.paid, Number(truth.paid), 'OPD tile collected must match the database');
  assert.ok(tiles.opd.amount > 0, 'the tile must be non-zero when billing exists (it used to be hardcoded 0)');
});

test('BUG-029: every module tile key is present and numeric', async () => {
  const res = await api('/reports/dashboard');
  const tiles = res.body.data.today_billing;
  for (const key of ['opd', 'ipd', 'pathology', 'radiology', 'pharmacy', 'ambulance', 'appointment', 'blood']) {
    assert.ok(tiles[key], `${key} tile must exist`);
    assert.equal(typeof tiles[key].amount, 'number');
    assert.equal(typeof tiles[key].count, 'number');
  }
});

test('BUG-029: collections are split by real payment method, not all cash', async () => {
  const res = await api('/reports/dashboard');
  const accounts = res.body.data.accounts;

  const rows = await Payment.findAll({
    attributes: ['method', [fn('SUM', col('amount')), 'total']],
    group: ['method'],
    raw: true,
  });
  const truth = { cash: 0, bank: 0 };
  for (const r of rows) {
    if (r.method === 'cash') truth.cash += Number(r.total);
    else if (r.method === 'bank_transfer' || r.method === 'cheque') truth.bank += Number(r.total);
  }
  assert.equal(accounts.cash, truth.cash, 'cash must match the database');
  assert.equal(accounts.bank, truth.bank, 'bank must match the database');
  // The Bkash payment above must land in mobile_banking, not cash.
  assert.ok(accounts.mobile_banking >= 400, 'mobile banking collections must be reported separately');
});

test('BUG-029: monthly billing matches the database for the current month', async () => {
  const today = localToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const { startInstant, endInstant } = require('../src/utils/timeRange');

  const res = await api('/reports/dashboard');
  const monthly = res.body.data.monthly_billing;

  const [truth] = await Invoice.findAll({
    attributes: [[fn('SUM', col('total')), 'amount']],
    where: {
      opd_visit_id: { [Op.ne]: null },
      status: { [Op.ne]: 'void' },
      issued_at: { [Op.gte]: startInstant(monthStart, config.timezone), [Op.lte]: endInstant(today, config.timezone) },
    },
    raw: true,
  });
  assert.equal(monthly.opd, Number(truth.amount || 0));
});

/* ── BUG-031: one debit/credit convention everywhere ──────────────────────── */

test('BUG-031: daily ledger and account ledger agree for the same period', async () => {
  const range = 'from=2026-07-26&to=2026-07-26';
  const daily = await api(`/reports/daily-ledger?${range}`);
  const account = await api(`/reports/account-ledger?${range}`);
  assert.equal(daily.status, 200);
  assert.equal(account.status, 200);

  assert.equal(daily.body.data.totals.debit, account.body.data.totals.debit, 'debit must match');
  assert.equal(daily.body.data.totals.credit, account.body.data.totals.credit, 'credit must match');
  assert.equal(
    daily.body.data.totals.closing_balance,
    account.body.data.totals.closing_balance,
    'closing balance must match — these two reports used opposite conventions'
  );
  assert.equal(daily.body.data.convention, account.body.data.convention);
});

test('BUG-031: money in is a debit and money out is a credit, matching the DB', async () => {
  const range = { from: '2026-07-26', to: '2026-07-26' };
  const res = await api(`/reports/daily-ledger?from=${range.from}&to=${range.to}`);
  const { startInstant, endInstant, calendarDate } = require('../src/utils/timeRange');

  const [pay] = await Payment.findAll({
    attributes: [[fn('SUM', col('amount')), 'total']],
    where: { paid_at: { [Op.gte]: startInstant(range.from, config.timezone), [Op.lte]: endInstant(range.to, config.timezone) } },
    raw: true,
  });
  const [exp] = await Expense.findAll({
    attributes: [[fn('SUM', col('amount')), 'total']],
    where: { expense_date: { [Op.gte]: calendarDate(range.from, config.timezone), [Op.lte]: calendarDate(range.to, config.timezone) } },
    raw: true,
  });

  assert.equal(res.body.data.totals.debit, Number(pay.total || 0), 'receipts must be the debit total');
  assert.equal(res.body.data.totals.credit, Number(exp.total || 0), 'expenses must be the credit total');
});

test('BUG-031: patient ledger uses the receivable convention', async () => {
  const res = await api('/reports/patient-ledger?patient_id=1');
  assert.equal(res.status, 200);
  assert.match(res.body.data.convention, /invoice = debit/);
  for (const e of res.body.data.entries) {
    if (e.voucher_type === 'Invoice') assert.ok(e.debit >= 0 && e.credit === 0);
    if (e.voucher_type === 'Payment') assert.ok(e.credit >= 0 && e.debit === 0);
  }
});

/* ── BUG-032: opening balances ────────────────────────────────────────────── */

test('BUG-032: a later period carries the earlier balance forward', async () => {
  // All seeded activity is in July; query August only.
  const res = await api('/reports/daily-ledger?from=2026-08-01&to=2026-08-31');
  assert.equal(res.status, 200);
  const opening = res.body.data.opening_balance;

  const { startInstant, calendarDate } = require('../src/utils/timeRange');
  const boundary = startInstant('2026-08-01', config.timezone);
  const [pay] = await Payment.findAll({
    attributes: [[fn('SUM', col('amount')), 'total']],
    where: { paid_at: { [Op.lt]: boundary } }, raw: true,
  });
  const [exp] = await Expense.findAll({
    attributes: [[fn('SUM', col('amount')), 'total']],
    where: { expense_date: { [Op.lt]: calendarDate('2026-08-01', config.timezone) } }, raw: true,
  });
  const expected = Number(pay.total || 0) - Number(exp.total || 0);

  assert.equal(opening, expected, 'opening must equal prior receipts minus prior expenses');
  assert.notEqual(opening, 0, 'opening must not be the old hardcoded zero');
  assert.equal(
    res.body.data.totals.closing_balance,
    opening + res.body.data.totals.debit - res.body.data.totals.credit,
    'closing must build on the opening balance'
  );
});

test('BUG-032: a patient with prior dues is not reported as owing nothing', async () => {
  // Create an invoice dated in the past, then query a later window only.
  const patient = await Patient.findOne({ where: { deleted_at: null } });
  const inv = await Invoice.create({
    invoice_code: `INV-QA-OPEN-${Date.now()}`,
    patient_id: patient.id,
    issued_at: new Date('2026-06-15T06:00:00Z'),
    subtotal: 5000, discount: 0, tax: 0, total: 5000, paid_amount: 0,
    status: 'sent',
  });
  createdInvoiceIds.push(inv.id);

  const res = await api(`/reports/patient-ledger?patient_id=${patient.id}&from=2026-08-01&to=2026-08-31`);
  assert.equal(res.status, 200);
  assert.ok(
    res.body.data.opening_balance >= 5000,
    `the ৳5,000 June due must appear as opening (got ${res.body.data.opening_balance})`
  );

  const bal = await api(`/reports/patient-balance?patient_id=${patient.id}&from=2026-08-01&to=2026-08-31`);
  const row = bal.body.data.find((r) => String(r.id) === String(patient.id));
  assert.ok(row.opening >= 5000, 'patient balance must carry the opening too');
  assert.ok(row.balance >= 5000, 'the filtered balance must include prior dues');
});

test('BUG-032: no date filter means no opening balance', async () => {
  const res = await api('/reports/daily-ledger');
  assert.equal(res.body.data.opening_balance, 0, 'without a from date there is nothing to carry in');
});

test('BUG-032: account balance carries an opening per account', async () => {
  const res = await api('/reports/account-balance?from=2026-08-01&to=2026-08-31');
  assert.equal(res.status, 200);
  const cash = res.body.data.find((a) => a.account_id === 'cash');
  assert.ok(cash, 'cash account must be present');
  assert.equal(typeof cash.opening, 'number');
  assert.equal(cash.balance, cash.opening + cash.debit - cash.credit, 'balance must build on opening');
});
