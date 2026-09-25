'use strict';

const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { currentYear } = require('../../utils/dateUtils');
const { allocateForYear } = require('../../utils/codeSequence');
const { generatePatientCode, generateCode, generateReferralCode } = require('../../utils/codeGenerator');
const { withCodeRetry } = require('../../utils/sequence');
const { createEncounterInvoice } = require('../../utils/encounterBilling');
const { EMERGENCY_STATUS, BED_STATUS, REFERRAL_STATUS } = require('../../config/constants');
const {
  sequelize, Organization, Hospital, Branch, Department, Patient, Doctor, User, Ward, Bed, Admission,
  VitalSign, ClinicalNote, EmergencyEncounter, EmergencyTriage, EmergencyDoctorAssignment,
  EmergencyAssessment, EmergencyOrder, EmergencyProcedure, EmergencyObservation, EmergencyDisposition,
  LabTest, RadiologyTest, Medicine, Service, ServiceType, ServicePrice, Invoice, InvoiceItem, Payment,
  ApprovalRequest, Referral,
} = require('../../models');
const repository = require('./emergency.repository');
const laboratoryService = require('../laboratory/laboratory.service');
const radiologyService = require('../radiology/radiology.service');
const prescriptionService = require('../prescriptions/prescriptions.service');
const ipdService = require('../ipd/ipd.service');
const catalogService = require('../service-catalog/service-catalog.service');

const ACTIVE_STATUSES = ['registered', 'triaged', 'under_assessment', 'treatment', 'observation'];
const TERMINAL_STATUSES = ['discharged', 'admitted', 'transferred'];
const STATUS_ORDER = ['registered', 'triaged', 'under_assessment', 'treatment', 'observation'];

const tenantScope = async (user, transaction) => {
  let branch = null;
  if (user.branch_id) branch = await Branch.findByPk(user.branch_id, { transaction });
  if (!branch && user.hospital_id) {
    branch = await Branch.findOne({ where: { hospital_id: user.hospital_id, is_active: true }, order: [['is_main', 'DESC'], ['id', 'ASC']], transaction });
  }
  if (!branch) branch = await Branch.findOne({ where: { is_active: true }, order: [['is_main', 'DESC'], ['id', 'ASC']], transaction });
  if (!branch) throw ApiError.conflict('No active branch is configured');
  const hospital = await Hospital.findByPk(user.hospital_id || branch.hospital_id, { transaction });
  if (!hospital) throw ApiError.conflict('No active hospital is configured');
  const organization = await Organization.findByPk(user.organization_id || hospital.organization_id, { transaction });
  if (!organization) throw ApiError.conflict('No active organization is configured');
  return { organization_id: organization.id, hospital_id: hospital.id, branch_id: branch.id };
};

const emergencyDepartment = async (scope, transaction) => Department.findOne({
  where: { code: 'EMERG', organization_id: scope.organization_id,
    [Op.or]: [{ branch_id: scope.branch_id }, { branch_id: null }] },
  order: [[sequelize.literal('branch_id IS NOT NULL'), 'DESC']], transaction,
});

const ensureEncounter = async (id, transaction, lock = false) => {
  const encounter = await repository.findBasicById(id, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!encounter) throw ApiError.notFound('Emergency encounter not found');
  return encounter;
};

const ensureActive = (encounter) => {
  if (TERMINAL_STATUSES.includes(encounter.status)) throw ApiError.conflict(`Emergency encounter is already ${encounter.status}`);
};

