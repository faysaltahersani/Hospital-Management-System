'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateOpdVisitCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear } = require('../../utils/codeSequence');
const { OPD_VISIT_STATUS } = require('../../config/constants');
const { Sequelize } = require('sequelize');
const { generateInvoiceCode, generatePaymentCode } = require('../../utils/codeGenerator');
const { INVOICE_STATUS, PAYMENT_METHODS, PAYMENT_METHOD_VALUES } = require('../../config/constants');
const {
  sequelize,
  Patient,
  Doctor,
  User,
  Appointment,
  MasterOption,
  Invoice,
  InvoiceItem,
  Payment,
  OpdVisit,
} = require('../../models');
const repository = require('./opd.repository');
const { currentTenant } = require('../../utils/tenantContext');
const serviceCatalog = require('../service-catalog/service-catalog.service');

// BUG-054 - exact money throughout the OPD billing path.
const money = require('../../utils/money');
const toMoney = (value) => money.toMajor(money.toMinor(value));
const round2 = (value) => money.toMajor(money.toMinor(value));

const invoiceStatusFor = (total, paid) => {
  if (!money.isPositive(paid)) return INVOICE_STATUS.SENT;
  if (money.gte(paid, total)) return INVOICE_STATUS.PAID;
  return INVOICE_STATUS.PARTIALLY_PAID;
};

// The UI offers friendly account labels ("Bkash", "Bank Transfer"); the Payment
// model stores a fixed enum. Map rather than silently reject.
const PAYMENT_METHOD_ALIASES = {
  cash: PAYMENT_METHODS.CASH,
  card: PAYMENT_METHODS.CARD,
  'credit card': PAYMENT_METHODS.CARD,
  'debit card': PAYMENT_METHODS.CARD,
  bank: PAYMENT_METHODS.BANK_TRANSFER,
  'bank transfer': PAYMENT_METHODS.BANK_TRANSFER,
  cheque: PAYMENT_METHODS.CHEQUE,
  check: PAYMENT_METHODS.CHEQUE,
  insurance: PAYMENT_METHODS.INSURANCE,
  bkash: PAYMENT_METHODS.MOBILE_BANKING,
  nagad: PAYMENT_METHODS.MOBILE_BANKING,
  rocket: PAYMENT_METHODS.MOBILE_BANKING,
  'mobile banking': PAYMENT_METHODS.MOBILE_BANKING,
};

const normalizePaymentMethod = (value) => {
  const raw = String(value || 'cash').trim().toLowerCase();
  if (PAYMENT_METHOD_VALUES.includes(raw)) return raw;
  return PAYMENT_METHOD_ALIASES[raw] || PAYMENT_METHODS.CASH;
};

