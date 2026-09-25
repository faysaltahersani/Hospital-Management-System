'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const {
  generateBloodDonorCode,
  generateBloodBagCode,
  generateBloodIssueCode,
} = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear, allocate } = require('../../utils/codeSequence');
const { BLOOD_BAG_STATUS } = require('../../config/constants');
const { checkCompatibility } = require('../../utils/bloodCompatibility');
const { sequelize, Patient } = require('../../models');
const repository = require('./blood-bank.repository');
const { createEncounterInvoice } = require('../../utils/encounterBilling');

/* ---------- Donors ---------- */

const listDonors = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.blood_group) filters.blood_group = query.blood_group;
  if (query.gender) filters.gender = query.gender;
  if (query.is_active !== undefined) filters.is_active = query.is_active;

  const { rows, count } = await repository.findAndCountDonors({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((d) => d.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getDonor = async (id) => {
  const donor = await repository.findDonorById(id);
  if (!donor) throw ApiError.notFound('Donor not found');
  return donor.toJSON();
};

const createDonor = async (input) => {
  const year = currentYear();
  const donor = await withCodeRetry(async () => {
    const sequence = await allocateForYear('blood_donor', year);
    const donor_code = generateBloodDonorCode(year, sequence);
    return repository.createDonor({ ...input, donor_code });
  });
  return donor.toJSON();
};

const updateDonor = async (id, changes) => {
  const donor = await repository.findDonorById(id);
  if (!donor) throw ApiError.notFound('Donor not found');
  await repository.updateDonor(donor, changes);
  return donor.toJSON();
};

const removeDonor = async (id) => {
  const donor = await repository.findDonorById(id);
  if (!donor) throw ApiError.notFound('Donor not found');
  await repository.destroyDonor(donor);
  return { message: 'Donor deleted' };
};

/* ---------- Bags ---------- */

const listBags = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.blood_group) filters.blood_group = query.blood_group;
  if (query.component) filters.component = query.component;
  if (query.status) filters.status = query.status;
  if (query.donor_id) filters.donor_id = query.donor_id;

  const { rows, count } = await repository.findAndCountBags({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((b) => b.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getBag = async (id) => {
  const bag = await repository.findBagById(id);
  if (!bag) throw ApiError.notFound('Blood bag not found');
  return bag.toJSON();
};

const createBag = async (input) => {
  return sequelize.transaction(async (t) => {
    if (input.donor_id) {
      const donor = await repository.findDonorById(input.donor_id, { transaction: t });
      if (!donor) throw ApiError.badRequest('Donor not found');
      await repository.updateDonor(
        donor,
        {
          last_donation_at: input.collected_at || new Date(),
          total_donations: (donor.total_donations || 0) + 1,
        },
        { transaction: t }
      );
    }

    const year = currentYear();
    const collectedAt = input.collected_at ? new Date(input.collected_at) : new Date();
    let expiresAt = input.expires_at ? new Date(input.expires_at) : null;
    if (!expiresAt || isNaN(expiresAt.getTime())) {
      const comp = (input.component || 'whole_blood').toLowerCase();
      const days = comp === 'platelets' ? 5 : (comp === 'plasma' || comp === 'cryo') ? 365 : 35;
      expiresAt = new Date(collectedAt.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const bag = await withCodeRetry(async () => {
      const sequence = await allocateForYear('blood_bag', year, { transaction: t });
      const bag_code = generateBloodBagCode(year, sequence);
      return repository.createBag(
        {
          bag_code,
          donor_id: input.donor_id || null,
          blood_group: input.blood_group,
          component: input.component || 'whole_blood',
          volume_ml: input.volume_ml || 450,
          collected_at: collectedAt,
          expires_at: expiresAt,
          price: input.price || 0,
          status: BLOOD_BAG_STATUS.AVAILABLE,
          notes: input.notes || null,
        },
        { transaction: t }
      );
    });

    return (await repository.findBagById(bag.id, { transaction: t })).toJSON();
  });
};

const updateBag = async (id, changes) => {
  const bag = await repository.findBagById(id);
  if (!bag) throw ApiError.notFound('Blood bag not found');
  if (bag.status === BLOOD_BAG_STATUS.ISSUED) {
    throw ApiError.badRequest('Cannot edit an issued bag');
  }
  await repository.updateBag(bag, changes);
  return (await repository.findBagById(id)).toJSON();
};

/**
 * Records an infectious-disease screening result against a bag.
 *
 * The issue path refuses any bag whose screening is not 'passed' (BUG-013), but
 * nothing could ever set it: `screening_status` was written by migration 002 and
 * then only ever read. Every bag therefore stayed 'pending' or 'not_recorded' and
 * POST /blood-bank/issues could not succeed for any unit in the database — the
 * safety gate had no gate-opening procedure behind it.
 *
 * Deliberate rules:
 *   * `screening_status` is NOT accepted by createBag/updateBag. A screening is a
 *     laboratory finding attributed to a person at a time, not a field an
 *     administrator edits alongside the bag's volume.
 *   * A failed screening also takes the unit out of circulation immediately.
 *   * Re-screening a passed unit back to pending/failed stays possible (a later
 *     confirmatory test can overturn an earlier result), but an already-issued bag
 *     is refused: the transfusion has happened and the record must stand.
 */
const recordBagScreening = async (id, input, currentUserId) => {
  const bag = await repository.findBagById(id);
  if (!bag) throw ApiError.notFound('Blood bag not found');
  if (bag.status === BLOOD_BAG_STATUS.ISSUED) {
    throw ApiError.badRequest(
      `Blood bag ${bag.bag_code} has already been issued; its screening record cannot be changed.`
    );
  }

  const changes = {
    screening_status: input.screening_status,
    screened_at: input.screened_at || new Date(),
    screened_by: currentUserId || null,
    screening_notes: input.notes ?? bag.screening_notes ?? null,
  };

  // A unit that fails screening must not remain issuable.
  if (input.screening_status === 'failed') {
    changes.status = BLOOD_BAG_STATUS.DISCARDED;
  }

  await repository.updateBag(bag, changes);
  return (await repository.findBagById(id)).toJSON();
};

const removeBag = async (id) => {
  const bag = await repository.findBagById(id);
  if (!bag) throw ApiError.notFound('Blood bag not found');
  if (bag.status === BLOOD_BAG_STATUS.ISSUED) {
    throw ApiError.badRequest('Cannot delete an issued bag');
  }
  await repository.destroyBag(bag);
  return { message: 'Blood bag deleted' };
};

const getStockSummary = async () => {
  const rows = await repository.stockSummary();
  return rows.map((r) => ({
    blood_group: r.blood_group,
    component: r.component,
    status: r.status,
    count: Number(r.count),
  }));
};

/* ---------- Issues ---------- */

const listIssues = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;

  const { rows, count } = await repository.findAndCountIssues({
    filters,
    dateRange: query,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((i) => i.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getIssue = async (id) => {
  const issue = await repository.findIssueById(id);
  if (!issue) throw ApiError.notFound('Blood issue not found');
  return issue.toJSON();
};

const issueBag = async (input, currentUserId) => {
  return sequelize.transaction(async (t) => {
    const bag = await repository.findBagById(input.bag_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!bag) throw ApiError.badRequest('Blood bag not found');
    if (bag.status !== BLOOD_BAG_STATUS.AVAILABLE) {
      throw ApiError.conflict(`Blood bag is ${bag.status}`);
    }
    if (new Date(bag.expires_at) < new Date()) {
      await repository.updateBag(bag, { status: BLOOD_BAG_STATUS.EXPIRED }, { transaction: t });
      throw ApiError.badRequest('Blood bag has expired');
    }

    // BUG-013 — patient-safety gate. Screening must have been recorded as
    // passed, and the unit must be ABO/Rh compatible with the recipient.
    // Both checks fail closed: missing or unknown data blocks the issue.
    if (bag.screening_status !== 'passed') {
      throw ApiError.badRequest(
        `Blood bag ${bag.bag_code} cannot be issued: infectious-disease screening is "${bag.screening_status}". ` +
          'Record a passed screening result before issuing.'
      );
    }

    let recipientGroup = input.recipient_blood_group || null;
    if (input.patient_id) {
      const patient = await Patient.findByPk(input.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');
      recipientGroup = patient.blood_group;
    }

    // An issue with no identified recipient group cannot be safety-checked.
    // Requiring the group is the safe behaviour; `issued_to` free text alone is
    // not sufficient to authorise a transfusion.
    const verdict = checkCompatibility({
      bagGroup: bag.blood_group,
      recipientGroup,
      component: bag.component,
    });
    if (!verdict.compatible) {
      throw ApiError.badRequest(`Incompatible blood issue rejected: ${verdict.reason}`);
    }

    const year = currentYear();
    const issue = await withCodeRetry(async () => {
      const sequence = await allocateForYear('blood_issue', year, { transaction: t });
      const issue_code = generateBloodIssueCode(year, sequence);
      return repository.createIssue(
        {
          issue_code,
          bag_id: bag.id,
          patient_id: input.patient_id || null,
          issued_to: input.issued_to || null,
          issued_at: input.issued_at || new Date(),
          price: input.price !== undefined ? input.price : bag.price,
          issued_by: currentUserId || null,
          notes: input.notes || null,
        },
        { transaction: t }
      );
    });

    await repository.updateBag(bag, { status: BLOOD_BAG_STATUS.ISSUED }, { transaction: t });

    // BUG-042 - a priced blood issue raises a real invoice. Issues to an
    // unidentified recipient are blocked earlier by the safety gate, so a
    // patient is always present here; a zero-price issue raises nothing.
    const issuePrice = Number(issue.price || 0);
    if (issuePrice > 0) {
      const { Invoice, InvoiceItem, Payment } = require('../../models');
      await createEncounterInvoice({
        models: { Invoice, InvoiceItem, Payment },
        transaction: t,
        patientId: issue.patient_id,
        link: { blood_issue_id: issue.id },
        lines: [{
          item_type: 'other',
          reference_id: issue.id,
          service_source_type: 'blood_bag',
          service_source_id: bag.id,
          description: `Blood issue ${bag.bag_code} (${bag.blood_group} ${bag.component})`,
          quantity: 1,
          unit_price: issuePrice,
        }],
        payments: input.payments,
        issuedAt: issue.issued_at,
        currentUserId,
      });
    }

    return (await repository.findIssueById(issue.id, { transaction: t })).toJSON();
  });
};

const removeIssue = async (id) => {
  return sequelize.transaction(async (t) => {
    const issue = await repository.findIssueById(id, { transaction: t });
    if (!issue) throw ApiError.notFound('Blood issue not found');
    const bag = await repository.findBagById(issue.bag_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (bag) await repository.updateBag(bag, { status: BLOOD_BAG_STATUS.AVAILABLE }, { transaction: t });
    await repository.destroyIssue(issue);
    return { message: 'Blood issue reverted' };
  });
};

const toOptionCode = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const STANDARD_BLOOD_GROUP_CODES = Object.freeze({
  'A+': 'a_positive',
  'A-': 'a_negative',
  'B+': 'b_positive',
  'B-': 'b_negative',
  'AB+': 'ab_positive',
  'AB-': 'ab_negative',
  'O+': 'o_positive',
  'O-': 'o_negative',
});

const toBloodMasterOptionCode = (type, label) =>
  type === 'blood_group' && STANDARD_BLOOD_GROUP_CODES[label]
    ? STANDARD_BLOOD_GROUP_CODES[label]
    : toOptionCode(label);

const listBloodMasterOptions = async (type, query = {}) => {
  const { MasterOption } = require('../../models');
  const { Op } = require('sequelize');
  const where = { type, is_active: true };
  if (query.search) {
    where.label = { [Op.like]: `%${query.search.trim()}%` };
  }
  const options = await MasterOption.findAll({
    where,
    order: [['label', 'ASC']],
  });
  return options.map((opt) => ({
    id: opt.id,
    name: opt.label,
    code: opt.code,
    creator: { full_name: 'Admin' },
    updater: { full_name: 'Admin' },
  }));
};

const createBloodMasterOption = async (type, body) => {
  const { MasterOption } = require('../../models');
  const label = body.name || body.label || '';
  const code = body.code || toBloodMasterOptionCode(type, label);
  const option = await MasterOption.create({
    type,
    code,
    label,
    is_active: true,
  });
  return {
    id: option.id,
    name: option.label,
    code: option.code,
    creator: { full_name: 'Admin' },
    updater: { full_name: 'Admin' },
  };
};

const updateBloodMasterOption = async (id, body) => {
  const { MasterOption } = require('../../models');
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Option not found');
  const label = body.name || body.label || option.label;
  await option.update({ label, code: toBloodMasterOptionCode(option.type, label) });
  return {
    id: option.id,
    name: option.label,
    code: option.code,
    creator: { full_name: 'Admin' },
    updater: { full_name: 'Admin' },
  };
};

const deleteBloodMasterOption = async (id) => {
  const { MasterOption } = require('../../models');
  const option = await MasterOption.findByPk(id);
  if (!option) throw ApiError.notFound('Option not found');
  await option.destroy();
  return { message: 'Deleted successfully' };
};

module.exports = {
  listDonors,
  getDonor,
  createDonor,
  updateDonor,
  removeDonor,
  listBags,
  getBag,
  createBag,
  updateBag,
  recordBagScreening,
  removeBag,
  getStockSummary,
  listIssues,
  getIssue,
  issueBag,
  removeIssue,
  listBloodMasterOptions,
  createBloodMasterOption,
  updateBloodMasterOption,
  deleteBloodMasterOption,
};
