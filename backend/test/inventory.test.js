'use strict';

// BUG-012 / BUG-026 regression tests: real batches, FEFO consumption, no
// fabricated stock or expiry, transactional purchase/sale/return.

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { Op } = require('sequelize');

const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { sequelize, Medicine, MedicineBatch, MedicineSale, MedicineSaleItem } = models;

let server, base, token;
const cleanup = { medicineIds: [], saleIds: [] };

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

const makeMedicine = async (code) => {
  const med = await Medicine.create({
    code, name: `QA ${code}`, unit: 'piece',
    purchase_price: 10, sale_price: 20, stock_quantity: 0, reorder_level: 5, is_active: true,
  });
  cleanup.medicineIds.push(med.id);
  return med;
};

const addBatch = (med, batch_no, expiry_date, qty) =>
  MedicineBatch.create({
    medicine_id: med.id, batch_no, expiry_date,
    quantity_in: qty, quantity_out: 0, purchase_price: 10, sale_price: 20, source: 'qa',
  });

const syncCache = async (med) => {
  const rows = await MedicineBatch.findAll({ where: { medicine_id: med.id } });
  const total = rows.reduce((s, b) => s + (Number(b.quantity_in) - Number(b.quantity_out)), 0);
  await med.update({ stock_quantity: total });
  return total;
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
  for (const saleId of cleanup.saleIds) {
    const items = await MedicineSaleItem.findAll({ where: { sale_id: saleId } });
    for (const it of items) {
      await sequelize.query('DELETE FROM medicine_sale_item_batches WHERE sale_item_id = ?', { replacements: [it.id] });
    }
    await MedicineSaleItem.destroy({ where: { sale_id: saleId }, force: true });
    await MedicineSale.destroy({ where: { id: saleId }, force: true });
  }
  if (cleanup.medicineIds.length) {
    await MedicineBatch.destroy({ where: { medicine_id: cleanup.medicineIds }, force: true });
    await Medicine.destroy({ where: { id: cleanup.medicineIds }, force: true });
  }
  await new Promise((r) => server.close(r));
  await sequelize.close();
});

test('BUG-012: batch report contains no fabricated stock or expiry', async () => {
  const res = await api('/pharmacy/medicine-batch-stock');
  assert.equal(res.status, 200);
  const rows = res.body.data;
  assert.ok(Array.isArray(rows));
  // The old code invented current_stock 50 and expiry 2027-12-31 for every
  // medicine lacking a purchase record.
  const fabricated = rows.filter((r) => r.expiry_date === '2027-12-31');
  assert.equal(fabricated.length, 0, 'the 2027-12-31 placeholder must be gone');
  for (const r of rows) {
    assert.equal(typeof r.current_stock, 'number');
    assert.equal(r.current_stock, r.quantity_in - r.quantity_out, 'stock must be derived, never stored');
    if (!r.expiry_recorded) assert.equal(r.expiry_date, null, 'unknown expiry must be null, not a guess');
  }
});

test('BUG-012: every batch row corresponds to a real database row', async () => {
  const res = await api('/pharmacy/medicine-batch-stock');
  const dbCount = await MedicineBatch.count();
  assert.equal(res.body.data.length, dbCount, 'no extra rows may be synthesised');
});

test('BUG-012: FEFO consumes the earliest expiry first', async () => {
  const med = await makeMedicine(`QA-FEFO-${Date.now()}`);
  await addBatch(med, 'LATE', '2027-12-31', 10);
  await addBatch(med, 'EARLY', '2026-11-30', 10);
  await addBatch(med, 'MID', '2027-01-31', 10);
  await syncCache(med);

  const res = await api('/pharmacy/sales', {
    method: 'POST',
    body: { items: [{ medicine_id: med.id, quantity: 12 }], payment_method: 'cash' },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  cleanup.saleIds.push(res.body.data.id);

  const early = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'EARLY' } });
  const mid = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'MID' } });
  const late = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'LATE' } });

  assert.equal(Number(early.quantity_out), 10, 'earliest expiry must be exhausted first');
  assert.equal(Number(mid.quantity_out), 2, 'the remainder comes from the next expiry');
  assert.equal(Number(late.quantity_out), 0, 'the latest expiry must be untouched');

  await med.reload();
  assert.equal(Number(med.stock_quantity), 18, 'cached stock must equal the batch total');
});

