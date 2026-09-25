'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateInvoiceCode, generatePaymentCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear } = require('../../utils/codeSequence');
const { INVOICE_STATUS } = require('../../config/constants');
const {
  sequelize, Patient, Appointment, ExpenseCategory, Expense, MasterOption, Invoice, Payment,
} = require('../../models');
const money = require('../../utils/money');
const repository = require('./billing.repository');
const { currentTenant } = require('../../utils/tenantContext');
const serviceCatalog = require('../service-catalog/service-catalog.service');

// BUG-054 - normalises a DECIMAL column value to an exact 2dp number instead
// of letting a float through. Every money read in this module goes via here.
const toMoney = (value) => money.toMajor(money.toMinor(value));

// BUG-039 / BUG-054 - status is a pure function of (total, paid), compared on
// exact minor units so a cent of float drift cannot flip 'paid' to
// 'partially_paid'.
const invoiceStatusFor = (total, paidAmount, fallback = INVOICE_STATUS.SENT) => {
  if (!money.isPositive(paidAmount)) return fallback;
  if (money.gte(paidAmount, total)) return INVOICE_STATUS.PAID;
  return INVOICE_STATUS.PARTIALLY_PAID;
};

/** Exact sum of live payments against an invoice. */
const sumInvoicePayments = async (invoiceId, transaction) => {
  const rows = await Payment.findAll({
    where: { invoice_id: invoiceId },
    attributes: ['amount'],
    transaction,
  });
  return money.add(...rows.map((r) => r.amount));
};

/**
 * BUG-039 - recomputes paid_amount and status from the payment rows and writes
 * them back. This is the single authoritative path; every flow that touches
 * payments funnels through it, so the six revenue streams cannot diverge.
 */
const reconcileInvoiceFromPayments = async (invoiceId, transaction) => {
  // The bare row: this path only reads status/total and writes two columns, so
  // there is no reason to join four associations to do it.
  const invoice = await repository.findInvoiceRow(invoiceId, { transaction });
  if (!invoice) return null;
  if (invoice.status === INVOICE_STATUS.VOID) return invoice; // void is terminal

  const paid = await sumInvoicePayments(invoiceId, transaction);
  const total = invoice.total;
  await repository.updateInvoice(
    invoice,
    { paid_amount: paid, status: invoiceStatusFor(total, paid, INVOICE_STATUS.SENT) },
    { transaction }
  );
  return invoice;
};

// BUG-054 - line and invoice totals computed on integer minor units, so
// subtotal - discount + tax always equals total exactly.
const buildInvoiceTotals = (items, discount = 0, tax = 0) => {
  const rows = items.map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = item.unit_price;
    return {
      item_type: item.item_type,
      reference_id: item.reference_id || null,
      service_id: item.service_id || null,
      service_price_id: item.service_price_id || null,
      pricing_snapshot: item.pricing_snapshot || null,
      description: item.description,
      quantity,
      unit_price: money.toMajor(money.toMinor(unitPrice)),
      total_price: money.mulQty(unitPrice, quantity),
    };
  });
  const subtotal = money.add(...rows.map((r) => r.total_price));
  const total = money.subFloor(money.add(subtotal, tax), discount);
  return { rows, subtotal, total };
};

const enrichCatalogueItems = async (items, transaction) => {
  const tenant = currentTenant();
  if (!tenant) return items;
  const rows = [];
  for (const item of items) {
    if (!item.service_id) { rows.push(item); continue; }
    const resolved = await serviceCatalog.resolvePrice({ service_id:item.service_id, payer_type:item.payer_type||'self', payer_reference:item.payer_reference||null }, tenant, { transaction });
    rows.push({ ...item, unit_price:resolved.amount, service_price_id:resolved.service_price_id, pricing_snapshot:{...resolved,captured_at:new Date().toISOString(),legacy_fallback_amount:toMoney(item.unit_price)} });
  }
  return rows;
};