// BUG-004 — financial figures are read from the linked invoice, never invented.
// A visit with no invoice is reported as UNBILLED (due = fee, paid = 0) rather
// than as paid in full, because no payment evidence exists for it.
const mapVisitResponse = (json) => {
  if (!json) return json;
  const invoice = json.invoice || null;

  if (!invoice) {
    const fee = toMoney(json.consultation_fee);
    return {
      ...json,
      is_billed: false,
      subtotal: fee,
      discount: 0,
      tax: 0,
      total_amount: fee,
      paid_amount: 0,
      due_amount: fee,
      payment_method: null,
      payments: [],
    };
  }

  const total = toMoney(invoice.total);
  const paid = toMoney(invoice.paid_amount);
  const payments = Array.isArray(invoice.payments) ? invoice.payments : [];
  return {
    ...json,
    is_billed: true,
    invoice_id: invoice.id,
    invoice_code: invoice.invoice_code,
    subtotal: toMoney(invoice.subtotal),
    discount: toMoney(invoice.discount),
    tax: toMoney(invoice.tax),
    total_amount: total,
    paid_amount: paid,
    due_amount: money.subFloor(total, paid),
    invoice_status: invoice.status,
    payment_method: payments.length ? payments[0].method : null,
    payments: payments.map((p) => ({
      id: p.id,
      payment_code: p.payment_code,
      account_name: p.method,
      method: p.method,
      amount: toMoney(p.amount),
      paid_at: p.paid_at,
    })),
  };
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
  if (query.department_id) filters.department_id = query.department_id;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });

  return { items: rows.map((v) => mapVisitResponse(v.toJSON())), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (id) => {
  const visit = await repository.findById(id);
  if (!visit) throw ApiError.notFound('OPD visit not found');
  return mapVisitResponse(visit.toJSON());
};

const create = async (input, currentUserId) => {
  const patient = await Patient.findByPk(input.patient_id);
  if (!patient) throw ApiError.badRequest('Patient not found');

  const doctor = await Doctor.findByPk(input.doctor_id);
  if (!doctor) throw ApiError.badRequest('Doctor not found');

  if (input.appointment_id) {
    const appt = await Appointment.findByPk(input.appointment_id);
    if (!appt) throw ApiError.badRequest('Appointment not found');
  }

  const year = currentYear();
  const visit = await withCodeRetry(async () => {
    // Same counter as the bill-entry path, so the two cannot issue the same code.
    const sequence = await allocateForYear('opd_visit', year);
    const visit_code = generateOpdVisitCode(year, sequence);
    return repository.create({
      visit_code,
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      department_id: doctor.department_id,
      appointment_id: input.appointment_id || null,
      visit_date: input.visit_date || new Date(),
      chief_complaint: input.chief_complaint || null,
      vitals: input.vitals || null,
      diagnosis: input.diagnosis || null,
      advice: input.advice || null,
      consultation_fee:
        input.consultation_fee !== undefined ? input.consultation_fee : doctor.consultation_fee,
      follow_up_date: input.follow_up_date || null,
      status: input.status || OPD_VISIT_STATUS.IN_CONSULTATION,
      created_by: currentUserId || null,
    });
  });

  return mapVisitResponse((await repository.findById(visit.id)).toJSON());
};

const update = async (id, changes) => {
  const visit = await repository.findById(id);
  if (!visit) throw ApiError.notFound('OPD visit not found');
  if (visit.status !== OPD_VISIT_STATUS.IN_CONSULTATION) {
    throw ApiError.badRequest(`Cannot edit visit in "${visit.status}" status`);
  }
  await repository.update(visit, changes);
  return mapVisitResponse((await repository.findById(id)).toJSON());
};

const complete = async (id, changes) => {
  const visit = await repository.findById(id);
  if (!visit) throw ApiError.notFound('OPD visit not found');
  if (visit.status !== OPD_VISIT_STATUS.IN_CONSULTATION) {
    throw ApiError.badRequest('Visit already finalized');
  }
  await repository.update(visit, { ...changes, status: OPD_VISIT_STATUS.COMPLETED });
  return mapVisitResponse((await repository.findById(id)).toJSON());
};

const cancel = async (id) => {
  const visit = await repository.findById(id);
  if (!visit) throw ApiError.notFound('OPD visit not found');
  if (visit.status === OPD_VISIT_STATUS.COMPLETED) {
    throw ApiError.badRequest('Cannot cancel a completed visit');
  }
  await repository.update(visit, { status: OPD_VISIT_STATUS.CANCELLED });
  return mapVisitResponse((await repository.findById(id)).toJSON());
};

const remove = async (id) => {
  const visit = await repository.findById(id);
  if (!visit) throw ApiError.notFound('OPD visit not found');
  await repository.destroy(visit);
  return { message: 'OPD visit deleted' };
};

const getBillEntryMeta = async () => {
  const [doctors, patients, options] = await Promise.all([
    Doctor.findAll({
      include: [{ model: User, as: 'user', attributes: ['full_name'] }],
      where: { is_available: true },
      order: [['doctor_code', 'ASC']],
    }),
    Patient.findAll({
      attributes: ['id', 'patient_code', 'full_name', 'phone', 'gender'],
      order: [['patient_code', 'ASC']],
    }),
    MasterOption.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['label', 'ASC']],
    }),
  ]);

  const billCount = Math.floor(100000 + Math.random() * 900000);
  const types = options.filter((o) => o.type === 'symptom_type');
  const heads = options.filter((o) => o.type === 'symptom_head');

  return {
    doctors: doctors.map((d) => ({
      id: d.id,
      doctor_code: d.doctor_code,
      full_name: d.user?.full_name || d.doctor_code,
      consultation_fee: d.consultation_fee || 500,
    })),
    patients: patients.map((p) => p.toJSON()),
    symptom_types: types.map((t) => ({ id: t.id, label: t.label, value: t.id })),
    symptom_heads: heads.map((h) => ({ id: h.id, label: h.label, value: h.id, sort_order: h.sort_order, description: h.description })),
    symptoms: [
      { id: 1, type: "General", title: "Fever & Weakness", description: "Body temperature above 101F, body ache" },
      { id: 2, type: "Respiratory", title: "Cough & Cold", description: "Dry cough, runny nose" },
      { id: 3, type: "Cardiology", title: "Chest Pain", description: "Mild tightness in chest" },
      { id: 4, type: "Gastro", title: "Abdominal Pain", description: "Upper abdominal discomfort" },
    ],
    accounts: ["Cash", "Bkash", "Nagad", "Card", "Bank Transfer"],
    charge_categories: [
      { value: "consultation", label: "Consultation Fee" },
      { value: "registration", label: "Registration Fee" },
      { value: "service", label: "Service Charge" },
    ],
    charges: [
      { value: "consultation_fee", label: "Consultation Fee" },
      { value: "registration_fee", label: "Registration Fee" },
      { value: "emergency_fee", label: "Emergency Fee" },
    ],
    tax_rates: [
      { value: "0", label: "0%" },
      { value: "5", label: "5%" },
      { value: "10", label: "10%" },
      { value: "15", label: "15%" },
    ],
    next_bill_no: `BILL-${billCount}`,
  };
};

