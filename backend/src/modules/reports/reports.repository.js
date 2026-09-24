'use strict';

const { Op, Sequelize } = require('sequelize');
const {
  Patient,
  Doctor,
  User,
  Appointment,
  Admission,
  Bed,
  BloodBag,
  Medicine,
  MedicineSale,
  Invoice,
  Payment,
  Expense,
  ExpenseCategory,
  OpdVisit,
  LabOrder,
  RadiologyOrder,
  AmbulanceTrip,
  Referral,
} = require('../../models');

// BUG-017 — these two helpers were the direct cause of empty finance reports.
// `new Date(to + 'T23:59:59.999Z')` concatenated a string onto a Date (Joi had
// already converted the query parameter), yielding an Invalid Date that matched
// no rows. Both now delegate to the shared, timezone-aware range builders so
// every report resolves boundaries identically to the module list endpoints.
const { dateTimeRange, dateOnlyRange } = require('../../utils/dateUtils');
const money = require('../../utils/money');

/** For DATEONLY columns (appointment_date, expense_date). */
const dateRangeWhere = (field, range = {}) => {
  const built = dateOnlyRange(range);
  return built ? { [field]: built } : {};
};

/** For DATETIME columns stored in UTC (paid_at, issued_at, ordered_at, ...). */
const dateTimeRangeWhere = (field, range = {}) => {
  const built = dateTimeRange(range);
  return built ? { [field]: built } : {};
};

const countPatients = () => Patient.count();
const countDoctors = () => Doctor.count();
const countActiveAdmissions = (status) => Admission.count({ where: { status } });
const countTodayAppointments = (today) => Appointment.count({ where: { appointment_date: today } });
const countLowStockMedicines = () =>
  Medicine.count({
    where: {
      is_active: true,
      [Op.and]: [Sequelize.where(Sequelize.col('stock_quantity'), Op.lte, Sequelize.col('reorder_level'))],
    },
  });
const countAvailableBloodBags = (status) => BloodBag.count({ where: { status } });

const sumPayments = (range) =>
  Payment.sum('amount', { where: dateTimeRangeWhere('paid_at', range) });
const sumExpenses = (range) =>
  Expense.sum('amount', { where: dateRangeWhere('expense_date', range) });
const sumInvoices = (range) =>
  Invoice.sum('total', { where: dateTimeRangeWhere('issued_at', range) });
// BUG-067 — outstanding used to ignore the selected period entirely (so it was
// an all-time figure sitting beside period-filtered totals) and counted `draft`
// invoices, which are not yet receivable.
const sumOutstandingInvoices = async (excludedStatus, range = {}) => {
  const row = await Invoice.findOne({
    attributes: [[Sequelize.fn('SUM', Sequelize.literal('total - paid_amount')), 'total']],
    where: {
      status: { [Op.notIn]: [excludedStatus, 'draft'] },
      ...dateTimeRangeWhere('issued_at', range),
    },
    raw: true,
  });
  return row?.total || 0;
};