const listInvoices = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.status) filters.status = query.status;
  const { rows, count } = await repository.findAndCountInvoices({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((i) => i.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getInvoice = async (id) => {
  const invoice = await repository.findInvoiceById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice.toJSON();
};

const getInvoicePrint = async (id) => {
  const invoice = await repository.findInvoiceById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const data = invoice.toJSON();
  const total = toMoney(data.total);
  const paidAmount = toMoney(data.paid_amount);
  return {
    document_type: 'invoice',
    generated_at: new Date().toISOString(),
    invoice: data,
    summary: {
      subtotal: toMoney(data.subtotal),
      discount: toMoney(data.discount),
      tax: toMoney(data.tax),
      total,
      paid_amount: paidAmount,
      balance_due: money.subFloor(total, paidAmount),
      status: data.status,
    },
  };
};

const createInvoice = async (input, currentUserId) =>
  // Wrap with retry: invoice_code is generated from a non-atomic count, so a
  // concurrent insert can lose the unique-constraint race.
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      const patient = await Patient.findByPk(input.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');
      if (input.appointment_id) {
        const appointment = await Appointment.findByPk(input.appointment_id, { transaction: t });
        if (!appointment) throw ApiError.badRequest('Appointment not found');
      }

      const pricedItems = await enrichCatalogueItems(input.items, t);
      const totals = buildInvoiceTotals(pricedItems, input.discount, input.tax);
      // Atomically claimed, so two concurrent writers cannot derive the same
      // number. Deriving it from a read (COUNT(*)+1, or MAX(suffix)+1) is a
      // read-then-write race; with 11 rows present and INV-2026-000012 already
      // issued, COUNT(*)+1 regenerated exactly that code on every retry and the
      // request could never succeed.
      const year = currentYear();
      const sequence = await allocateForYear('invoice', year, { transaction: t });
      const invoice_code = generateInvoiceCode(year, sequence);
      const invoice = await repository.createInvoice(
        {
          invoice_code,
          patient_id: input.patient_id,
          appointment_id: input.appointment_id || null,
          issued_at: input.issued_at || new Date(),
          due_at: input.due_at || null,
          subtotal: totals.subtotal,
          discount: toMoney(input.discount),
          tax: toMoney(input.tax),
          total: totals.total,
          paid_amount: 0,
          // BUG-039 - a new invoice has no payments, so it starts unpaid.
          // Validation rejects a client-supplied status outright.
          status: INVOICE_STATUS.SENT,
          notes: input.notes || null,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );
      await repository.createInvoiceItems(
        totals.rows.map((row) => ({ ...row, invoice_id: invoice.id })),
        { transaction: t }
      );
      return (await repository.findInvoiceById(invoice.id, { transaction: t })).toJSON();
    })
  );

const updateInvoice = async (id, changes) => {
  return sequelize.transaction(async (t) => {
    const invoice = await repository.findInvoiceById(id, { transaction: t });
    if (!invoice) throw ApiError.notFound('Invoice not found');
    if (invoice.status === INVOICE_STATUS.PAID && changes.items) {
      throw ApiError.badRequest('Cannot replace items on a paid invoice');
    }
    if (changes.patient_id) {
      const patient = await Patient.findByPk(changes.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');
    }
    if (changes.appointment_id) {
      const appointment = await Appointment.findByPk(changes.appointment_id, { transaction: t });
      if (!appointment) throw ApiError.badRequest('Appointment not found');
    }

    const updateData = { ...changes };
    delete updateData.items;

    // BUG-039 - the client may only ask to VOID. Any other status value is
    // ignored entirely; the real status is recomputed from payment records
    // below, so a forged status can never take effect.
    const requestedVoid = changes.status === INVOICE_STATUS.VOID;
    delete updateData.status;

    if (requestedVoid) {
      // Voiding an invoice that has been paid against would strand the money.
      const paidTotal = await sumInvoicePayments(invoice.id, t);
      if (money.isPositive(paidTotal)) {
        throw ApiError.badRequest(
          `Cannot void invoice ${invoice.invoice_code}: ${money.format(paidTotal)} has already been paid against it. ` +
            'Reverse the payments first.'
        );
      }
      updateData.status = INVOICE_STATUS.VOID;
    }

    if (changes.items || changes.discount !== undefined || changes.tax !== undefined) {
      const sourceItems = changes.items ? await enrichCatalogueItems(changes.items, t) : invoice.items.map((item) => item.toJSON());
      const totals = buildInvoiceTotals(sourceItems, changes.discount ?? invoice.discount, changes.tax ?? invoice.tax);
      Object.assign(updateData, { subtotal: totals.subtotal, total: totals.total });
      if (changes.items) {
        await repository.deleteInvoiceItems(invoice.id, { transaction: t });
        await repository.createInvoiceItems(
          totals.rows.map((row) => ({ ...row, invoice_id: invoice.id })),
          { transaction: t }
        );
      }
    }

    await repository.updateInvoice(invoice, updateData, { transaction: t });

    // Authoritative reconciliation: paid_amount and status both come from the
    // payment rows, never from the request.
    if (!requestedVoid) {
      await reconcileInvoiceFromPayments(invoice.id, t);
    }

    return (await repository.findInvoiceById(id, { transaction: t })).toJSON();
  });
};

const removeInvoice = async (id) => {
  const invoice = await repository.findInvoiceById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (toMoney(invoice.paid_amount) > 0) throw ApiError.badRequest('Cannot delete invoice with payments');
  await repository.destroyInvoice(invoice);
  return { message: 'Invoice deleted' };
};

const listPayments = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.invoice_id) filters.invoice_id = query.invoice_id;
  if (query.method) filters.method = query.method;
  const { rows, count } = await repository.findAndCountPayments({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((p) => p.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getPayment = async (id) => {
  const payment = await repository.findPaymentById(id);
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment.toJSON();
};

const createPayment = async (input, currentUserId) =>
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      // Row-level lock only — see repository.lockInvoiceById for why joining here
      // deadlocked concurrent cashiers.
      const invoice = await repository.lockInvoiceById(input.invoice_id, t);
      if (!invoice) throw ApiError.badRequest('Invoice not found');
      if (invoice.status === INVOICE_STATUS.VOID) throw ApiError.badRequest('Cannot pay a void invoice');

      // BUG-054 - exact comparison; the old float sum could reject an exact
      // final payment as an overpayment.
      const amount = input.amount;
      if (!money.isPositive(amount)) throw ApiError.badRequest('Payment amount must be positive');
      const alreadyPaid = await sumInvoicePayments(invoice.id, t);
      const nextPaid = money.add(alreadyPaid, amount);
      if (money.gt(nextPaid, invoice.total)) {
        throw ApiError.badRequest(
          `Payment exceeds invoice balance (total ${money.format(invoice.total)}, ` +
            `already paid ${money.format(alreadyPaid)}, attempted ${money.format(amount)})`
        );
      }

      const year = currentYear();
      const sequence = await allocateForYear('payment', year, { transaction: t });
      const payment_code = generatePaymentCode(year, sequence);
      const payment = await repository.createPayment(
        {
          payment_code,
          invoice_id: invoice.id,
          amount,
          method: input.method,
          reference: input.reference || null,
          paid_at: input.paid_at || new Date(),
          received_by: currentUserId || null,
          notes: input.notes || null,
        },
        { transaction: t }
      );

      // Derived, not assigned.
      await reconcileInvoiceFromPayments(invoice.id, t);

      return (await repository.findPaymentById(payment.id, { transaction: t })).toJSON();
    })
  );

const removePayment = async (id) => {
  return sequelize.transaction(async (t) => {
    const payment = await repository.findPaymentById(id, { transaction: t });
    if (!payment) throw ApiError.notFound('Payment not found');
    const invoice = await repository.lockInvoiceById(payment.invoice_id, t);
    if (!invoice) throw ApiError.notFound('The invoice this payment belongs to no longer exists');
    await repository.destroyPayment(payment, { transaction: t });
    // Recomputed from what remains, so a deleted payment cannot leave a stale
    // paid_amount or status behind.
    await reconcileInvoiceFromPayments(invoice.id, t);
    return { message: 'Payment deleted' };
  });
};

const listCategories = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.is_active !== undefined) filters.is_active = query.is_active;
  const { rows, count } = await repository.findAndCountCategories({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((c) => c.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const createCategory = async (input) => {
  const exists = await repository.findCategoryByName(input.name);
  if (exists) throw ApiError.conflict('Expense category already exists');
  const category = await repository.createCategory(input);
  return category.toJSON();
};

const updateCategory = async (id, changes) => {
  const category = await repository.findCategoryById(id);
  if (!category) throw ApiError.notFound('Expense category not found');
  await repository.updateCategory(category, changes);
  return category.toJSON();
};

const removeCategory = async (id) => {
  const category = await repository.findCategoryById(id);
  if (!category) throw ApiError.notFound('Expense category not found');
  await repository.destroyCategory(category);
  return { message: 'Expense category deleted' };
};

const listExpenses = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.category_id) filters.category_id = query.category_id;
  if (query.payment_method) filters.payment_method = query.payment_method;
  const { rows, count } = await repository.findAndCountExpenses({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });

  // Build User lookup for creators
  const { User } = require('../../models');
  const creatorIds = [...new Set(rows.map((e) => e.created_by).filter(Boolean))];
  const userMap = {};
  if (creatorIds.length) {
    const users = await User.findAll({ where: { id: creatorIds }, attributes: ['id', 'full_name'] });
    for (const u of users) userMap[String(u.id)] = u.full_name;
  }

  const items = rows.map((e) => {
    const plain = e.toJSON();
    const creatorName = plain.created_by ? (userMap[String(plain.created_by)] || 'Admin') : 'Admin';
    return {
      ...plain,
      account: { name: plain.payment_method || 'N/A' },
      creator: { full_name: creatorName },
      updater: { full_name: 'N/A' },
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const getExpense = async (id) => {
  const expense = await repository.findExpenseById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense.toJSON();
};

const createExpense = async (input, currentUserId) => {
  if (input.category_id) {
    const category = await repository.findCategoryById(input.category_id);
    if (!category) throw ApiError.badRequest('Expense category not found');
  }
  const expense = await repository.createExpense({
    ...input,
    created_by: currentUserId || null,
  });
  return (await repository.findExpenseById(expense.id)).toJSON();
};

const updateExpense = async (id, changes) => {
  const expense = await repository.findExpenseById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  if (changes.category_id) {
    const category = await repository.findCategoryById(changes.category_id);
    if (!category) throw ApiError.badRequest('Expense category not found');
  }
  await repository.updateExpense(expense, changes);
  return (await repository.findExpenseById(id)).toJSON();
};

const removeExpense = async (id) => {
  const expense = await repository.findExpenseById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  await repository.destroyExpense(expense);
  return { message: 'Expense deleted' };
};

const getExpenseMeta = async () => {
  const count = await Expense.count({ paranoid: false });
  const next_code = 'EXP-' + String(100000 + count + 1);

  let categories = await ExpenseCategory.findAll({
    order: [['name', 'ASC']],
  });

  // BUG-019 — removed seed-on-GET: default expense categories now seeded by migration 008

  const accountOptions = await MasterOption.findAll({
    where: { type: 'payment_account' },
  });

  const accounts = accountOptions.length
    ? accountOptions.map((a) => ({ id: a.id, name: a.label }))
    : [
        { id: 1, name: 'Cash' },
        { id: 2, name: 'Bank' },
        { id: 3, name: 'Mobile Banking' },
      ];

  return {
    next_code,
    expense_heads: categories.map((c) => ({ id: c.id, name: c.name })),
    accounts,
  };
};

const parseJsonDescription = (desc) => {
  if (!desc) return {};
  if (typeof desc === 'object') return desc;
  try {
    return JSON.parse(desc);
  } catch (err) {
    return {};
  }
};

const createAccount = async (body) => {
  const count = await MasterOption.count({ where: { type: 'payment_account' }, paranoid: false });
  const code = 'ACC-' + String(1000 + count + 1);

  const option = await MasterOption.create({
    type: 'payment_account',
    code,
    label: body.name,
    description: JSON.stringify({
      name: body.name,
      description: body.description || '',
      type: body.type,
      opening_balance: Number(body.opening_balance || 0),
    }),
    is_active: true,
  });

  return {
    id: option.id,
    code: option.code,
    name: option.label,
    description: body.description || '',
    type: body.type,
    opening_balance: Number(body.opening_balance || 0),
  };
};

const listAccounts = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  let { rows, count } = await MasterOption.findAndCountAll({
    where: { type: 'payment_account' },
    limit,
    offset,
    order: [['id', 'DESC']],
  });

  // BUG-019 — removed seed-on-GET: default payment accounts now seeded by migration 008

  const items = rows.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    return {
      id: opt.id,
      code: opt.code,
      name: opt.label,
      type: extra.type || 'Cash',
      description: extra.description || '',
      opening_balance: Number(extra.opening_balance || 0),
      creator: { full_name: 'Admin' },
      updater: { full_name: 'N/A' },
      created_at: opt.createdAt,
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const updateAccount = async (id, changes) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'payment_account') throw ApiError.notFound('Account not found');
  const extra = parseJsonDescription(option.description);
  const updatedExtra = { ...extra, ...changes };
  await option.update({
    label: changes.name || option.label,
    description: JSON.stringify(updatedExtra),
  });
  return { id: option.id, code: option.code, name: option.label, ...updatedExtra };
};

const removeAccount = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'payment_account') throw ApiError.notFound('Account not found');
  await option.destroy();
  return { message: 'Account deleted' };
};

const getTaxRateMeta = async () => {
  const count = await MasterOption.count({ where: { type: 'tax_rate' }, paranoid: false });
  const next_tax_rate_code = 'TR-' + String(1000 + count + 1);
  return { next_tax_rate_code };
};

const createTaxRate = async (body) => {
  const count = await MasterOption.count({ where: { type: 'tax_rate' }, paranoid: false });
  const code = body.code || ('TR-' + String(1000 + count + 1));

  const option = await MasterOption.create({
    type: 'tax_rate',
    code,
    label: body.name,
    description: JSON.stringify({
      name: body.name,
      code,
      rate: Number(body.rate || 0),
      type: body.type,
    }),
    is_active: true,
  });

  return {
    id: option.id,
    code: option.code,
    name: option.label,
    rate: Number(body.rate || 0),
    type: body.type,
  };
};

const listTaxRates = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  let { rows, count } = await MasterOption.findAndCountAll({
    where: { type: 'tax_rate' },
    limit,
    offset,
    order: [['id', 'DESC']],
  });

  // BUG-019 — removed seed-on-GET: default tax rates now seeded by migration 008

  const items = rows.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    return {
      id: opt.id,
      code: opt.code,
      name: opt.label,
      rate: Number(extra.rate || 0),
      type: extra.type || 'Percentage',
      creator: { full_name: 'Admin' },
      updater: { full_name: 'N/A' },
      created_at: opt.createdAt,
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const updateTaxRate = async (id, changes) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'tax_rate') throw ApiError.notFound('Tax rate not found');
  const extra = parseJsonDescription(option.description);
  const updatedExtra = { ...extra, ...changes };
  await option.update({
    code: changes.code || option.code,
    label: changes.name || option.label,
    description: JSON.stringify(updatedExtra),
  });
  return { id: option.id, code: option.code, name: option.label, ...updatedExtra };
};

const removeTaxRate = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'tax_rate') throw ApiError.notFound('Tax rate not found');
  await option.destroy();
  return { message: 'Tax rate deleted' };
};

