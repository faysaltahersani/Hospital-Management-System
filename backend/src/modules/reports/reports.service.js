'use strict';

const {
  ADMISSION_STATUS,
  BLOOD_BAG_STATUS,
  INVOICE_STATUS,
} = require('../../config/constants');
const config = require('../../config');
const money = require('../../utils/money');
const repository = require('./reports.repository');
const { Op } = require('sequelize');
const { dateOnlyRange } = require('../../utils/dateUtils');

// BUG-033 — upper bound on any paginated report page. Chosen to stay well inside
// a single grouped IN(...) query while still allowing a full ward/day export.
const MAX_REPORT_PAGE_SIZE = 200;
const { MasterOption, Referral, Doctor, User, Patient, IncomeEntry, ContraEntry } = require('../../models');

const parseJsonDescription = (desc) => {
  if (!desc) return {};
  if (typeof desc === 'object') return desc;
  try {
    return JSON.parse(desc);
  } catch {
    return {};
  }
};

// BUG-054 - normalises a DECIMAL/aggregate value to an exact 2dp number.
// `Number(value || 0)` let 1050.0000000000001-style values straight into the
// report output and into the running-balance accumulators below.
const toNumber = (value) => money.toMajor(money.toMinor(value));

const normalizeCounts = (rows, key = 'status') =>
  rows.reduce((acc, row) => ({ ...acc, [row[key]]: Number(row.count) }), {});

const normalizeTotals = (rows, key = 'method') =>
  rows.reduce((acc, row) => ({ ...acc, [row[key] || 'uncategorized']: toNumber(row.total) }), {});

// BUG-068 - toISOString() gave the UTC day, so between 00:00 and 06:00 local
// the dashboard showed *yesterday* appointments.
const todayString = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const dashboard = async (query) => {
  const range = { from: query.from, to: query.to };
  const [
    totalPatients,
    totalDoctors,
    activeAdmissions,
    todayAppointments,
    lowStockMedicines,
    availableBloodBags,
    revenue,
    expenses,
    billed,
    outstanding,
    appointmentStatuses,
    bedStatuses,
  ] = await Promise.all([
    repository.countPatients(),
    repository.countDoctors(),
    repository.countActiveAdmissions(ADMISSION_STATUS.ADMITTED),
    repository.countTodayAppointments(todayString()),
    repository.countLowStockMedicines(),
    repository.countAvailableBloodBags(BLOOD_BAG_STATUS.AVAILABLE),
    repository.sumPayments(range),
    repository.sumExpenses(range),
    repository.sumInvoices(range),
    repository.sumOutstandingInvoices(INVOICE_STATUS.VOID, range),
    repository.appointmentStatusCounts(range),
    repository.bedStatusCounts(),
  ]);

  // BUG-029 — computed, not hardcoded. "Today" and "this month" are resolved in
  // the hospital timezone so the tiles match what staff see on the wall clock.
  const today = todayString();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [todayBilling, monthBilling, accountGroups] = await Promise.all([
    repository.moduleBillingTotals({ from: today, to: today }),
    repository.moduleBillingTotals({ from: monthStart, to: today }),
    repository.collectionsByAccountGroup(range),
  ]);

  const bedCounts = normalizeCounts(bedStatuses);
  return {
    totals: {
      patients: totalPatients,
      doctors: totalDoctors,
      active_admissions: activeAdmissions,
      today_appointments: todayAppointments,
      low_stock_medicines: lowStockMedicines,
      available_blood_bags: availableBloodBags,
      available_beds: bedCounts.available || 0,
    },
    finance: {
      billed: toNumber(billed),
      revenue: toNumber(revenue),
      expenses: toNumber(expenses),
      net: money.sub(revenue, expenses),
      outstanding: toNumber(outstanding),
    },
    today_billing: {
      pathology: todayBilling.pathology,
      radiology: todayBilling.radiology,
      pharmacy: todayBilling.pharmacy,
      ipd: todayBilling.ipd,
      ambulance: todayBilling.ambulance,
      opd: todayBilling.opd,
      appointment: todayBilling.appointment,
      blood: todayBilling.blood,
      collections: toNumber(revenue),
    },
    // Split by the actual payment method instead of assuming everything is cash.
    accounts: accountGroups,
    monthly_billing: {
      pathology: monthBilling.pathology.amount,
      radiology: monthBilling.radiology.amount,
      opd: monthBilling.opd.amount,
      ipd: monthBilling.ipd.amount,
      pharmacy: monthBilling.pharmacy.amount,
      appointment: monthBilling.appointment.amount,
      ambulance: monthBilling.ambulance.amount,
      blood: monthBilling.blood.amount,
    },
    appointments_by_status: normalizeCounts(appointmentStatuses),
    beds_by_status: bedCounts,
  };
};

const appointments = async (query) => {
  const range = { from: query.from, to: query.to };
  const [byStatus, byDate] = await Promise.all([
    repository.appointmentStatusCounts(range),
    repository.appointmentDailyCounts(range),
  ]);
  return {
    by_status: normalizeCounts(byStatus),
    by_date: byDate.map((row) => ({
      date: row.appointment_date,
      count: Number(row.count),
    })),
  };
};

const finance = async (query) => {
  const range = { from: query.from, to: query.to };
  const [billed, revenue, expenses, outstanding, invoicesByStatus, paymentsByMethod, expensesByCategory] =
    await Promise.all([
      repository.sumInvoices(range),
      repository.sumPayments(range),
      repository.sumExpenses(range),
      repository.sumOutstandingInvoices(INVOICE_STATUS.VOID, range),
      repository.invoiceStatusCounts(range),
      repository.paymentMethodTotals(range),
      repository.expenseCategoryTotals(range),
    ]);

  return {
    totals: {
      billed: toNumber(billed),
      revenue: toNumber(revenue),
      expenses: toNumber(expenses),
      net: money.sub(revenue, expenses),
      outstanding: toNumber(outstanding),
    },
    invoices_by_status: normalizeCounts(invoicesByStatus),
    payments_by_method: normalizeTotals(paymentsByMethod, 'method'),
    expenses_by_category: expensesByCategory.map((row) => ({
      category_id: row.category_id || null,
      category_name: row.category_name || 'uncategorized',
      total: toNumber(row.total),
    })),
  };
};

