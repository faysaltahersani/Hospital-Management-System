'use strict';

// Sequelize options (notably `transaction`) are forwarded by every helper below.
// They used to be dropped: a service inside `sequelize.transaction(async (t))`
// would call `repository.create(data, { transaction: t })` and the row was written
// on a DIFFERENT pooled connection, outside the transaction. Two consequences,
// both observed under a 50-user load test:
//   * the write was not rolled back with its transaction, leaving orphans (an OPD
//     visit with no invoice when the billing step failed)
//   * each request needed a second connection while holding one, so with
//     DB_POOL_MAX=10 concurrent writers deadlocked the pool until the acquire
//     timeout fired

const { Op, Sequelize } = require('sequelize');
const { dateTimeRange, dateOnlyRange } = require('../../utils/dateUtils');
const {
  Invoice,
  InvoiceItem,
  Payment,
  Patient,
  Appointment,
  User,
  ExpenseCategory,
  Expense,
} = require('../../models');

const invoiceIncludes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  { model: Appointment, as: 'appointment', attributes: ['id', 'appointment_code', 'appointment_date'] },
  { model: InvoiceItem, as: 'items' },
  { model: Payment, as: 'payments' },
];

const findAndCountInvoices = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.issued_at = range;
  if (search) {
    where[Op.or] = [
      { invoice_code: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Invoice.findAndCountAll({
    where,
    include: invoiceIncludes,
    limit,
    offset,
    order: [['issued_at', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

const findInvoiceById = (id, options = {}) => Invoice.findByPk(id, { include: invoiceIncludes, ...options });

/**
 * Locks ONE invoice row for update, with no associations joined.
 *
 * Locking through `findInvoiceById` instead was a serious concurrency defect:
 * `SELECT ... FOR UPDATE` across the joins takes next-key locks on the joined
 * `payments` rows and the gaps between them, so a second transaction inserting a
 * payment for the same invoice blocked on the first transaction's read lock.
 * With several cashiers posting against one invoice the transactions formed a
 * lock cycle that MariaDB only broke at the 50-second timeout: a measured 10
 * concurrent payments produced nine HTTP 500s and one 50.6-second success.
 *
 * Nothing needed the joined rows under the lock — the guards read `status`,
 * `total` and `invoice_code`, and the payment total is summed separately. Locking
 * the single row serialises writers on the invoice without locking the payments
 * table they are trying to insert into.
 */
const lockInvoiceById = (id, transaction) =>
  Invoice.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });

/** Invoice row on its own, for internal reconciliation reads. */
const findInvoiceRow = (id, options = {}) => Invoice.findByPk(id, options);
const countInvoicesForYear = (year, options = {}) =>
  Invoice.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createInvoice = (data, options = {}) => Invoice.create(data, options);
const updateInvoice = (invoice, changes, options = {}) => invoice.update(changes, options);
const destroyInvoice = (invoice, options = {}) => invoice.destroy(options);
const createInvoiceItems = (items, options = {}) => InvoiceItem.bulkCreate(items, options);
const deleteInvoiceItems = (invoiceId, options = {}) =>
  InvoiceItem.destroy({ where: { invoice_id: invoiceId }, ...options });

const paymentIncludes = [
  { model: Invoice, as: 'invoice', attributes: ['id', 'invoice_code', 'total', 'paid_amount', 'status'] },
  { model: User, as: 'receiver', attributes: ['id', 'full_name', 'email'] },
];

const findAndCountPayments = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.paid_at = range;
  if (search) {
    where[Op.or] = [
      { payment_code: { [Op.like]: `%${search}%` } },
      { reference: { [Op.like]: `%${search}%` } },
      { '$invoice.invoice_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Payment.findAndCountAll({
    where,
    include: paymentIncludes,
    limit,
    offset,
    order: [['paid_at', 'DESC']],
    distinct: true,
  });
};

const findPaymentById = (id, options = {}) => Payment.findByPk(id, { include: paymentIncludes, ...options });
const countPaymentsForYear = (year, options = {}) =>
  Payment.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createPayment = (data, options = {}) => Payment.create(data, options);
// The delete must join the caller's transaction: without it the row was removed
// outside the transaction, so the reconcile that follows still saw it in its
// snapshot and wrote back a paid_amount that included the deleted payment.
const destroyPayment = (payment, options = {}) => payment.destroy(options);

const findAndCountCategories = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
  return ExpenseCategory.findAndCountAll({ where, limit, offset, order: [['name', 'ASC']] });
};

const findCategoryById = (id, options = {}) => ExpenseCategory.findByPk(id, options);
const findCategoryByName = (name, options = {}) => ExpenseCategory.findOne({ where: { name }, ...options });
const createCategory = (data, options = {}) => ExpenseCategory.create(data, options);
const updateCategory = (category, changes, options = {}) => category.update(changes, options);
const destroyCategory = (category, options = {}) => category.destroy(options);

const expenseIncludes = [
  { model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] },
];

const findAndCountExpenses = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateOnlyRange(dateRange);
  if (range) where.expense_date = range;
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { reference: { [Op.like]: `%${search}%` } },
    ];
  }
  return Expense.findAndCountAll({
    where,
    include: expenseIncludes,
    limit,
    offset,
    order: [['expense_date', 'DESC']],
    distinct: true,
  });
};

const findExpenseById = (id, options = {}) => Expense.findByPk(id, { include: expenseIncludes, ...options });
const createExpense = (data, options = {}) => Expense.create(data, options);
const updateExpense = (expense, changes, options = {}) => expense.update(changes, options);
const destroyExpense = (expense, options = {}) => expense.destroy(options);

module.exports = {
  findAndCountInvoices,
  findInvoiceById,
  lockInvoiceById,
  findInvoiceRow,
  countInvoicesForYear,
  createInvoice,
  updateInvoice,
  destroyInvoice,
  createInvoiceItems,
  deleteInvoiceItems,
  findAndCountPayments,
  findPaymentById,
  countPaymentsForYear,
  createPayment,
  destroyPayment,
  findAndCountCategories,
  findCategoryById,
  findCategoryByName,
  createCategory,
  updateCategory,
  destroyCategory,
  findAndCountExpenses,
  findExpenseById,
  createExpense,
  updateExpense,
  destroyExpense,
};
