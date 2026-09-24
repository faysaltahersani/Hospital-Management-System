'use strict';

// BUG-012 / BUG-026 — FEFO (First-Expiry-First-Out) batch consumption.
//
// Sales previously decremented a single `medicines.stock_quantity` counter with
// no batch or expiry awareness, and the batch report invented quantities for any
// medicine without a purchase record. Stock now moves through real batch rows,
// consumed earliest-expiry-first, and expired stock is never dispensed.

const ApiError = require('./ApiError');

/**
 * Ordered batches with stock available for dispensing.
 * Expired batches are excluded outright — they must not be dispensed, and the
 * caller should see a shortfall rather than silently receiving expired units.
 * NULL-expiry batches (opening balances whose expiry was never recorded) sort
 * last, so dated stock is always used first.
 */
const availableBatches = async (MedicineBatch, medicineId, { transaction, asOf = new Date() }) => {
  const { Op, literal } = require('sequelize');
  const today = asOf.toISOString().slice(0, 10);

  const batches = await MedicineBatch.findAll({
    where: {
      medicine_id: medicineId,
      [Op.and]: [literal('quantity_in > quantity_out')],
      [Op.or]: [{ expiry_date: null }, { expiry_date: { [Op.gte]: today } }],
    },
    order: [
      [literal('expiry_date IS NULL'), 'ASC'], // dated batches first
      ['expiry_date', 'ASC'],
      ['id', 'ASC'],
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  return batches;
};

const totalAvailable = (batches) =>
  batches.reduce((sum, b) => sum + (Number(b.quantity_in) - Number(b.quantity_out)), 0);

/**
 * Consumes `quantity` units of a medicine FEFO.
 * @returns {Promise<Array<{batch_id:number, batch_no:string, expiry_date:string|null, quantity:number}>>}
 * @throws ApiError 409 when there is not enough non-expired stock.
 */
const consumeFefo = async ({ MedicineBatch, medicineId, medicineName, quantity, transaction, asOf }) => {
  const required = Number(quantity);
  if (!Number.isFinite(required) || required <= 0) {
    throw ApiError.badRequest(`Invalid quantity for ${medicineName || medicineId}`);
  }

  const batches = await availableBatches(MedicineBatch, medicineId, { transaction, asOf });
  const have = totalAvailable(batches);
  if (have < required) {
    throw ApiError.conflict(
      `Not enough non-expired stock for ${medicineName || `medicine ${medicineId}`}: ` +
        `${required} requested, ${have} available`
    );
  }

  const allocations = [];
  let outstanding = required;
  for (const batch of batches) {
    if (outstanding <= 0) break;
    const free = Number(batch.quantity_in) - Number(batch.quantity_out);
    if (free <= 0) continue;
    const take = Math.min(free, outstanding);
    // eslint-disable-next-line no-await-in-loop
    await batch.update({ quantity_out: Number(batch.quantity_out) + take }, { transaction });
    allocations.push({
      batch_id: batch.id,
      batch_no: batch.batch_no,
      expiry_date: batch.expiry_date,
      quantity: take,
    });
    outstanding -= take;
  }

  if (outstanding > 0) {
    // Defensive: the pre-check above should make this unreachable.
    throw ApiError.conflict(`Could not allocate ${outstanding} unit(s) for ${medicineName || medicineId}`);
  }
  return allocations;
};

/** Returns units to a specific batch (used when reversing a sale). */
const returnToBatch = async ({ MedicineBatch, batchId, quantity, transaction }) => {
  const batch = await MedicineBatch.findByPk(batchId, { transaction, lock: transaction?.LOCK.UPDATE });
  if (!batch) throw ApiError.badRequest(`Batch ${batchId} not found`);
  const next = Number(batch.quantity_out) - Number(quantity);
  if (next < 0) {
    throw ApiError.badRequest(
      `Returning ${quantity} unit(s) to batch ${batch.batch_no} would exceed what was dispensed from it`
    );
  }
  await batch.update({ quantity_out: next }, { transaction });
  return batch;
};

/** Adds purchased units into a batch, creating it when new. */
const receiveIntoBatch = async ({
  MedicineBatch,
  medicineId,
  batchNo,
  expiryDate,
  quantity,
  purchasePrice,
  salePrice,
  source,
  transaction,
}) => {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw ApiError.badRequest('Purchase quantity must be positive');

  const [batch, created] = await MedicineBatch.findOrCreate({
    where: { medicine_id: medicineId, batch_no: String(batchNo).slice(0, 60) },
    defaults: {
      medicine_id: medicineId,
      batch_no: String(batchNo).slice(0, 60),
      expiry_date: expiryDate || null,
      quantity_in: qty,
      quantity_out: 0,
      purchase_price: purchasePrice || 0,
      sale_price: salePrice || 0,
      source: source || null,
    },
    transaction,
  });

  if (!created) {
    await batch.update(
      {
        quantity_in: Number(batch.quantity_in) + qty,
        // A later delivery may carry the expiry the first one omitted.
        expiry_date: batch.expiry_date || expiryDate || null,
        purchase_price: purchasePrice || batch.purchase_price,
        sale_price: salePrice || batch.sale_price,
      },
      { transaction }
    );
  }
  return batch;
};

/** Authoritative on-hand quantity for a medicine, derived from batches. */
const onHand = async ({ MedicineBatch, medicineId, transaction }) => {
  const { fn, col, literal } = require('sequelize');
  const row = await MedicineBatch.findOne({
    attributes: [[fn('SUM', literal('quantity_in - quantity_out')), 'qty']],
    where: { medicine_id: medicineId },
    raw: true,
    transaction,
  });
  return Number(row?.qty || 0);
};

module.exports = { consumeFefo, returnToBatch, receiveIntoBatch, availableBatches, totalAvailable, onHand };