const bedOccupancy = async () => {
  const rows = await repository.bedStatusCounts();
  const byStatus = normalizeCounts(rows);
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const occupied = byStatus.occupied || 0;
  return {
    total,
    occupied,
    available: byStatus.available || 0,
    occupancy_rate: total > 0 ? Number(((occupied / total) * 100).toFixed(2)) : 0,
    by_status: byStatus,
  };
};

const bloodStock = async () => {
  const rows = await repository.bloodStockCounts();
  return rows.map((row) => ({
    blood_group: row.blood_group,
    component: row.component,
    status: row.status,
    count: Number(row.count),
  }));
};

const pharmacyStock = async (query) => {
  const [summaryRows, lowStockRows] = await Promise.all([
    repository.pharmacyStockSummary(),
    repository.lowStockMedicines(query.limit || 20),
  ]);
  const summary = summaryRows[0] || {};
  return {
    summary: {
      total_medicines: Number(summary.total_medicines || 0),
      total_units: Number(summary.total_units || 0),
      stock_value: toNumber(summary.stock_value),
    },
    low_stock: lowStockRows.map((row) => row.toJSON()),
  };
};

const patientBalance = async (query = {}) => {
  const page = Math.max(Number(query.page || 1), 1);
  // BUG-033 — a hard cap, enforced here as well as in the request schema so the
  // query cost stays bounded no matter how the endpoint is reached.
  const limit = Math.min(Math.max(Number(query.limit || 30), 1), MAX_REPORT_PAGE_SIZE);

  const { rows: patients, count } = await repository.getPatientsList({
    search: query.search,
    patient_id: query.patient_id,
    page,
    limit,
  });

  const range = { from: query.from, to: query.to };

  // BUG-033 — one grouped aggregate for the whole page instead of three queries
  // per patient. Query count is now independent of `limit`.
  const aggregates = await repository.patientBalanceAggregates(
    patients.map((p) => p.id),
    range,
    query.from
  );

  const data = patients.map((p) => {
    const agg = aggregates.get(Number(p.id)) || {
      debit: 0,
      credit: 0,
      opening_debit: 0,
      opening_credit: 0,
    };
    // BUG-054 — exact money, so a page of balances sums to the same value the
    // DECIMAL columns hold.
    const debit = money.toMajor(money.toMinor(agg.debit));
    const credit = money.toMajor(money.toMinor(agg.credit));
    // BUG-032 — without this, filtering to a period reported a patient with a
    // long-standing due as owing nothing.
    const opening = money.sub(agg.opening_debit, agg.opening_credit);

    return {
      id: p.id,
      name: p.full_name,
      code: p.patient_code,
      opening,
      debit,
      credit,
      balance: money.sub(money.add(opening, debit), credit),
    };
  });

  const totals = data.reduce(
    (acc, item) => ({
      opening: money.add(acc.opening, item.opening),
      debit: money.add(acc.debit, item.debit),
      credit: money.add(acc.credit, item.credit),
      balance: money.add(acc.balance, item.balance),
    }),
    { opening: 0, debit: 0, credit: 0, balance: 0 }
  );

  return {
    data,
    meta: {
      totals,
      pagination: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit) || 1,
      },
    },
  };
};

const patientLedger = async (query = {}) => {
  if (!query.patient_id) {
    const defaultPatient = (await repository.getPatientsList({ limit: 1 })).rows[0];
    if (!defaultPatient) {
      return {
        patient: null,
        opening_balance: 0,
        totals: { debit: 0, credit: 0, closing_balance: 0 },
        entries: [],
      };
    }
    query.patient_id = defaultPatient.id;
  }

  const { rows } = await repository.getPatientsList({ patient_id: query.patient_id });
  const patient = rows[0];
  if (!patient) {
    return {
      patient: null,
      opening_balance: 0,
      totals: { debit: 0, credit: 0, closing_balance: 0 },
      entries: [],
    };
  }

  const range = { from: query.from, to: query.to };
  const opening = await repository.patientOpeningBalance(patient.id, query.from);
  const invoices = await repository.getPatientInvoices(patient.id, range);
  const payments = await repository.getPatientPayments(patient.id, range);

  const invoiceEntries = invoices.map((inv) => ({
    id: `inv-${inv.id}`,
    date: inv.issued_at ? inv.issued_at.toISOString().slice(0, 10) : '',
    raw_date: inv.issued_at ? new Date(inv.issued_at).getTime() : 0,
    voucher_type: 'Invoice',
    voucher_no: inv.invoice_no || `INV-${inv.id}`,
    description: `Billing invoice #${inv.invoice_no || inv.id}`,
    debit: toNumber(inv.total),
    credit: 0,
  }));

  const paymentEntries = payments.map((pay) => ({
    id: `pay-${pay.id}`,
    date: pay.paid_at ? pay.paid_at.toISOString().slice(0, 10) : '',
    raw_date: pay.paid_at ? new Date(pay.paid_at).getTime() : 0,
    voucher_type: 'Payment',
    voucher_no: pay.receipt_no || `PAY-${pay.id}`,
    description: `Payment received via ${pay.method || 'Cash'}`,
    debit: 0,
    credit: toNumber(pay.amount),
  }));

  const allEntries = [...invoiceEntries, ...paymentEntries].sort((a, b) => a.raw_date - b.raw_date);

  let runningBalance = opening;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries = allEntries.map((e) => {
    // BUG-054 - accumulate on exact minor units; a long ledger otherwise drifts
    // a cent away from the DECIMAL rows it was built from.
    totalDebit = money.add(totalDebit, e.debit);
    totalCredit = money.add(totalCredit, e.credit);
    runningBalance = money.add(runningBalance, money.sub(e.debit, e.credit));
    return { ...e, balance: runningBalance };
  });

  return {
    patient: {
      id: patient.id,
      name: patient.full_name,
      code: patient.patient_code,
      phone: patient.phone,
    },
    opening_balance: opening,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      closing_balance: runningBalance,
    },
    convention: 'invoice = debit (receivable up), payment = credit',
    entries,
  };
};