const advance = async (encounter, status, userId, transaction) => {
  if (TERMINAL_STATUSES.includes(status)) {
    await encounter.update({ status, updated_by: userId, discharge_at: new Date() }, { transaction });
    return;
  }
  const current = STATUS_ORDER.indexOf(encounter.status);
  const target = STATUS_ORDER.indexOf(status);
  if (target > current) await encounter.update({ status, updated_by: userId }, { transaction });
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  for (const field of ['status', 'priority', 'patient_id', 'assigned_doctor_id']) if (query[field]) filters[field] = query[field];
  if (query.active === true || query.active === 'true') filters.status = { [Op.in]: ACTIVE_STATUSES };
  const { rows, count } = await repository.findAndCount({ filters, dateRange: query, search: query.search, limit, offset });
  return { items: rows.map((row) => row.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (id) => {
  const row = await repository.findById(id);
  if (!row) throw ApiError.notFound('Emergency encounter not found');
  return row.toJSON();
};

const createPatient = async (input, user, scope, transaction) => {
  const year = currentYear();
  return withCodeRetry(async () => {
    const sequence = await allocateForYear('patient', year, { transaction });
    return Patient.create({
      ...input,
      patient_code: generatePatientCode(year, sequence),
      blood_group: input.blood_group || 'unknown',
      created_by: user.id,
      registered_at: new Date(),
      ...scope,
    }, { transaction });
  });
};

const register = async (input, user) => sequelize.transaction(async (transaction) => {
  const scope = await tenantScope(user, transaction);
  let patient;
  if (input.patient_id) patient = await Patient.findByPk(input.patient_id, { transaction });
  else patient = await createPatient(input.new_patient, user, scope, transaction);
  if (!patient) throw ApiError.badRequest('Patient not found');
  if (patient.organization_id && Number(patient.organization_id) !== Number(scope.organization_id)) {
    throw ApiError.forbidden('Patient belongs to another organization');
  }
  const existing = await EmergencyEncounter.findOne({
    where: { patient_id: patient.id, branch_id: scope.branch_id, status: { [Op.in]: ACTIVE_STATUSES } }, transaction,
  });
  if (existing) throw ApiError.conflict(`Patient already has active Emergency encounter ${existing.encounter_code}`);
  const department = await emergencyDepartment(scope, transaction);
  const year = currentYear();
  const encounter = await withCodeRetry(async () => {
    const sequence = await allocateForYear('emergency_encounter', year, { transaction });
    return EmergencyEncounter.create({
      encounter_code: generateCode('ER', year, sequence), patient_id: patient.id,
      department_id: department?.id || null, arrival_mode: input.arrival_mode || 'walk_in',
      arrival_at: input.arrival_at || new Date(), chief_complaint: input.chief_complaint,
      status: EMERGENCY_STATUS.REGISTERED, created_by: user.id, updated_by: user.id, ...scope,
    }, { transaction });
  });
  return (await repository.findById(encounter.id, { transaction })).toJSON();
});

const vitalPayload = (input, encounter, userId) => {
  const fields = ['temperature_c', 'pulse_bpm', 'respiratory_rate', 'systolic_bp', 'diastolic_bp', 'spo2_percent', 'height_cm', 'weight_kg', 'pain_score'];
  const data = Object.fromEntries(fields.filter((key) => input[key] !== undefined && input[key] !== null && input[key] !== '').map((key) => [key, input[key]]));
  if (!Object.keys(data).length) return null;
  const height = Number(data.height_cm || 0); const weight = Number(data.weight_kg || 0);
  if (height > 0 && weight > 0) data.bmi = (weight / ((height / 100) ** 2)).toFixed(2);
  return { ...data, patient_id: encounter.patient_id, encounter_type: 'emergency', encounter_id: encounter.id,
    captured_at: input.captured_at || new Date(), notes: input.vital_notes || null, recorded_by: userId };
};

const triage = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const previous = await EmergencyTriage.findOne({ where: { emergency_encounter_id: encounter.id }, order: [['version_no', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
  if (previous?.status === 'draft') throw ApiError.conflict('A draft triage exists; update and finalize that draft');
  const vitals = vitalPayload(input.vitals || {}, encounter, user.id);
  if (input.status === 'final' && !vitals) throw ApiError.badRequest('Final triage requires at least one vital measurement');
  const vital = vitals ? await VitalSign.create(vitals, { transaction }) : null;
  if (previous?.status === 'final') await previous.update({ status: 'amended' }, { transaction });
  const row = await EmergencyTriage.create({
    emergency_encounter_id: encounter.id, version_no: Number(previous?.version_no || 0) + 1,
    triage_level: input.triage_level, chief_complaint: input.chief_complaint || encounter.chief_complaint,
    pain_score: input.vitals?.pain_score ?? input.pain_score ?? null, consciousness: input.consciousness || 'alert',
    priority_notes: input.priority_notes || null, triage_notes: input.triage_notes || null,
    triage_nurse_id: user.id, vital_sign_id: vital?.id || null, status: input.status || 'final',
    finalized_at: (input.status || 'final') === 'final' ? new Date() : null,
  }, { transaction });
  if (row.status === 'final') {
    await encounter.update({ priority: row.triage_level, chief_complaint: row.chief_complaint }, { transaction });
    await advance(encounter, EMERGENCY_STATUS.TRIAGED, user.id, transaction);
  }
  return (await repository.findById(encounter.id, { transaction })).toJSON();
});

const updateTriage = async (id, changes, user) => sequelize.transaction(async (transaction) => {
  const row = await EmergencyTriage.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!row) throw ApiError.notFound('Emergency triage not found');
  if (row.status !== 'draft') throw ApiError.conflict('Finalized triage is immutable; create an amendment instead');
  const encounter = await ensureEncounter(row.emergency_encounter_id, transaction, true); ensureActive(encounter);
  const { vitals, ...triageChanges } = changes;
  if (changes.status === 'final') {
    let vital = row.vital_sign_id ? await VitalSign.findByPk(row.vital_sign_id, { transaction }) : null;
    const data = vitalPayload(vitals || {}, encounter, user.id);
    if (data) vital = vital ? await vital.update(data, { transaction }) : await VitalSign.create(data, { transaction });
    if (!vital) throw ApiError.badRequest('Final triage requires at least one vital measurement');
    triageChanges.vital_sign_id = vital.id; triageChanges.finalized_at = new Date();
  }
  await row.update(triageChanges, { transaction });
  if (row.status === 'final') {
    await encounter.update({ priority: row.triage_level, chief_complaint: row.chief_complaint }, { transaction });
    await advance(encounter, EMERGENCY_STATUS.TRIAGED, user.id, transaction);
  }
  return row.toJSON();
});

const assignDoctor = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const doctor = await Doctor.findByPk(input.doctor_id, { transaction });
  if (!doctor || !doctor.is_available) throw ApiError.badRequest('An available doctor is required');
  await EmergencyDoctorAssignment.update({ ended_at: new Date() }, { where: { emergency_encounter_id: encounter.id, ended_at: null }, transaction });
  const assignment = await EmergencyDoctorAssignment.create({
    emergency_encounter_id: encounter.id, doctor_id: doctor.id, assigned_by: user.id,
    assigned_at: new Date(), reason: input.reason || null,
  }, { transaction });
  await encounter.update({ assigned_doctor_id: doctor.id, updated_by: user.id }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.UNDER_ASSESSMENT, user.id, transaction);
  return assignment.toJSON();
});

const assessment = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  if (!encounter.assigned_doctor_id && user.role !== 'admin' && user.role !== 'super_admin') {
    throw ApiError.conflict('Assign a doctor before clinical assessment');
  }
  const previous = await EmergencyAssessment.findOne({ where: { emergency_encounter_id: encounter.id }, order: [['version_no', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
  if (previous?.status === 'draft') throw ApiError.conflict('A draft assessment exists; update that draft first');
  if (previous?.status === 'final') await previous.update({ status: 'amended' }, { transaction });
  const status = input.status || 'final'; const version = Number(previous?.version_no || 0) + 1;
  const content = [input.history && `History:\n${input.history}`, input.examination && `Examination:\n${input.examination}`,
    `Diagnosis:\n${input.diagnosis}`, input.differential_diagnosis && `Differential diagnosis:\n${input.differential_diagnosis}`,
    input.clinical_notes && `Clinical notes:\n${input.clinical_notes}`, input.disposition_plan && `Plan:\n${input.disposition_plan}`].filter(Boolean).join('\n\n');
  const note = await ClinicalNote.create({ patient_id: encounter.patient_id, encounter_type: 'emergency', encounter_id: encounter.id,
    note_type: 'assessment', title: `Emergency assessment v${version}`, content, status,
    author_id: user.id, finalized_at: status === 'final' ? new Date() : null }, { transaction });
  const row = await EmergencyAssessment.create({ ...input, emergency_encounter_id: encounter.id, version_no: version,
    chief_complaint: input.chief_complaint || encounter.chief_complaint, assessed_by: user.id,
    clinical_note_id: note.id, status, finalized_at: status === 'final' ? new Date() : null }, { transaction });
  if (status === 'final') await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction);
  return row.toJSON();
});

const updateAssessment = async (id, changes, user) => sequelize.transaction(async (transaction) => {
  const row = await EmergencyAssessment.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!row) throw ApiError.notFound('Emergency assessment not found');
  if (row.status !== 'draft') throw ApiError.conflict('Final assessment is immutable; create an amendment instead');
  const encounter = await ensureEncounter(row.emergency_encounter_id, transaction, true); ensureActive(encounter);
  await row.update({ ...changes, finalized_at: changes.status === 'final' ? new Date() : row.finalized_at }, { transaction });
  const note = row.clinical_note_id ? await ClinicalNote.findByPk(row.clinical_note_id, { transaction }) : null;
  if (note) await note.update({ content: changes.clinical_notes || note.content, status: changes.status || note.status,
    finalized_at: changes.status === 'final' ? new Date() : note.finalized_at }, { transaction });
  if (row.status === 'final') await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction);
  return row.toJSON();
});

const addLabOrder = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const order = await laboratoryService.createOrder({ ...input, patient_id: encounter.patient_id,
    doctor_id: input.doctor_id || encounter.assigned_doctor_id, emergency_encounter_id: encounter.id }, user.id, { transaction });
  await EmergencyOrder.create({ emergency_encounter_id: encounter.id, order_type: 'laboratory', reference_type: 'lab_order',
    reference_id: order.id, status: order.status, requested_by: user.id, notes: input.notes || null }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction); return order;
});

