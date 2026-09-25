'use strict';

// BUG-042 — one authoritative billing path for every revenue stream.
//
// Before this existed, only appointment invoices went through `invoices`/
// `payments`. OPD stored nothing, IPD hid payments in a text column, and
// laboratory, radiology, blood issue and ambulance recorded a bare amount on
// their own row with no invoice, no payment and no receivable. Finance reports
// read only invoices/payments, so all of that revenue was invisible — which is
// why two reports fabricated collection figures to fill the gap.
//
// Every caller now passes its encounter link plus priced lines, and gets a real
// Invoice + InvoiceItem rows + Payment rows created inside the caller's
// transaction. Money is computed here, never taken from the client.

const ApiError = require('./ApiError');
const { generateInvoiceCode, generatePaymentCode } = require('./codeGenerator');
const { allocateForYear } = require('./codeSequence');
const { currentYear } = require('./dateUtils');
const {
  INVOICE_STATUS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
} = require('../config/constants');

// BUG-054 - all arithmetic delegates to utils/money, which works on integer
// minor units. `round2` remained float-based and could still drift.
const money = require('./money');
const { currentTenant } = require('./tenantContext');
const toMoney = (value) => money.toMajor(money.toMinor(value));
const round2 = (value) => money.toMajor(money.toMinor(value));

const invoiceStatusFor = (total, paid) => {
  if (!money.isPositive(paid)) return INVOICE_STATUS.SENT;
  if (money.gte(paid, total)) return INVOICE_STATUS.PAID;
  return INVOICE_STATUS.PARTIALLY_PAID;
};

// The UI offers friendly account labels; Payment.method is a fixed enum.
const PAYMENT_METHOD_ALIASES = {
  cash: PAYMENT_METHODS.CASH,
  card: PAYMENT_METHODS.CARD,
  'credit card': PAYMENT_METHODS.CARD,
  'debit card': PAYMENT_METHODS.CARD,
  bank: PAYMENT_METHODS.BANK_TRANSFER,
  'bank transfer': PAYMENT_METHODS.BANK_TRANSFER,
  'main bank account': PAYMENT_METHODS.BANK_TRANSFER,
  cheque: PAYMENT_METHODS.CHEQUE,
  check: PAYMENT_METHODS.CHEQUE,
  insurance: PAYMENT_METHODS.INSURANCE,
  bkash: PAYMENT_METHODS.MOBILE_BANKING,
  nagad: PAYMENT_METHODS.MOBILE_BANKING,
  rocket: PAYMENT_METHODS.MOBILE_BANKING,
  'mobile banking': PAYMENT_METHODS.MOBILE_BANKING,
  'cash account': PAYMENT_METHODS.CASH,
};

const normalizePaymentMethod = (value) => {
  const raw = String(value || 'cash').trim().toLowerCase();
  if (PAYMENT_METHOD_VALUES.includes(raw)) return raw;
  return PAYMENT_METHOD_ALIASES[raw] || PAYMENT_METHODS.CASH;
};

/**
 * Resolve discount and tax from either absolute amounts or percentages, then
 * derive the total. Rejects values that would make the invoice incoherent.
 */
const resolveTotals = ({ lines, discount, discount_percent, tax, tax_rate }) => {
  const rows = lines.map((line) => {
    const quantity = Number(line.quantity ?? 1) || 1;
    if (money.isNegative(line.unit_price)) {
      throw ApiError.badRequest(`Line price cannot be negative: ${line.description}`);
    }
    return {
      item_type: line.item_type,
      reference_id: line.reference_id || null,
      service_id: line.service_id || null,
      service_price_id: line.service_price_id || null,
      pricing_snapshot: line.pricing_snapshot || null,
      description: String(line.description || 'Charge').slice(0, 255),
      quantity,
      unit_price: toMoney(line.unit_price),
      total_price: money.mulQty(line.unit_price, quantity),
    };
  });

  const subtotal = money.add(...rows.map((r) => r.total_price));

  const resolvedDiscount =
    discount !== undefined && discount !== null
      ? toMoney(discount)
      : money.percentOf(subtotal, discount_percent);
  if (money.isNegative(resolvedDiscount)) throw ApiError.badRequest('Discount cannot be negative');
  if (money.gt(resolvedDiscount, subtotal)) {
    throw ApiError.badRequest(
      `Discount (${money.format(resolvedDiscount)}) cannot exceed the subtotal (${money.format(subtotal)})`
    );
  }

  const afterDiscount = money.sub(subtotal, resolvedDiscount);
  const resolvedTax =
    tax !== undefined && tax !== null ? toMoney(tax) : money.percentOf(afterDiscount, tax_rate);
  if (money.isNegative(resolvedTax)) throw ApiError.badRequest('Tax cannot be negative');

  return {
    rows,
    subtotal,
    discount: resolvedDiscount,
    tax: resolvedTax,
    total: money.add(afterDiscount, resolvedTax),
  };
};