const paymentMethodForAccount = (account) => {
  const extra = parseJsonDescription(account.description);
  const source = `${extra.type || ''} ${account.label || ''}`.toLowerCase();
  if (source.includes('mobile') || source.includes('bkash') || source.includes('nagad')) return 'mobile_banking';
  if (source.includes('bank') || source.includes('transfer')) return 'bank_transfer';
  if (source.includes('card')) return 'card';
  if (source.includes('cheque') || source.includes('check')) return 'cheque';
  if (source.includes('insurance')) return 'insurance';
  if (source.includes('cash')) return 'cash';
  return null;
};

const loadPaymentAccountContext = async () => {
  const accounts = await MasterOption.findAll({
    where: { type: 'payment_account', is_active: true },
    order: [['id', 'ASC']],
  });
  const canonicalByMethod = new Map();
  for (const account of accounts) {
    const method = paymentMethodForAccount(account);
    if (method && !canonicalByMethod.has(method)) canonicalByMethod.set(method, String(account.id));
  }
  return { accounts, canonicalByMethod };
};

const accountExplicitActivity = async (accountId, range = {}, beforeDate = null) => {
  const incomeWhere = { account_id: accountId };
  const contraWhere = {
    [Op.or]: [{ from_account_id: accountId }, { to_account_id: accountId }],
  };

  if (beforeDate) {
    incomeWhere.income_date = { [Op.lt]: beforeDate };
    contraWhere.transaction_date = { [Op.lt]: beforeDate };
  } else {
    const bounded = dateOnlyRange(range);
    if (bounded) {
      incomeWhere.income_date = bounded;
      contraWhere.transaction_date = bounded;
    }
  }

  const [incomes, contra] = await Promise.all([
    IncomeEntry.findAll({ where: incomeWhere, order: [['income_date', 'ASC'], ['id', 'ASC']] }),
    ContraEntry.findAll({ where: contraWhere, order: [['transaction_date', 'ASC'], ['id', 'ASC']] }),
  ]);

  return { incomes, contra };
};

const accountBalance = async (query = {}) => {
  const range = { from: query.from, to: query.to };
  const { accounts, canonicalByMethod } = await loadPaymentAccountContext();

  const accountRows = await Promise.all(
    accounts.map(async (account) => {
      const extra = parseJsonDescription(account.description);
      const inferredMethod = paymentMethodForAccount(account);
      const method = inferredMethod && canonicalByMethod.get(inferredMethod) === String(account.id) ? inferredMethod : null;
      const [{ incomes, contra }, prior, payments, expenses, methodOpening] = await Promise.all([
        accountExplicitActivity(account.id, range),
        query.from ? accountExplicitActivity(account.id, {}, query.from) : Promise.resolve({ incomes: [], contra: [] }),
        method ? repository.getPayments(range, method) : Promise.resolve([]),
        method ? repository.getExpenses(range, method) : Promise.resolve([]),
        method ? repository.accountOpeningBalance(method, query.from) : Promise.resolve(0),
      ]);

      const incomingContra = contra.filter((item) => String(item.to_account_id) === String(account.id));
      const outgoingContra = contra.filter((item) => String(item.from_account_id) === String(account.id));
      const priorIncoming = prior.contra.filter((item) => String(item.to_account_id) === String(account.id));
      const priorOutgoing = prior.contra.filter((item) => String(item.from_account_id) === String(account.id));

      const debit = money.add(
        ...payments.map((item) => item.amount),
        ...incomes.map((item) => item.amount),
        ...incomingContra.map((item) => item.amount)
      );
      const credit = money.add(...expenses.map((item) => item.amount), ...outgoingContra.map((item) => item.amount));
      const opening = money.add(
        Number(extra.opening_balance || 0),
        methodOpening,
        ...prior.incomes.map((item) => item.amount),
        ...priorIncoming.map((item) => item.amount),
        ...priorOutgoing.map((item) => money.sub(0, item.amount))
      );

      return {
        id: account.id,
        account_id: method || String(account.id),
        name: account.label,
        opening,
        debit,
        credit,
        balance: money.sub(money.add(opening, debit), credit),
      };
    })
  );

  let filtered = accountRows;
  if (query.account_id) {
    filtered = filtered.filter(
      (a) => String(a.id) === String(query.account_id) || a.account_id.toLowerCase() === String(query.account_id).toLowerCase()
    );
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    filtered = filtered.filter((a) => a.name.toLowerCase().includes(s));
  }

  const totals = filtered.reduce(
    (acc, item) => ({
      opening: money.add(acc.opening, item.opening),
      debit: money.add(acc.debit, item.debit),
      credit: money.add(acc.credit, item.credit),
      balance: money.add(acc.balance, item.balance),
    }),
    { opening: 0, debit: 0, credit: 0, balance: 0 }
  );

  return {
    data: filtered,
    meta: {
      totals,
      pagination: {
        page: 1,
        limit: 30,
        total: filtered.length,
        total_pages: 1,
      },
    },
  };
};