const getContraMeta = async () => {
  const { ContraEntry } = require('../../models');
  const count = await ContraEntry.count({ paranoid: false });
  const next_code = 'CTR-' + String(100000 + count + 1);
  const { items: accounts } = await listAccounts({ limit: 200 });
  return { next_code, accounts: accounts.map((a) => ({ id: a.id, name: a.name })) };
};

const createContra = async (body, currentUserId) => {
  const { ContraEntry } = require('../../models');
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw ApiError.badRequest('Transfer amount must be positive');
  if (!body.from_account_id || !body.to_account_id) {
    throw ApiError.badRequest('Both source and destination accounts are required');
  }
  if (String(body.from_account_id) === String(body.to_account_id)) {
    throw ApiError.badRequest('Source and destination accounts must be different');
  }

  const count = await ContraEntry.count({ paranoid: false });
  const code = body.contra_code || 'CTR-' + String(100000 + count + 1);

  const entry = await ContraEntry.create({
    contra_code: code,
    from_account_id: body.from_account_id,
    to_account_id: body.to_account_id,
    amount,
    transaction_date: body.transaction_date || new Date().toISOString().slice(0, 10),
    note: body.note || null,
    created_by: currentUserId || null,
  });

  return { id: entry.id, contra_code: entry.contra_code, amount: Number(entry.amount) };
};

