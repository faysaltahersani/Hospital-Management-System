'use strict';

// BUG-016 regression tests: finance filtering, search, sorting and pagination
// must all happen in SQL BEFORE pagination. The original defect fetched one page
// and filtered it in JavaScript, so any record past page one was invisible to
// search and date filters, and `total` was the filtered length of a single page.
//
// The suite seeds its own dataset spanning three months and removes it afterwards.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const { sequelize, IncomeEntry, ContraEntry, MasterOption } = require('../src/models');

let server, base, token;
const TAG = `QA016-${Date.now()}`;
const SEEDED = 60;

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

  // Three months, ascending amounts, uniquely taggable notes.
  const rows = [];
  for (let i = 1; i <= SEEDED; i += 1) {
    const month = 6 + (i % 3);
    const day = (i % 28) + 1;
    rows.push({
      income_code: `${TAG}-${String(i).padStart(3, '0')}`,
      amount: 1000 + i,
      income_date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      note: `${TAG} note ${i}`,
    });
  }
  await IncomeEntry.bulkCreate(rows);
});

test.after(async () => {
  await IncomeEntry.destroy({ where: { income_code: { [Op.like]: `${TAG}%` } }, force: true });
  await ContraEntry.destroy({ where: { contra_code: { [Op.like]: `${TAG}%` } }, force: true });
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

/* ── the original failure ─────────────────────────────────────────────────── */

test('BUG-016: a record beyond page one is findable by search', async () => {
  // Entry 46 sits on page 3 at the default page size.
  const needle = `${TAG} note 46`;
  const res = await api(`/billing/income?search=${encodeURIComponent(needle)}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1, 'the record must be found regardless of which page it lives on');
  assert.equal(res.body.meta.pagination.total, 1, 'total must be the SQL count, not a filtered page length');
  assert.equal(res.body.data[0].income_code, `${TAG}-046`);
});

test('BUG-016: search total matches the database count', async () => {
  const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&limit=1`);
  const dbCount = await IncomeEntry.count({ where: { note: { [Op.like]: `%${TAG}%` } } });
  assert.equal(res.body.meta.pagination.total, dbCount, 'total must equal the database count');
  assert.equal(res.body.data.length, 1, 'limit must still apply');
});

/* ── pagination ───────────────────────────────────────────────────────────── */

test('BUG-016: pagination is consistent and complete', async () => {
  const limit = 20;
  const first = await api(`/billing/income?search=${encodeURIComponent(TAG)}&limit=${limit}&page=1`);
  const total = first.body.meta.pagination.total;
  const pages = first.body.meta.pagination.total_pages;
  assert.equal(total, SEEDED);
  assert.equal(pages, Math.ceil(SEEDED / limit));

  // Walk every page and confirm we see each seeded record exactly once.
  const seen = new Set();
  for (let page = 1; page <= pages; page += 1) {
    const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&limit=${limit}&page=${page}`);
    for (const row of res.body.data) {
      assert.ok(!seen.has(row.income_code), `duplicate across pages: ${row.income_code}`);
      seen.add(row.income_code);
    }
  }
  assert.equal(seen.size, SEEDED, 'every record must be reachable by paging');
});

test('BUG-016: a page past the end is empty but reports the true total', async () => {
  const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&limit=20&page=99`);
  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.pagination.total, SEEDED);
});

/* ── date filtering ──────────────────────────────────────────────────────── */

test('BUG-016: date filter is applied in SQL and matches the database', async () => {
  const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&from=2026-06-01&to=2026-06-30&limit=100`);
  const dbCount = await IncomeEntry.count({
    where: { note: { [Op.like]: `%${TAG}%` }, income_date: { [Op.between]: ['2026-06-01', '2026-06-30'] } },
  });
  assert.equal(res.body.meta.pagination.total, dbCount);
  assert.ok(dbCount > 0, 'fixture must produce June rows');
  for (const row of res.body.data) {
    assert.ok(row.income_date >= '2026-06-01' && row.income_date <= '2026-06-30', `out of range: ${row.income_date}`);
  }
});

test('BUG-016: date filter combines with pagination without losing rows', async () => {
  const limit = 5;
  const first = await api(`/billing/income?search=${encodeURIComponent(TAG)}&from=2026-06-01&to=2026-08-31&limit=${limit}&page=1`);
  const total = first.body.meta.pagination.total;
  const pages = first.body.meta.pagination.total_pages;
  let counted = 0;
  for (let page = 1; page <= pages; page += 1) {
    const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&from=2026-06-01&to=2026-08-31&limit=${limit}&page=${page}`);
    counted += res.body.data.length;
  }
  assert.equal(counted, total, 'paging a filtered set must return exactly the filtered total');
});

