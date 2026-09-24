'use strict';

/**
 * Report versions — the permanence rule.
 *
 * When a study is finalised, the content of the report is copied into
 * `diagnostic_report_versions` as a self-contained JSON snapshot and that row is
 * never updated again. A later correction does not edit it: the correction becomes
 * version 2, version 1 is marked superseded, and both stay readable forever.
 *
 * The snapshot is deliberately a *copy* rather than a set of foreign keys. A
 * finalised report must still read correctly in five years, after a doctor has
 * been renamed, a test has been retired or a reference range has been revised.
 * Resolving those through live rows would silently rewrite history, so the values
 * as they stood at signing time are frozen into the snapshot.
 *
 * `storage_key` never enters a snapshot. Attachments are recorded by id and
 * checksum; the bytes stay reachable only through the authorised download route.
 */

const ApiError = require('../../utils/ApiError');
const { sequelize, User } = require('../../models');
const repository = require('./diagnostics.repository');
const { DIAGNOSTIC_STATUS } = require('../../config/diagnostics');

/** The shape of a snapshot, bumped only if the layout changes incompatibly. */
const SNAPSHOT_VERSION = 1;

const VERSION_STATUS = { FINAL: 'final', AMENDED: 'amended', CANCELLED: 'cancelled' };

const iso = (value) => (value ? new Date(value).toISOString() : null);

/** A doctor as they were named at signing time. */
const doctorSnapshot = (doctor) =>
  doctor
    ? {
        id: doctor.id,
        doctor_code: doctor.doctor_code || null,
        name: doctor.user ? doctor.user.full_name : null,
      }
    : null;

const userSnapshot = (id, byId) =>
  id ? { id, name: byId.get(id) || null } : null;

/**
 * Ages are stored as a date of birth, so the age *at the time of the study* has to
 * be computed and frozen: printing today's age on a report signed years ago would
 * misstate the record.
 */
const ageAt = (dob, when) => {
  if (!dob || !when) return null;
  const birth = new Date(dob);
  const at = new Date(when);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  let years = at.getFullYear() - birth.getFullYear();
  const monthDelta = at.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birth.getDate())) years -= 1;
  return years >= 0 ? years : null;
};

/**
 * Builds the frozen content of one version from a fully-loaded study.
 *
 * `study` must come from `findStudyById`, which excludes `storage_key` from the
 * attachment rows — so a snapshot cannot carry a filesystem path even by accident.
 */