const countByStatus = (model, statusField, extraWhere = {}) =>
  model.findAll({
    attributes: [statusField, [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
    where: extraWhere,
    group: [statusField],
    raw: true,
  });

const appointmentStatusCounts = (range) =>
  countByStatus(Appointment, 'status', dateRangeWhere('appointment_date', range));

const appointmentDailyCounts = (range) =>
  Appointment.findAll({
    attributes: ['appointment_date', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
    where: dateRangeWhere('appointment_date', range),
    group: ['appointment_date'],
    order: [['appointment_date', 'ASC']],
    raw: true,
  });

const invoiceStatusCounts = (range) =>
  countByStatus(Invoice, 'status', dateTimeRangeWhere('issued_at', range));

const paymentMethodTotals = (range) =>
  Payment.findAll({
    attributes: ['method', [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']],
    where: dateTimeRangeWhere('paid_at', range),
    group: ['method'],
    raw: true,
  });

const expenseCategoryTotals = (range) =>
  Expense.findAll({
    attributes: [
      [Sequelize.col('category.id'), 'category_id'],
      [Sequelize.col('category.name'), 'category_name'],
      [Sequelize.fn('SUM', Sequelize.col('Expense.amount')), 'total'],
    ],
    include: [{ model: ExpenseCategory, as: 'category', attributes: [] }],
    where: dateRangeWhere('expense_date', range),
    group: ['category.id', 'category.name'],
    raw: true,
  });

const bedStatusCounts = () => countByStatus(Bed, 'status');

const bloodStockCounts = () =>
  BloodBag.findAll({
    attributes: [
      'blood_group',
      'component',
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['blood_group', 'component', 'status'],
    order: [
      ['blood_group', 'ASC'],
      ['component', 'ASC'],
      ['status', 'ASC'],
    ],
    raw: true,
  });

const pharmacyStockSummary = () =>
  Medicine.findAll({
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_medicines'],
      [Sequelize.fn('SUM', Sequelize.col('stock_quantity')), 'total_units'],
      [Sequelize.fn('SUM', Sequelize.literal('stock_quantity * sale_price')), 'stock_value'],
    ],
    where: { is_active: true },
    raw: true,
  });

const lowStockMedicines = (limit = 20) =>
  Medicine.findAll({
    where: {
      is_active: true,
      [Op.and]: [Sequelize.where(Sequelize.col('stock_quantity'), Op.lte, Sequelize.col('reorder_level'))],
    },
    attributes: ['id', 'code', 'name', 'category', 'stock_quantity', 'reorder_level', 'sale_price'],
    order: [
      ['stock_quantity', 'ASC'],
      ['name', 'ASC'],
    ],
    limit,
  });

// Models retrieval for reports logic
const getPatientsList = async ({ search, patient_id, limit = 100, page = 1 } = {}) => {
  const where = {};
  if (patient_id) where.id = patient_id;
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { patient_code: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  const offset = (Math.max(Number(page), 1) - 1) * Number(limit);
  const { rows, count } = await Patient.findAndCountAll({
    where,
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
  });
  return { rows, count };
};

/**
 * BUG-033 — patient balances for a whole page of patients in a fixed number of
 * queries.
 *
 * The report previously ran three queries per patient (invoices, payments,
 * opening balance) inside a Promise.all over the page, so cost grew linearly
 * with page size: `?limit=100000` meant up to 300,000 round trips, each also
 * materialising full row objects only to sum one column. This groups by
 * patient_id and sums in SQL instead — 2 queries for the in-range figures plus
 * 2 more only when an opening balance is required, regardless of page size.
 *
 * Void invoices are excluded from every leg. The old code excluded them from the
 * opening balance but not from the in-range debit, so a voided invoice inflated
 * a patient's balance whenever it fell inside the selected period.
 */
const patientBalanceAggregates = async (patientIds, range = {}, from = null) => {
  const empty = new Map();
  if (!Array.isArray(patientIds) || patientIds.length === 0) return empty;

  const idFilter = { [Op.in]: patientIds };
  const notVoid = { [Op.ne]: 'void' };

  const sumBy = (rows, key, value) => {
    const map = new Map();
    rows.forEach((row) => map.set(Number(row[key]), row[value]));
    return map;
  };

  const [invoiceRows, paymentRows] = await Promise.all([
    Invoice.findAll({
      attributes: ['patient_id', [Sequelize.fn('SUM', Sequelize.col('total')), 'amount']],
      where: { patient_id: idFilter, status: notVoid, ...dateTimeRangeWhere('issued_at', range) },
      group: ['patient_id'],
      raw: true,
    }),
    Payment.findAll({
      attributes: [
        [Sequelize.col('invoice.patient_id'), 'patient_id'],
        [Sequelize.fn('SUM', Sequelize.col('Payment.amount')), 'amount'],
      ],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: [],
          where: { patient_id: idFilter, status: notVoid },
          required: true,
        },
      ],
      where: dateTimeRangeWhere('paid_at', range),
      group: [Sequelize.col('invoice.patient_id')],
      raw: true,
    }),
  ]);

  const debits = sumBy(invoiceRows, 'patient_id', 'amount');
  const credits = sumBy(paymentRows, 'patient_id', 'amount');

  // BUG-032 — carry-in balance from strictly before the range start.
  let openInvoices = new Map();
  let openPayments = new Map();
  if (from) {
    const { startInstant } = require('../../utils/timeRange');
    const config = require('../../config');
    const boundary = startInstant(from, config.timezone);
    if (boundary) {
      const [openInvRows, openPayRows] = await Promise.all([
        Invoice.findAll({
          attributes: ['patient_id', [Sequelize.fn('SUM', Sequelize.col('total')), 'amount']],
          where: { patient_id: idFilter, status: notVoid, issued_at: { [Op.lt]: boundary } },
          group: ['patient_id'],
          raw: true,
        }),
        Payment.findAll({
          attributes: [
            [Sequelize.col('invoice.patient_id'), 'patient_id'],
            [Sequelize.fn('SUM', Sequelize.col('Payment.amount')), 'amount'],
          ],
          include: [
            {
              model: Invoice,
              as: 'invoice',
              attributes: [],
              where: { patient_id: idFilter, status: notVoid },
              required: true,
            },
          ],
          where: { paid_at: { [Op.lt]: boundary } },
          group: [Sequelize.col('invoice.patient_id')],
          raw: true,
        }),
      ]);
      openInvoices = sumBy(openInvRows, 'patient_id', 'amount');
      openPayments = sumBy(openPayRows, 'patient_id', 'amount');
    }
  }

  const result = new Map();
  patientIds.forEach((id) => {
    const key = Number(id);
    result.set(key, {
      debit: debits.get(key) ?? 0,
      credit: credits.get(key) ?? 0,
      opening_debit: openInvoices.get(key) ?? 0,
      opening_credit: openPayments.get(key) ?? 0,
    });
  });
  return result;
};

const getPatientInvoices = (patientId, range = {}) =>
  Invoice.findAll({
    where: { patient_id: patientId, ...dateTimeRangeWhere('issued_at', range) },
    order: [['issued_at', 'ASC']],
  });

const getPatientPayments = (patientId, range = {}) =>
  Payment.findAll({
    where: dateTimeRangeWhere('paid_at', range),
    include: [
      {
        model: Invoice,
        as: 'invoice',
        where: { patient_id: patientId },
        required: true,
        attributes: ['id', 'patient_id'],
      },
    ],
    order: [['paid_at', 'ASC']],
  });

const getPayments = (range = {}, method = null) => {
  const where = { ...dateTimeRangeWhere('paid_at', range) };
  if (method) where.method = method;
  return Payment.findAll({
    where,
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['id', 'invoice_code'],
        include: [{ model: Patient, as: 'patient', attributes: ['full_name', 'patient_code'] }],
      },
    ],
    order: [['paid_at', 'ASC']],
  });
};

const getExpenses = (range = {}, method = null) => {
  const where = { ...dateRangeWhere('expense_date', range) };
  if (method) where.payment_method = method;
  return Expense.findAll({
    where,
    include: [{ model: ExpenseCategory, as: 'category', attributes: ['name'] }],
    order: [['expense_date', 'ASC']],
  });
};

const getLabOrdersForStatement = (range = {}) =>
  LabOrder.findAll({
    where: dateTimeRangeWhere('ordered_at', range),
    include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
    order: [['ordered_at', 'ASC']],
  });

const getRadiologyOrdersForStatement = (range = {}) =>
  RadiologyOrder.findAll({
    where: dateTimeRangeWhere('ordered_at', range),
    include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
    order: [['ordered_at', 'ASC']],
  });

const getOpdVisitsForStatement = (range = {}) =>
  OpdVisit.findAll({
    where: dateTimeRangeWhere('visit_date', range),
    include: [
      { model: Patient, as: 'patient', attributes: ['full_name'] },
      {
        model: Doctor,
        as: 'doctor',
        attributes: ['doctor_code'],
        include: [{ model: User, as: 'user', attributes: ['full_name'] }],
      },
    ],
    order: [['visit_date', 'ASC']],
  });

const getAdmissionsForStatement = (range = {}) =>
  Admission.findAll({
    where: dateTimeRangeWhere('admitted_at', range),
    include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
    order: [['admitted_at', 'ASC']],
  });

const getMedicineSalesForStatement = (range = {}) =>
  MedicineSale.findAll({
    where: dateTimeRangeWhere('sold_at', range),
    include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
    order: [['sold_at', 'ASC']],
  });

const getAmbulanceTripsForStatement = (range = {}) =>
  AmbulanceTrip.findAll({
    where: dateTimeRangeWhere('dispatched_at', range),
    include: [{ model: Patient, as: 'patient', attributes: ['full_name'] }],
    order: [['dispatched_at', 'ASC']],
  });


// BUG-029 — the dashboard's per-module billing tiles were hardcoded zeros and
// all revenue was attributed to Cash with Bank pinned at 0. These queries derive
// every tile from the authoritative invoice/payment records, using the encounter
// link columns added by migrations 005/006. Pharmacy is taken from
// medicine_sales because a counter sale is settled outside invoices.
const moduleBillingTotals = async (range = {}) => {
  const where = dateTimeRangeWhere('issued_at', range);
  const invoiceWhere = { ...where, status: { [Op.ne]: 'void' } };

  const LINKS = {
    opd: 'opd_visit_id',
    ipd: 'admission_id',
    pathology: 'lab_order_id',
    radiology: 'radiology_order_id',
    blood: 'blood_issue_id',
    ambulance: 'ambulance_trip_id',
    appointment: 'appointment_id',
  };

  const attributes = [];
  for (const [key, column] of Object.entries(LINKS)) {
    attributes.push([
      Sequelize.literal(`SUM(CASE WHEN \`${column}\` IS NOT NULL THEN total ELSE 0 END)`),
      `${key}_amount`,
    ]);
    attributes.push([
      Sequelize.literal(`SUM(CASE WHEN \`${column}\` IS NOT NULL THEN paid_amount ELSE 0 END)`),
      `${key}_paid`,
    ]);
    attributes.push([
      Sequelize.literal(`COUNT(CASE WHEN \`${column}\` IS NOT NULL THEN 1 END)`),
      `${key}_count`,
    ]);
  }

  const [row] = await Invoice.findAll({ attributes, where: invoiceWhere, raw: true });

  const [pharmacyRow] = await MedicineSale.findAll({
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      [Sequelize.fn('SUM', Sequelize.col('total')), 'amount'],
    ],
    where: { ...dateTimeRangeWhere('sold_at', range), status: 'completed' },
    raw: true,
  });

  const out = {};
  for (const key of Object.keys(LINKS)) {
    out[key] = {
      count: Number(row?.[`${key}_count`] || 0),
      amount: Number(row?.[`${key}_amount`] || 0),
      paid: Number(row?.[`${key}_paid`] || 0),
    };
  }
  const pharmacyAmount = Number(pharmacyRow?.amount || 0);
  out.pharmacy = {
    count: Number(pharmacyRow?.count || 0),
    amount: pharmacyAmount,
    paid: pharmacyAmount, // settled at the counter
  };
  return out;
};

// BUG-029 — cash vs bank split, from the actual payment method rather than
// assuming every collection was cash.
const collectionsByAccountGroup = async (range = {}) => {
  const rows = await Payment.findAll({
    attributes: ['method', [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']],
    where: dateTimeRangeWhere('paid_at', range),
    group: ['method'],
    raw: true,
  });
  const out = { cash: 0, bank: 0, mobile_banking: 0, card: 0, cheque: 0, insurance: 0 };
  for (const r of rows) {
    const amount = Number(r.total || 0);
    if (r.method === 'cash') out.cash += amount;
    else if (r.method === 'bank_transfer' || r.method === 'cheque') out.bank += amount;
    else out[r.method] = (out[r.method] || 0) + amount;
  }
  return out;
};

// BUG-032 — opening balance for a patient: everything invoiced minus everything
// paid STRICTLY BEFORE the range start. Without this, a date-filtered ledger
// reported a long-standing debtor as owing nothing.
const patientOpeningBalance = async (patientId, from) => {
  if (!from) return 0;
  const { startInstant } = require('../../utils/timeRange');
  const config = require('../../config');
  const boundary = startInstant(from, config.timezone);
  if (!boundary) return 0;

  const [invRow] = await Invoice.findAll({
    attributes: [[Sequelize.fn('SUM', Sequelize.col('total')), 'total']],
    where: { patient_id: patientId, issued_at: { [Op.lt]: boundary }, status: { [Op.ne]: 'void' } },
    raw: true,
  });
  const [payRow] = await Payment.findAll({
    attributes: [[Sequelize.fn('SUM', Sequelize.col('Payment.amount')), 'total']],
    include: [{ model: Invoice, as: 'invoice', attributes: [], where: { patient_id: patientId }, required: true }],
    where: { paid_at: { [Op.lt]: boundary } },
    raw: true,
  });
  return money.sub(invRow?.total, payRow?.total);
};

// BUG-032 — opening balance for a cash/bank account: receipts minus expenses
// strictly before the range start.
const accountOpeningBalance = async (method, from) => {
  if (!from) return 0;
  const { startInstant, calendarDate } = require('../../utils/timeRange');
  const config = require('../../config');
  const boundary = startInstant(from, config.timezone);
  if (!boundary) return 0;

  const payWhere = { paid_at: { [Op.lt]: boundary } };
  if (method) payWhere.method = method;
  const [payRow] = await Payment.findAll({
    attributes: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'total']],
    where: payWhere,
    raw: true,
  });

  const expWhere = { expense_date: { [Op.lt]: calendarDate(from, config.timezone) } };
  if (method) expWhere.payment_method = method;
  const [expRow] = await Expense.findAll({
    attributes: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'total']],
    where: expWhere,
    raw: true,
  });

  return money.sub(payRow?.total, expRow?.total);
};