test('BUG-016: boundary dates are inclusive', async () => {
  const row = await IncomeEntry.findOne({ where: { note: { [Op.like]: `%${TAG}%` } }, order: [['income_date', 'ASC']] });
  const day = String(row.income_date);
  const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&from=${day}&to=${day}&limit=100`);
  const dbCount = await IncomeEntry.count({ where: { note: { [Op.like]: `%${TAG}%` }, income_date: day } });
  assert.equal(res.body.meta.pagination.total, dbCount);
  assert.ok(dbCount > 0);
});

/* ── sorting ─────────────────────────────────────────────────────────────── */

test('BUG-016: sorting happens in SQL across the whole result set', async () => {
  const asc = await api(`/billing/income?search=${encodeURIComponent(TAG)}&sort_by=amount&sort_dir=ASC&limit=1`);
  const desc = await api(`/billing/income?search=${encodeURIComponent(TAG)}&sort_by=amount&sort_dir=DESC&limit=1`);
  assert.equal(Number(asc.body.data[0].amount), 1001, 'lowest amount must come first when sorting ASC');
  assert.equal(Number(desc.body.data[0].amount), 1000 + SEEDED, 'highest amount must come first when sorting DESC');
});

test('BUG-016: an unknown sort column falls back safely (no SQL injection)', async () => {
  const res = await api(`/billing/income?search=${encodeURIComponent(TAG)}&sort_by=amount;DROP%20TABLE%20users&limit=1`);
  assert.equal(res.status, 200, 'must not error or execute the injected text');
  assert.equal(res.body.meta.pagination.total, SEEDED);
});

/* ── empty results ───────────────────────────────────────────────────────── */

test('BUG-016: empty results are reported honestly', async () => {
  const nonsense = await api('/billing/income?search=zzz-no-such-record-zzz');
  assert.equal(nonsense.body.data.length, 0);
  assert.equal(nonsense.body.meta.pagination.total, 0);
  assert.equal(nonsense.body.meta.pagination.total_pages, 0);

  const future = await api('/billing/income?from=2035-01-01&to=2035-12-31');
  assert.equal(future.body.meta.pagination.total, 0);
});

/* ── contra ──────────────────────────────────────────────────────────────── */

test('BUG-016: contra list filters in SQL', async () => {
  const accounts = await MasterOption.findAll({ where: { type: 'payment_account' }, limit: 2 });
  assert.ok(accounts.length >= 2, 'fixture: two payment accounts required');

  await ContraEntry.bulkCreate([
    { contra_code: `${TAG}-C1`, from_account_id: accounts[0].id, to_account_id: accounts[1].id, amount: 7777, transaction_date: '2026-06-10', note: `${TAG} june transfer` },
    { contra_code: `${TAG}-C2`, from_account_id: accounts[1].id, to_account_id: accounts[0].id, amount: 8888, transaction_date: '2026-08-10', note: `${TAG} august transfer` },
  ]);

  const june = await api(`/billing/contra?search=${encodeURIComponent(TAG)}&from=2026-06-01&to=2026-06-30&limit=50`);
  assert.equal(june.body.meta.pagination.total, 1, 'only the June transfer may match');
  assert.equal(june.body.data[0].contra_code, `${TAG}-C1`);

  const byAmount = await api('/billing/contra?search=8888&limit=50');
  assert.ok(byAmount.body.data.some((r) => r.contra_code === `${TAG}-C2`), 'amount search must work in SQL');

  const byAccount = await api(`/billing/contra?account_id=${accounts[0].id}&limit=50`);
  assert.ok(byAccount.body.meta.pagination.total >= 2, 'account filter must match either side of the transfer');
});

test('BUG-016: contra rejects incoherent transfers', async () => {
  const accounts = await MasterOption.findAll({ where: { type: 'payment_account' }, limit: 2 });
  const same = await api('/billing/contra', { method: 'POST', body: { from_account_id: accounts[0].id, to_account_id: accounts[0].id, amount: 100 } });
  assert.equal(same.status, 400);
  assert.match(same.body.message, /must be different/i);

  const negative = await api('/billing/contra', { method: 'POST', body: { from_account_id: accounts[0].id, to_account_id: accounts[1].id, amount: -5 } });
  assert.equal(negative.status, 400);

  const missing = await api('/billing/contra', { method: 'POST', body: { amount: 100 } });
  assert.equal(missing.status, 400);
});

/* ── migrated data preserved ──────────────────────────────────────────────── */

test('BUG-016: legacy EAV rows were migrated, not lost', async () => {
  const migrated = await IncomeEntry.count({ where: { legacy_option_id: { [Op.ne]: null } } });
  assert.ok(migrated >= 1, 'the legacy income entry must exist in the new table');

  const legacyStillThere = await MasterOption.count({ where: { type: 'income_entry' } });
  assert.ok(legacyStillThere >= 1, 'the original master_options row must be preserved for reversibility');

  const contraMigrated = await ContraEntry.count({ where: { legacy_option_id: { [Op.ne]: null } } });
  assert.ok(contraMigrated >= 1, 'legacy contra entries must exist in the new table');
});
