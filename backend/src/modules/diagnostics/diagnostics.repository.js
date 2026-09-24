'use strict';

const { Op } = require('sequelize');
const {
  DiagnosticStudy,
  DiagnosticResultParameter,
  DiagnosticMeasurement,
  DiagnosticFinding,
  DiagnosticOrganism,
  DiagnosticSensitivity,
  DiagnosticAttachment,
  DiagnosticReport,
  DiagnosticReportVersion,
  Patient,
  Doctor,
  User,
  Invoice,
} = require('../../models');
const { dateTimeRange } = require('../../utils/dateUtils');

/**
 * The child rows a study owns. `separate: true` on the hasMany includes keeps
 * each child set in its own query rather than multiplying the parent row by the
 * product of every collection — with six collections a single joined query would
 * return an unusable cartesian product.
 */
const studyChildren = () => [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone', 'gender', 'date_of_birth', 'blood_group', 'address'] },
  { model: Doctor, as: 'referring_doctor', attributes: ['id', 'doctor_code'], include: [{ model: User, as: 'user', attributes: ['full_name'] }] },
  { model: Doctor, as: 'performing_doctor', attributes: ['id', 'doctor_code'], include: [{ model: User, as: 'user', attributes: ['full_name'] }] },
  { model: Invoice, as: 'invoice', attributes: ['id', 'invoice_code', 'total', 'paid_amount', 'status'] },
  { model: DiagnosticResultParameter, as: 'parameters', separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] },
  { model: DiagnosticMeasurement, as: 'measurements', separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] },
  { model: DiagnosticFinding, as: 'findings', separate: true, order: [['sort_order', 'ASC'], ['id', 'ASC']] },
  {
    model: DiagnosticOrganism,
    as: 'organisms',
    separate: true,
    order: [['sort_order', 'ASC'], ['id', 'ASC']],
    include: [{ model: DiagnosticSensitivity, as: 'sensitivities' }],
  },
  {
    model: DiagnosticAttachment,
    as: 'attachments',
    separate: true,
    order: [['id', 'ASC']],
    // storage_key is deliberately excluded: the path on disk must never travel
    // to a client. Files are reached only through the authorised download route.
    attributes: { exclude: ['storage_key'] },
  },
  { model: DiagnosticReport, as: 'report' },
];

/** Light include set for list endpoints, where child collections are not needed. */
const studySummary = () => [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  { model: Doctor, as: 'referring_doctor', attributes: ['id', 'doctor_code'], include: [{ model: User, as: 'user', attributes: ['full_name'] }] },
  { model: Doctor, as: 'performing_doctor', attributes: ['id', 'doctor_code'], include: [{ model: User, as: 'user', attributes: ['full_name'] }] },
  { model: Invoice, as: 'invoice', attributes: ['id', 'invoice_code', 'total', 'paid_amount', 'status'] },
  // is_amended and version_count travel with the summary so a history list can
  // show that a report was corrected without fetching every report in full.
  {
    model: DiagnosticReport,
    as: 'report',
    attributes: ['id', 'report_number', 'status', 'template_key', 'is_amended', 'version_count'],
  },
];

const buildWhere = ({ filters = {}, dateRange, search } = {}) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange || {});
  if (range) where.study_datetime = range;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ study_code: like }, { test_name: like }, { modality: like }];
  }
  return where;
};

const findAndCountStudies = ({ filters, dateRange, search, limit, offset }) =>
  DiagnosticStudy.findAndCountAll({
    where: buildWhere({ filters, dateRange, search }),
    include: studySummary(),
    limit,
    offset,
    order: [['study_datetime', 'DESC'], ['id', 'DESC']],
    distinct: true,
    subQuery: false,
  });

const findStudyById = (id, options = {}) =>
  DiagnosticStudy.findByPk(id, { include: studyChildren(), ...options });

/** Bare row, for guards and status changes that do not need the children. */
const findStudyRow = (id, options = {}) => DiagnosticStudy.findByPk(id, options);

const lockStudyById = (id, transaction) =>
  DiagnosticStudy.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });

const createStudy = (data, options = {}) => DiagnosticStudy.create(data, options);
const updateStudy = (study, changes, options = {}) => study.update(changes, options);
const destroyStudy = (study, options = {}) => study.destroy(options);

const countStudiesForPatient = (patientId) =>
  DiagnosticStudy.count({ where: { patient_id: patientId } });

/* ── child collections ─────────────────────────────────────────────────────── */

const replaceParameters = async (studyId, rows, options = {}) => {
  await DiagnosticResultParameter.destroy({ where: { study_id: studyId }, force: true, ...options });
  if (!rows.length) return [];
  return DiagnosticResultParameter.bulkCreate(
    rows.map((row, index) => ({ ...row, study_id: studyId, sort_order: row.sort_order ?? index })),
    options
  );
};

const replaceMeasurements = async (studyId, rows, options = {}) => {
  await DiagnosticMeasurement.destroy({ where: { study_id: studyId }, force: true, ...options });
  if (!rows.length) return [];
  return DiagnosticMeasurement.bulkCreate(
    rows.map((row, index) => ({ ...row, study_id: studyId, sort_order: row.sort_order ?? index })),
    options
  );
};

const replaceFindings = async (studyId, rows, options = {}) => {
  await DiagnosticFinding.destroy({ where: { study_id: studyId }, force: true, ...options });
  if (!rows.length) return [];
  return DiagnosticFinding.bulkCreate(
    rows.map((row, index) => ({ ...row, study_id: studyId, sort_order: row.sort_order ?? index })),
    options
  );
};

