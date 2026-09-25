'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateRadiologyOrderCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { RADIOLOGY_ORDER_STATUS } = require('../../config/constants');
const { sequelize, Patient, Doctor, User, RadiologyTest, RadiologyOrder } = require('../../models');
const money = require('../../utils/money');
const repository = require('./radiology.repository');
const { createEncounterInvoice } = require('../../utils/encounterBilling');

const toMoney = (value) => Number(value || 0);

const listTests = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.category) filters.category = query.category;
  if (query.is_active !== undefined) filters.is_active = query.is_active;
  const { rows, count } = await repository.findAndCountTests({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((t) => t.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getTest = async (id) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Radiology test not found');
  return test.toJSON();
};

const createTest = async (input) => {
  const exists = await repository.findTestByCode(input.code);
  if (exists) throw ApiError.conflict('Radiology test code already exists');
  const test = await repository.createTest(input);
  return test.toJSON();
};

const updateTest = async (id, changes) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Radiology test not found');
  if (changes.code && changes.code !== test.code) {
    const exists = await repository.findTestByCode(changes.code);
    if (exists) throw ApiError.conflict('Radiology test code already exists');
  }
  await repository.updateTest(test, changes);
  return test.toJSON();
};

const removeTest = async (id) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Radiology test not found');
  await repository.destroyTest(test);
  return { message: 'Radiology test deleted' };
};