const addRadiologyOrder = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const bill = await radiologyService.createBill({ ...input, patient_id: encounter.patient_id,
    doctor_id: input.doctor_id || encounter.assigned_doctor_id, emergency_encounter_id: encounter.id }, user.id, { transaction });
  for (const order of bill.orders) await EmergencyOrder.create({ emergency_encounter_id: encounter.id, order_type: 'radiology',
    reference_type: 'radiology_order', reference_id: order.id, status: order.status, requested_by: user.id,
    notes: input.notes || null }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction); return bill;
});

const addMedicationOrder = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const doctorId = input.doctor_id || encounter.assigned_doctor_id;
  if (!doctorId) throw ApiError.badRequest('Assign a doctor before prescribing medication');
  const prescription = await prescriptionService.create({ ...input, patient_id: encounter.patient_id,
    doctor_id: doctorId, emergency_encounter_id: encounter.id }, { transaction });
  await EmergencyOrder.create({ emergency_encounter_id: encounter.id, order_type: 'medication', reference_type: 'prescription',
    reference_id: prescription.id, status: prescription.status, requested_by: user.id, notes: input.notes || null }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction); return prescription;
});

const addProcedure = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const service = await Service.findOne({ where: { id: input.service_id, status: 'active' }, transaction });
  if (!service) throw ApiError.badRequest('Active catalogue service not found');
  const resolved = await catalogService.resolvePrice({ service_id: service.id, payer_type: input.payer_type || 'self',
    payer_reference: input.payer_reference || null, at: input.performed_at || new Date() }, user, { transaction });
  const invoice = await createEncounterInvoice({ models: { Invoice, InvoiceItem, Payment }, transaction,
    patientId: encounter.patient_id, link: { emergency_encounter_id: encounter.id }, lines: [{ item_type: 'procedure',
      reference_id: service.id, service_id: service.id, description: service.name, quantity: input.quantity || 1,
      unit_price: resolved.amount, payer_type: input.payer_type, payer_reference: input.payer_reference }],
    payments: input.payments, discount: input.discount, discount_percent: input.discount_percent,
    tax: input.tax, tax_rate: input.tax_rate, issuedAt: input.performed_at || new Date(), notes: input.notes, currentUserId: user.id });
  const procedure = await EmergencyProcedure.create({ emergency_encounter_id: encounter.id, service_id: service.id,
    service_price_id: resolved.service_price_id, invoice_id: invoice.id, quantity: input.quantity || 1,
    status: input.status || 'completed', performed_by: input.status === 'ordered' ? null : user.id,
    performed_at: input.status === 'ordered' ? null : (input.performed_at || new Date()), notes: input.notes || null, created_by: user.id }, { transaction });
  await EmergencyOrder.create({ emergency_encounter_id: encounter.id, order_type: 'procedure', reference_type: 'emergency_procedure',
    reference_id: procedure.id, status: procedure.status, requested_by: user.id, notes: input.notes || null }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.TREATMENT, user.id, transaction);
  return { procedure: procedure.toJSON(), invoice: invoice.toJSON(), resolved_price: resolved };
});