const accountLedger = async (query = {}) => {
  const range = { from: query.from, to: query.to };

  // With no account selected, preserve the all-method ledger used by the daily
  // ledger reconciliation tests and by the report's legacy summary view.
  if (!query.account_id) {
    const opening = await repository.accountOpeningBalance(null, query.from);
    const [payments, expenses] = await Promise.all([
      repository.getPayments(range, null),
      repository.getExpenses(range, null),
    ]);
    const entries = [
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        date: p.paid_at ? p.paid_at.toISOString().slice(0, 10) : '',
        raw_date: p.paid_at ? new Date(p.paid_at).getTime() : 0,
        voucher_type: 'Payment',
        type: 'Payment In',
        voucher_no: p.payment_code || p.receipt_no || `PAY-${p.id}`,
        code: p.payment_code || p.receipt_no || `PAY-${p.id}`,
        description: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
        particular: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
        particulars: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
        debit: toNumber(p.amount),
        credit: 0,
      })),
      ...expenses.map((e) => ({
        id: `exp-${e.id}`,
        date: e.expense_date || '',
        raw_date: e.expense_date ? new Date(e.expense_date).getTime() : 0,
        voucher_type: 'Expense',
        type: 'Expense Out',
        voucher_no: e.expense_no || `EXP-${e.id}`,
        code: e.expense_no || `EXP-${e.id}`,
        description: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
        particular: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
        particulars: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
        debit: 0,
        credit: toNumber(e.amount),
      })),
    ].sort((a, b) => a.raw_date - b.raw_date);

    let runningBalance = opening;
    let totalDebit = 0;
    let totalCredit = 0;
    const balancedEntries = entries.map((entry) => {
      totalDebit = money.add(totalDebit, entry.debit);
      totalCredit = money.add(totalCredit, entry.credit);
      runningBalance = money.add(runningBalance, money.sub(entry.debit, entry.credit));
      return { ...entry, balance: runningBalance };
    });

    return {
      account: { id: 'all', name: 'All Accounts' },
      opening_balance: opening,
      totals: { debit: totalDebit, credit: totalCredit, closing_balance: runningBalance },
      convention: 'money in = debit, money out = credit',
      entries: balancedEntries,
    };
  }

  const { accounts, canonicalByMethod } = await loadPaymentAccountContext();
  const account = accounts.find((item) => String(item.id) === String(query.account_id));
  if (!account) {
    return {
      account: { id: query.account_id, name: 'Account Not Found' },
      opening_balance: 0,
      totals: { debit: 0, credit: 0, closing_balance: 0 },
      convention: 'money in = debit, money out = credit',
      entries: [],
    };
  }

  const extra = parseJsonDescription(account.description);
  const inferredMethod = paymentMethodForAccount(account);
  const method = inferredMethod && canonicalByMethod.get(inferredMethod) === String(account.id) ? inferredMethod : null;

  // BUG-032 — opening balance for this account, carried in from before the range.
  const [{ incomes, contra }, prior, payments, expenses, methodOpening] = await Promise.all([
    accountExplicitActivity(account.id, range),
    query.from ? accountExplicitActivity(account.id, {}, query.from) : Promise.resolve({ incomes: [], contra: [] }),
    method ? repository.getPayments(range, method) : Promise.resolve([]),
    method ? repository.getExpenses(range, method) : Promise.resolve([]),
    method ? repository.accountOpeningBalance(method, query.from) : Promise.resolve(0),
  ]);
  const opening = money.add(
    Number(extra.opening_balance || 0),
    methodOpening,
    ...prior.incomes.map((item) => item.amount),
    ...prior.contra.map((item) =>
      String(item.to_account_id) === String(account.id) ? item.amount : money.sub(0, item.amount)
    )
  );

  // BUG-011 — an empty ledger used to silently re-query with no method filter,
  // rendering EVERY account's transactions under the selected account's name.
  // An empty account ledger must read as empty; that is a real accounting fact.

  const paymentEntries = payments.map((p) => ({
    id: `pay-${p.id}`,
    date: p.paid_at ? p.paid_at.toISOString().slice(0, 10) : '',
    raw_date: p.paid_at ? new Date(p.paid_at).getTime() : 0,
    voucher_type: 'Payment',
    type: 'Payment In',
    voucher_no: p.payment_code || p.receipt_no || `PAY-${p.id}`,
    code: p.payment_code || p.receipt_no || `PAY-${p.id}`,
    description: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
    particular: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
    particulars: `Payment received from ${p.invoice?.patient?.full_name || 'Patient'}`,
    debit: toNumber(p.amount),
    credit: 0,
  }));

  const expenseEntries = expenses.map((e) => ({
    id: `exp-${e.id}`,
    date: e.expense_date || '',
    raw_date: e.expense_date ? new Date(e.expense_date).getTime() : 0,
    voucher_type: 'Expense',
    type: 'Expense Out',
    voucher_no: e.expense_no || `EXP-${e.id}`,
    code: e.expense_no || `EXP-${e.id}`,
    description: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
    particular: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
    particulars: `Expense: ${e.category?.name || e.description || 'General Expense'}`,
    debit: 0,
    credit: toNumber(e.amount),
  }));

  const incomeEntries = incomes.map((item) => ({
    id: `inc-${item.id}`,
    date: item.income_date || '',
    raw_date: item.income_date ? new Date(item.income_date).getTime() : 0,
    voucher_type: 'Income',
    type: 'Income In',
    voucher_no: item.income_code || `INC-${item.id}`,
    code: item.income_code || `INC-${item.id}`,
    description: item.note || 'Income received',
    particular: item.note || 'Income received',
    particulars: item.note || 'Income received',
    debit: toNumber(item.amount),
    credit: 0,
  }));

  const contraEntries = contra.map((item) => {
    const incoming = String(item.to_account_id) === String(account.id);
    return {
      id: `ctr-${item.id}`,
      date: item.transaction_date || '',
      raw_date: item.transaction_date ? new Date(item.transaction_date).getTime() : 0,
      voucher_type: 'Contra',
      type: incoming ? 'Transfer In' : 'Transfer Out',
      voucher_no: item.contra_code || `CTR-${item.id}`,
      code: item.contra_code || `CTR-${item.id}`,
      description: item.note || (incoming ? 'Account transfer received' : 'Account transfer sent'),
      particular: item.note || (incoming ? 'Account transfer received' : 'Account transfer sent'),
      particulars: item.note || (incoming ? 'Account transfer received' : 'Account transfer sent'),
      debit: incoming ? toNumber(item.amount) : 0,
      credit: incoming ? 0 : toNumber(item.amount),
    };
  });

  const allEntries = [...paymentEntries, ...expenseEntries, ...incomeEntries, ...contraEntries].sort(
    (a, b) => a.raw_date - b.raw_date
  );

  let runningBalance = opening;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries = allEntries.map((e) => {
    // BUG-054 - accumulate on exact minor units; a long ledger otherwise drifts
    // a cent away from the DECIMAL rows it was built from.
    totalDebit = money.add(totalDebit, e.debit);
    totalCredit = money.add(totalCredit, e.credit);
    runningBalance = money.add(runningBalance, money.sub(e.debit, e.credit));
    return { ...e, balance: runningBalance };
  });

  return {
    account: { id: account.id, name: account.label },
    opening_balance: opening,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      closing_balance: runningBalance,
    },
    convention: 'money in = debit, money out = credit',
    entries,
  };
};