const buildSnapshot = async (study, report, options = {}) => {
  const plain = typeof study.toJSON === 'function' ? study.toJSON() : study;

  // Signatory names are resolved once and frozen, for the same reason as the rest
  // of the snapshot: the record must not change when a user is renamed.
  const userIds = [plain.verified_by, plain.finalized_by, plain.created_by, options.amendedBy]
    .filter((id) => Number.isInteger(id) && id > 0);
  const byId = new Map();
  if (userIds.length) {
    const users = await User.findAll({
      where: { id: [...new Set(userIds)] },
      attributes: ['id', 'full_name'],
      ...options.query,
    });
    users.forEach((u) => byId.set(u.id, u.full_name));
  }

  const patient = plain.patient || {};

  return {
    snapshot_version: SNAPSHOT_VERSION,
    captured_at: new Date().toISOString(),

    patient: {
      id: patient.id ?? plain.patient_id,
      uhid: patient.patient_code || null,
      name: patient.full_name || null,
      gender: patient.gender || null,
      date_of_birth: patient.date_of_birth || null,
      age_at_study: ageAt(patient.date_of_birth, plain.study_datetime),
      phone: patient.phone || null,
      blood_group: patient.blood_group || null,
    },

    study: {
      id: plain.id,
      study_code: plain.study_code,
      category: plain.category,
      modality: plain.modality,
      test_name: plain.test_name,
      status: plain.status,
      study_datetime: iso(plain.study_datetime),
      sample_collected_at: iso(plain.sample_collected_at),
      result_at: iso(plain.result_at),
      clinical_history: plain.clinical_history || null,
      procedure_note: plain.procedure_note || null,
      body_part: plain.body_part || null,
      laterality: plain.laterality || null,
      views: plain.views || null,
      contrast_used: Boolean(plain.contrast_used),
      contrast_agent: plain.contrast_agent || null,
      series_or_sequences: plain.series_or_sequences || null,
      specimen: plain.specimen || null,
      sample_type: plain.sample_type || null,
      collection_method: plain.collection_method || null,
      adequacy: plain.adequacy || null,
      // The encounter a study belongs to is carried by the order it came from —
      // a lab order item or a radiology order — plus the invoice it was billed on.
      // There is no separate encounter column, so none is invented here.
      source_type: plain.source_type || null,
      source_id: plain.source_id ?? null,
      invoice: plain.invoice
        ? { id: plain.invoice.id, invoice_code: plain.invoice.invoice_code }
        : null,
    },

    doctors: {
      referring: doctorSnapshot(plain.referring_doctor),
      performing: doctorSnapshot(plain.performing_doctor),
    },

    signatories: {
      verified_by: userSnapshot(plain.verified_by, byId),
      verified_at: iso(plain.verified_at),
      finalized_by: userSnapshot(plain.finalized_by, byId),
      finalized_at: iso(plain.finalized_at),
    },

    report: report
      ? {
          id: report.id,
          report_number: report.report_number,
          template_key: report.template_key,
        }
      : null,

    result: {
      parameters: (plain.parameters || []).map((p) => ({
        group_label: p.group_label,
        parameter_name: p.parameter_name,
        result_value: p.result_value,
        result_numeric: p.result_numeric,
        unit: p.unit,
        ref_range_low: p.ref_range_low,
        ref_range_high: p.ref_range_high,
        ref_range_text: p.ref_range_text,
        flag: p.flag,
        method: p.method,
        comments: p.comments,
        sort_order: p.sort_order,
      })),
      measurements: (plain.measurements || []).map((m) => ({
        site: m.site,
        label: m.label,
        value_numeric: m.value_numeric,
        value_text: m.value_text,
        unit: m.unit,
        normal_range: m.normal_range,
        laterality: m.laterality,
        notes: m.notes,
        sort_order: m.sort_order,
      })),
      findings: (plain.findings || []).map((f) => ({
        section: f.section,
        body: f.body,
        is_abnormal: Boolean(f.is_abnormal),
        sort_order: f.sort_order,
      })),
      organisms: (plain.organisms || []).map((o) => ({
        organism_name: o.organism_name,
        culture_medium: o.culture_medium,
        colony_count: o.colony_count,
        growth: o.growth,
        notes: o.notes,
        sort_order: o.sort_order,
        sensitivities: (o.sensitivities || []).map((s) => ({
          antibiotic: s.antibiotic,
          interpretation: s.interpretation,
          mic: s.mic,
          zone_diameter_mm: s.zone_diameter_mm,
          notes: s.notes,
          sort_order: s.sort_order,
        })),
      })),
    },

    narrative: {
      interpretation: plain.interpretation || null,
      impression: plain.impression || null,
      conclusion: plain.conclusion || null,
      recommendation: plain.recommendation || null,
    },

    // Metadata only. The bytes are not embedded and the path is not present.
    attachments: (plain.attachments || [])
      .filter((a) => a.is_current !== false)
      .map((a) => ({
        id: a.id,
        kind: a.kind,
        original_name: a.original_name,
        mime_type: a.mime_type,
        // The column is file_size, not size_bytes; reading the wrong name wrote a
        // snapshot with the size missing, which a permanent record must not do.
        size_bytes: a.file_size ?? null,
        checksum_sha256: a.checksum_sha256,
        version: a.version,
        is_original: Boolean(a.is_original),
        series_id: a.series_id ?? null,
        caption: a.caption || null,
        uploaded_at: iso(a.uploaded_at || a.createdAt),
      })),
  };
};

/* ── diffing ───────────────────────────────────────────────────────────────── */

