'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateAdmissionCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { ADMISSION_STATUS, BED_STATUS } = require('../../config/constants');
const { sequelize, Patient, Doctor, Ward, Bed, Admission, AdmissionPayment } = require('../../models');
const money = require('../../utils/money');
const repository = require('./ipd.repository');

// BUG-005 / BUG-024 — payments are now real `admission_payments` rows, eagerly
// loaded as `payment_records`. Two fabrications are gone:
//   * `total_charges` no longer falls back to a hardcoded 1500, nor is it
//     back-filled from the paid amount to force due to zero. A not-yet-billed
//     admission reports 0 and the UI can say so.
//   * `payments` is no longer parsed out of the free-text notes column.
const mapAdmissionResponse = (admissionObj) => {
  if (!admissionObj) return admissionObj;

  const records = Array.isArray(admissionObj.payment_records) ? admissionObj.payment_records : [];
  const payments = records.map((p) => ({
    id: p.id,
    account_name: p.account_name,
    amount: Number(p.amount || 0),
    paid_at: p.paid_at,
    notes: p.notes || null,
  }));

  const paid_amount = money.add(...payments.map((p) => p.amount));
  const total_charges = money.toMajor(money.toMinor(admissionObj.total_charges));
  const due_amount = money.subFloor(total_charges, paid_amount);

  return {
    ...admissionObj,
    total_charges,
    paid_amount,
    due_amount,
    payments,
  };
};

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.doctor_id) filters.doctor_id = query.doctor_id;
  if (query.ward_id) filters.ward_id = query.ward_id;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((a) => mapAdmissionResponse(a.toJSON())),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const admission = await repository.findById(id);
  if (!admission) throw ApiError.notFound('Admission not found');
  return mapAdmissionResponse(admission.toJSON());
};