const listContra = async (query) => {
  // BUG-016 — this used to read ONE page from master_options and then filter that
  // page in JavaScript, reporting `total: filteredItems.length`. Anything past
  // page one was unreachable by search or date filter and the pager was wrong.
  // Filtering, sorting and counting now happen in SQL, before pagination.
  const { ContraEntry } = require('../../models');
  const { Op } = require('sequelize');
  const { dateOnlyRange } = require('../../utils/dateUtils');

  const { page, limit, offset } = parsePaging(query);
  const where = {};

  const range = dateOnlyRange(query);
  if (range) where.transaction_date = range;

  if (query.account_id) {
    const accountId = Number(query.account_id);
    if (Number.isFinite(accountId)) {
      where[Op.or] = [{ from_account_id: accountId }, { to_account_id: accountId }];
    }
  }

  if (query.search && String(query.search).trim()) {
    const term = `%${String(query.search).trim()}%`;
    const searchClause = [
      { contra_code: { [Op.like]: term } },
      { note: { [Op.like]: term } },
    ];
    if (Number.isFinite(Number(query.search))) searchClause.push({ amount: Number(query.search) });
    where[Op.and] = [...(where[Op.and] || []), { [Op.or]: searchClause }];
  }

  const SORTABLE = { transaction_date: 'transaction_date', amount: 'amount', contra_code: 'contra_code', id: 'id' };
  const sortBy = SORTABLE[query.sort_by] || 'transaction_date';
  const sortDir = String(query.sort_dir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await ContraEntry.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, sortDir], ['id', 'DESC']],
  });

  const accountRows = await MasterOption.findAll({
    where: { type: 'payment_account' },
    attributes: ['id', 'label'],
  });
  const accountMap = new Map(accountRows.map((a) => [String(a.id), a.label]));

  const items = rows.map((r) => ({
    id: r.id,
    contra_code: r.contra_code,
    amount: Number(r.amount),
    note: r.note,
    transaction_date: r.transaction_date,
    from_account_id: r.from_account_id,
    to_account_id: r.to_account_id,
    from_account: r.from_account_id ? { name: accountMap.get(String(r.from_account_id)) || null } : null,
    to_account: r.to_account_id ? { name: accountMap.get(String(r.to_account_id)) || null } : null,
    created_at: r.createdAt,
  }));

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const removeContra = async (id) => {
  const { ContraEntry } = require('../../models');
  const entry = await ContraEntry.findByPk(id);
  if (!entry) throw ApiError.notFound('Contra entry not found');
  await entry.destroy();
  return { message: 'Contra entry deleted' };
};