const SECTIONS = [
  ['result.parameters', (s) => s.result.parameters],
  ['result.measurements', (s) => s.result.measurements],
  ['result.findings', (s) => s.result.findings],
  ['result.organisms', (s) => s.result.organisms],
  ['narrative.interpretation', (s) => s.narrative.interpretation],
  ['narrative.impression', (s) => s.narrative.impression],
  ['narrative.conclusion', (s) => s.narrative.conclusion],
  ['narrative.recommendation', (s) => s.narrative.recommendation],
  ['study.test_name', (s) => s.study.test_name],
  ['study.body_part', (s) => s.study.body_part],
  ['study.laterality', (s) => s.study.laterality],
  ['study.clinical_history', (s) => s.study.clinical_history],
  ['study.specimen', (s) => s.study.specimen],
  ['attachments', (s) => s.attachments.map((a) => a.checksum_sha256)],
];

/**
 * Names the sections that actually differ between two snapshots.
 *
 * This is recorded rather than computed on read so that "what changed" is fixed at
 * the moment of amendment — the answer must not drift if the diff logic is later
 * refined.
 */
const changedSections = (before, after) => {
  const changed = [];
  SECTIONS.forEach(([name, pick]) => {
    let a;
    let b;
    try {
      a = JSON.stringify(pick(before) ?? null);
      b = JSON.stringify(pick(after) ?? null);
    } catch {
      return;
    }
    if (a !== b) changed.push(name);
  });
  return changed;
};

/* ── writing versions ──────────────────────────────────────────────────────── */

/**
 * Writes version 1 at finalisation. Called inside the finalise transaction, so a
 * report and its first version either both exist or neither does.
 */
const captureFinalVersion = async (study, report, currentUserId, t) => {
  const snapshot = await buildSnapshot(study, report, { query: { transaction: t } });

  const version = await repository.createVersion(
    {
      report_id: report.id,
      study_id: study.id,
      patient_id: study.patient_id,
      version_no: 1,
      version_status: VERSION_STATUS.FINAL,
      snapshot: JSON.stringify(snapshot),
      verified_by: study.verified_by || null,
      verified_at: study.verified_at || null,
      issued_by: currentUserId || null,
      issued_at: new Date(),
    },
    { transaction: t }
  );

  await repository.updateReport(
    report,
    { current_version_id: version.id, version_count: 1, is_amended: false },
    { transaction: t }
  );

  return version;
};

/**
 * Corrects a finalised report.
 *
 * The original version is not touched: it gains `superseded_at`/`superseded_by_id`
 * and remains readable. The correction is a new row carrying who made it, when,
 * why, and which sections differ. If nothing actually differs the amendment is
 * refused — an audit trail of empty revisions hides the real ones.
 */
const amend = async (studyId, input, currentUserId) =>
  sequelize.transaction(async (t) => {
    const locked = await repository.lockStudyById(studyId, t);
    if (!locked) throw ApiError.notFound('Diagnostic study not found');

    if (locked.status !== DIAGNOSTIC_STATUS.FINAL) {
      throw ApiError.badRequest(
        `Only a finalised report can be amended. Study ${locked.study_code} is "${locked.status}" — ` +
          'edit the result directly while it is still open.'
      );
    }

    const report = await repository.findReportByStudy(studyId, { transaction: t });
    if (!report) {
      throw ApiError.badRequest(
        `Study ${locked.study_code} is final but carries no report, so there is nothing to amend.`
      );
    }

    const reason = String(input.reason || '').trim();
    if (reason.length < 10) {
      throw ApiError.badRequest(
        'An amendment reason of at least 10 characters is required, and it is stored with the correction.'
      );
    }

    const previous = await repository.findCurrentVersion(report.id, { transaction: t });
    if (!previous) {
      throw ApiError.badRequest(
        `Report ${report.report_number} has no stored version to supersede. It predates report versioning.`
      );
    }

    const before = previous.content;

    // Apply the correction through the same writer the normal result path uses, so
    // an amended value is validated and derived exactly like an original one.
    // Requires the caller to have passed the FINAL guard above.
    const { applyResultPayload } = require('./diagnostics.service');
    await applyResultPayload(locked, input, currentUserId, t, { advanceStatus: false });

    const updated = await repository.findStudyById(studyId, { transaction: t });
    const after = await buildSnapshot(updated, report, {
      amendedBy: currentUserId,
      query: { transaction: t },
    });

    const changed = changedSections(before, after);
    if (!changed.length) {
      throw ApiError.badRequest(
        'The amendment would not change any part of the report. Nothing was recorded.'
      );
    }

    const nextNo = (report.version_count || 1) + 1;
    const version = await repository.createVersion(
      {
        report_id: report.id,
        study_id: studyId,
        patient_id: locked.patient_id,
        version_no: nextNo,
        version_status: VERSION_STATUS.AMENDED,
        snapshot: JSON.stringify(after),
        amends_version_id: previous.id,
        amendment_reason: reason,
        changed_fields: JSON.stringify(changed),
        verified_by: locked.verified_by || null,
        verified_at: locked.verified_at || null,
        issued_by: currentUserId || null,
        issued_at: new Date(),
      },
      { transaction: t }
    );

    // The original is superseded, never rewritten.
    await repository.updateVersion(
      previous,
      { superseded_at: new Date(), superseded_by_id: version.id },
      { transaction: t }
    );

    // `status` deliberately stays 'final': an amended report is still a final
    // report, just at a later version. The amendment is carried by `is_amended`
    // and by the version chain, which keeps one source of truth for it. (The
    // status column is the shared lifecycle enum and has no 'amended' member;
    // writing one silently stored an empty string on this MariaDB, which is how
    // the redundancy was caught.)
    await repository.updateReport(
      report,
      {
        current_version_id: version.id,
        version_count: nextNo,
        is_amended: true,
      },
      { transaction: t }
    );

    return {
      study: (await repository.findStudyById(studyId, { transaction: t })).toJSON(),
      version: {
        id: version.id,
        version_no: version.version_no,
        version_status: version.version_status,
        amends_version_id: version.amends_version_id,
        amendment_reason: version.amendment_reason,
        changed_fields: changed,
        issued_at: version.issued_at,
      },
    };
  });

