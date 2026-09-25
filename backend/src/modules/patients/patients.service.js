'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generatePatientCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const repository = require('./patients.repository');

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.gender) filters.gender = query.gender;
  if (query.blood_group) filters.blood_group = query.blood_group;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((p) => p.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const patient = await repository.findById(id);
  if (!patient) throw ApiError.notFound('Patient not found');
  return patient.toJSON();
};

const timelineDate = (type, item) => {
  if (type === 'appointment') return `${item.appointment_date}T${String(item.appointment_time).slice(0, 8)}`;
  return item.visit_date || item.admitted_at || item.arrival_at || item.prescribed_at || item.ordered_at || item.issued_at || item.sold_at || item.captured_at || item.created_at;
};

const timelineTitle = (type, item) => {
  const code =
    item.appointment_code ||
    item.visit_code ||
    item.admission_code ||
    item.encounter_code ||
    item.prescription_code ||
    item.order_code ||
    item.invoice_code ||
    item.sale_code ||
    item.id;
  return `${type.replace(/_/g, ' ')} #${code}`;
};

const getTimeline = async (id, query = {}) => {
  const patient = await repository.findById(id);
  if (!patient) throw ApiError.notFound('Patient not found');

  const limit = Math.min(Number(query.limit || 20), 100);
  const groups = await repository.findTimelineByPatientId(id, { limit });
  const events = Object.entries(groups).flatMap(([group, rows]) => {
    const type = group.replace(/s$/, '');
    return rows.map((row) => {
      const item = row.toJSON();
      const occurredAt = timelineDate(type, item);
      return {
        type,
        title: timelineTitle(type, item),
        occurred_at: occurredAt,
        status: item.status || null,
        reference_id: item.id,
        data: item,
      };
    });
  });

  events.sort((a, b) => new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0));

  return {
    patient: patient.toJSON(),
    events,
    groups: Object.fromEntries(
      Object.entries(groups).map(([key, rows]) => [key, rows.map((row) => row.toJSON())])
    ),
  };
};

const create = async (input) => {
  const year = currentYear();
  const patient = await withCodeRetry(async () => {
    const sequence = await allocateForYear('patient', year);
    const patient_code = generatePatientCode(year, sequence);
    return repository.create({
      ...input,
      patient_code,
      blood_group: input.blood_group || 'unknown',
    });
  });
  return patient.toJSON();
};

const update = async (id, changes) => {
  const patient = await repository.findById(id);
  if (!patient) throw ApiError.notFound('Patient not found');
  await repository.update(patient, changes);
  return patient.toJSON();
};

// BUG-028 - soft-deleting a parent left its children live and pointing at a row
// that every default query hides. Deleting patient 5 in the shipped data orphaned
// 10 records across 10 tables, so an active admission rendered with a blank
// patient name. Deletion is refused while dependents exist, and the caller is
// told exactly what is blocking it.
const PATIENT_DEPENDENTS = [
  { model: 'Admission', label: 'admission(s)', activeOnly: { status: 'admitted' } },
  { model: 'Invoice', label: 'invoice(s)' },
  { model: 'Appointment', label: 'open appointment(s)', activeOnly: { status: ['scheduled', 'confirmed', 'in_progress'] } },
  { model: 'OpdVisit', label: 'OPD visit(s)' },
  { model: 'LabOrder', label: 'lab order(s)' },
  { model: 'RadiologyOrder', label: 'radiology order(s)' },
  { model: 'Prescription', label: 'prescription(s)' },
  { model: 'MedicineSale', label: 'pharmacy sale(s)' },
  { model: 'BloodIssue', label: 'blood issue(s)' },
  { model: 'PatientAllergy', label: 'allergy record(s)' },
  { model: 'PatientProblem', label: 'problem/diagnosis record(s)' },
  { model: 'PatientHistory', label: 'medical history record(s)' },
  { model: 'VitalSign', label: 'vital-sign record(s)' },
  { model: 'ClinicalNote', label: 'clinical note(s)' },
  { model: 'EmergencyEncounter', label: 'Emergency encounter(s)' },
];

const remove = async (id) => {
  const patient = await repository.findById(id);
  if (!patient) throw ApiError.notFound('Patient not found');

  const models = require('../../models');
  const { Op } = require('sequelize');
  const blocking = [];
  for (const dep of PATIENT_DEPENDENTS) {
    const Model = models[dep.model];
    if (!Model) continue;
    const where = { patient_id: id };
    if (dep.activeOnly) {
      for (const [key, value] of Object.entries(dep.activeOnly)) {
        where[key] = Array.isArray(value) ? { [Op.in]: value } : value;
      }
    }
    // eslint-disable-next-line no-await-in-loop
    const count = await Model.count({ where });
    if (count > 0) blocking.push(`${count} ${dep.label}`);
  }

  if (blocking.length) {
    throw ApiError.conflict(
      `Cannot delete patient ${patient.patient_code}: ${blocking.join(', ')} still reference this record. ` +
        'Clinical and financial history must be retained.'
    );
  }

  await repository.destroy(patient);
  return { message: 'Patient deleted' };
};

module.exports = { list, getById, getTimeline, create, update, remove };