const createIncomeHead = async (body) => {
  const count = await MasterOption.count({ where: { type: 'income_head' }, paranoid: false });
  const code = 'INC-HEAD-' + String(100 + count + 1);

  const option = await MasterOption.create({
    type: 'income_head',
    code,
    label: body.title || body.name,
    description: JSON.stringify({
      title: body.title || body.name,
    }),
    is_active: true,
  });

  return {
    id: option.id,
    code: option.code,
    title: option.label,
    creator: { full_name: 'Admin' },
    updater: { full_name: 'N/A' },
  };
};

const listIncomeHeads = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  let { rows, count } = await MasterOption.findAndCountAll({
    where: { type: 'income_head' },
    limit,
    offset,
    order: [['id', 'DESC']],
  });

  // BUG-019 — removed seed-on-GET: default income heads now seeded by migration 008

  const items = rows.map((opt) => {
    const extra = parseJsonDescription(opt.description);
    return {
      id: opt.id,
      code: opt.code,
      title: extra.title || opt.label,
      creator: { full_name: 'Admin' },
      updater: { full_name: 'N/A' },
      created_at: opt.createdAt,
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const updateIncomeHead = async (id, changes) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'income_head') throw ApiError.notFound('Income head not found');
  const title = changes.title || changes.name || option.label;
  await option.update({
    label: title,
    description: JSON.stringify({ title }),
  });
  return { id: option.id, code: option.code, title: option.label, creator: { full_name: 'Admin' } };
};

const removeIncomeHead = async (id) => {
  const option = await MasterOption.findByPk(id);
  if (!option || option.type !== 'income_head') throw ApiError.notFound('Income head not found');
  await option.destroy();
  return { message: 'Income head deleted' };
};

const getIncomeMeta = async () => {
  const { IncomeEntry } = require('../../models');
  const count = await IncomeEntry.count({ paranoid: false });
  const next_code = 'INC-' + String(100000 + count + 1);

  const { items: income_heads } = await listIncomeHeads({ limit: 100 });
  const { items: accounts } = await listAccounts({ limit: 100 });

  return {
    next_code,
    income_heads: income_heads.map((h) => ({ id: h.id, title: h.title })),
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
  };
};

const createIncome = async (body, currentUserId) => {
  const { IncomeEntry } = require('../../models');
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount < 0) throw ApiError.badRequest('Income amount cannot be negative');

  const count = await IncomeEntry.count({ paranoid: false });
  const code = body.income_code || 'INC-' + String(100000 + count + 1);

  const entry = await IncomeEntry.create({
    income_code: code,
    income_head_id: body.income_head_id || null,
    account_id: body.account_id || null,
    amount,
    income_date: body.income_date || new Date().toISOString().slice(0, 10),
    note: body.note || null,
    created_by: currentUserId || null,
  });

  return { id: entry.id, income_code: entry.income_code, amount: Number(entry.amount) };
};