const getReferralsList = async ({ search, person_id } = {}) => {
  const where = {};
  if (person_id) where.id = person_id;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { referral_code: { [Op.like]: `%${search}%` } },
    ];
  }
  return Referral.findAll({ where, order: [['name', 'ASC']] });
};

module.exports = {
  moduleBillingTotals,
  collectionsByAccountGroup,
  patientOpeningBalance,
  accountOpeningBalance,
  countPatients,
  countDoctors,
  countActiveAdmissions,
  countTodayAppointments,
  countLowStockMedicines,
  countAvailableBloodBags,
  sumPayments,
  sumExpenses,
  sumInvoices,
  sumOutstandingInvoices,
  appointmentStatusCounts,
  appointmentDailyCounts,
  invoiceStatusCounts,
  paymentMethodTotals,
  expenseCategoryTotals,
  bedStatusCounts,
  bloodStockCounts,
  pharmacyStockSummary,
  lowStockMedicines,
  getPatientsList,
  patientBalanceAggregates,
  getPatientInvoices,
  getPatientPayments,
  getPayments,
  getExpenses,
  getLabOrdersForStatement,
  getRadiologyOrdersForStatement,
  getOpdVisitsForStatement,
  getAdmissionsForStatement,
  getMedicineSalesForStatement,
  getAmbulanceTripsForStatement,
  getReferralsList,
};