// BUG-004 / BUG-042 — OPD billing now produces real financial records.
//
// Previously this endpoint accepted `discount`, `tax` and `payments[]` from the
// browser, persisted NONE of them (opd_visits has no such columns), stuffed the
// payment method into the clinical `advice` field, and created no invoice. The
// list endpoint then fabricated `paid = consultation_fee, due = 0`, so a
// part-paid discounted bill was recorded as paid in full and the receivable
// disappeared.
//
// The visit, its invoice, the invoice lines and every payment are now written in
// ONE transaction. All monetary values are recomputed server-side from the fee,
// discount and tax inputs — client-supplied totals are never trusted.
const createBill = async (input, currentUserId) =>
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      const patient = await Patient.findByPk(input.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');

      const doctor = await Doctor.findByPk(input.doctor_id, { transaction: t });
      if (!doctor) throw ApiError.badRequest('Doctor not found');

      let consultationFee = toMoney(
        input.consultation_fee !== undefined ? input.consultation_fee : doctor.consultation_fee
      );
      let cataloguePrice = null;
      if (currentTenant()) {
        try {
          cataloguePrice = await serviceCatalog.resolveSourcePrice(
            { source_type: 'doctor', source_id: doctor.id, payer_type: input.payer_type || 'self', payer_reference: input.payer_reference || null, at: input.visit_date },
            currentTenant(),
            { transaction: t }
          );
          if (cataloguePrice) consultationFee = toMoney(cataloguePrice.amount);
        } catch (error) {
          if (error.statusCode !== 404) throw error;
        }
      }
      if (consultationFee < 0) throw ApiError.badRequest('Consultation fee cannot be negative');

      // Server-side money. Discount may arrive as an absolute amount or a
      // percentage; tax is applied to the post-discount amount.
      const discount =
        input.discount !== undefined
          ? toMoney(input.discount)
          : money.percentOf(consultationFee, input.discount_percent);
      if (money.isNegative(discount)) throw ApiError.badRequest('Discount cannot be negative');
      if (money.gt(discount, consultationFee)) {
        throw ApiError.badRequest(
          `Discount (${money.format(discount)}) cannot exceed the consultation fee (${money.format(consultationFee)})`
        );
      }
      const afterDiscount = money.sub(consultationFee, discount);
      const tax =
        input.tax !== undefined ? toMoney(input.tax) : money.percentOf(afterDiscount, input.tax_rate);
      if (money.isNegative(tax)) throw ApiError.badRequest('Tax cannot be negative');
      const total = money.add(afterDiscount, tax);

      const payments = (Array.isArray(input.payments) ? input.payments : [])
        .map((p) => ({
          method: normalizePaymentMethod(p.account_name || p.method),
          amount: toMoney(p.amount),
          reference: p.reference || null,
        }))
        .filter((p) => p.amount > 0);

      const paidAmount = money.add(...payments.map((p) => p.amount));
      if (money.gt(paidAmount, total)) {
        throw ApiError.badRequest(
          `Payments (${paidAmount.toFixed(2)}) exceed the bill total (${total.toFixed(2)})`
        );
      }

      const year = currentYear();
      const sequence = await allocateForYear('opd_visit', year, { transaction: t });
      const visit_code = generateOpdVisitCode(year, sequence);

      const visit = await repository.create(
        {
          visit_code,
          patient_id: input.patient_id,
          doctor_id: input.doctor_id,
          department_id: doctor.department_id,
          visit_date: input.visit_date || new Date(),
          chief_complaint: input.chief_complaint || null,
          vitals: input.vitals || null,
          diagnosis: input.diagnosis || null,
          advice: input.advice || input.notes || null,
          consultation_fee: consultationFee,
          status: OPD_VISIT_STATUS.IN_CONSULTATION,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );

      const invoiceSequence = await allocateForYear('invoice', year, { transaction: t });

      const invoice = await Invoice.create(
        {
          invoice_code: generateInvoiceCode(year, invoiceSequence),
          patient_id: input.patient_id,
          opd_visit_id: visit.id,
          issued_at: visit.visit_date,
          subtotal: consultationFee,
          discount,
          tax,
          total,
          paid_amount: paidAmount,
          status: invoiceStatusFor(total, paidAmount),
          notes: input.notes || null,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );

      await InvoiceItem.create(
        {
          invoice_id: invoice.id,
          item_type: 'consultation',
          reference_id: visit.id,
          description: `OPD consultation — ${visit_code}`,
          quantity: 1,
          unit_price: consultationFee,
          total_price: consultationFee,
          service_id: cataloguePrice?.service_id || null,
          service_price_id: cataloguePrice?.service_price_id || null,
          pricing_snapshot: cataloguePrice ? { ...cataloguePrice, captured_at: new Date().toISOString() } : null,
        },
        { transaction: t }
      );

      for (const p of payments) {
        // eslint-disable-next-line no-await-in-loop
        const paymentSequence = await allocateForYear('payment', year, { transaction: t });
        // eslint-disable-next-line no-await-in-loop
        await Payment.create(
          {
            payment_code: generatePaymentCode(year, paymentSequence),
            invoice_id: invoice.id,
            amount: p.amount,
            method: p.method,
            reference: p.reference,
            paid_at: visit.visit_date,
            received_by: currentUserId || null,
          },
          { transaction: t }
        );
      }

      return visit.id;
    })
  ).then(async (visitId) => {
    // Read back after commit: the response only needs the durable state, and
    // reading post-commit avoids depending on include behaviour inside an
    // open transaction.
    const created = await repository.findById(visitId);
    return mapVisitResponse(created.toJSON());
  });

module.exports = { list, getById, create, update, complete, cancel, remove, getBillEntryMeta, createBill };