const getDischargeSummary = async (id) => {
  const admission = await repository.findById(id);
  if (!admission) throw ApiError.notFound('Admission not found');
  const data = mapAdmissionResponse(admission.toJSON());
  const admittedAt = data.admitted_at ? new Date(data.admitted_at) : null;
  const dischargedAt = data.discharged_at ? new Date(data.discharged_at) : new Date();
  const stayDays = admittedAt
    ? Math.max(1, Math.ceil((dischargedAt.getTime() - admittedAt.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return {
    document_type: 'discharge_summary',
    generated_at: new Date().toISOString(),
    admission: data,
    patient: data.patient,
    doctor: data.doctor,
    ward: data.ward,
    bed: data.bed,
    summary: {
      admission_code: data.admission_code,
      admitted_at: data.admitted_at,
      discharged_at: data.discharged_at,
      stay_days: stayDays,
      reason: data.reason,
      diagnosis: data.diagnosis,
      status: data.status,
      total_charges: data.total_charges,
      notes: data.notes,
    },
  };
};

const admit = async (input, currentUserId) => {
  return sequelize.transaction(async (t) => {
    const patient = await Patient.findByPk(input.patient_id, { transaction: t });
    if (!patient) throw ApiError.badRequest('Patient not found');

    if (input.doctor_id) {
      const doctor = await Doctor.findByPk(input.doctor_id, { transaction: t });
      if (!doctor) throw ApiError.badRequest('Doctor not found');
    }

    // BUG-006 — patient-safety gate on bed allocation.
    //
    // Previously: an explicitly requested bed was used regardless of its status
    // and without a row lock (so two patients could be admitted to one bed); an
    // unknown bed_id silently fell back to "any available bed"; and if none was
    // free a ward and a bed were fabricated. All three are removed. The bed must
    // be named, must exist, and must be free — verified under FOR UPDATE so
    // concurrent admissions serialise.
    if (!input.bed_id) {
      throw ApiError.badRequest('bed_id is required: a bed must be selected explicitly for admission');
    }

    const bed = await Bed.findByPk(input.bed_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!bed) throw ApiError.badRequest(`Bed ${input.bed_id} not found`);
    if (bed.status !== BED_STATUS.AVAILABLE) {
      throw ApiError.conflict(
        `Bed ${bed.bed_number} is not available (status: ${bed.status}) and cannot be allocated`
      );
    }

    // Defence in depth: bed.status can drift from reality (see BUG-027), so the
    // authoritative check is whether an active admission already holds the bed.
    const occupant = await repository.findActiveByBed(bed.id, { transaction: t });
    if (occupant) {
      throw ApiError.conflict(
        `Bed ${bed.bed_number} is already occupied by admission ${occupant.admission_code}`
      );
    }

    const ward = await Ward.findByPk(bed.ward_id, { transaction: t });
    if (!ward) throw ApiError.badRequest(`Bed ${bed.bed_number} is not linked to a valid ward`);

    const year = currentYear();
    const admission = await withCodeRetry(async () => {
      // Atomically claimed. Deriving it from COUNT(*) made ten simultaneous
      // bookings compute the same number, so nine were rejected with 409.
      const sequence = await allocateForYear('admission', year, { transaction: t });
      const admission_code = generateAdmissionCode(year, sequence);
      const totalCharges = Number(input.total_charges || 0);

      return repository.create(
        {
          admission_code,
          patient_id: input.patient_id,
          doctor_id: input.doctor_id || null,
          ward_id: ward.id,
          bed_id: bed.id,
          admitted_at: input.admitted_at || new Date(),
          total_charges: totalCharges,
          reason: input.reason || null,
          diagnosis: input.diagnosis || null,
          notes: input.notes || null,
          status: ADMISSION_STATUS.ADMITTED,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );
    });

    // Admission-time payments become real rows in the same transaction, so a
    // failure anywhere rolls back both the admission and its receipts.
    if (Array.isArray(input.payments)) {
      for (const p of input.payments) {
        const value = Number(p?.amount || 0);
        if (!Number.isFinite(value) || value <= 0) continue;
        // eslint-disable-next-line no-await-in-loop
        await AdmissionPayment.create(
          {
            admission_id: admission.id,
            account_name: p.account_name || 'Cash',
            amount: value,
            paid_at: p.paid_at || new Date(),
            received_by: currentUserId || null,
          },
          { transaction: t }
        );
      }
    }

    await bed.update({ status: BED_STATUS.OCCUPIED }, { transaction: t });

    const createdRecord = await repository.findById(admission.id, { transaction: t });
    return mapAdmissionResponse(createdRecord.toJSON());
  });
};

// BUG-005 — real transactional payment record. Previously this performed an
// unguarded read-modify-write on a text column: concurrent payments lost data,
// negative amounts were accepted, and overpayment was unchecked.
const addPayment = async (id, { account_name, amount, paid_at, notes }, currentUserId) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw ApiError.badRequest('Payment amount must be a positive number');
  }

  return sequelize.transaction(async (t) => {
    const admission = await Admission.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!admission) throw ApiError.notFound('Admission not found');

    // BUG-054 - sum the rows exactly rather than trusting a float SUM/compare.
    const existingPayments = await AdmissionPayment.findAll({
      where: { admission_id: admission.id },
      attributes: ['amount'],
      transaction: t,
    });
    const paidSoFar = money.add(...existingPayments.map((p) => p.amount));
    const totalCharges = admission.total_charges;

    // Overpayment is rejected rather than silently absorbed. A zero-charge
    // admission has nothing to pay against yet.
    if (!money.isPositive(totalCharges)) {
      throw ApiError.badRequest(
        'Admission has no recorded charges yet; set total_charges before accepting payment'
      );
    }
    if (money.gt(money.add(paidSoFar, value), totalCharges)) {
      throw ApiError.badRequest(
        `Payment exceeds outstanding balance (charges ${money.format(totalCharges)}, ` +
          `already paid ${money.format(paidSoFar)}, attempted ${money.format(value)})`
      );
    }

    await AdmissionPayment.create(
      {
        admission_id: admission.id,
        account_name: account_name || 'Cash',
        amount: value,
        paid_at: paid_at || new Date(),
        received_by: currentUserId || null,
        notes: notes || null,
      },
      { transaction: t }
    );

    return mapAdmissionResponse((await repository.findById(id, { transaction: t })).toJSON());
  });
};

const update = async (id, changes) => {
  const admission = await repository.findById(id);
  if (!admission) throw ApiError.notFound('Admission not found');
  if (admission.status !== ADMISSION_STATUS.ADMITTED) {
    throw ApiError.badRequest(`Cannot edit admission in "${admission.status}" status`);
  }
  await repository.update(admission, changes);
  return mapAdmissionResponse((await repository.findById(id)).toJSON());
};

const transferBed = async (id, { bed_id }) => {
  return sequelize.transaction(async (t) => {
    const admission = await repository.findById(id, { transaction: t });
    if (!admission) throw ApiError.notFound('Admission not found');
    if (admission.status !== ADMISSION_STATUS.ADMITTED) {
      throw ApiError.badRequest('Only active admissions can be transferred');
    }
    if (Number(bed_id) === Number(admission.bed_id)) {
      throw ApiError.badRequest('New bed must be different');
    }

    const newBed = await Bed.findByPk(bed_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!newBed) throw ApiError.badRequest('Bed not found');
    if (newBed.status !== BED_STATUS.AVAILABLE) {
      throw ApiError.conflict('Target bed is not available');
    }

    const oldBed = await Bed.findByPk(admission.bed_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (oldBed) await oldBed.update({ status: BED_STATUS.AVAILABLE }, { transaction: t });
    await newBed.update({ status: BED_STATUS.OCCUPIED }, { transaction: t });

    await admission.update(
      { bed_id: newBed.id, ward_id: newBed.ward_id, status: ADMISSION_STATUS.ADMITTED },
      { transaction: t }
    );

    return mapAdmissionResponse((await repository.findById(id, { transaction: t })).toJSON());
  });
};

const discharge = async (id, { discharged_at, total_charges, notes }) => {
  return sequelize.transaction(async (t) => {
    const admission = await repository.findById(id, { transaction: t });
    if (!admission) throw ApiError.notFound('Admission not found');
    if (admission.status !== ADMISSION_STATUS.ADMITTED) {
      throw ApiError.badRequest('Admission is not active');
    }

    const bed = await Bed.findByPk(admission.bed_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (bed) await bed.update({ status: BED_STATUS.AVAILABLE }, { transaction: t });

    await admission.update(
      {
        status: ADMISSION_STATUS.DISCHARGED,
        discharged_at: discharged_at || new Date(),
        total_charges: total_charges !== undefined ? total_charges : admission.total_charges,
        notes: notes !== undefined ? notes : admission.notes,
      },
      { transaction: t }
    );

    return mapAdmissionResponse((await repository.findById(id, { transaction: t })).toJSON());
  });
};

const remove = async (id) => {
  const admission = await repository.findById(id);
  if (!admission) throw ApiError.notFound('Admission not found');
  if (admission.status === ADMISSION_STATUS.ADMITTED) {
    throw ApiError.badRequest('Discharge the patient before deleting the admission');
  }
  await repository.destroy(admission);
  return { message: 'Admission deleted' };
};

const getBillPrint = async (id) => {
  const admission = await repository.findById(id);
  if (!admission) throw ApiError.notFound('Admission not found');
  const data = mapAdmissionResponse(admission.toJSON());

  const patient = data.patient || {};
  const doctorUser = data.doctor?.user?.full_name || data.doctor?.doctor_code || 'N/A';

  return {
    admission: data,
    patient: {
      patient_code: patient.patient_code || 'N/A',
      full_name: patient.full_name || 'N/A',
      phone: patient.phone || 'N/A',
      gender: patient.gender || 'N/A',
      blood_group: patient.blood_group || 'N/A',
      age: patient.date_of_birth ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} YRS` : 'N/A',
      address: patient.address || 'N/A',
    },
    doctor: {
      full_name: doctorUser,
    },
    summary: {
      total: data.total_charges,
      paid: data.paid_amount,
      due: data.due_amount,
      notes: data.notes || '',
      symptoms: data.reason ? [data.reason] : [],
    },
    payments: data.payments || [],
  };
};

module.exports = { list, getById, getDischargeSummary, admit, addPayment, update, transferBed, discharge, remove, getBillPrint };
