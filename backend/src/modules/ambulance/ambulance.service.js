'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateTripCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { AMBULANCE_STATUS, TRIP_STATUS } = require('../../config/constants');
const { sequelize, Patient, Ambulance, Doctor, User, MasterOption, AmbulanceTrip } = require('../../models');
const repository = require('./ambulance.repository');
const { createEncounterInvoice, normalizePaymentMethod } = require('../../utils/encounterBilling');

/* ---------- Ambulances ---------- */

const listAmbulances = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCountAmbulances({
    filters,
    search: query.search,
    limit,
    offset,
  });

  const items = rows.map((a) => {
    const json = a.toJSON();
    let year = json.manufacture_year;
    if (!year && json.notes && json.notes.includes('[Year:')) {
      const match = json.notes.match(/\[Year:\s*(\d{4})\]/);
      if (match) year = match[1];
    }
    // BUG-008-class fabrication removed: an unrecorded manufacture year used to
    // be invented from a rotating list based on the row id.
    return { ...json, manufacture_year: year ? String(year) : null };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const getAmbulance = async (id) => {
  const a = await repository.findAmbulanceById(id);
  if (!a) throw ApiError.notFound('Ambulance not found');
  const json = a.toJSON();
  let year = json.manufacture_year;
  if (!year && json.notes && json.notes.includes('[Year:')) {
    const match = json.notes.match(/\[Year:\s*(\d{4})\]/);
    if (match) year = match[1];
  }
  return { ...json, manufacture_year: year ? String(year) : null };
};

const createAmbulance = async (input) => {
  const exists = await repository.findAmbulanceByVehicle(input.vehicle_number);
  if (exists) throw ApiError.conflict('Vehicle number already exists');
  const payload = { ...input };
  if (input.manufacture_year) {
    const yearTag = `[Year: ${input.manufacture_year}]`;
    payload.notes = payload.notes ? `${yearTag} ${payload.notes}` : yearTag;
  }
  const a = await repository.createAmbulance(payload);
  const json = a.toJSON();
  return { ...json, manufacture_year: input.manufacture_year ? String(input.manufacture_year) : null };
};

const updateAmbulance = async (id, changes) => {
  const a = await repository.findAmbulanceById(id);
  if (!a) throw ApiError.notFound('Ambulance not found');
  const payload = { ...changes };
  if (changes.manufacture_year !== undefined) {
    let cleanNotes = (a.notes || '').replace(/\[Year:\s*\d{4}\]\s*/, '').trim();
    if (changes.manufacture_year) {
      const yearTag = `[Year: ${changes.manufacture_year}]`;
      cleanNotes = cleanNotes ? `${yearTag} ${cleanNotes}` : yearTag;
    }
    payload.notes = cleanNotes;
  }
  await repository.updateAmbulance(a, payload);
  const json = a.toJSON();
  return { ...json, manufacture_year: changes.manufacture_year ? String(changes.manufacture_year) : null };
};

const removeAmbulance = async (id) => {
  const a = await repository.findAmbulanceById(id);
  if (!a) throw ApiError.notFound('Ambulance not found');
  if (a.status === AMBULANCE_STATUS.ON_TRIP) {
    throw ApiError.badRequest('Cannot delete an ambulance that is on a trip');
  }
  await repository.destroyAmbulance(a);
  return { message: 'Ambulance deleted' };
};

/* ---------- Trips ---------- */

const listTrips = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.ambulance_id) filters.ambulance_id = query.ambulance_id;
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCountTrips({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });

  // BUG-008-class fabrication removed: trips with no recorded doctor used to be
  // attributed to one of four hardcoded names chosen by id modulo.
  const items = rows.map((t) => {
    const json = t.toJSON();
    let doctorName = null;
    if (json.notes && json.notes.includes('[Doctor:')) {
      const match = json.notes.match(/\[Doctor:\s*([^\]]+)\]/);
      if (match) doctorName = match[1].trim();
    }
    const cleanNotes = json.notes ? json.notes.replace(/\[Doctor:\s*[^\]]+\]\s*/, '').trim() : '';

    return {
      ...json,
      doctor: doctorName ? { full_name: doctorName, user: { full_name: doctorName } } : null,
      notes: cleanNotes || json.notes,
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

const getTrip = async (id) => {
  const t = await repository.findTripById(id);
  if (!t) throw ApiError.notFound('Trip not found');
  return t.toJSON();
};

const calculateFare = ({ base_fare, per_km_rate, distance_km }) =>
  Number((Number(base_fare) + Number(per_km_rate) * Number(distance_km || 0)).toFixed(2));

const dispatchTrip = async (input, currentUserId) => {
  return sequelize.transaction(async (t) => {
    const ambulance = await Ambulance.findByPk(input.ambulance_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!ambulance) throw ApiError.badRequest('Ambulance not found');
    if (ambulance.status !== AMBULANCE_STATUS.AVAILABLE) {
      throw ApiError.conflict(`Ambulance is ${ambulance.status}`);
    }

    if (input.patient_id) {
      const patient = await Patient.findByPk(input.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');
    }

    const year = currentYear();
    const fare =
      input.fare !== undefined
        ? input.fare
        : calculateFare({
            base_fare: ambulance.base_fare,
            per_km_rate: ambulance.per_km_rate,
            distance_km: input.distance_km,
          });

    const trip = await withCodeRetry(async () => {
      // Atomically claimed. Deriving it from COUNT(*) made ten simultaneous
      // bookings compute the same number, so nine were rejected with 409.
      const sequence = await allocateForYear('ambulance_trip', year, { transaction: t });
      const trip_code = generateTripCode(year, sequence);
      return repository.createTrip(
        {
          trip_code,
          ambulance_id: ambulance.id,
          patient_id: input.patient_id || null,
          requester_name: input.requester_name || null,
          requester_phone: input.requester_phone || null,
          pickup_address: input.pickup_address,
          dropoff_address: input.dropoff_address,
          distance_km: input.distance_km || 0,
          fare,
          dispatched_at: input.dispatched_at || new Date(),
          status: TRIP_STATUS.DISPATCHED,
          notes: input.notes || null,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );
    });

    await ambulance.update({ status: AMBULANCE_STATUS.ON_TRIP }, { transaction: t });

    // BUG-042 - a priced trip for an identified patient raises a real invoice.
    // Trips for an external requester have no patient to bill, so no invoice is
    // created and the fare remains recorded on the trip only.
    const tripFare = Number(trip.fare || 0);
    if (tripFare > 0 && trip.patient_id) {
      const { Invoice, InvoiceItem, Payment } = require('../../models');
      await createEncounterInvoice({
        models: { Invoice, InvoiceItem, Payment },
        transaction: t,
        patientId: trip.patient_id,
        link: { ambulance_trip_id: trip.id },
        lines: [{
          item_type: 'ambulance',
          reference_id: trip.id,
          description: `Ambulance trip ${trip.trip_code} (${ambulance.vehicle_number})`,
          quantity: 1,
          unit_price: tripFare,
        }],
        payments: input.payments,
        issuedAt: trip.dispatched_at,
        currentUserId,
      });
    }

    return (await repository.findTripById(trip.id, { transaction: t })).toJSON();
  });
};

const updateTrip = async (id, changes) => {
  const trip = await repository.findTripById(id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if ([TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(trip.status)) {
    throw ApiError.badRequest(`Cannot edit trip in "${trip.status}" status`);
  }
  await repository.updateTrip(trip, changes);
  return (await repository.findTripById(id)).toJSON();
};

const completeTrip = async (id, payload) => {
  return sequelize.transaction(async (t) => {
    const trip = await repository.findTripById(id, { transaction: t });
    if (!trip) throw ApiError.notFound('Trip not found');
    if ([TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(trip.status)) {
      throw ApiError.badRequest(`Trip already ${trip.status}`);
    }

    const ambulance = await Ambulance.findByPk(trip.ambulance_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    await trip.update(
      {
        status: TRIP_STATUS.COMPLETED,
        completed_at: payload?.completed_at || new Date(),
        distance_km: payload?.distance_km !== undefined ? payload.distance_km : trip.distance_km,
        fare: payload?.fare !== undefined ? payload.fare : trip.fare,
        notes: payload?.notes !== undefined ? payload.notes : trip.notes,
      },
      { transaction: t }
    );

    if (ambulance) await ambulance.update({ status: AMBULANCE_STATUS.AVAILABLE }, { transaction: t });

    return (await repository.findTripById(id, { transaction: t })).toJSON();
  });
};

const cancelTrip = async (id, payload) => {
  return sequelize.transaction(async (t) => {
    const trip = await repository.findTripById(id, { transaction: t });
    if (!trip) throw ApiError.notFound('Trip not found');
    if (trip.status === TRIP_STATUS.COMPLETED) {
      throw ApiError.badRequest('Cannot cancel a completed trip');
    }
    const ambulance = await Ambulance.findByPk(trip.ambulance_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    await trip.update(
      { status: TRIP_STATUS.CANCELLED, notes: payload?.notes || trip.notes },
      { transaction: t }
    );
    if (ambulance) await ambulance.update({ status: AMBULANCE_STATUS.AVAILABLE }, { transaction: t });

    return (await repository.findTripById(id, { transaction: t })).toJSON();
  });
};

const removeTrip = async (id) => {
  const trip = await repository.findTripById(id);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.status === TRIP_STATUS.IN_PROGRESS || trip.status === TRIP_STATUS.DISPATCHED) {
    throw ApiError.badRequest('Cannot delete an active trip');
  }
  await repository.destroyTrip(trip);
  return { message: 'Trip deleted' };
};

const getCallEntryMeta = async () => {
  const [patients, doctors, ambulances, symptomTypes, symptomHeads, masterAccounts] = await Promise.all([
    Patient.findAll({ order: [['id', 'DESC']], limit: 200 }),
    Doctor.findAll({
      include: [{ model: User, as: 'user', attributes: ['full_name'] }],
      order: [['id', 'ASC']],
    }),
    Ambulance.findAll({ order: [['id', 'DESC']] }),
    MasterOption.findAll({ where: { type: 'symptom_type', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
    MasterOption.findAll({ where: { type: 'symptom_head', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
    MasterOption.findAll({ where: { type: 'payment_account', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] }),
  ]);

  let types = symptomTypes;
  let heads = symptomHeads;
  if (types.length === 0) {
    try {
      const t1 = await MasterOption.create({ type: 'symptom_type', code: 'SYMP_GEN', label: 'General Symptoms', sort_order: 1, is_active: true });
      const t2 = await MasterOption.create({ type: 'symptom_type', code: 'SYMP_EMERG', label: 'Emergency Symptoms', sort_order: 2, is_active: true });
      const t3 = await MasterOption.create({ type: 'symptom_type', code: 'SYMP_CARD', label: 'Cardiology Symptoms', sort_order: 3, is_active: true });

      await MasterOption.create({ type: 'symptom_head', code: 'HEAD_FEV', label: 'Fever & Body Pain', description: 'High temperature, weakness', sort_order: t1.id, is_active: true });
      await MasterOption.create({ type: 'symptom_head', code: 'HEAD_BREATH', label: 'Shortness of Breath', description: 'Difficulty breathing', sort_order: t2.id, is_active: true });
      await MasterOption.create({ type: 'symptom_head', code: 'HEAD_CHEST', label: 'Chest Tightness', description: 'Chest pain or pressure', sort_order: t3.id, is_active: true });

      types = await MasterOption.findAll({ where: { type: 'symptom_type', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
      heads = await MasterOption.findAll({ where: { type: 'symptom_head', is_active: true }, order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    } catch (_err) {}
  }

  const next_bill_no = `BILL-${Math.floor(100000 + Math.random() * 900000)}`;
  const next_patient_code = `PAT-${Date.now().toString().slice(-6)}`;

  const accounts = masterAccounts.length > 0
    ? masterAccounts.map(a => ({ name: a.label }))
    : [
        { name: "Cash Account" },
        { name: "Bank Account" },
        { name: "bKash / Mobile Banking" }
      ];

  let mappedAmbulances = ambulances.map((a) => ({
    id: a.id,
    vehicle_number: a.vehicle_number,
    model: a.model,
    base_fare: Number(a.base_fare || 0),
    driver_name: a.driver_name,
    driver_phone: a.driver_phone,
  }));

  if (mappedAmbulances.length === 0) {
    mappedAmbulances = [
      { id: 1, vehicle_number: '101', model: 'Toyota HiAce', base_fare: 5000, driver_name: 'Driver 1', driver_phone: '01700000000' },
      { id: 2, vehicle_number: '102', model: 'Emergency Ambulance', base_fare: 8000, driver_name: 'Driver 2', driver_phone: '01800000000' }
    ];
  }

  const mappedCharges = mappedAmbulances.map((a) => ({
    id: a.id,
    value: a.id,
    name: `${a.vehicle_number}${a.model ? ` (${a.model})` : ''}`,
    label: `${a.vehicle_number}${a.model ? ` (${a.model})` : ''}`,
    base_fare: a.base_fare,
  }));

  const mappedDoctors = doctors.map((d) => ({
    id: d.id,
    doctor_code: d.doctor_code,
    full_name: d.user?.full_name || d.doctor_code || `Dr. ${d.id}`,
  }));

  if (mappedDoctors.length === 0) {
    mappedDoctors.push(
      { id: 1, doctor_code: 'DOC-101', full_name: 'Dr. Anisur Rahman' },
      { id: 2, doctor_code: 'DOC-102', full_name: 'Dr. Nazmul Karim' }
    );
  }

  return {
    next_bill_no,
    next_patient_code,
    accounts,
    patients: patients.map((p) => ({
      id: p.id,
      patient_code: p.patient_code,
      full_name: p.full_name,
      phone: p.phone,
      gender: p.gender,
      date_of_birth: p.date_of_birth,
      age: p.age,
    })),
    doctors: mappedDoctors,
    ambulances: mappedAmbulances,
    charges: mappedCharges,
    symptom_types: types.map((t) => ({ id: t.id, label: t.label, value: t.id })),
    symptom_heads: heads.map((h) => ({ id: h.id, label: h.label, value: h.id, sort_order: h.sort_order, description: h.description })),
    charge_categories: [{ value: 'ambulance', label: 'Ambulance Service' }],
    tax_rates: [0, 5, 10, 15],
  };
};

const createCall = async (input, currentUserId) => {
  // BUG-020 — this used to insert an AmbulanceTrip directly: no availability
  // check, no row lock, no update of the vehicle to `on_trip`, a collision-prone
  // `TRIP-<timestamp>` code and a hardcoded fallback doctor. Two concurrent
  // calls could book the same vehicle, and the fleet then showed it as free.
  // It now delegates to the guarded dispatch path.
  if (!input.ambulance_id) throw ApiError.badRequest('An ambulance must be selected');

  let doctorNote = null;
  if (input.doctor_id) {
    const doc = await Doctor.findByPk(input.doctor_id, {
      include: [{ model: User, as: 'user', attributes: ['full_name'] }],
    });
    if (!doc) throw ApiError.badRequest('Doctor not found');
    doctorNote = `Doctor: ${doc.user?.full_name || doc.doctor_code}`;
  }

  const notes =
    [input.symptoms_description || input.note || '', doctorNote].filter(Boolean).join('\n') || null;

  const trip = await dispatchTrip(
    {
      ambulance_id: input.ambulance_id,
      patient_id: input.patient_id || null,
      requester_name: input.reference || null,
      requester_phone: input.requester_phone || null,
      pickup_address: input.case_text || input.pickup_address || 'Hospital Pickup',
      dropoff_address: input.dropoff_address || 'Emergency Ward',
      distance_km: input.distance_km || 0,
      fare: input.total_amount !== undefined ? input.total_amount : input.charge_rate,
      dispatched_at: input.call_date || new Date(),
      notes,
      payments: input.payments,
    },
    currentUserId
  );

  return trip;
};

const createSymptomType = async (data) => {
  const option = await MasterOption.create({
    type: 'symptom_type',
    code: `SYMP_${Date.now()}`,
    label: String(data.name || data.label),
    is_active: true,
  });
  return { id: option.id, label: option.label, value: option.id };
};

const createSymptomHead = async (data) => {
  const option = await MasterOption.create({
    type: 'symptom_head',
    code: `HEAD_${Date.now()}`,
    label: String(data.name || data.label),
    sort_order: data.symptoms_type_id || data.sort_order || 1,
    description: data.description || '',
    is_active: true,
  });
  return { id: option.id, label: option.label, value: option.id, sort_order: option.sort_order, description: option.description };
};

const updateCall = async (id, changes) => {
  const trip = await repository.findTripById(id);
  if (!trip) throw ApiError.notFound('Call ambulance record not found');
  const payload = {};
  if (changes.patient_id) payload.patient_id = changes.patient_id;
  if (changes.ambulance_id) payload.ambulance_id = changes.ambulance_id;
  if (changes.case_text || changes.pickup_address) payload.pickup_address = changes.case_text || changes.pickup_address;
  if (changes.reference || changes.requester_name) payload.requester_name = changes.reference || changes.requester_name;
  if (changes.total_amount !== undefined || changes.charge_rate !== undefined || changes.fare !== undefined) {
    payload.fare = changes.total_amount !== undefined ? changes.total_amount : (changes.charge_rate !== undefined ? changes.charge_rate : changes.fare);
  }

  let doctorName = null;
  if (changes.doctor_id) {
    try {
      const doc = await Doctor.findByPk(changes.doctor_id, {
        include: [{ model: User, as: 'user', attributes: ['full_name'] }],
      });
      if (doc) doctorName = doc.user?.full_name || doc.doctor_code;
    } catch (_err) {}
  }

  let existingNotes = (trip.notes || '').replace(/\[Doctor:\s*[^\]]+\]\s*/, '').trim();
  if (changes.symptoms_description || changes.note || changes.notes) {
    existingNotes = changes.symptoms_description || changes.note || changes.notes;
  }

  if (doctorName) {
    payload.notes = `[Doctor: ${doctorName}] ${existingNotes}`.trim();
  } else if (changes.symptoms_description || changes.note || changes.notes) {
    payload.notes = existingNotes;
  }

  await repository.updateTrip(trip, payload);
  return (await repository.findTripById(id)).toJSON();
};

const removeCall = async (id) => {
  const trip = await repository.findTripById(id);
  if (!trip) throw ApiError.notFound('Call ambulance record not found');
  await repository.destroyTrip(trip);
  return { message: 'Ambulance call record deleted' };
};

// BUG-021 — the Call Ambulance Record page requested GET /ambulance/calls/list,
// which never existed. The catch-all used to answer it with an empty 200, so the
// page showed "no records" forever even though trips existed. It is implemented
// here against the real trips, with money read from the linked invoice.
const listCalls = async (query = {}) => {
  const { Invoice, Payment } = require('../../models');
  const { page, limit, offset } = parsePaging(query);

  const { rows, count } = await repository.findAndCountTrips({
    filters: {},
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });

  const tripIds = rows.map((t) => t.id);
  const invoices = tripIds.length
    ? await Invoice.findAll({
        where: { ambulance_trip_id: tripIds },
        include: [{ model: Payment, as: 'payments', attributes: ['id', 'amount', 'method', 'paid_at'] }],
      })
    : [];
  const byTrip = new Map(invoices.map((i) => [String(i.ambulance_trip_id), i]));

  const items = rows.map((t) => {
    const json = t.toJSON();
    const invoice = byTrip.get(String(t.id));
    const rent = Number(json.fare || 0);
    // Unbilled trips report the fare as outstanding rather than as collected.
    const total = invoice ? Number(invoice.total) : rent;
    const paid = invoice ? Number(invoice.paid_amount) : 0;
    return {
      ...json,
      rent,
      discount_amount: invoice ? Number(invoice.discount) : 0,
      tax_amount: invoice ? Number(invoice.tax) : 0,
      total_amount: total,
      paid_amount: paid,
      due_amount: Math.max(total - paid, 0),
      is_billed: Boolean(invoice),
      invoice_id: invoice ? invoice.id : null,
      invoice_code: invoice ? invoice.invoice_code : null,
      payments: invoice ? invoice.payments.map((p) => ({ id: p.id, amount: Number(p.amount), method: p.method, paid_at: p.paid_at })) : [],
    };
  });

  return { items, meta: buildMeta({ total: count, page, limit }) };
};

// BUG-021 — POST /ambulance/calls/:id/payments also did not exist (404 on save).
// A payment is recorded against the trip's invoice, inside a transaction, with
// the same overpayment guard used everywhere else.
const addCallPayment = async (tripId, input, currentUserId) => {
  const { Invoice, Payment } = require('../../models');
  const amount = Number(input?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest('Payment amount must be a positive number');
  }

  return sequelize.transaction(async (t) => {
    const trip = await repository.findTripById(tripId, { transaction: t });
    if (!trip) throw ApiError.notFound('Ambulance call not found');

    const invoice = await Invoice.findOne({
      where: { ambulance_trip_id: trip.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!invoice) {
      throw ApiError.badRequest(
        'This call has no invoice to pay against (it was recorded without a patient or fare)'
      );
    }

    const paid = Number(invoice.paid_amount || 0);
    const total = Number(invoice.total || 0);
    if (paid + amount > total + 0.005) {
      throw ApiError.badRequest(
        `Payment exceeds the outstanding balance (total ${total.toFixed(2)}, already paid ${paid.toFixed(2)})`
      );
    }

    const { generatePaymentCode } = require('../../utils/codeGenerator');
    const { nextSequenceForYear } = require('../../utils/sequence');
    const year = currentYear();
    const seq = await nextSequenceForYear(Payment, 'payment_code', 'PAY', year, { transaction: t });

    await Payment.create(
      {
        payment_code: generatePaymentCode(year, seq),
        invoice_id: invoice.id,
        amount,
        method: normalizePaymentMethod(input.account_name || input.method),
        reference: input.reference || null,
        paid_at: input.paid_at || new Date(),
        received_by: currentUserId || null,
      },
      { transaction: t }
    );

    const nextPaid = paid + amount;
    await invoice.update(
      {
        paid_amount: nextPaid,
        status: nextPaid >= total - 0.005 ? 'paid' : 'partially_paid',
      },
      { transaction: t }
    );

    return { trip_id: trip.id, invoice_code: invoice.invoice_code, paid_amount: nextPaid, due_amount: Math.max(total - nextPaid, 0) };
  });
};

module.exports = {
  listCalls,
  addCallPayment,
  listAmbulances,
  getAmbulance,
  createAmbulance,
  updateAmbulance,
  removeAmbulance,
  listTrips,
  getTrip,
  dispatchTrip,
  updateTrip,
  completeTrip,
  cancelTrip,
  removeTrip,
  getCallEntryMeta,
  createCall,
  createSymptomType,
  createSymptomHead,
  updateCall,
  removeCall,
};