/* ── reading versions ──────────────────────────────────────────────────────── */

const versionRow = (v, { withContent = false } = {}) => ({
  id: v.id,
  version_no: v.version_no,
  version_status: v.version_status,
  is_current: !v.superseded_at,
  amends_version_id: v.amends_version_id,
  amendment_reason: v.amendment_reason,
  changed_fields: v.changedFieldList,
  verified_by: v.verified_by,
  verified_at: v.verified_at,
  issued_by: v.issued_by,
  issued_at: v.issued_at,
  superseded_at: v.superseded_at,
  superseded_by_id: v.superseded_by_id,
  ...(withContent ? { content: v.content } : {}),
});

/** The full version chain of a study, oldest first. */
const listVersions = async (studyId) => {
  const study = await repository.findStudyById(studyId);
  if (!study) throw ApiError.notFound('Diagnostic study not found');

  const versions = await repository.findVersionsByStudy(studyId);
  return {
    study_id: study.id,
    study_code: study.study_code,
    report_number: study.report ? study.report.report_number : null,
    version_count: versions.length,
    is_amended: versions.some((v) => v.version_status === VERSION_STATUS.AMENDED),
    versions: versions.map((v) => versionRow(v)),
  };
};

/**
 * One frozen version including its content. `version_no` may be `current`.
 *
 * The study is loaded first and the version is matched against it, so a version id
 * belonging to another patient's report cannot be read by guessing a number.
 */
const getVersion = async (studyId, versionNo) => {
  const study = await repository.findStudyById(studyId);
  if (!study) throw ApiError.notFound('Diagnostic study not found');

  const versions = await repository.findVersionsByStudy(studyId);
  if (!versions.length) {
    throw ApiError.notFound(`Study ${study.study_code} has no finalised report version`);
  }

  const wanted =
    versionNo === 'current' || versionNo === undefined
      ? versions.find((v) => !v.superseded_at) || versions[versions.length - 1]
      : versions.find((v) => v.version_no === Number(versionNo));

  if (!wanted) throw ApiError.notFound(`Version ${versionNo} not found for ${study.study_code}`);

  return {
    study_id: study.id,
    study_code: study.study_code,
    ...versionRow(wanted, { withContent: true }),
  };
};

module.exports = {
  SNAPSHOT_VERSION,
  VERSION_STATUS,
  buildSnapshot,
  changedSections,
  captureFinalVersion,
  amend,
  listVersions,
  getVersion,
};