const dailyLedger = async (query = {}) => {
  const range = { from: query.from, to: query.to };
  // BUG-032 — opening balance carried in from before the range.
  const opening = await repository.accountOpeningBalance(null, query.from);
  const payments = await repository.getPayments(range);
  const expenses = await repository.getExpenses(range);

  const paymentEntries = payments.map((p) => ({
    id: `pay-${p.id}`,
    date: p.paid_at ? p.paid_at.toISOString().slice(0, 10) : '',
    raw_date: p.paid_at ? new Date(p.paid_at).getTime() : 0,
    voucher_type: 'Payment In',
    type: 'Payment In',
    voucher_no: p.payment_code || `PAY-${p.id}`,
    code: p.payment_code || `PAY-${p.id}`,
    description: `Income via ${p.method || 'Cash'} (${p.invoice?.patient?.full_name || 'Walk-in'})`,
    particular: `Income via ${p.method || 'Cash'} (${p.invoice?.patient?.full_name || 'Walk-in'})`,
    // BUG-031 — Daily Ledger used the OPPOSITE convention to Account Ledger for
    // the same rows, so the two reports could never be reconciled. Both now use
    // the standard asset-account convention: money in is a DEBIT, money out is a
    // CREDIT, and balance moves debit - credit.
    debit: toNumber(p.amount),
    credit: 0,
  }));

  const expenseEntries = expenses.map((e) => ({
    id: `exp-${e.id}`,
    date: e.expense_date || '',
    raw_date: e.expense_date ? new Date(e.expense_date).getTime() : 0,
    voucher_type: 'Expense Out',
    type: 'Expense Out',
    voucher_no: `EXP-${e.id}`,
    code: `EXP-${e.id}`,
    description: `Expense: ${e.category?.name || 'General Expense'}`,
    particular: `Expense: ${e.category?.name || 'General Expense'}`,
    debit: 0,
    credit: toNumber(e.amount),
  }));

  const allEntries = [...paymentEntries, ...expenseEntries].sort((a, b) => a.raw_date - b.raw_date);

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries = allEntries.map((e) => {
    // BUG-054 - accumulate on exact minor units; a long ledger otherwise drifts
    // a cent away from the DECIMAL rows it was built from.
    totalDebit = money.add(totalDebit, e.debit);
    totalCredit = money.add(totalCredit, e.credit);
    runningBalance = money.add(runningBalance, money.sub(e.debit, e.credit));
    return { ...e, balance: runningBalance };
  });

  return {
    opening_balance: opening,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      closing_balance: opening + runningBalance,
    },
    convention: 'money in = debit, money out = credit',
    items: entries,
    entries,
  };
};

