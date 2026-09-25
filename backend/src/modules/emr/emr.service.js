'use strict';

const ApiError = require('../../utils/ApiError');
const {
  sequelize,
  Patient,
  PatientAllergy,
  PatientProblem,
  PatientHistory,
  VitalSign,
  ClinicalNote,
  User,
} = require('../../models');

const TYPES = {
  allergies: { model: PatientAllergy, required: ['allergen'], order: [['created_at', 'DESC']] },
  problems: { model: PatientProblem, required: ['title'], order: [['created_at', 'DESC']] },
  histories: { model: PatientHistory, required: ['category', 'title'], order: [['occurred_on', 'DESC'], ['created_at', 'DESC']] },
  vitals: { model: VitalSign, required: [], order: [['captured_at', 'DESC']] },
  notes: { model: ClinicalNote, required: ['title', 'content'], order: [['created_at', 'DESC']] },
};

const ALLOWED_FIELDS = {
  allergies: ['allergen', 'reaction', 'severity', 'status', 'onset_date', 'notes', 'verified_by'],
  problems: ['code', 'title', 'problem_type', 'status', 'onset_date', 'resolved_date', 'notes'],
  histories: ['category', 'title', 'details', 'occurred_on'],
  vitals: [
    'encounter_type', 'encounter_id', 'captured_at', 'temperature_c', 'pulse_bpm', 'respiratory_rate',
    'systolic_bp', 'diastolic_bp', 'spo2_percent', 'height_cm', 'weight_kg', 'pain_score', 'notes',
  ],
  notes: ['encounter_type', 'encounter_id', 'note_type', 'title', 'content', 'status'],
};

const sanitizeInput = (type, input) =>
  Object.fromEntries(ALLOWED_FIELDS[type].filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));

const includeAuthor = (type) => {
  if (type === 'notes') return [{ model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }];
  return [{ model: User, as: 'recorder', attributes: ['id', 'full_name', 'role'], required: false }];
};

const ensurePatient = async (patientId, transaction) => {
  const patient = await Patient.findByPk(patientId, { transaction });
  if (!patient) throw ApiError.notFound('Patient not found');
  return patient;
};

const normalize = (type, input, userId) => {
  const data = { ...input };
  if (type === 'vitals') {
    const height = Number(data.height_cm || 0);
    const weight = Number(data.weight_kg || 0);
    if (height > 0 && weight > 0) data.bmi = (weight / ((height / 100) ** 2)).toFixed(2);
    data.recorded_by = userId;
  } else if (type === 'notes') {
    data.author_id = userId;
    if (data.status === 'final') data.finalized_at = new Date();
  } else {
    data.recorded_by = userId;
  }
  return data;
};

const assertRequired = (type, input) => {
  for (const field of TYPES[type].required) {
    if (!String(input[field] || '').trim()) throw ApiError.badRequest(`${field.replace(/_/g, ' ')} is required`);
  }
  if (type === 'allergies' && input.status && !['active', 'inactive', 'resolved'].includes(input.status)) {
    throw ApiError.badRequest('Invalid allergy status');
  }
  if (type === 'problems' && input.status && !['active', 'resolved', 'inactive'].includes(input.status)) {
    throw ApiError.badRequest('Invalid problem status');
  }
  if (type === 'notes' && input.status && !['draft', 'final', 'amended'].includes(input.status)) {
    throw ApiError.badRequest('Invalid note status');
  }
  if (type === 'vitals') {
    const clinicalFields = ALLOWED_FIELDS.vitals.filter((field) => !['encounter_type', 'encounter_id', 'captured_at', 'notes'].includes(field));
    if (!clinicalFields.some((field) => input[field] !== undefined && input[field] !== null && input[field] !== '')) {
      throw ApiError.badRequest('At least one vital measurement is required');
    }
  }
};

const list = async (patientId, type, query = {}) => {
  await ensurePatient(patientId);
  const definition = TYPES[type];
  const where = { patient_id: patientId };
  if (query.status && definition.model.rawAttributes.status) where.status = query.status;
  const rows = await definition.model.findAll({
    where,
    include: includeAuthor(type),
    limit: Math.min(Number(query.limit || 100), 500),
    order: definition.order,
  });
  return rows.map((row) => row.toJSON());
};

const create = async (patientId, type, input, userId) =>
  sequelize.transaction(async (transaction) => {
    await ensurePatient(patientId, transaction);
    const clean = sanitizeInput(type, input);
    assertRequired(type, clean);
    const row = await TYPES[type].model.create(
      { ...normalize(type, clean, userId), patient_id: patientId },
      { transaction }
    );
    return row.toJSON();
  });

const update = async (type, id, changes, userId) =>
  sequelize.transaction(async (transaction) => {
    const row = await TYPES[type].model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw ApiError.notFound('Clinical record not found');
    if (type === 'notes' && row.status === 'final') {
      throw ApiError.conflict('Final clinical notes are immutable; create an amendment instead');
    }
    const next = sanitizeInput(type, changes);
    assertRequired(type, { ...row.toJSON(), ...next });
    if (type === 'vitals') {
      const height = Number(next.height_cm ?? row.height_cm ?? 0);
      const weight = Number(next.weight_kg ?? row.weight_kg ?? 0);
      if (height > 0 && weight > 0) next.bmi = (weight / ((height / 100) ** 2)).toFixed(2);
      next.recorded_by = userId;
    }
    if (type === 'notes' && next.status === 'final') next.finalized_at = new Date();
    await row.update(next, { transaction });
    return row.toJSON();
  });

const remove = async (type, id) =>
  sequelize.transaction(async (transaction) => {
    const row = await TYPES[type].model.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw ApiError.notFound('Clinical record not found');
    if (type === 'notes' && ['final', 'amended'].includes(row.status)) {
      throw ApiError.conflict('Final or amended clinical notes cannot be deleted');
    }
    await row.destroy({ transaction });
    return { message: 'Clinical record deleted' };
  });

const summary = async (patientId) => {
  const patient = await ensurePatient(patientId);
  const [allergies, problems, histories, vitals, notes] = await Promise.all([
    list(patientId, 'allergies', { limit: 100 }),
    list(patientId, 'problems', { limit: 100 }),
    list(patientId, 'histories', { limit: 100 }),
    list(patientId, 'vitals', { limit: 25 }),
    list(patientId, 'notes', { limit: 50 }),
  ]);
  return { patient: patient.toJSON(), allergies, problems, histories, vitals, notes };
};

module.exports = { TYPES, list, create, update, remove, summary };