test('BUG-012: expired stock is never dispensed', async () => {
  const med = await makeMedicine(`QA-EXP-${Date.now()}`);
  await addBatch(med, 'EXPIRED', '2020-01-01', 50);
  await addBatch(med, 'GOOD', '2027-06-30', 3);
  await syncCache(med);

  const res = await api('/pharmacy/sales', {
    method: 'POST',
    body: { items: [{ medicine_id: med.id, quantity: 10 }], payment_method: 'cash' },
  });
  assert.equal(res.status, 409, 'must refuse: only 3 non-expired units exist');
  assert.match(res.body.message, /non-expired/i);

  const expired = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'EXPIRED' } });
  assert.equal(Number(expired.quantity_out), 0, 'expired batch must remain untouched');
});

test('BUG-025/BUG-012: duplicate lines cannot oversell', async () => {
  const med = await makeMedicine(`QA-DUP-${Date.now()}`);
  await addBatch(med, 'ONLY', '2027-06-30', 10);
  await syncCache(med);

  const res = await api('/pharmacy/sales', {
    method: 'POST',
    body: {
      items: [
        { medicine_id: med.id, quantity: 8 },
        { medicine_id: med.id, quantity: 8 },
      ],
      payment_method: 'cash',
    },
  });
  assert.equal(res.status, 409, '16 units must not pass a stock of 10');

  const batch = await MedicineBatch.findOne({ where: { medicine_id: med.id } });
  assert.equal(Number(batch.quantity_out), 0, 'a refused sale must not move stock');
});

test('BUG-026: a refund returns units to the batch they came from', async () => {
  const med = await makeMedicine(`QA-RET-${Date.now()}`);
  await addBatch(med, 'B1', '2026-12-31', 5);
  await addBatch(med, 'B2', '2027-12-31', 5);
  await syncCache(med);

  const sale = await api('/pharmacy/sales', {
    method: 'POST',
    body: { items: [{ medicine_id: med.id, quantity: 7 }], payment_method: 'cash' },
  });
  assert.equal(sale.status, 201);
  cleanup.saleIds.push(sale.body.data.id);

  let b1 = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'B1' } });
  let b2 = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'B2' } });
  assert.equal(Number(b1.quantity_out), 5);
  assert.equal(Number(b2.quantity_out), 2);

  const refund = await api(`/pharmacy/sales/${sale.body.data.id}/status`, {
    method: 'PATCH',
    body: { status: 'refunded' },
  });
  assert.equal(refund.status, 200, JSON.stringify(refund.body));

  await b1.reload(); await b2.reload();
  assert.equal(Number(b1.quantity_out), 0, 'B1 must be fully restored');
  assert.equal(Number(b2.quantity_out), 0, 'B2 must be fully restored');

  await med.reload();
  assert.equal(Number(med.stock_quantity), 10, 'stock must return to its original level');
});

test('BUG-026: a purchase creates a real batch inside one transaction', async () => {
  const med = await makeMedicine(`QA-PUR-${Date.now()}`);
  const res = await api('/pharmacy/purchases', {
    method: 'POST',
    body: {
      supplier_id: 1,
      items: [{ medicine_id: med.id, quantity: 25, purchase_price: 8, sale_price: 12, batch_no: 'QA-BATCH-1', expiry_date: '2028-03-31' }],
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));

  const batch = await MedicineBatch.findOne({ where: { medicine_id: med.id, batch_no: 'QA-BATCH-1' } });
  assert.ok(batch, 'the purchase must create a batch');
  assert.equal(Number(batch.quantity_in), 25);
  assert.equal(String(batch.expiry_date), '2028-03-31');

  await med.reload();
  assert.equal(Number(med.stock_quantity), 25, 'cached stock must match the batch');
});

test('BUG-026: a purchase for an unknown medicine writes nothing', async () => {
  const before = await MedicineBatch.count();
  const res = await api('/pharmacy/purchases', {
    method: 'POST',
    body: { supplier_id: 1, items: [{ medicine_id: 99999999, quantity: 5, purchase_price: 1 }] },
  });
  assert.ok(res.status >= 400, 'must fail');
  assert.equal(await MedicineBatch.count(), before, 'no batch may survive the rollback');
});

test('BUG-012: negative available stock is impossible', async () => {
  const rows = await MedicineBatch.findAll({ where: { quantity_out: { [Op.gt]: sequelize.col('quantity_in') } } });
  assert.equal(rows.length, 0, 'no batch may be over-consumed');
});