const dailyStatement = async (query = {}) => {
  const range = { from: query.from, to: query.to };

  const [
    labOrders,
    radOrders,
    opdVisits,
    admissions,
    medicineSales,
    ambulanceTrips,
    payments,
  ] = await Promise.all([
    repository.getLabOrdersForStatement(range),
    repository.getRadiologyOrdersForStatement(range),
    repository.getOpdVisitsForStatement(range),
    repository.getAdmissionsForStatement(range),
    repository.getMedicineSalesForStatement(range),
    repository.getAmbulanceTripsForStatement(range),
    repository.getPayments(range),
  ]);

  const pathology = labOrders.map((o, index) => ({
    id: o.id,
    sl: index + 1,
    date: o.ordered_at ? o.ordered_at.toISOString().slice(0, 10) : '',
    bill_no: o.order_code || `LAB-${o.id}`,
    order_no: o.order_code || `LAB-${o.id}`,
    patient: o.patient?.full_name || 'N/A',
    patient_name: o.patient?.full_name || 'N/A',
    doctor: 'Pathology Dept',
    doctor_name: 'Pathology Dept',
    test_name: 'Pathology Order',
    sub_total: toNumber(o.total),
    discount: 0,
    amount: toNumber(o.total),
    // BUG-010 — this used to assert `paid = full amount, due = 0`, so the
    // statement always showed 100% collection with no outstanding balance. No
    // collection is recorded against lab orders, so it is reported as unknown
    // rather than fabricated.
    paid: null,
    due: null,
    collection_recorded: false,
  }));

  const radiology = radOrders.map((o, index) => ({
    id: o.id,
    sl: index + 1,
    date: o.ordered_at ? o.ordered_at.toISOString().slice(0, 10) : '',
    bill_no: o.order_code || `RAD-${o.id}`,
    order_no: o.order_code || `RAD-${o.id}`,
    patient: o.patient?.full_name || 'N/A',
    patient_name: o.patient?.full_name || 'N/A',
    doctor: 'Radiology Dept',
    doctor_name: 'Radiology Dept',
    test_name: 'Radiology Order',
    sub_total: toNumber(o.total),
    discount: 0,
    amount: toNumber(o.total),
    paid: null,
    due: null,
    collection_recorded: false,
  }));

  const opd = opdVisits.map((v, index) => ({
    id: v.id,
    sl: index + 1,
    date: v.visit_date ? v.visit_date.toISOString().slice(0, 10) : '',
    bill_no: v.visit_code || `OPD-${v.id}`,
    visit_no: v.visit_code || `OPD-${v.id}`,
    patient: v.patient?.full_name || 'N/A',
    patient_name: v.patient?.full_name || 'N/A',
    doctor: v.doctor?.user?.full_name || 'Specialist Doctor',
    doctor_name: v.doctor?.user?.full_name || 'Specialist Doctor',
    // BUG-004 / BUG-010 — OPD now carries a real invoice; use it. An unbilled
    // visit reports its fee as outstanding rather than as collected.
    amount: v.invoice ? toNumber(v.invoice.total) : toNumber(v.consultation_fee),
    paid: v.invoice ? toNumber(v.invoice.paid_amount) : 0,
    due: v.invoice
      ? money.subFloor(v.invoice.total, v.invoice.paid_amount)
      : toNumber(v.consultation_fee),
    collection_recorded: Boolean(v.invoice),
  }));

  const ipd = admissions.map((a, index) => ({
    id: a.id,
    sl: index + 1,
    date: a.admitted_at ? a.admitted_at.toISOString().slice(0, 10) : '',
    bill_no: a.admission_code || `IPD-${a.id}`,
    admission_no: a.admission_code || `IPD-${a.id}`,
    patient: a.patient?.full_name || 'N/A',
    patient_name: a.patient?.full_name || 'N/A',
    doctor: `Bed ${a.bed_id || 'N/A'}`,
    doctor_name: `Bed ${a.bed_id || 'N/A'}`,
    room_bed: `Bed ${a.bed_id || 'N/A'}`,
    amount: toNumber(a.total_charges),
  }));

  const pharmacy = medicineSales.map((s, index) => ({
    id: s.id,
    sl: index + 1,
    date: s.sold_at ? s.sold_at.toISOString().slice(0, 10) : '',
    bill_no: s.sale_code || `SALE-${s.id}`,
    invoice_no: s.sale_code || `SALE-${s.id}`,
    sale_no: s.sale_code || `SALE-${s.id}`,
    patient: s.patient?.full_name || 'Walk-in Customer',
    patient_name: s.patient?.full_name || 'Walk-in Customer',
    doctor: 'Pharmacy Dept',
    doctor_name: 'Pharmacy Dept',
    sub_total: toNumber(s.subtotal || s.total),
    discount: toNumber(s.discount),
    amount: toNumber(s.total),
    paid: toNumber(s.total),
    due: 0,
  }));

  const ambulance = ambulanceTrips.map((t, index) => ({
    id: t.id,
    sl: index + 1,
    date: t.dispatched_at ? t.dispatched_at.toISOString().slice(0, 10) : '',
    bill_no: t.trip_code || `TRIP-${t.id}`,
    trip_no: t.trip_code || `TRIP-${t.id}`,
    patient: t.patient?.full_name || t.requester_name || 'N/A',
    patient_name: t.patient?.full_name || t.requester_name || 'N/A',
    amount: toNumber(t.fare),
  }));

  const income = payments.map((p, index) => ({
    id: p.id,
    sl: index + 1,
    date: p.paid_at ? p.paid_at.toISOString().slice(0, 10) : '',
    code: p.payment_code || p.receipt_no || `REC-${p.id}`,
    receipt_no: p.payment_code || p.receipt_no || `REC-${p.id}`,
    head: `${p.method ? p.method.toUpperCase() : 'CASH'} Income (${p.invoice?.patient?.full_name || 'General Patient'})`,
    patient_name: p.invoice?.patient?.full_name || 'General Patient',
    method: p.method || 'Cash',
    amount: toNumber(p.amount),
  }));

  // Null-safe: `paid`/`due` are intentionally null where collection is not
  // recorded, and must not be coerced into zeros that read as facts.
  const sum = (rows, field) => rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

  const totals = {
    pathology: {
      sub_total: sum(pathology, 'sub_total'),
      amount: sum(pathology, 'amount'),
      paid: null,
      due: null,
      collection_recorded: false,
    },
    radiology: {
      sub_total: sum(radiology, 'sub_total'),
      amount: sum(radiology, 'amount'),
      paid: null,
      due: null,
      collection_recorded: false,
    },
    opd: {
      amount: sum(opd, 'amount'),
      paid: sum(opd, 'paid'),
      due: sum(opd, 'due'),
    },
    ipd: {
      amount: sum(ipd, 'amount'),
    },
    pharmacy: {
      sub_total: sum(pharmacy, 'sub_total'),
      amount: sum(pharmacy, 'amount'),
      paid: sum(pharmacy, 'paid'),
      due: sum(pharmacy, 'due'),
    },
    ambulance: {
      amount: sum(ambulance, 'amount'),
    },
    income: sum(income, 'amount'),
  };

  // BUG-010 — this previously added each service line's "paid" (which was the
  // full billed amount) to the real payment total, double counting everything
  // billed through invoices and inflating the day's income. Collected income is
  // the sum of actual payment records, plus counter-settled pharmacy sales,
  // which do not pass through invoices.
  const final_income = totals.income + totals.pharmacy.paid;

  // Billed-but-not-collected is now reported explicitly instead of hidden
  // behind a fabricated zero due.
  const total_billed =
    totals.pathology.amount +
    totals.radiology.amount +
    totals.opd.amount +
    totals.ipd.amount +
    totals.pharmacy.amount +
    totals.ambulance.amount;

  return {
    pathology,
    radiology,
    opd,
    ipd,
    pharmacy,
    ambulance,
    income,
    totals,
    final_income,
    total_billed,
    // Explicit provenance so a consumer cannot present estimates as collections.
    income_basis: 'payments table + counter-settled pharmacy sales',
  };
};