const listOrders = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
  if (query.test_id) filters.test_id = query.test_id;
  if (query.status) filters.status = query.status;
  const { rows, count } = await repository.findAndCountOrders({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((o) => o.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getOrder = async (id) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Radiology order not found');
  return order.toJSON();
};

const getOrderReport = async (id) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Radiology order not found');
  const data = order.toJSON();
  return {
    document_type: 'radiology_report',
    generated_at: new Date().toISOString(),
    order: data,
    patient: data.patient,
    doctor: data.doctor,
    test: data.test,
    result: {
      status: data.status,
      result_notes: data.result_notes,
      result_image_url: data.result_image_url,
      result_at: data.result_at,
    },
  };
};

const createOrder = async (input, currentUserId) => {
  const patient = await Patient.findByPk(input.patient_id);
  if (!patient) throw ApiError.badRequest('Patient not found');
  if (input.doctor_id) {
    const doctor = await Doctor.findByPk(input.doctor_id);
    if (!doctor) throw ApiError.badRequest('Doctor not found');
  }
  const test = await repository.findTestById(input.test_id);
  if (!test) throw ApiError.badRequest('Radiology test not found');
  if (!test.is_active) throw ApiError.badRequest(`${test.name} is inactive`);

  const price = input.price !== undefined ? toMoney(input.price) : toMoney(test.price);
  const year = currentYear();
  const order = await withCodeRetry(async () => {
    const sequence = await allocateForYear('radiology_order', year);
    const order_code = generateRadiologyOrderCode(year, sequence);
    return repository.createOrder({
      order_code,
      patient_id: input.patient_id,
      doctor_id: input.doctor_id || null,
      test_id: input.test_id,
      ordered_at: input.ordered_at || new Date(),
      status: RADIOLOGY_ORDER_STATUS.ORDERED,
      price,
      total: price,
      notes: input.notes || null,
      created_by: currentUserId || null,
    });
  });
  return (await repository.findOrderById(order.id)).toJSON();
};

const createBill = async (input, currentUserId, options = {}) => {
  const work = async (t) => {
    const patient = await Patient.findByPk(input.patient_id, { transaction: t });
    if (!patient) throw ApiError.badRequest('Patient not found');

    let doctorId = input.doctor_id || null;
    if (doctorId) {
      const doctor = await Doctor.findByPk(doctorId, { transaction: t });
      if (!doctor) doctorId = null;
    }

    const items = input.items || [];
    if (!items.length) throw ApiError.badRequest('At least one radiology test item is required');

    const createdOrders = [];
    const year = currentYear();

    for (const item of items) {
      const test = await repository.findTestById(item.test_id, { transaction: t });
      if (!test) throw ApiError.badRequest(`Radiology test not found: ${item.test_id}`);

      const price = item.price !== undefined ? toMoney(item.price) : toMoney(test.price);
      const order = await withCodeRetry(async () => {
        const sequence = await allocateForYear('radiology_order', year, { transaction: t });
        const order_code = generateRadiologyOrderCode(year, sequence);
        return repository.createOrder(
          {
            order_code,
            patient_id: input.patient_id,
            doctor_id: doctorId,
            emergency_encounter_id: input.emergency_encounter_id || null,
            test_id: test.id,
            ordered_at: input.ordered_at || new Date(),
            status: RADIOLOGY_ORDER_STATUS.ORDERED,
            price,
            total: price,
            notes: input.notes || null,
            created_by: currentUserId || null,
          },
          { transaction: t }
        );
      });
      const orderJson = await repository.findOrderById(order.id, { transaction: t });
      createdOrders.push(orderJson ? orderJson.toJSON() : order.toJSON());
    }

    // BUG-042 - one invoice covers the whole radiology bill, with a line per
    // test, linked to the first order of the bill.
    const { Invoice, InvoiceItem, Payment } = require('../../models');
    const invoice = await createEncounterInvoice({
      models: { Invoice, InvoiceItem, Payment },
      transaction: t,
      patientId: input.patient_id,
      link: {
        radiology_order_id: createdOrders[0]?.id || null,
        emergency_encounter_id: input.emergency_encounter_id || null,
      },
      lines: createdOrders.map((o) => ({
        item_type: 'radiology',
        reference_id: o.id,
        service_source_type: 'radiology_test',
        service_source_id: o.test_id,
        description: `Radiology - ${o.test?.name || o.order_code}`,
        quantity: 1,
        unit_price: o.price,
      })),
      payments: input.payments,
      discount: input.discount,
      discount_percent: input.discount_percent,
      tax: input.tax,
      tax_rate: input.tax_rate,
      issuedAt: input.ordered_at || new Date(),
      currentUserId,
    });

    return {
      order_code: createdOrders[0]?.order_code || 'RADBILL',
      invoice_code: invoice.invoice_code,
      invoice_id: invoice.id,
      total: Number(invoice.total),
      paid_amount: Number(invoice.paid_amount),
      due_amount: money.subFloor(invoice.total, invoice.paid_amount),
      orders: createdOrders,
    };
  };
  return options.transaction ? work(options.transaction) : sequelize.transaction(work);
};

// BUG-037 — order status used to accept any enum value in any direction, so a
// completed report could be reopened and an order could be completed with no
// result at all.
const RADIOLOGY_TRANSITIONS = Object.freeze({
  ordered: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

const updateOrderStatus = async (id, status, currentUserId) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Radiology order not found');

  const allowed = RADIOLOGY_TRANSITIONS[order.status] || [];
  if (order.status !== status && !allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot move a radiology order from "${order.status}" to "${status}"`);
  }
  if (status === RADIOLOGY_ORDER_STATUS.COMPLETED && !String(order.impression || '').trim()) {
    throw ApiError.badRequest('An impression must be recorded before completing a radiology order');
  }

  await repository.updateOrder(order, {
    status,
    verified_by: status === RADIOLOGY_ORDER_STATUS.COMPLETED ? currentUserId || order.verified_by : order.verified_by,
    verified_at: status === RADIOLOGY_ORDER_STATUS.COMPLETED ? new Date() : order.verified_at,
  });
  return (await repository.findOrderById(id)).toJSON();
};

const updateOrderResult = async (id, changes, currentUserId) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Radiology order not found');

  // BUG-037 — a result may not be attached to a cancelled order, and a completed
  // report may not be silently rewritten without an explicit status change.
  if (order.status === RADIOLOGY_ORDER_STATUS.CANCELLED) {
    throw ApiError.badRequest('Cannot record a result on a cancelled order');
  }

  const nextStatus = changes.status || order.status;
  // BUG-037 — completion requires an actual radiological opinion.
  const findings = changes.findings !== undefined ? changes.findings : order.findings;
  const impression = changes.impression !== undefined ? changes.impression : order.impression;
  if (nextStatus === RADIOLOGY_ORDER_STATUS.COMPLETED && !String(impression || '').trim()) {
    throw ApiError.badRequest(
      'An impression is required before a radiology order can be completed'
    );
  }

  await repository.updateOrder(order, {
    findings,
    impression,
    result_notes: changes.result_notes !== undefined ? changes.result_notes : order.result_notes,
    result_image_url: changes.result_image_url !== undefined ? changes.result_image_url : order.result_image_url,
    result_at: changes.result_at || new Date(),
    status: nextStatus,
    verified_by: nextStatus === RADIOLOGY_ORDER_STATUS.COMPLETED ? currentUserId || order.verified_by : order.verified_by,
    verified_at: nextStatus === RADIOLOGY_ORDER_STATUS.COMPLETED ? new Date() : order.verified_at,
  });
  return (await repository.findOrderById(id)).toJSON();
};

const removeOrder = async (id) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Radiology order not found');
  await repository.destroyOrder(order);
  return { message: 'Radiology order deleted' };
};

const getBillEntryMeta = async () => {
  const { MasterOption } = require('../../models');
  const [doctors, patients, tests, orderCount, patientCount, referralOptions] = await Promise.all([
    Doctor.findAll({
      include: [{ model: User, as: 'user', attributes: ['full_name'] }],
      order: [['doctor_code', 'ASC']],
    }),
    Patient.findAll({
      attributes: ['id', 'patient_code', 'full_name', 'phone'],
      order: [['patient_code', 'ASC']],
    }),
    RadiologyTest.findAll({
      order: [['name', 'ASC']],
    }),
    RadiologyOrder.count(),
    Patient.count(),
    MasterOption.findAll({
      where: { type: 'referral_doctor', is_active: true },
      order: [['label', 'ASC']],
    }).catch(() => []),
  ]);

  let doctorList = doctors.map((d) => ({
    id: d.id,
    doctor_code: d.doctor_code,
    full_name: d.user?.full_name || d.doctor_code || `Doctor #${d.id}`,
  }));

  if (referralOptions.length) {
    referralOptions.forEach((ref) => {
      doctorList.push({
        id: ref.id,
        doctor_code: ref.code || 'REF',
        full_name: `${ref.label} (External)`,
      });
    });
  }

  return {
    next_bill_no: `RADBILL-${String(orderCount + 1).padStart(6, '0')}`,
    next_patient_code: `PAT-${String(patientCount + 1).padStart(5, '0')}`,
    accounts: ['Cash', 'Card', 'Bkash', 'Nagad', 'Bank Transfer'],
    doctors: doctorList,
    patients: patients.map((p) => p.toJSON()),
    tests: tests.map((t) => t.toJSON()),
  };
};