/**
 * Creates the invoice, its lines and any payments for one clinical encounter.
 *
 * @param {object}  args
 * @param {object}  args.models        { Invoice, InvoiceItem, Payment }
 * @param {object}  args.transaction   caller's transaction — required
 * @param {number}  args.patientId
 * @param {object}  args.link          e.g. { lab_order_id: 12 }
 * @param {Array}   args.lines         [{ item_type, reference_id, description, quantity, unit_price }]
 * @param {Array}   [args.payments]    [{ method|account_name, amount, reference }]
 * @param {Date}    [args.issuedAt]
 * @returns {Promise<object>} the created Invoice instance
 */
const createEncounterInvoice = async ({
  models,
  transaction,
  patientId,
  link = {},
  lines,
  payments = [],
  discount,
  discount_percent,
  tax,
  tax_rate,
  issuedAt,
  notes,
  currentUserId,
}) => {
  if (!transaction) throw new Error('createEncounterInvoice requires a transaction');
  if (!patientId) throw ApiError.badRequest('A patient is required to raise an invoice');
  if (!Array.isArray(lines) || lines.length === 0) {
    throw ApiError.badRequest('At least one billable line is required');
  }

  const { Invoice, InvoiceItem, Payment } = models;
  const tenant = currentTenant();
  const catalogue = require('../modules/service-catalog/service-catalog.service');
  const resolvedLines = [];
  for (const line of lines) {
    let resolved = null;
    if (tenant && line.service_id) {
      try { resolved = await catalogue.resolvePrice({ service_id: line.service_id, payer_type: line.payer_type || 'self', payer_reference: line.payer_reference || null, at: issuedAt }, tenant, { transaction }); }
      catch (error) { if (error.statusCode !== 404) throw error; }
    } else if (tenant && line.service_source_type && line.service_source_id) {
      try { resolved = await catalogue.resolveSourcePrice({ source_type: line.service_source_type, source_id: line.service_source_id, payer_type: line.payer_type || 'self', payer_reference: line.payer_reference || null, at: issuedAt }, tenant, { transaction }); }
      catch (error) { if (error.statusCode !== 404) throw error; }
    }
    resolvedLines.push(resolved ? {
      ...line,
      service_id: resolved.service_id,
      service_price_id: resolved.service_price_id,
      unit_price: resolved.amount,
      pricing_snapshot: { ...resolved, captured_at: new Date().toISOString(), legacy_fallback_amount: toMoney(line.unit_price) },
    } : line);
  }
  const totals = resolveTotals({ lines: resolvedLines, discount, discount_percent, tax, tax_rate });

  const cleanPayments = payments
    .map((p) => ({
      method: normalizePaymentMethod(p.method || p.account_name),
      amount: toMoney(p.amount),
      reference: p.reference || null,
    }))
    .filter((p) => money.isPositive(p.amount));

  const paidAmount = money.add(...cleanPayments.map((p) => p.amount));
  if (money.gt(paidAmount, totals.total)) {
    throw ApiError.badRequest(
      `Payments (${paidAmount.toFixed(2)}) exceed the invoice total (${totals.total.toFixed(2)})`
    );
  }

  const year = currentYear();
  const issued = issuedAt || new Date();

  // Atomically claimed. MAX(suffix)+1 is a read-then-write race: this helper bills
  // pathology, radiology, ambulance and blood issues, so ten simultaneous bookings
  // in ANY of those modules derived the same invoice code and nine were rejected
  // with 409 'Resource already exists'.
  const invoiceSeq = await allocateForYear('invoice', year, { transaction });
  const invoice = await Invoice.create(
    {
      invoice_code: generateInvoiceCode(year, invoiceSeq),
      patient_id: patientId,
      ...link,
      issued_at: issued,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      paid_amount: paidAmount,
      status: invoiceStatusFor(totals.total, paidAmount),
      notes: notes || null,
      created_by: currentUserId || null,
    },
    { transaction }
  );

  await InvoiceItem.bulkCreate(
    totals.rows.map((row) => ({ ...row, invoice_id: invoice.id })),
    { transaction }
  );

  for (const p of cleanPayments) {
    // eslint-disable-next-line no-await-in-loop
    const paymentSeq = await allocateForYear('payment', year, { transaction });
    // eslint-disable-next-line no-await-in-loop
    await Payment.create(
      {
        payment_code: generatePaymentCode(year, paymentSeq),
        invoice_id: invoice.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        paid_at: issued,
        received_by: currentUserId || null,
      },
      { transaction }
    );
  }

  return invoice;
};

module.exports = {
  createEncounterInvoice,
  normalizePaymentMethod,
  resolveTotals,
  invoiceStatusFor,
  toMoney,
  round2,
};