const referralPersonBalance = async (query = {}) => {
  // BUG-009 — every person used to report a hardcoded credit of 500, ignoring
  // the actual commission records entirely. Figures now come from the stored
  // referral_bill rows.
  const persons = await MasterOption.findAll({ where: { type: 'referral_person' } });
  const bills = await MasterOption.findAll({ where: { type: 'referral_bill' } });

  const byPerson = new Map();
  for (const bill of bills) {
    const extra = parseJsonDescription(bill.description);
    const key = String(extra.referral_person_id || '');
    if (!key) continue;
    const acc = byPerson.get(key) || { commission: 0, paid: 0, count: 0 };
    acc.commission = money.add(acc.commission, extra.commission_amount);
    acc.paid = money.add(acc.paid, extra.paid_amount);
    acc.count += 1;
    byPerson.set(key, acc);
  }

  let list = persons.map((p) => {
    const extra = parseJsonDescription(p.description);
    const agg = byPerson.get(String(p.id)) || { commission: 0, paid: 0, count: 0 };
    const opening = toNumber(extra.opening_balance);
    return {
      id: p.id,
      person_id: p.id,
      name: p.label,
      code: p.code,
      phone: extra.contact_no || null,
      bills: agg.count,
      opening,
      // Commission earned is owed to the person (credit); payouts reduce it.
      credit: agg.commission,
      debit: agg.paid,
      balance: money.sub(money.add(opening, agg.commission), agg.paid),
    };
  });

  if (query.person_id) {
    list = list.filter((i) => String(i.id) === String(query.person_id) || String(i.code) === String(query.person_id));
  }
  if (query.search) {
    const term = String(query.search).toLowerCase();
    list = list.filter((i) => String(i.name).toLowerCase().includes(term) || String(i.code).toLowerCase().includes(term));
  }

  const totals = list.reduce(
    (acc, i) => ({
      opening: acc.opening + i.opening,
      debit: acc.debit + i.debit,
      credit: acc.credit + i.credit,
      balance: money.add(acc.balance, i.balance),
    }),
    { opening: 0, debit: 0, credit: 0, balance: 0 }
  );

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 30;
  const start = (page - 1) * limit;

  return {
    data: list.slice(start, start + limit),
    meta: {
      totals,
      pagination: { page, limit, total: list.length, total_pages: Math.ceil(list.length / limit) || 1 },
    },
  };
};

const referralPersonLedger = async (query = {}) => {
  // BUG-009 — this used to emit a single invented 500 entry, and when the
  // requested person was not found it silently fell back to the first referral
  // in the table, labelling another person's data as theirs.
  if (!query.person_id) {
    return {
      referral_person: null,
      opening_balance: 0,
      totals: { debit: 0, credit: 0, closing_balance: 0 },
      entries: [],
      message: 'Select a referral person',
    };
  }

  const person = await MasterOption.findByPk(query.person_id);
  if (!person || person.type !== 'referral_person') {
    return {
      referral_person: null,
      opening_balance: 0,
      totals: { debit: 0, credit: 0, closing_balance: 0 },
      entries: [],
      message: 'Referral person not found',
    };
  }

  const extra = parseJsonDescription(person.description);
  const opening = toNumber(extra.opening_balance);
  const bills = await MasterOption.findAll({ where: { type: 'referral_bill' } });

  const entries = bills
    .map((b) => ({ b, e: parseJsonDescription(b.description) }))
    .filter(({ e }) => String(e.referral_person_id) === String(person.id))
    .map(({ b, e }) => ({
      id: `refbill-${b.id}`,
      date: e.bill_date ? String(e.bill_date).slice(0, 10) : '',
      raw_date: e.bill_date ? new Date(e.bill_date).getTime() : 0,
      voucher_type: 'Referral Commission',
      voucher_no: b.code,
      code: b.code,
      description:
        `Commission ${toNumber(e.commission_percent)}% on ${e.bill_number || 'invoice'} ` +
        `(${toNumber(e.bill_amount).toFixed(2)})`,
      particular: e.patient_name || 'Patient',
      debit: toNumber(e.paid_amount),
      credit: toNumber(e.commission_amount),
    }))
    .sort((a, b) => a.raw_date - b.raw_date);

  let running = opening;
  let totalDebit = 0;
  let totalCredit = 0;
  const withBalance = entries.map((e) => {
    totalDebit = money.add(totalDebit, e.debit);
    totalCredit = money.add(totalCredit, e.credit);
    running += e.credit - e.debit;
    return { ...e, balance: running };
  });

  return {
    referral_person: { id: person.id, name: person.label, code: person.code, phone: extra.contact_no || null },
    opening_balance: opening,
    totals: { debit: totalDebit, credit: totalCredit, closing_balance: running },
    entries: withBalance,
  };
};

