'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generatePrescriptionCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { sequelize, Patient, Doctor, Appointment, Medicine } = require('../../models');
const repository = require('./prescriptions.repository');

const normalizeItem = async (item, options = {}) => {
  let medicineName = item.medicine_name;
  if (item.medicine_id) {
    const medicine = await Medicine.findByPk(item.medicine_id, options);
    if (!medicine) throw ApiError.badRequest(`Medicine not found: ${item.medicine_id}`);
    medicineName = medicineName || medicine.name;
  }
  return {
    medicine_id: item.medicine_id || null,
    medicine_name: medicineName,
    dosage: item.dosage || null,
    frequency: item.frequency || null,
    duration: item.duration || null,
    quantity: item.quantity || 1,
    instructions: item.instructions || null,
  };
};

const ensureReferences = async (input, options = {}) => {
  const patient = await Patient.findByPk(input.patient_id, options);
  if (!patient) throw ApiError.badRequest('Patient not found');
  const doctor = await Doctor.findByPk(input.doctor_id, options);
  if (!doctor) throw ApiError.badRequest('Doctor not found');
  if (input.appointment_id) {
    const appointment = await Appointment.findByPk(input.appointment_id, options);
    if (!appointment) throw ApiError.badRequest('Appointment not found');
  }
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((p) => p.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (id) => {
  const prescription = await repository.findById(id);
  if (!prescription) throw ApiError.notFound('Prescription not found');
  return prescription.toJSON();
};

const create = async (input, options = {}) => {
  const work = async (t) => {
    await ensureReferences(input, { transaction: t });
    const year = currentYear();
    const prescription = await withCodeRetry(async () => {
      const sequence = await allocateForYear('prescription', year, { transaction: t });
      const prescription_code = generatePrescriptionCode(year, sequence);
      return repository.create(
        {
          prescription_code,
          patient_id: input.patient_id,
          doctor_id: input.doctor_id,
          appointment_id: input.appointment_id || null,
          emergency_encounter_id: input.emergency_encounter_id || null,
          prescribed_at: input.prescribed_at || new Date(),
          diagnosis: input.diagnosis || null,
          notes: input.notes || null,
          status: input.status,
        },
        { transaction: t }
      );
    });

    const items = [];
    for (const item of input.items || []) {
      items.push({ ...(await normalizeItem(item, { transaction: t })), prescription_id: prescription.id });
    }
    if (items.length) await repository.createItems(items, { transaction: t });

    return (await repository.findById(prescription.id, { transaction: t })).toJSON();
  };
  return options.transaction ? work(options.transaction) : sequelize.transaction(work);
};

const update = async (id, changes) => {
  return sequelize.transaction(async (t) => {
    const prescription = await repository.findById(id, { transaction: t });
    if (!prescription) throw ApiError.notFound('Prescription not found');

    const next = {
      patient_id: changes.patient_id || prescription.patient_id,
      doctor_id: changes.doctor_id || prescription.doctor_id,
      appointment_id:
        changes.appointment_id !== undefined ? changes.appointment_id : prescription.appointment_id,
    };
    if (changes.patient_id || changes.doctor_id || changes.appointment_id !== undefined) {
      await ensureReferences(next, { transaction: t });
    }

    const { items, ...prescriptionChanges } = changes;
    await repository.update(prescription, prescriptionChanges, { transaction: t });

    if (items) {
      await repository.deleteItems(prescription.id, { transaction: t });
      const rows = [];
      for (const item of items) {
        rows.push({ ...(await normalizeItem(item, { transaction: t })), prescription_id: prescription.id });
      }
      if (rows.length) await repository.createItems(rows, { transaction: t });
    }

    return (await repository.findById(id, { transaction: t })).toJSON();
  });
};

const updateStatus = async (id, status) => {
  const prescription = await repository.findById(id);
  if (!prescription) throw ApiError.notFound('Prescription not found');
  await repository.update(prescription, { status });
  return (await repository.findById(id)).toJSON();
};

const remove = async (id) => {
  const prescription = await repository.findById(id);
  if (!prescription) throw ApiError.notFound('Prescription not found');
  await repository.destroy(prescription);
  return { message: 'Prescription deleted' };
};

module.exports = { list, getById, create, update, updateStatus, remove };