const updateProcedureStatus = async (id, input, user) => sequelize.transaction(async (transaction) => {
  const row = await EmergencyProcedure.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!row) throw ApiError.notFound('Emergency procedure not found');
  const transitions = { ordered: ['in_progress', 'completed', 'cancelled'], in_progress: ['completed', 'cancelled'], completed: [], cancelled: [] };
  if (row.status !== input.status && !transitions[row.status].includes(input.status)) throw ApiError.conflict(`Cannot move procedure from ${row.status} to ${input.status}`);
  await row.update({ status: input.status, notes: input.notes ?? row.notes,
    performed_by: input.status === 'completed' ? user.id : row.performed_by,
    performed_at: input.status === 'completed' ? new Date() : row.performed_at }, { transaction });
  await EmergencyOrder.update({ status: input.status }, { where: { reference_type: 'emergency_procedure', reference_id: row.id }, transaction });
  return row.toJSON();
});

const assignObservation = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const bed = await Bed.findByPk(input.bed_id, { include: [{ model: Ward, as: 'ward' }], transaction, lock: transaction.LOCK.UPDATE });
  if (!bed || !bed.ward || bed.ward.type !== 'emergency') throw ApiError.badRequest('Select a bed from an Emergency ward');
  if (bed.status !== BED_STATUS.AVAILABLE) throw ApiError.conflict(`Bed ${bed.bed_number} is not available`);
  const active = await EmergencyObservation.findOne({ where: { [Op.or]: [{ bed_id: bed.id }, { emergency_encounter_id: encounter.id }], status: 'active' }, transaction, lock: transaction.LOCK.UPDATE });
  if (active) throw ApiError.conflict('The bed or encounter already has an active observation allocation');
  const observation = await EmergencyObservation.create({ emergency_encounter_id: encounter.id, bed_id: bed.id,
    assigned_by: user.id, notes: input.notes || null }, { transaction });
  await bed.update({ status: BED_STATUS.OCCUPIED }, { transaction });
  await encounter.update({ current_bed_id: bed.id, updated_by: user.id }, { transaction });
  await advance(encounter, EMERGENCY_STATUS.OBSERVATION, user.id, transaction); return observation.toJSON();
});