const supplierBalance = async (query = {}) => {
  const suppliers = await MasterOption.findAll({ where: { type: 'pharmacy_supplier' } });
  const purchases = await MasterOption.findAll({ where: { type: 'pharmacy_purchase' } });

  const supplierPurchaseMap = new Map();
  purchases.forEach((p) => {
    const extra = parseJsonDescription(p.description);
    const suppId = String(extra.supplier_id || '');
    if (!suppId) return;

    if (!supplierPurchaseMap.has(suppId)) {
      supplierPurchaseMap.set(suppId, []);
    }

    const items = Array.isArray(extra.items) ? extra.items : [];
    let total_amount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
    const payment_details = Array.isArray(extra.payment_details) ? extra.payment_details : [];
    const paid_amount = money.add(...payment_details.map((pay) => pay.amount));

    supplierPurchaseMap.get(suppId).push({
      date: extra.purchased_at || p.createdAt,
      total_amount,
      paid_amount,
      due_amount: Math.max(total_amount - paid_amount, 0),
    });
  });

  let list = suppliers.map((s) => {
    const extra = parseJsonDescription(s.description);
    const suppPurchases = supplierPurchaseMap.get(String(s.id)) || supplierPurchaseMap.get(String(s.code)) || [];

    const credit = suppPurchases.reduce((sum, p) => sum + p.total_amount, 0);
    const debit = suppPurchases.reduce((sum, p) => sum + p.paid_amount, 0);
    const balance = credit - debit;

    return {
      id: s.id,
      supplier_id: s.id,
      supplier_code: s.code,
      name: s.label,
      phone: extra.phone || '',
      address: extra.address || '',
      opening: 0,
      debit,
      credit,
      balance,
    };
  });

  if (query.supplier_id) {
    list = list.filter((s) => String(s.id) === String(query.supplier_id) || String(s.supplier_code) === String(query.supplier_id));
  }
  if (query.search) {
    const term = String(query.search).toLowerCase();
    list = list.filter((s) => String(s.name).toLowerCase().includes(term) || String(s.supplier_code).toLowerCase().includes(term));
  }

  const totals = list.reduce(
    (acc, item) => ({
      opening: money.add(acc.opening, item.opening),
      debit: money.add(acc.debit, item.debit),
      credit: money.add(acc.credit, item.credit),
      balance: money.add(acc.balance, item.balance),
    }),
    { opening: 0, debit: 0, credit: 0, balance: 0 }
  );

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 30;
  const start = (page - 1) * limit;
  const paginatedData = list.slice(start, start + limit);

  return {
    data: paginatedData,
    meta: {
      totals,
      pagination: {
        page,
        limit,
        total: list.length,
        total_pages: Math.ceil(list.length / limit) || 1,
      },
    },
  };
};

const supplierLedger = async (query = {}) => {
  const suppId = query.supplier_id;
  let supplier = null;

  if (suppId) {
    const opt = await MasterOption.findByPk(suppId).catch(() => null);
    if (opt && opt.type === 'pharmacy_supplier') {
      const extra = parseJsonDescription(opt.description);
      supplier = { id: opt.id, name: opt.label, code: opt.code, ...extra };
    }
  }

  if (!supplier) {
    const firstSupp = await MasterOption.findOne({ where: { type: 'pharmacy_supplier' } });
    if (firstSupp) {
      const extra = parseJsonDescription(firstSupp.description);
      supplier = { id: firstSupp.id, name: firstSupp.label, code: firstSupp.code, ...extra };
    }
  }

  const purchases = await MasterOption.findAll({ where: { type: 'pharmacy_purchase' } });
  const entries = [];

  purchases.forEach((p) => {
    const extra = parseJsonDescription(p.description);
    if (supplier && String(extra.supplier_id) !== String(supplier.id) && String(extra.supplier_id) !== String(supplier.code)) {
      return;
    }

    const items = Array.isArray(extra.items) ? extra.items : [];
    const total_amount = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
    const payment_details = Array.isArray(extra.payment_details) ? extra.payment_details : [];
    const paid_amount = money.add(...payment_details.map((pay) => pay.amount));

    entries.push({
      id: `pur-${p.id}`,
      date: extra.purchased_at || (p.createdAt ? p.createdAt.toISOString().slice(0, 10) : ''),
      raw_date: extra.purchased_at ? new Date(extra.purchased_at).getTime() : new Date(p.createdAt).getTime(),
      voucher_type: 'Purchase',
      type: 'Purchase Invoice',
      voucher_no: p.code || `PUR-${p.id}`,
      code: p.code || `PUR-${p.id}`,
      description: `Medicine Purchase Invoice (${items.length} items)`,
      particular: `Medicine Purchase Invoice (${items.length} items)`,
      particulars: `Medicine Purchase Invoice (${items.length} items)`,
      debit: 0,
      credit: total_amount,
    });

    if (paid_amount > 0) {
      entries.push({
        id: `pay-${p.id}`,
        date: extra.purchased_at || (p.createdAt ? p.createdAt.toISOString().slice(0, 10) : ''),
        raw_date: (extra.purchased_at ? new Date(extra.purchased_at).getTime() : new Date(p.createdAt).getTime()) + 1,
        voucher_type: 'Payment',
        type: 'Supplier Payment',
        voucher_no: `PAY-${p.id}`,
        code: `PAY-${p.id}`,
        description: `Payment to supplier for Invoice ${p.code || `PUR-${p.id}`}`,
        particular: `Payment to supplier for Invoice ${p.code || `PUR-${p.id}`}`,
        particulars: `Payment to supplier for Invoice ${p.code || `PUR-${p.id}`}`,
        debit: paid_amount,
        credit: 0,
      });
    }
  });

  entries.sort((a, b) => a.raw_date - b.raw_date);

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  const calculatedEntries = entries.map((e) => {
    totalDebit = money.add(totalDebit, e.debit);
    totalCredit = money.add(totalCredit, e.credit);
    runningBalance = money.add(runningBalance, money.sub(e.credit, e.debit));
    return {
      ...e,
      balance: runningBalance,
    };
  });

  return {
    supplier: supplier || { id: 1, name: 'Default Supplier', code: '10001' },
    opening_balance: 0,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
      closing_balance: runningBalance,
    },
    entries: calculatedEntries,
  };
};

module.exports = {
  dashboard,
  appointments,
  finance,
  bedOccupancy,
  bloodStock,
  pharmacyStock,
  patientLedger,
  patientBalance,
  accountLedger,
  accountBalance,
  dailyLedger,
  dailyStatement,
  referralPersonLedger,
  referralPersonBalance,
  supplierLedger,
  supplierBalance,
};
