'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateLabOrderCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { LAB_ORDER_STATUS } = require('../../config/constants');
const { sequelize, Patient, Doctor, User, LabTest, LabOrder } = require('../../models');
const repository = require('./laboratory.repository');
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
  const items = rows.map((t) => {
    const json = t.toJSON();
    const price = Number(json.price || 0);
    return {
      ...json,
      base_charge: json.base_charge ? Number(json.base_charge) : price,
      final_charge: json.final_charge ? Number(json.final_charge) : price,
    };
  });
  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const getTest = async (id) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Lab test not found');
  return test.toJSON();
};

const createTest = async (input) => {
  const exists = await repository.findTestByCode(input.code);
  if (exists) throw ApiError.conflict('Lab test code already exists');
  const test = await repository.createTest(input);
  return test.toJSON();
};

const updateTest = async (id, changes) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Lab test not found');
  if (changes.code && changes.code !== test.code) {
    const exists = await repository.findTestByCode(changes.code);
    if (exists) throw ApiError.conflict('Lab test code already exists');
  }
  await repository.updateTest(test, changes);
  return test.toJSON();
};

const removeTest = async (id) => {
  const test = await repository.findTestById(id);
  if (!test) throw ApiError.notFound('Lab test not found');
  await repository.destroyTest(test);
  return { message: 'Lab test deleted' };
};

const listOrders = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
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
  if (!order) throw ApiError.notFound('Lab order not found');
  return order.toJSON();
};

const getOrderReport = async (id) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Lab order not found');
  const data = order.toJSON();
  return {
    document_type: 'laboratory_report',
    generated_at: new Date().toISOString(),
    order: data,
    patient: data.patient,
    doctor: data.doctor,
    results: (data.items || []).map((item) => ({
      item_id: item.id,
      test: item.test,
      status: item.status,
      result_value: item.result_value,
      result_notes: item.result_notes,
      result_at: item.result_at,
    })),
  };
};