const releaseObservationInTransaction = async (observation, userId, transaction, { makeAvailable = true } = {}) => {
  if (observation.status !== 'active') throw ApiError.conflict('Observation allocation is not active');
  const bed = await Bed.findByPk(observation.bed_id, { transaction, lock: transaction.LOCK.UPDATE });
  await observation.update({ status: 'completed', ended_at: new Date(), ended_by: userId }, { transaction });
  if (bed && makeAvailable) {
    const admission = await Admission.findOne({ where: { bed_id: bed.id, status: 'admitted' }, transaction });
    if (!admission) await bed.update({ status: BED_STATUS.AVAILABLE }, { transaction });
  }
  const encounter = await ensureEncounter(observation.emergency_encounter_id, transaction, true);
  if (Number(encounter.current_bed_id) === Number(observation.bed_id)) await encounter.update({ current_bed_id: null, updated_by: userId }, { transaction });
  return observation;
};

const releaseObservation = async (id, user) => sequelize.transaction(async (transaction) => {
  const observation = await EmergencyObservation.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!observation) throw ApiError.notFound('Emergency observation not found');
  return (await releaseObservationInTransaction(observation, user.id, transaction)).toJSON();
});

const disposition = async (encounterId, input, user) => sequelize.transaction(async (transaction) => {
  const encounter = await ensureEncounter(encounterId, transaction, true); ensureActive(encounter);
  const existing = await EmergencyDisposition.findOne({ where: { emergency_encounter_id: encounter.id, status: 'completed' }, transaction });
  if (existing) throw ApiError.conflict('A completed disposition already exists');
  if (input.workflow_request_id) {
    const approval = await ApprovalRequest.findOne({ where: { id: input.workflow_request_id, status: 'approved' }, transaction });
    if (!approval) throw ApiError.conflict('The linked workflow request must be approved');
  }
  const observation = await EmergencyObservation.findOne({ where: { emergency_encounter_id: encounter.id, status: 'active' }, transaction, lock: transaction.LOCK.UPDATE });
  let admission = null; let referral = null; let terminal = EMERGENCY_STATUS.TRANSFERRED;
  if (input.disposition_type === 'ipd_admission' || input.disposition_type === 'icu_transfer') {
    if (!input.bed_id) throw ApiError.badRequest('A destination bed is required for admission');
    if (observation) await releaseObservationInTransaction(observation, user.id, transaction);
    admission = await ipdService.admit({ patient_id: encounter.patient_id, doctor_id: input.doctor_id || encounter.assigned_doctor_id,
      bed_id: input.bed_id, reason: input.reason || encounter.chief_complaint, diagnosis: input.diagnosis || null,
      notes: input.instructions || null, total_charges: input.total_charges || 0 }, user.id, { transaction });
    terminal = EMERGENCY_STATUS.ADMITTED;
  } else if (input.disposition_type === 'discharge') {
    if (observation) await releaseObservationInTransaction(observation, user.id, transaction);
    await ClinicalNote.create({ patient_id: encounter.patient_id, encounter_type: 'emergency', encounter_id: encounter.id,
      note_type: 'discharge', title: 'Emergency discharge', content: input.instructions || input.reason || 'Discharged from Emergency',
      status: 'final', author_id: user.id, finalized_at: new Date() }, { transaction });
    terminal = EMERGENCY_STATUS.DISCHARGED;
  } else {
    if (observation) await releaseObservationInTransaction(observation, user.id, transaction);
    if (input.disposition_type === 'referral') {
      if (!input.to_doctor_id && !input.external_facility && !input.external_doctor_name) throw ApiError.badRequest('Referral destination is required');
      const sequence = await allocateForYear('referral', currentYear(), { transaction });
      referral = await Referral.create({ referral_code: generateReferralCode(currentYear(), sequence), patient_id: encounter.patient_id,
        from_doctor_id: input.doctor_id || encounter.assigned_doctor_id, to_doctor_id: input.to_doctor_id || null,
        external_doctor_name: input.external_doctor_name || null, external_facility: input.external_facility || input.destination || null,
        external_phone: input.external_phone || null, reason: input.reason || null, notes: input.instructions || null,
        referred_at: new Date(), status: REFERRAL_STATUS.PENDING,
        organization_id: encounter.organization_id, hospital_id: encounter.hospital_id, branch_id: encounter.branch_id }, { transaction });
    }
  }
  const row = await EmergencyDisposition.create({ emergency_encounter_id: encounter.id, disposition_type: input.disposition_type,
    admission_id: admission?.id || null, referral_id: referral?.id || null, workflow_request_id: input.workflow_request_id || null,
    destination: input.destination || input.external_facility || null, reason: input.reason || null,
    instructions: input.instructions || null, disposed_by: user.id }, { transaction });
  await encounter.update({ admission_id: admission?.id || null }, { transaction });
  await advance(encounter, terminal, user.id, transaction);
  return { disposition: row.toJSON(), admission, referral: referral?.toJSON() || null };
});