// BUG-021 / BUG-016 — edit and delete on the real table.
const updateIncome = async (id, changes) => {
  const { IncomeEntry } = require('../../models');
  const entry = await IncomeEntry.findByPk(id);
  if (!entry) throw ApiError.notFound('Income entry not found');

  const next = {};
  if (changes.income_head_id !== undefined) next.income_head_id = changes.income_head_id || null;
  if (changes.account_id !== undefined) next.account_id = changes.account_id || null;
  if (changes.note !== undefined) next.note = changes.note;
  if (changes.income_date !== undefined) next.income_date = changes.income_date;
  if (changes.amount !== undefined) {
    const amount = Number(changes.amount);
    if (!Number.isFinite(amount) || amount < 0) throw ApiError.badRequest('Income amount cannot be negative');
    next.amount = amount;
  }

  await entry.update(next);
  return { id: entry.id, income_code: entry.income_code, amount: Number(entry.amount), ...next };
};

const removeIncome = async (id) => {
  const { IncomeEntry } = require('../../models');
  const entry = await IncomeEntry.findByPk(id);
  if (!entry) throw ApiError.notFound('Income entry not found');
  await entry.destroy();
  return { message: 'Income entry deleted' };
};


const listIncomes = async (query) => {
  // BUG-016 — same defect as contra: page-then-filter. Now filtered in SQL.
  const { IncomeEntry } = require('../../models');
  const { Op } = require('sequelize');
  const { dateOnlyRange } = require('../../utils/dateUtils');

  const { page, limit, offset } = parsePaging(query);
  const where = {};

  const range = dateOnlyRange(query);
  if (range) where.income_date = range;

  if (query.income_head_id && Number.isFinite(Number(query.income_head_id))) {
    where.income_head_id = Number(query.income_head_id);
  }
  if (query.account_id && Number.isFinite(Number(query.account_id))) {
    where.account_id = Number(query.account_id);
  }

  if (query.search && String(query.search).trim()) {
    const term = `%${String(query.search).trim()}%`;
    const clause = [{ income_code: { [Op.like]: term } }, { note: { [Op.like]: term } }];
    if (Number.isFinite(Number(query.search))) clause.push({ amount: Number(query.search) });
    where[Op.and] = [...(where[Op.and] || []), { [Op.or]: clause }];
  }

  const SORTABLE = { income_date: 'income_date', amount: 'amount', income_code: 'income_code', id: 'id' };
  const sortBy = SORTABLE[query.sort_by] || 'income_date';
  const sortDir = String(query.sort_dir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { rows, count } = await IncomeEntry.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, sortDir], ['id', 'DESC']],
  });

  const [headRows, accountRows] = await Promise.all([
    MasterOption.findAll({ where: { type: 'income_head' }, attributes: ['id', 'label'] }),
    MasterOption.findAll({ where: { type: 'payment_account' }, attributes: ['id', 'label'] }),
  ]);
  const headMap = new Map(headRows.map((h) => [String(h.id), h.label]));
  const accountMap = new Map(accountRows.map((a) => [String(a.id), a.label]));

  const items = rows.map((r) => ({
    id: r.id,
    income_code: r.income_code,
    amount: Number(r.amount),
    note: r.note,
    income_date: r.income_date,
    income_head_id: r.income_head_id,
    account_id: r.account_id,
    income_head: r.income_head_id ? { title: headMap.get(String(r.income_head_id)) || null } : null,
    account: r.account_id ? { name: accountMap.get(String(r.account_id)) || null } : null,
    created_at: r.createdAt,
  }));

  return { items, meta: buildMeta({ total: count, page, limit }) };
};