/**
 * Organisms carry their own sensitivities, so the whole set is rebuilt together.
 * Deleting the organism cascades to its sensitivities in the schema.
 */
const replaceOrganisms = async (studyId, rows, options = {}) => {
  const existing = await DiagnosticOrganism.findAll({ where: { study_id: studyId }, attributes: ['id'], ...options });
  if (existing.length) {
    await DiagnosticSensitivity.destroy({
      where: { organism_id: existing.map((o) => o.id) },
      force: true,
      ...options,
    });
    await DiagnosticOrganism.destroy({ where: { study_id: studyId }, force: true, ...options });
  }
  const created = [];
  for (const [index, row] of rows.entries()) {
    const { sensitivities = [], ...organism } = row;
    // eslint-disable-next-line no-await-in-loop
    const saved = await DiagnosticOrganism.create(
      { ...organism, study_id: studyId, sort_order: organism.sort_order ?? index },
      options
    );
    if (sensitivities.length) {
      // eslint-disable-next-line no-await-in-loop
      await DiagnosticSensitivity.bulkCreate(
        sensitivities.map((s, i) => ({ ...s, organism_id: saved.id, sort_order: s.sort_order ?? i })),
        options
      );
    }
    created.push(saved);
  }
  return created;
};

/* ── report ────────────────────────────────────────────────────────────────── */

const findReportByStudy = (studyId, options = {}) =>
  DiagnosticReport.findOne({ where: { study_id: studyId }, ...options });

const createReport = (data, options = {}) => DiagnosticReport.create(data, options);
const updateReport = (report, changes, options = {}) => report.update(changes, options);

/* ── report versions ───────────────────────────────────────────────────────────
 * There is deliberately no updateVersion for content and no destroyVersion. A
 * version row is written once; the only permitted change is marking it superseded,
 * which `updateVersion` below is scoped to by its callers.
 */

const createVersion = (data, options = {}) => DiagnosticReportVersion.create(data, options);

/** Marks a version superseded. Never used to alter a snapshot. */
const updateVersion = (version, changes, options = {}) => version.update(changes, options);

/** The whole chain for a study, oldest first, so amendments read in order. */
const findVersionsByStudy = (studyId, options = {}) =>
  DiagnosticReportVersion.findAll({
    where: { study_id: studyId },
    order: [['version_no', 'ASC']],
    ...options,
  });

/** The version currently in force: the one nothing has superseded. */
const findCurrentVersion = (reportId, options = {}) =>
  DiagnosticReportVersion.findOne({
    where: { report_id: reportId, superseded_at: null },
    order: [['version_no', 'DESC']],
    ...options,
  });

/* ── attachments ───────────────────────────────────────────────────────────── */

const createAttachment = (data, options = {}) => DiagnosticAttachment.create(data, options);

const findAttachmentById = (id, options = {}) => DiagnosticAttachment.findByPk(id, options);

/**
 * The same row INCLUDING `storage_key`.
 *
 * The model carries a defaultScope that excludes `storage_key`, so no ordinary
 * query can leak a file path into an API response even by accident. Serving a file
 * genuinely needs the path, so that protection is lifted here and only here —
 * `unscoped` makes the exception explicit and greppable rather than silently
 * widening the model.
 *
 * Callers must not put the result into a response body.
 */
const findAttachmentWithKey = (id, options = {}) =>
  DiagnosticAttachment.unscoped().findByPk(id, options);

/**
 * The generated PDF for a version, if one has already been produced. Unscoped
 * because the caller needs the storage path to stream the existing file rather
 * than rendering a second copy of a signed document.
 */
const findGeneratedReport = (versionId, options = {}) =>
  DiagnosticAttachment.unscoped().findOne({
    where: { report_version_id: versionId, kind: 'generated_report' },
    order: [['id', 'DESC']],
    ...options,
  });

/** Every attachment of a study, with paths, for integrity checking. */
const findAttachmentsWithKeys = (studyId, options = {}) =>
  DiagnosticAttachment.unscoped().findAll({
    where: { study_id: studyId },
    order: [['id', 'ASC']],
    ...options,
  });

const findAttachmentsByStudy = (studyId, options = {}) =>
  DiagnosticAttachment.findAll({
    where: { study_id: studyId },
    order: [['id', 'ASC']],
    attributes: { exclude: ['storage_key'] },
    ...options,
  });

const destroyAttachment = (attachment, options = {}) => attachment.destroy(options);

const countAttachments = (studyId, options = {}) =>
  DiagnosticAttachment.count({ where: { study_id: studyId }, ...options });

module.exports = {
  studyChildren,
  findAndCountStudies,
  findStudyById,
  findStudyRow,
  lockStudyById,
  createStudy,
  updateStudy,
  destroyStudy,
  countStudiesForPatient,
  replaceParameters,
  replaceMeasurements,
  replaceFindings,
  replaceOrganisms,
  findReportByStudy,
  createReport,
  updateReport,
  createVersion,
  updateVersion,
  findVersionsByStudy,
  findCurrentVersion,
  createAttachment,
  findAttachmentById,
  findAttachmentWithKey,
  findAttachmentsWithKeys,
  findGeneratedReport,
  findAttachmentsByStudy,
  destroyAttachment,
  countAttachments,
};