const getMeta = async (user) => {
  const [patients, doctors, wards, labTests, radiologyTests, medicines, services] = await Promise.all([
    Patient.findAll({ attributes: ['id', 'patient_code', 'full_name', 'age', 'gender', 'blood_group', 'phone'], order: [['patient_code', 'ASC']], limit: 1000 }),
    Doctor.findAll({ where: { is_available: true }, include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }], order: [['doctor_code', 'ASC']] }),
    Ward.findAll({ where: { type: 'emergency', is_active: true }, include: [{ model: Bed, as: 'beds', where: { status: BED_STATUS.AVAILABLE }, required: false }], order: [['name', 'ASC']] }),
    LabTest.findAll({ where: { is_active: true }, attributes: ['id', 'code', 'name', 'price'], order: [['name', 'ASC']] }),
    RadiologyTest.findAll({ where: { is_active: true }, attributes: ['id', 'code', 'name', 'price'], order: [['name', 'ASC']] }),
    Medicine.findAll({ where: { is_active: true }, attributes: ['id', 'code', 'name', 'unit'], order: [['name', 'ASC']] }),
    Service.findAll({ where: { status: 'active' }, include: [
      { model: ServiceType, as: 'type', where: { code: 'EMERGENCY' }, attributes: ['id', 'code', 'name'] },
      { model: ServicePrice, as: 'prices', where: { status: 'approved' }, required: false, separate: true, order: [['version_no', 'DESC']] },
    ], order: [['name', 'ASC']] }),
  ]);
  return { patients, doctors, emergency_wards: wards, lab_tests: labTests, radiology_tests: radiologyTests,
    medicines, services, arrival_modes: ['walk_in', 'ambulance', 'transfer', 'police', 'other'],
    triage_levels: ['resuscitation', 'emergent', 'urgent', 'less_urgent', 'non_urgent'],
    statuses: [...ACTIVE_STATUSES, ...TERMINAL_STATUSES], user_scope: await tenantScope(user) };
};

