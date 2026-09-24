'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateReferralCode } = require('../../utils/codeGenerator');
const { currentYear, dateTimeRange } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { REFERRAL_STATUS } = require('../../config/constants');
const { Op } = require('sequelize');
const { Patient, Doctor, MasterOption } = require('../../models');
const money = require('../../utils/money');
const repository = require('./referrals.repository');

const parseDesc = (str) => { try { return JSON.parse(str || '{}'); } catch { return {}; } };

const ensureReferences = async (input) => {
  const patient = await Patient.findByPk(input.patient_id);
  if (!patient) throw ApiError.badRequest('Patient not found');
  if (input.from_doctor_id) {
    const doctor = await Doctor.findByPk(input.from_doctor_id);
    if (!doctor) throw ApiError.badRequest('From doctor not found');
  }
  if (input.to_doctor_id) {
    const doctor = await Doctor.findByPk(input.to_doctor_id);
    if (!doctor) throw ApiError.badRequest('To doctor not found');
  }
};

// ─── Referral (existing) ────────────────────────────────────────────────────

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.from_doctor_id) filters.from_doctor_id = query.from_doctor_id;
  if (query.to_doctor_id) filters.to_doctor_id = query.to_doctor_id;
  if (query.status) filters.status = query.status;
  const { rows, count } = await repository.findAndCount({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((r) => r.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (id) => {
  const referral = await repository.findById(id);
  if (!referral) throw ApiError.notFound('Referral not found');
  return referral.toJSON();
};

const create = async (input) => {
  await ensureReferences(input);
  if (!input.to_doctor_id && !input.external_doctor_name && !input.external_facility) {
    throw ApiError.badRequest('Referral destination is required');
  }
  const year = currentYear();
  const referral = await withCodeRetry(async () => {
    const sequence = await allocateForYear('referral', year);
    const referral_code = generateReferralCode(year, sequence);
    return repository.create({
      ...input,
      referral_code,
      referred_at: input.referred_at || new Date(),
      status: input.status || REFERRAL_STATUS.PENDING,
    });
  });
  return (await repository.findById(referral.id)).toJSON();
};

const update = async (id, changes) => {
  const referral = await repository.findById(id);
  if (!referral) throw ApiError.notFound('Referral not found');
  const next = { ...referral.toJSON(), ...changes };
  await ensureReferences(next);
  if (!next.to_doctor_id && !next.external_doctor_name && !next.external_facility) {
    throw ApiError.badRequest('Referral destination is required');
  }
  await repository.update(referral, changes);
  return (await repository.findById(id)).toJSON();
};

const updateStatus = async (id, status) => {
  const referral = await repository.findById(id);
  if (!referral) throw ApiError.notFound('Referral not found');
  await repository.update(referral, { status });
  return (await repository.findById(id)).toJSON();
};

const remove = async (id) => {
  const referral = await repository.findById(id);
  if (!referral) throw ApiError.notFound('Referral not found');
  await repository.destroy(referral);
  return { message: 'Referral deleted' };
};

// ─── Referral Persons (MasterOption) ────────────────────────────────────────

const personToJson = (opt) => {
  const extra = parseDesc(opt.description);
  const isUpdated = Boolean(extra.updated_by_name || opt.updatedAt > opt.createdAt);
  const updaterName = extra.updated_by_name && extra.updated_by_name !== 'System Administrator' ? extra.updated_by_name : 'Admin';
  return {
    id: opt.id,
    referral_person_code: opt.code,
    name: opt.label,
    contact_no: extra.contact_no || null,
    contact_person_name: extra.contact_person_name || null,
    contact_person_mobile_no: extra.contact_person_mobile_no || null,
    opening_balance: Number(extra.opening_balance || 0),
    address: extra.address || null,
    opd_commission_per: Number(extra.opd_commission_per || 0),
    ipd_commission_per: Number(extra.ipd_commission_per || 0),
    pharmacy_commission_per: Number(extra.pharmacy_commission_per || 0),
    pathology_commission_per: Number(extra.pathology_commission_per || 0),
    radiology_commission_per: Number(extra.radiology_commission_per || 0),
    blood_bank_commission_per: Number(extra.blood_bank_commission_per || 0),
    ambulance_commission_per: Number(extra.ambulance_commission_per || 0),
    is_active: opt.is_active !== false,
    created_at: opt.createdAt,
    creator: { full_name: 'Admin' },
    updater: isUpdated ? { full_name: updaterName } : null,
  };
};

const listPersons = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const where = { type: 'referral_person' };
  if (query.search) where.label = { [Op.like]: `%${query.search}%` };
  if (query.is_active === 'true') where.is_active = true;

  const range = dateTimeRange({ from: query.from, to: query.to });
  if (range) where.created_at = range;

  // BUG-041 — this listing applies its de-duplication and search in JavaScript,
  // so it must not slice in SQL first. Doing both produced two wrong answers at
  // once: rows removed by the JS filter left short pages with no backfill, and
  // `meta.pagination.total` below was the length of the filtered PAGE rather than
  // the size of the whole result set, so the paginator reported "1-10 of 7" and
  // disabled the next-page button while further rows existed. The full matching
  // set is loaded, filtered, counted, and only then sliced.
  const rows = await MasterOption.findAll({ where, order: [['id', 'DESC']] });

  // BUG-019 — removed seed-on-GET: two fabricated referral persons no longer invented on read

  let items = rows.map(personToJson);

  // BUG-008 — referrals were merged in as "persons" using referral.id as the
  // person id, colliding with the master_options id space. Removed.

  // BUG-008/BUG-019 — two hardcoded referral persons ("Dr. Anisur Rahman" id 1,
  // "Dr. Nazmul Karim" id 2) used to be injected into every response. Their ids
  // collided with unrelated master_options rows, so selecting one linked a bill
  // to the wrong record. Only real rows are returned now.
  const seenIds = new Set();
  items = items.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  if (query.search) {
    const s = query.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        (i.name && i.name.toLowerCase().includes(s)) ||
        (i.referral_person_code && i.referral_person_code.toLowerCase().includes(s)) ||
        (i.contact_no && i.contact_no.toLowerCase().includes(s)) ||
        (i.contact_person_name && i.contact_person_name.toLowerCase().includes(s))
    );
  }

  items.sort((a, b) => (b.id || 0) - (a.id || 0));

  // The true filtered count, then the requested page out of it.
  const total = items.length;
  return { items: items.slice(offset, offset + limit), meta: buildMeta({ total, page, limit }) };
};

const getPersonById = async (id) => {
  const opt = await MasterOption.findByPk(id);
  if (!opt || opt.type !== 'referral_person') throw ApiError.notFound('Referral person not found');
  return personToJson(opt);
};

const createPerson = async (input) => {
  const code = 'REF-PERSON-' + String(100 + (await allocate('referral_person')));
  const extra = {
    contact_no: input.contact_no || null,
    contact_person_name: input.contact_person_name || null,
    contact_person_mobile_no: input.contact_person_mobile_no || null,
    opening_balance: Number(input.opening_balance || 0),
    address: input.address || null,
    opd_commission_per: Number(input.opd_commission_per || 0),
    ipd_commission_per: Number(input.ipd_commission_per || 0),
    pharmacy_commission_per: Number(input.pharmacy_commission_per || 0),
    pathology_commission_per: Number(input.pathology_commission_per || 0),
    radiology_commission_per: Number(input.radiology_commission_per || 0),
    blood_bank_commission_per: Number(input.blood_bank_commission_per || 0),
    ambulance_commission_per: Number(input.ambulance_commission_per || 0),
  };
  const opt = await MasterOption.create({ type: 'referral_person', code, label: input.name, description: JSON.stringify(extra) });
  return personToJson(opt);
};

const updatePerson = async (id, changes) => {
  const opt = await MasterOption.findByPk(id);
  if (!opt || opt.type !== 'referral_person') throw ApiError.notFound('Referral person not found');
  const extra = parseDesc(opt.description);
  const nextExtra = {
    ...extra,
    updated_by_name: 'Admin',
    contact_no: changes.contact_no !== undefined ? changes.contact_no : extra.contact_no,
    contact_person_name: changes.contact_person_name !== undefined ? changes.contact_person_name : extra.contact_person_name,
    contact_person_mobile_no: changes.contact_person_mobile_no !== undefined ? changes.contact_person_mobile_no : extra.contact_person_mobile_no,
    opening_balance: changes.opening_balance !== undefined ? Number(changes.opening_balance) : extra.opening_balance,
    address: changes.address !== undefined ? changes.address : extra.address,
    opd_commission_per: changes.opd_commission_per !== undefined ? Number(changes.opd_commission_per) : extra.opd_commission_per,
    ipd_commission_per: changes.ipd_commission_per !== undefined ? Number(changes.ipd_commission_per) : extra.ipd_commission_per,
    pharmacy_commission_per: changes.pharmacy_commission_per !== undefined ? Number(changes.pharmacy_commission_per) : extra.pharmacy_commission_per,
    pathology_commission_per: changes.pathology_commission_per !== undefined ? Number(changes.pathology_commission_per) : extra.pathology_commission_per,
    radiology_commission_per: changes.radiology_commission_per !== undefined ? Number(changes.radiology_commission_per) : extra.radiology_commission_per,
    blood_bank_commission_per: changes.blood_bank_commission_per !== undefined ? Number(changes.blood_bank_commission_per) : extra.blood_bank_commission_per,
    ambulance_commission_per: changes.ambulance_commission_per !== undefined ? Number(changes.ambulance_commission_per) : extra.ambulance_commission_per,
  };
  await opt.update({ label: changes.name || opt.label, description: JSON.stringify(nextExtra) });
  return personToJson(await MasterOption.findByPk(id));
};

const removePerson = async (id) => {
  const opt = await MasterOption.findByPk(id);
  if (!opt || opt.type !== 'referral_person') throw ApiError.notFound('Referral person not found');
  await opt.destroy();
  return { message: 'Referral person deleted' };
};

// ─── Referral Bills (MasterOption) ──────────────────────────────────────────

const buildPersonMap = async () => {
  const map = {};
  try {
    const persons = await MasterOption.findAll({ where: { type: 'referral_person' }, attributes: ['id', 'label'] });
    for (const p of persons) map[String(p.id)] = p.label;
  } catch (_e) {}

  try {
    const refs = await Referral.findAll({ attributes: ['id', 'external_doctor_name', 'referral_code'] });
    for (const r of refs) {
      if (r.id) map[String(r.id)] = r.external_doctor_name || r.referral_code;
    }
  } catch (_e) {}

  return map;
};

const billToJson = (opt, personMap = {}) => {
  const extra = parseDesc(opt.description);
  // BUG-008 — no identity fallback. An unresolved referral person reads as
  // unknown rather than being attributed to a real named person.
  const personName =
    extra.referral_person_name ||
    (typeof extra.referral_person === 'string' ? extra.referral_person : null) ||
    personMap[String(extra.referral_person_id)] ||
    null;

  return {
    id: opt.id,
    referral_bill_code: opt.code,
    bill_date: extra.bill_date || opt.createdAt,
    patient_id: extra.patient_id || null,
    // BUG-008 — this used to default to a named patient ("Salma Begum",
    // "PAT-101"), putting a fabricated identity on a financial record.
    patient: extra.patient_name
      ? { full_name: extra.patient_name, patient_code: extra.patient_code || null }
      : null,
    referral_person_id: extra.referral_person_id || null,
    referral_person: personName ? { name: personName } : null,
    patient_type: extra.patient_type || 'OPD',
    bill_number: extra.bill_number || `BILL-${opt.id}`,
    bill_amount: Number(extra.bill_amount || 0),
    commission_percent: Number(extra.commission_percent || 0),
    commission_amount: Number(extra.commission_amount || 0),
    paid_amount: Number(extra.paid_amount || 0),
    due_amount: Number(extra.due_amount || 0),
    creator: { full_name: 'Admin' },
    updater: { full_name: 'N/A' },
    created_at: opt.createdAt,
  };
};

const listBills = async (query) => {
  const formatDateInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { page, limit, offset } = parsePaging(query);
  // Quarantined rows (machine-fabricated by the removed seed-on-GET path,
  // migration 009) are excluded from listings and reports.
  // BUG-041 — same defect as listPersons: the referral-person, date-range and
  // search filters below run in JavaScript over the JSON `description` payload,
  // so slicing in SQL beforehand filtered only the current page and reported that
  // page's length as the grand total. The Referral Bill Record screen therefore
  // showed a wrong row count and could not reach later pages.
  const rows = await MasterOption.findAll({
    where: { type: 'referral_bill', is_active: true },
    order: [['id', 'DESC']],
  });

  // BUG-019 — removed seed-on-GET: two fabricated referral bills (5000/12000 with commissions) no longer invented on read

  const personMap = await buildPersonMap();
  const items = rows.map((r) => billToJson(r, personMap));

  const filteredItems = items.filter((item) => {
    if (query.referral_person_id) {
      const targetId = String(query.referral_person_id).toLowerCase();
      const targetName = (personMap[targetId] || '').toLowerCase();

      const itemRefId = String(item.referral_person_id || '').toLowerCase();
      const itemRefName = String(item.referral_person?.name || '').toLowerCase();

      const matchesRef =
        itemRefId === targetId ||
        itemRefName.includes(targetId) ||
        (targetName && itemRefName.includes(targetName));

      if (!matchesRef) return false;
    }
    if (query.from) {
      const transDate = formatDateInput(item.bill_date || item.created_at);
      const fromStr = formatDateInput(query.from);
      if (transDate < fromStr) return false;
    }
    if (query.to) {
      const transDate = formatDateInput(item.bill_date || item.created_at);
      const toStr = formatDateInput(query.to);
      if (transDate > toStr) return false;
    }
    if (query.search && query.search.trim()) {
      const term = query.search.trim().toLowerCase();
      const code = String(item.referral_bill_code || '').toLowerCase();
      const patient = String(item.patient?.full_name || item.patient?.patient_code || '').toLowerCase();
      const refPerson = String(item.referral_person?.name || '').toLowerCase();
      const billNum = String(item.bill_number || '').toLowerCase();

      const matches = [code, patient, refPerson, billNum].some((str) => str && str.includes(term));
      if (!matches) return false;
    }
    return true;
  });

  const total = filteredItems.length;
  return {
    items: filteredItems.slice(offset, offset + limit),
    meta: buildMeta({ total, page, limit }),
  };
};

const getBillAccounts = async () => {
  const accounts = await MasterOption.findAll({ where: { type: 'payment_account' }, attributes: ['id', 'label'] });
  return accounts.map((a) => ({ id: a.id, name: a.label }));
};

const RATE_FIELD_BY_TYPE = Object.freeze({
  opd: 'opd_commission_per',
  ipd: 'ipd_commission_per',
  pharmacy: 'pharmacy_commission_per',
  pathology: 'pathology_commission_per',
  lab: 'pathology_commission_per',
  radiology: 'radiology_commission_per',
  blood: 'blood_bank_commission_per',
  blood_bank: 'blood_bank_commission_per',
  ambulance: 'ambulance_commission_per',
});

// BUG-008 / BUG-009 — commission used to be whatever the client posted:
// `bill_amount`, `commission_percent` and `commission_amount` were all stored
// verbatim with no validation (a 50% rate on a 1,950 bill is in the shipped
// data), the per-module rates configured on the referral person were never read
// by any code path, and there was no route validation at all.
//
// The amount is now taken from a real invoice (never from the request), the rate
// comes from the referral person's configured percentage for that service type,
// and the commission is computed server-side.
const createBill = async (input, currentUserId) => {
  const { Invoice } = require('../../models');

  const person = await MasterOption.findByPk(input.referral_person_id);
  if (!person || person.type !== 'referral_person') {
    throw ApiError.badRequest('A valid referral person is required');
  }

  if (!input.invoice_id) {
    throw ApiError.badRequest(
      'invoice_id is required: commission must be calculated from a real invoice, not a supplied amount'
    );
  }
  const invoice = await Invoice.findByPk(input.invoice_id);
  if (!invoice) throw ApiError.badRequest(`Invoice ${input.invoice_id} not found`);

  const patientType = String(input.patient_type || 'opd').toLowerCase().trim();
  const rateField = RATE_FIELD_BY_TYPE[patientType];
  if (!rateField) {
    throw ApiError.badRequest(
      `Unknown service type "${input.patient_type}". Expected one of: ${Object.keys(RATE_FIELD_BY_TYPE).join(', ')}`
    );
  }

  const config = parseDesc(person.description);
  const rate = Number(config[rateField] || 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw ApiError.badRequest(
      `Referral person "${person.label}" has no valid ${patientType} commission rate configured`
    );
  }

  const billAmount = Number(invoice.total || 0);
  // BUG-054 - percentage of money on integer minor units. The float form
  // could land a cent off, and the commission is what the hospital pays out.
  const commissionAmount = money.percentOf(billAmount, rate);

  const code = 'REF-BILL-' + String(1000 + (await allocate('referral_bill')));

  const extra = {
    patient_id: invoice.patient_id,
    patient_name: null,
    patient_code: null,
    referral_person_id: person.id,
    referral_person_name: person.label,
    patient_type: patientType,
    invoice_id: invoice.id,
    bill_number: invoice.invoice_code,
    bill_date: invoice.issued_at,
    bill_amount: billAmount,
    commission_percent: rate,
    commission_amount: commissionAmount,
    paid_amount: 0,
    due_amount: commissionAmount,
    created_by: currentUserId || null,
    calculated_at: new Date().toISOString(),
  };

  if (invoice.patient_id) {
    const patient = await Patient.findByPk(invoice.patient_id, { attributes: ['full_name', 'patient_code'] });
    if (patient) {
      extra.patient_name = patient.full_name;
      extra.patient_code = patient.patient_code;
    }
  }

  const opt = await MasterOption.create({
    type: 'referral_bill',
    code,
    label: `${extra.patient_name || 'Unknown patient'} - ${code}`,
    description: JSON.stringify(extra),
  });

  const personMap = await buildPersonMap();
  return billToJson(opt, personMap);
};

const removeBill = async (id) => {
  const opt = await MasterOption.findByPk(id);
  if (!opt || opt.type !== 'referral_bill') throw ApiError.notFound('Referral bill not found');
  await opt.destroy();
  return { message: 'Referral bill deleted' };
};

module.exports = {
  list, getById, create, update, updateStatus, remove,
  listPersons, getPersonById, createPerson, updatePerson, removePerson,
  listBills, getBillAccounts, createBill, removeBill,
};