const getRadiologyParametersMeta = async () => {
  const { MasterOption } = require('../../models');
  const units = await MasterOption.findAll({
    where: { type: 'radiology_test_unit', is_active: true },
    order: [['label', 'ASC']],
  });
  return { units: units.map((u) => u.toJSON()) };
};

const listRadiologyParameters = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const { rows, count } = await repository.findAndCountRadiologyParameters({
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((p) => p.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getRadiologyParameter = async (id) => {
  const param = await repository.findRadiologyParameterById(id);
  if (!param) throw ApiError.notFound('Radiology parameter not found');
  return param.toJSON();
};

const createRadiologyParameter = async (input) => {
  const param = await repository.createRadiologyParameter(input);
  const refreshed = await repository.findRadiologyParameterById(param.id);
  return refreshed ? refreshed.toJSON() : param.toJSON();
};

const updateRadiologyParameter = async (id, changes) => {
  const param = await repository.findRadiologyParameterById(id);
  if (!param) throw ApiError.notFound('Radiology parameter not found');
  await repository.updateRadiologyParameter(param, changes);
  const refreshed = await repository.findRadiologyParameterById(id);
  return refreshed ? refreshed.toJSON() : param.toJSON();
};

const removeRadiologyParameter = async (id) => {
  const param = await repository.findRadiologyParameterById(id);
  if (!param) throw ApiError.notFound('Radiology parameter not found');
  await repository.destroyRadiologyParameter(param);
  return { message: 'Radiology parameter deleted' };
};

const getRadiologyTestEntryMeta = async () => {
  const { MasterOption, RadiologyParameter, RadiologyTest } = require('../../models');
  const categories = await MasterOption.findAll({
    where: { type: 'radiology_test_category', is_active: true },
    order: [['label', 'ASC']],
  });
  const parameters = await RadiologyParameter.findAll({
    order: [['name', 'ASC']],
  });
  const count = await RadiologyTest.count();
  const next_test_code = `RAD-${String(count + 1).padStart(4, '0')}`;

  let catList = categories.map((c) => c.toJSON());
  if (!catList.length) {
    catList = [
      { id: 1, label: 'X-Ray', code: 'xray' },
      { id: 2, label: 'MRI', code: 'mri' },
      { id: 3, label: 'CT Scan', code: 'ct_scan' },
      { id: 4, label: 'Ultrasound', code: 'ultrasound' },
      { id: 5, label: 'Mammography', code: 'mammography' },
      { id: 6, label: 'PET-CT', code: 'pet_ct' },
      { id: 7, label: 'Fluoroscopy', code: 'fluoroscopy' },
      { id: 8, label: 'DEXA Scan', code: 'dexa_scan' },
      { id: 9, label: 'Angiography', code: 'angiography' },
    ];
  }

  return {
    next_test_code,
    categories: catList,
    parameters: parameters.map((p) => p.toJSON()),
    tax_rates: ['0', '5', '10', '15'],
  };
};

const createRadiologyTestEntry = async (input) => {
  const code = input.code || input.short_name || `RAD-${Date.now()}`;
  const price = Number(input.final_charge || input.base_charge || 0);
  const base_charge = Number(input.base_charge || price || 0);
  const final_charge = Number(input.final_charge || price || 0);
  const tax_rate = Number(input.tax_rate || 0);

  const test = await repository.createTest({
    code,
    name: input.name,
    short_name: input.short_name || code,
    test_type: input.test_type || input.category || 'Standard',
    method: input.method || 'Standard',
    report_delivery_day: input.report_delivery_day || '1 Day',
    category: input.category || 'other',
    price,
    base_charge,
    final_charge,
    tax_rate,
    description: input.description || input.method || null,
    is_active: true,
  });
  return test.toJSON();
};

module.exports = {
  listTests,
  getTest,
  createTest,
  updateTest,
  removeTest,
  listOrders,
  getOrder,
  getOrderReport,
  createOrder,
  createBill,
  updateOrderStatus,
  updateOrderResult,
  removeOrder,
  getBillEntryMeta,
  getRadiologyParametersMeta,
  listRadiologyParameters,
  getRadiologyParameter,
  createRadiologyParameter,
  updateRadiologyParameter,
  removeRadiologyParameter,
  getRadiologyTestEntryMeta,
  createRadiologyTestEntry,
};