// BUG-021 — the Patient Due Collection page called
// GET /billing/patient-due-collections[/meta], which did not exist; the
// catch-all answered with an empty 200 so the page was permanently blank.
// Dues are derived from invoices/payments, which are authoritative.
const getPatientDueCollections = async (query = {}) => {
  const { Invoice, Patient, Payment } = require('../../models');
  const { Op, fn, col, literal } = require('sequelize');
  const { page, limit, offset } = parsePaging(query);
  const { dateTimeRange } = require('../../utils/dateUtils');

  const where = {
    status: { [Op.notIn]: ['void', 'draft'] },
    [Op.and]: [literal('total > paid_amount')],
  };
  const range = dateTimeRange(query);
  if (range) where.issued_at = range;
  if (query.patient_id) where.patient_id = query.patient_id;
  if (query.search && String(query.search).trim()) {
    const term = `%${String(query.search).trim()}%`;
    const matchingPatients = await Patient.findAll({
      attributes: ['id'],
      where: {
        [Op.or]: [
          { patient_code: { [Op.like]: term } },
          { full_name: { [Op.like]: term } },
          { phone: { [Op.like]: term } },
        ],
      },
      raw: true,
    });
    const matches = [{ invoice_code: { [Op.like]: term } }];
    if (matchingPatients.length) {
      matches.push({ patient_id: { [Op.in]: matchingPatients.map((patient) => patient.id) } });
    }
    where[Op.and].push({
      [Op.or]: matches,
    });
  }

  const { rows, count } = await Invoice.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
      { model: Payment, as: 'payments', attributes: ['id', 'amount', 'method', 'paid_at'] },
    ],
    limit,
    offset,
    order: [['issued_at', 'ASC']],
    distinct: true,
    subQuery: false,
  });

  const collectionRows = rows.map((inv) => {
    const total = toMoney(inv.total);
    const paid = toMoney(inv.paid_amount);
    const latestPayment = [...inv.payments].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0];
    return {
      id: inv.id,
      code: inv.invoice_code,
      issued_at: inv.issued_at,
      patient_id: inv.patient_id,
      patient: inv.patient
        ? {
            id: inv.patient.id,
            patient_code: inv.patient.patient_code,
            full_name: inv.patient.full_name,
            phone: inv.patient.phone,
          }
        : null,
      total_amount: total,
      paid_amount: paid,
      amount: money.subFloor(total, paid),
      account: latestPayment?.method || 'Unpaid',
      status: inv.status,
      last_payment_at: latestPayment?.paid_at || null,
      source: inv.lab_order_id
        ? 'Pathology'
        : inv.opd_visit_id
          ? 'OPD'
          : inv.appointment_id
            ? 'Appointment'
            : inv.radiology_order_id
              ? 'Radiology'
              : inv.admission_id
                ? 'IPD'
                : inv.blood_issue_id
                  ? 'Blood Bank'
                  : inv.ambulance_trip_id
                    ? 'Ambulance'
                    : 'General',
    };
  });

  const items = { pathology: [], opd: [], appointment: [], other: [] };
  for (const item of collectionRows) {
    if (item.source === 'Pathology') items.pathology.push(item);
    else if (item.source === 'OPD') items.opd.push(item);
    else if (item.source === 'Appointment') items.appointment.push(item);
    else items.other.push(item);
  }

  const [totalsRow] = await Invoice.findAll({
    attributes: [
      [fn('SUM', col('total')), 'billed'],
      [fn('SUM', col('paid_amount')), 'paid'],
      [fn('SUM', literal('total - paid_amount')), 'due'],
    ],
    where,
    raw: true,
  });

  return {
    items,
    meta: {
      totals: {
        billed: toMoney(totalsRow?.billed),
        paid: toMoney(totalsRow?.paid),
        due: toMoney(totalsRow?.due),
      },
      ...buildMeta({ total: count, page, limit }),
    },
  };
};

const getPatientDueCollectionMeta = async () => {
  const { Patient } = require('../../models');
  const patients = await Patient.findAll({
    attributes: ['id', 'patient_code', 'full_name', 'phone'],
    order: [['patient_code', 'ASC']],
  });
  const { items: accounts } = await listAccounts({ limit: 100 });
  return {
    patients: patients.map((p) => p.toJSON()),
    accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
  };
};

module.exports = {
  getPatientDueCollections,
  getPatientDueCollectionMeta,
  listInvoices,
  getInvoice,
  getInvoicePrint,
  createInvoice,
  updateInvoice,
  removeInvoice,
  listPayments,
  getPayment,
  createPayment,
  removePayment,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  listExpenses,
  getExpense,
  getExpenseMeta,
  createExpense,
  updateExpense,
  removeExpense,
  listAccounts,
  createAccount,
  updateAccount,
  removeAccount,
  getTaxRateMeta,
  createTaxRate,
  listTaxRates,
  updateTaxRate,
  removeTaxRate,
  createIncomeHead,
  listIncomeHeads,
  updateIncomeHead,
  removeIncomeHead,
  getIncomeMeta,
  createIncome,
  listIncomes,
  getContraMeta,
  createContra,
  listContra,
  removeContra,
};