const createOrder = async (input, currentUserId) => {
  return sequelize.transaction(async (t) => {
    const patient = await Patient.findByPk(input.patient_id, { transaction: t });
    if (!patient) throw ApiError.badRequest('Patient not found');
    // BUG-036 — an unknown doctor used to be silently discarded, losing the
    // referring clinician without telling anyone. It is now an explicit error,
    // and the namespaced external form is rejected with guidance.
    if (input.doctor_id !== undefined && input.doctor_id !== null && input.doctor_id !== '') {
      if (String(input.doctor_id).startsWith('external:')) {
        throw ApiError.badRequest(
          'External referrers cannot be stored as doctor_id. Send external_referrer_name instead.'
        );
      }
      const doctor = await Doctor.findByPk(input.doctor_id, { transaction: t });
      if (!doctor) throw ApiError.badRequest(`Doctor ${input.doctor_id} not found`);
    }

    let total = 0;
    const rows = [];
    for (const item of input.items) {
      const test = await repository.findTestById(item.test_id, { transaction: t });
      if (!test) throw ApiError.badRequest(`Lab test not found: ${item.test_id}`);
      if (!test.is_active) throw ApiError.badRequest(`${test.name} is inactive`);
      const price = item.price !== undefined ? toMoney(item.price) : toMoney(test.price);
      total += price;
      rows.push({ test_id: test.id, price, status: LAB_ORDER_STATUS.ORDERED });
    }

    const year = currentYear();
    const order = await withCodeRetry(async () => {
      // Atomically claimed. Deriving it from COUNT(*) made ten simultaneous
      // bookings compute the same number, so nine were rejected with 409.
      const sequence = await allocateForYear('lab_order', year, { transaction: t });
      const order_code = generateLabOrderCode(year, sequence);
      return repository.createOrder(
        {
          order_code,
          patient_id: input.patient_id,
          doctor_id: input.doctor_id || null,
          ordered_at: input.ordered_at || new Date(),
          status: LAB_ORDER_STATUS.ORDERED,
          total,
          notes: input.notes || null,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );
    });

    await repository.createOrderItems(
      rows.map((row) => ({ ...row, order_id: order.id })),
      { transaction: t }
    );

    // BUG-042 - lab revenue now becomes a real invoice (and payments, when
    // collected at the counter) instead of living only as a total on the order.
    const { Invoice, InvoiceItem, Payment } = require('../../models');
    await createEncounterInvoice({
      models: { Invoice, InvoiceItem, Payment },
      transaction: t,
      patientId: input.patient_id,
      link: { lab_order_id: order.id },
      lines: rows.map((row, i) => ({
        item_type: 'lab_test',
        reference_id: row.test_id,
        description: `Lab test - ${input.items[i]?.name || `#${row.test_id}`}`,
        quantity: 1,
        unit_price: row.price,
      })),
      payments: input.payments,
      discount: input.discount,
      discount_percent: input.discount_percent,
      tax: input.tax,
      tax_rate: input.tax_rate,
      issuedAt: order.ordered_at,
      currentUserId,
    });

    return (await repository.findOrderById(order.id, { transaction: t })).toJSON();
  });
};

// BUG-037 — the lab order status had no state machine either: an order could be
// marked completed while items still had no result, and a completed order could
// be reopened.
const LAB_TRANSITIONS = Object.freeze({
  ordered: ['sample_collected', 'in_progress', 'completed', 'cancelled'],
  sample_collected: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

const updateOrderStatus = async (id, status) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Lab order not found');

  const allowed = LAB_TRANSITIONS[order.status] || [];
  if (order.status !== status && !allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot move a lab order from "${order.status}" to "${status}"`);
  }
  if (status === LAB_ORDER_STATUS.COMPLETED) {
    const pending = (order.items || []).filter(
      (i) => i.result_value === null || String(i.result_value).trim() === ''
    );
    if (pending.length) {
      throw ApiError.badRequest(
        `Cannot complete this order: ${pending.length} of ${order.items.length} test(s) have no result recorded`
      );
    }
  }
  await repository.updateOrder(order, { status });
  return (await repository.findOrderById(id)).toJSON();
};

const updateOrderItemResult = async (orderId, itemId, changes, currentUserId) => {
  const order = await repository.findOrderById(orderId);
  if (!order) throw ApiError.notFound('Lab order not found');
  const item = await repository.findOrderItemById(itemId);
  if (!item || Number(item.order_id) !== Number(orderId)) throw ApiError.notFound('Lab order item not found');
  if (order.status === LAB_ORDER_STATUS.CANCELLED) {
    throw ApiError.badRequest('Cannot record a result on a cancelled order');
  }
  await repository.updateOrderItem(item, {
    result_value: changes.result_value,
    result_notes: changes.result_notes,
    result_at: changes.result_at || new Date(),
    status: changes.status || item.status,
    verified_by: currentUserId || null,
    verified_at: new Date(),
  });
  return (await repository.findOrderById(orderId)).toJSON();
};

const removeOrder = async (id) => {
  const order = await repository.findOrderById(id);
  if (!order) throw ApiError.notFound('Lab order not found');
  await repository.destroyOrder(order);
  return { message: 'Lab order deleted' };
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
    LabTest.findAll({
      order: [['name', 'ASC']],
    }),
    LabOrder.count(),
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

  // BUG-036 — external referrers were appended using their master_options id in
  // the same `id` field as real doctors. Selecting one sent a foreign id as
  // `doctor_id`, which either matched an unrelated doctor row or was silently
  // nulled. They are namespaced now, and createOrder rejects the namespaced form
  // rather than guessing.
  if (referralOptions.length) {
    referralOptions.forEach((ref) => {
      doctorList.push({
        id: `external:${ref.id}`,
        external_referrer_id: ref.id,
        is_external: true,
        doctor_code: ref.code || 'REF',
        full_name: `${ref.label} (External)`,
      });
    });
  }

  return {
    next_bill_no: `BILL-${String(orderCount + 1).padStart(6, '0')}`,
    next_patient_code: `PAT-${String(patientCount + 1).padStart(5, '0')}`,
    accounts: ['Cash', 'Card', 'Bkash', 'Nagad', 'Bank Transfer'],
    doctors: doctorList,
    patients: patients.map((p) => p.toJSON()),
    tests: tests.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      price: Number(t.price || 0),
      tax_rate: 0,
    })),
  };
};

const getPathologyParametersMeta = async () => {
  const { MasterOption } = require('../../models');
  const units = await MasterOption.findAll({
    where: { type: 'pathology_test_unit', is_active: true },
    order: [['label', 'ASC']],
  });
  return { units: units.map((u) => u.toJSON()) };
};

const listPathologyParameters = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const { rows, count } = await repository.findAndCountPathologyParameters({
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((p) => p.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getPathologyParameter = async (id) => {
  const param = await repository.findPathologyParameterById(id);
  if (!param) throw ApiError.notFound('Pathology parameter not found');
  return param.toJSON();
};

const createPathologyParameter = async (input) => {
  const param = await repository.createPathologyParameter(input);
  const refreshed = await repository.findPathologyParameterById(param.id);
  return refreshed ? refreshed.toJSON() : param.toJSON();
};

const updatePathologyParameter = async (id, changes) => {
  const param = await repository.findPathologyParameterById(id);
  if (!param) throw ApiError.notFound('Pathology parameter not found');
  await repository.updatePathologyParameter(param, changes);
  const refreshed = await repository.findPathologyParameterById(id);
  return refreshed ? refreshed.toJSON() : param.toJSON();
};

const removePathologyParameter = async (id) => {
  const param = await repository.findPathologyParameterById(id);
  if (!param) throw ApiError.notFound('Pathology parameter not found');
  await repository.destroyPathologyParameter(param);
  return { message: 'Pathology parameter deleted' };
};

const getPathologyTestEntryMeta = async () => {
  const { MasterOption, PathologyParameter, LabTest } = require('../../models');
  const categories = await MasterOption.findAll({
    where: { type: 'pathology_test_category', is_active: true },
    order: [['label', 'ASC']],
  });
  const parameters = await PathologyParameter.findAll({
    order: [['name', 'ASC']],
  });
  const count = await LabTest.count();
  const next_test_code = `PATH-${String(count + 1).padStart(4, '0')}`;

  let catList = categories.map((c) => c.toJSON());
  if (!catList.length) {
    catList = [
      { id: 1, label: 'Hematology', code: 'hematology' },
      { id: 2, label: 'Biochemistry', code: 'biochemistry' },
      { id: 3, label: 'Microbiology', code: 'microbiology' },
      { id: 4, label: 'Serology', code: 'serology' },
      { id: 5, label: 'Immunology', code: 'immunology' },
      { id: 6, label: 'Clinical Pathology', code: 'clinical_pathology' },
      { id: 7, label: 'Histopathology', code: 'histopathology' },
    ];
  }

  return {
    next_test_code,
    categories: catList,
    parameters: parameters.map((p) => p.toJSON()),
  };
};

const createPathologyTestEntry = async (input) => {
  // BUG-035 — these two fields were cross-wired: `test_type` was written into
  // `sample_type` and, far worse, `method` was written into `normal_range`, so
  // the reference range printed on a patient's lab report was actually the test
  // METHOD text. A clinician comparing a result against "normal" was reading the
  // wrong field entirely.
  if (!input.name || !String(input.name).trim()) {
    throw ApiError.badRequest('Test name is required');
  }
  const code = input.code || input.short_name || `PATH-${Date.now()}`;
  const test = await repository.createTest({
    code,
    name: input.name,
    category: input.category,
    test_type: input.test_type || null,
    method: input.method || null,
    sample_type: input.sample_type || null,
    normal_range: input.normal_range || null,
    unit: input.unit || null,
    price: Number(input.final_charge || input.base_charge || input.price || 0),
    base_charge: Number(input.base_charge || input.price || 0),
    final_charge: Number(input.final_charge || input.base_charge || input.price || 0),
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
  updateOrderStatus,
  updateOrderItemResult,
  removeOrder,
  getBillEntryMeta,
  getPathologyParametersMeta,
  listPathologyParameters,
  getPathologyParameter,
  createPathologyParameter,
  updatePathologyParameter,
  removePathologyParameter,
  getPathologyTestEntryMeta,
  createPathologyTestEntry,
};