const report = async (query) => {
  const filters = {}; const range = require('../../utils/dateUtils').dateTimeRange(query);
  if (range) filters.arrival_at = range;
  const encounters = await EmergencyEncounter.findAll({ where: filters, include: repository.listIncludes, order: [['arrival_at', 'ASC']] });
  const ids = encounters.map((e) => e.id);
  const [assignments, invoices] = await Promise.all([
    ids.length ? EmergencyDoctorAssignment.findAll({ where: { emergency_encounter_id: { [Op.in]: ids } } }) : [],
    ids.length ? Invoice.findAll({ where: { emergency_encounter_id: { [Op.in]: ids } }) : [],
  ]);
  const by = (values, key) => values.reduce((acc, value) => { const name = key(value) || 'unknown'; acc[name] = (acc[name] || 0) + 1; return acc; }, {});
  const firstAssignment = new Map(); for (const a of assignments) if (!firstAssignment.has(String(a.emergency_encounter_id))) firstAssignment.set(String(a.emergency_encounter_id), a);
  const waits = encounters.map((e) => { const a = firstAssignment.get(String(e.id)); return a ? (new Date(a.assigned_at) - new Date(e.arrival_at)) / 60000 : null; }).filter((x) => x !== null && x >= 0);
  const doctorPerformance = {};
  for (const e of encounters) if (e.assigned_doctor) { const name = e.assigned_doctor.user?.full_name || e.assigned_doctor.doctor_code; const row = doctorPerformance[name] || { encounters: 0, completed: 0 }; row.encounters += 1; if (TERMINAL_STATUSES.includes(e.status)) row.completed += 1; doctorPerformance[name] = row; }
  return { generated_at: new Date().toISOString(), total_visits: encounters.length, active_visits: encounters.filter((e) => ACTIVE_STATUSES.includes(e.status)).length,
    triage_distribution: by(encounters, (e) => e.priority), disposition_distribution: by(encounters.filter((e) => TERMINAL_STATUSES.includes(e.status)), (e) => e.status),
    daily_visits: by(encounters, (e) => new Date(e.arrival_at).toISOString().slice(0, 10)), average_doctor_wait_minutes: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
    doctor_performance: doctorPerformance, revenue: { invoice_count: invoices.length,
      billed: Number(invoices.reduce((sum, i) => sum + Number(i.total || 0), 0).toFixed(2)),
      collected: Number(invoices.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0).toFixed(2)),
      due: Number(invoices.reduce((sum, i) => sum + Math.max(Number(i.total || 0) - Number(i.paid_amount || 0), 0), 0).toFixed(2)) } };
};

const dashboard = async () => report({ from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() });
const getOrders = async (encounterId) => { await ensureEncounter(encounterId); return EmergencyOrder.findAll({ where: { emergency_encounter_id: encounterId }, order: [['requested_at', 'DESC']] }); };
const getBilling = async (encounterId) => { await ensureEncounter(encounterId); return Invoice.findAll({ where: { emergency_encounter_id: encounterId }, include: [{ model: InvoiceItem, as: 'items' }, { model: Payment, as: 'payments' }], order: [['issued_at', 'DESC']] }); };

module.exports = { list, getById, register, triage, updateTriage, assignDoctor, assessment, updateAssessment,
  addLabOrder, addRadiologyOrder, addMedicationOrder, addProcedure, updateProcedureStatus,
  assignObservation, releaseObservation, disposition, getMeta, report, dashboard, getOrders, getBilling };

