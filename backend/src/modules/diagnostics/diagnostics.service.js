'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { allocateForYear } = require('../../utils/codeSequence');
const money = require('../../utils/money');
const { sequelize, Patient, Doctor, Invoice, LabOrderItem, RadiologyOrder } = require('../../models');
const repository = require('./diagnostics.repository');
const {
  DIAGNOSTIC_STATUS,
  STATUS_TRANSITIONS,
  RESULT_EDITABLE_STATUSES,
  DIAGNOSTIC_MODALITIES,
  DIAGNOSTIC_CATEGORY_VALUES,
  modalityByKey,
  modalitiesForCategory,
} = require('../../config/diagnostics');

/* ── helpers ───────────────────────────────────────────────────────────────── */

const studyCode = (year, sequence) => `DX-${year}-${String(sequence).padStart(6, '0')}`;
const reportNumber = (year, sequence) => `DXR-${year}-${String(sequence).padStart(6, '0')}`;

/**
 * Resolves the report template for a study. A modality names its own template;
 * a category without a recognised modality falls back to the category template,
 * so a report is never rendered with a layout meant for something else.
 */
const templateFor = (category, modality) => {
  const known = modality ? modalityByKey(modality) : null;
  if (known) return known.template;
  const siblings = modalitiesForCategory(category);
  return siblings.length ? siblings[0].template : 'specialized';
};

const assertTransition = (from, to) => {
  const allowed = STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw ApiError.badRequest(
      `A study cannot move from "${from}" to "${to}". ` +
        (allowed.length ? `Allowed next: ${allowed.join(', ')}.` : `"${from}" is a terminal state.`)
    );
  }
};

/**
 * A result may only be edited while the study is still open. Once verified or
 * finalised the content is the signed record and must not change silently — the
 * study has to be sent back to an earlier state first, which is itself audited.
 */
const assertResultEditable = (study) => {
  if (!RESULT_EDITABLE_STATUSES.includes(study.status)) {
    throw ApiError.badRequest(
      `Results cannot be edited while the study is "${study.status}". ` +
        'Move it back to under_review or result_entered first.'
    );
  }
};

/**
 * True when the study carries anything a specialist could review. Verification is
 * refused otherwise, so an empty report can never be signed.
 */
const hasRecordedResult = (study) =>
  Boolean(
    (study.parameters && study.parameters.length) ||
      (study.measurements && study.measurements.length) ||
      (study.findings && study.findings.length) ||
      (study.organisms && study.organisms.length) ||
      (study.interpretation && String(study.interpretation).trim()) ||
      (study.impression && String(study.impression).trim()) ||
      (study.conclusion && String(study.conclusion).trim())
  );

/**
 * Derives the abnormality flag from the numeric value and the reference range
 * when the caller did not supply one. A flag the caller sends is kept — a
 * pathologist may legitimately mark something abnormal that sits inside the
 * range — but a blank flag is never left blank when the range can decide it.
 */
const deriveFlag = (row) => {
  if (row.flag) return row.flag;
  const value = row.result_numeric;
  const low = row.ref_range_low;
  const high = row.ref_range_high;
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (low !== null && low !== undefined && low !== '' && numeric < Number(low)) return 'low';
  if (high !== null && high !== undefined && high !== '' && numeric > Number(high)) return 'high';
  if (
    (low === null || low === undefined || low === '') &&
    (high === null || high === undefined || high === '')
  ) {
    return null;
  }
  return 'normal';
};

/* ── read ──────────────────────────────────────────────────────────────────── */

const list = async (query = {}) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.patient_id) filters.patient_id = query.patient_id;
  if (query.category) filters.category = query.category;
  if (query.modality) filters.modality = query.modality;
  if (query.status) filters.status = query.status;
  if (query.referring_doctor_id) filters.referring_doctor_id = query.referring_doctor_id;
  if (query.performing_doctor_id) filters.performing_doctor_id = query.performing_doctor_id;

  const { rows, count } = await repository.findAndCountStudies({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });

  return { items: rows.map((r) => r.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getById = async (id) => {
  const study = await repository.findStudyById(id);
  if (!study) throw ApiError.notFound('Diagnostic study not found');
  return study.toJSON();
};

/**
 * Every investigation for one patient, newest first — the Patient Diagnostic
 * History the clinical staff work from.
 */
const historyForPatient = async (patientId, query = {}) => {
  const patient = await Patient.findByPk(patientId);
  if (!patient) throw ApiError.notFound('Patient not found');

  const { page, limit, offset } = parsePaging(query);
  const filters = { patient_id: patientId };
  if (query.category) filters.category = query.category;
  if (query.status) filters.status = query.status;

  const { rows, count } = await repository.findAndCountStudies({
    filters,
    dateRange: { from: query.from, to: query.to },
    search: query.search,
    limit,
    offset,
  });

  return {
    patient: {
      id: patient.id,
      patient_code: patient.patient_code,
      full_name: patient.full_name,
      phone: patient.phone,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
      blood_group: patient.blood_group,
    },
    items: rows.map((r) => r.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

/** Catalogue the UI needs to build its pickers, straight from configuration. */
const getMeta = async () => ({
  categories: DIAGNOSTIC_CATEGORY_VALUES,
  modalities: DIAGNOSTIC_MODALITIES,
  statuses: Object.values(DIAGNOSTIC_STATUS),
  transitions: STATUS_TRANSITIONS,
});

/* ── create / update ──────────────────────────────────────────────────────── */

const create = async (input, currentUserId) =>
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      const patient = await Patient.findByPk(input.patient_id, { transaction: t });
      if (!patient) throw ApiError.badRequest('Patient not found');

      for (const [field, label] of [
        ['referring_doctor_id', 'Referring doctor'],
        ['performing_doctor_id', 'Performing doctor'],
      ]) {
        if (input[field]) {
          // eslint-disable-next-line no-await-in-loop
          const doctor = await Doctor.findByPk(input[field], { transaction: t });
          if (!doctor) throw ApiError.badRequest(`${label} not found`);
        }
      }

      if (input.invoice_id) {
        const invoice = await Invoice.findByPk(input.invoice_id, { transaction: t });
        if (!invoice) throw ApiError.badRequest(`Invoice ${input.invoice_id} not found`);
        if (Number(invoice.patient_id) !== Number(input.patient_id)) {
          throw ApiError.badRequest('That invoice belongs to a different patient');
        }
      }

      // A study may be raised from an existing lab or radiology order, in which
      // case the source must actually exist — a dangling source_id would make the
      // study untraceable back to what was ordered and billed.
      if (input.source_type && input.source_type !== 'standalone') {
        if (!input.source_id) throw ApiError.badRequest('source_id is required when source_type is not standalone');
        const model = input.source_type === 'lab_order_item' ? LabOrderItem : RadiologyOrder;
        // eslint-disable-next-line no-await-in-loop
        const source = await model.findByPk(input.source_id, { transaction: t });
        if (!source) throw ApiError.badRequest(`${input.source_type} ${input.source_id} not found`);
      }

      if (input.modality && !modalityByKey(input.modality)) {
        throw ApiError.badRequest(`Unknown modality "${input.modality}"`);
      }

      const year = currentYear();
      const sequence = await allocateForYear('diagnostic_study', year, { transaction: t });

      const study = await repository.createStudy(
        {
          study_code: studyCode(year, sequence),
          patient_id: input.patient_id,
          category: input.category,
          modality: input.modality || null,
          test_name: input.test_name,
          source_type: input.source_type || 'standalone',
          source_id: input.source_id || null,
          invoice_id: input.invoice_id || null,
          referring_doctor_id: input.referring_doctor_id || null,
          performing_doctor_id: input.performing_doctor_id || null,
          performing_user_id: input.performing_user_id || null,
          // A new study is always ORDERED. Letting the caller choose would allow
          // an investigation to appear verified before anyone looked at it.
          status: DIAGNOSTIC_STATUS.ORDERED,
          study_datetime: input.study_datetime || new Date(),
          clinical_history: input.clinical_history || null,
          procedure_note: input.procedure_note || null,
          body_part: input.body_part || null,
          laterality: input.laterality || 'not_applicable',
          views: input.views || null,
          contrast_used: input.contrast_used ?? false,
          contrast_agent: input.contrast_agent || null,
          series_or_sequences: input.series_or_sequences || null,
          specimen: input.specimen || null,
          sample_type: input.sample_type || null,
          collection_method: input.collection_method || null,
          adequacy: input.adequacy || null,
          created_by: currentUserId || null,
        },
        { transaction: t }
      );

      return (await repository.findStudyById(study.id, { transaction: t })).toJSON();
    })
  );

const update = async (id, changes, currentUserId) =>
  sequelize.transaction(async (t) => {
    const study = await repository.lockStudyById(id, t);
    if (!study) throw ApiError.notFound('Diagnostic study not found');

    // Descriptive fields are part of the report body, so they follow the same
    // rule as the result itself.
    assertResultEditable(study);

    if (changes.modality && !modalityByKey(changes.modality)) {
      throw ApiError.badRequest(`Unknown modality "${changes.modality}"`);
    }

    const updateData = { ...changes };
    // Status, verification and finalisation are not editable here: they move only
    // through changeStatus/verify/finalise, which enforce the lifecycle.
    [
      'status',
      'verified_by',
      'verified_at',
      'finalized_by',
      'finalized_at',
      'study_code',
      'patient_id',
    ].forEach((field) => delete updateData[field]);

    updateData.performing_user_id = updateData.performing_user_id ?? currentUserId ?? study.performing_user_id;

    await repository.updateStudy(study, updateData, { transaction: t });
    return (await repository.findStudyById(id, { transaction: t })).toJSON();
  });

const remove = async (id) =>
  sequelize.transaction(async (t) => {
    const study = await repository.lockStudyById(id, t);
    if (!study) throw ApiError.notFound('Diagnostic study not found');

    // A verified or final study is a signed clinical record. It is cancelled, not
    // deleted, so the trail survives.
    if ([DIAGNOSTIC_STATUS.VERIFIED, DIAGNOSTIC_STATUS.FINAL].includes(study.status)) {
      throw ApiError.conflict(
        `Study ${study.study_code} is ${study.status} and cannot be deleted. Cancel it instead.`
      );
    }

    const attachments = await repository.countAttachments(id, { transaction: t });
    if (attachments > 0) {
      throw ApiError.conflict(
        `Study ${study.study_code} has ${attachments} attached file(s). Remove them before deleting the study.`
      );
    }

    await repository.destroyStudy(study, { transaction: t });
    return { message: 'Diagnostic study deleted' };
  });

/* ── result entry ─────────────────────────────────────────────────────────── */

/**
 * Records the structured result. Each collection is replaced wholesale when the
 * caller sends it, and left untouched when the key is absent — so a screen that
 * only edits findings cannot wipe the measurements it never loaded.
 */
const saveResult = async (id, input, currentUserId) =>
  sequelize.transaction(async (t) => {
    const study = await repository.lockStudyById(id, t);
    if (!study) throw ApiError.notFound('Diagnostic study not found');
    assertResultEditable(study);

    await applyResultPayload(study, input, currentUserId, t, { advanceStatus: true });
    return (await repository.findStudyById(id, { transaction: t })).toJSON();
  });

/**
 * Writes the result content of a study.
 *
 * Extracted so that an amendment to a finalised report goes through exactly the
 * same writer as the original entry — flags derived the same way, collections
 * replaced the same way. It performs no status checks of its own: the caller is
 * responsible for deciding that writing is permitted, either via
 * `assertResultEditable` for an open study or the FINAL check in the amendment
 * path. It must never be exposed directly to a route.
 *
 * `advanceStatus` is false for an amendment: correcting a signed report must not
 * push the study back to `result_entered`.
 */
const applyResultPayload = async (study, input, currentUserId, t, { advanceStatus = true } = {}) => {
  const id = study.id;
  {
    if (Array.isArray(input.parameters)) {
      await repository.replaceParameters(
        id,
        input.parameters.map((row) => ({
          group_label: row.group_label || null,
          parameter_name: row.parameter_name,
          result_value: row.result_value ?? null,
          result_numeric:
            row.result_numeric === undefined || row.result_numeric === null || row.result_numeric === ''
              ? null
              : Number(row.result_numeric),
          unit: row.unit || null,
          ref_range_low: row.ref_range_low ?? null,
          ref_range_high: row.ref_range_high ?? null,
          ref_range_text: row.ref_range_text || null,
          flag: deriveFlag(row),
          method: row.method || null,
          comments: row.comments || null,
          sort_order: row.sort_order,
          recorded_by: currentUserId || null,
        })),
        { transaction: t }
      );
    }

    if (Array.isArray(input.measurements)) {
      await repository.replaceMeasurements(
        id,
        input.measurements.map((row) => ({
          site: row.site || null,
          label: row.label,
          value_numeric:
            row.value_numeric === undefined || row.value_numeric === null || row.value_numeric === ''
              ? null
              : Number(row.value_numeric),
          value_text: row.value_text || null,
          unit: row.unit || null,
          normal_range: row.normal_range || null,
          laterality: row.laterality || null,
          notes: row.notes || null,
          sort_order: row.sort_order,
          recorded_by: currentUserId || null,
        })),
        { transaction: t }
      );
    }

    if (Array.isArray(input.findings)) {
      await repository.replaceFindings(
        id,
        input.findings.map((row) => ({
          section: row.section || null,
          body: row.body,
          is_abnormal: row.is_abnormal ?? false,
          sort_order: row.sort_order,
          recorded_by: currentUserId || null,
        })),
        { transaction: t }
      );
    }

    if (Array.isArray(input.organisms)) {
      await repository.replaceOrganisms(
        id,
        input.organisms.map((row) => ({
          organism_name: row.organism_name,
          culture_medium: row.culture_medium || null,
          colony_count: row.colony_count || null,
          growth: row.growth || null,
          notes: row.notes || null,
          sort_order: row.sort_order,
          sensitivities: Array.isArray(row.sensitivities)
            ? row.sensitivities.map((s) => ({
                antibiotic: s.antibiotic,
                interpretation: s.interpretation || null,
                mic: s.mic || null,
                zone_diameter_mm:
                  s.zone_diameter_mm === undefined || s.zone_diameter_mm === null || s.zone_diameter_mm === ''
                    ? null
                    : Number(s.zone_diameter_mm),
                notes: s.notes || null,
                sort_order: s.sort_order,
              }))
            : [],
        })),
        { transaction: t }
      );
    }

    const narrative = {};
    ['interpretation', 'impression', 'conclusion', 'recommendation'].forEach((field) => {
      if (input[field] !== undefined) narrative[field] = input[field] || null;
    });
    if (input.sample_collected_at !== undefined) narrative.sample_collected_at = input.sample_collected_at;

    narrative.result_at = input.result_at || study.result_at || new Date();
    narrative.performing_user_id = study.performing_user_id || currentUserId || null;

    // Recording a result moves an open study forward, but never backwards: a study
    // already under review stays under review.
    if (
      advanceStatus &&
      [DIAGNOSTIC_STATUS.ORDERED, DIAGNOSTIC_STATUS.SAMPLE_COLLECTED, DIAGNOSTIC_STATUS.PROCESSING].includes(
        study.status
      )
    ) {
      narrative.status = DIAGNOSTIC_STATUS.RESULT_ENTERED;
    }

    await repository.updateStudy(study, narrative, { transaction: t });
  }
};

/* ── lifecycle ────────────────────────────────────────────────────────────── */

const changeStatus = async (id, input, currentUserId) =>
  sequelize.transaction(async (t) => {
    const study = await repository.lockStudyById(id, t);
    if (!study) throw ApiError.notFound('Diagnostic study not found');

    const target = input.status;
    assertTransition(study.status, target);

    if (target === DIAGNOSTIC_STATUS.CANCELLED && !input.reason) {
      throw ApiError.badRequest('A reason is required to cancel a study');
    }

    // Verification and finalisation have their own endpoints because they attach
    // a person to the record; routing them through here would lose that.
    if ([DIAGNOSTIC_STATUS.VERIFIED, DIAGNOSTIC_STATUS.FINAL].includes(target)) {
      throw ApiError.badRequest(
        `Use POST /diagnostics/${id}/${target === DIAGNOSTIC_STATUS.VERIFIED ? 'verify' : 'finalise'} for that transition.`
      );
    }

    const changes = { status: target };
    if (target === DIAGNOSTIC_STATUS.CANCELLED) changes.cancelled_reason = input.reason;
    if (target === DIAGNOSTIC_STATUS.SAMPLE_COLLECTED) {
      changes.sample_collected_at = input.sample_collected_at || new Date();
      changes.performing_user_id = study.performing_user_id || currentUserId || null;
    }

    await repository.updateStudy(study, changes, { transaction: t });
    return (await repository.findStudyById(id, { transaction: t })).toJSON();
  });

/**
 * The specialist signs off. Refused unless a result exists, so nothing empty can
 * be verified, and the verifier is recorded from the session rather than the body.
 */
const verify = async (id, currentUserId) =>
  sequelize.transaction(async (t) => {
    const locked = await repository.lockStudyById(id, t);
    if (!locked) throw ApiError.notFound('Diagnostic study not found');
    assertTransition(locked.status, DIAGNOSTIC_STATUS.VERIFIED);

    const full = await repository.findStudyById(id, { transaction: t });
    if (!hasRecordedResult(full)) {
      throw ApiError.badRequest(
        `Study ${locked.study_code} has no recorded result, findings or impression, so it cannot be verified.`
      );
    }

    await repository.updateStudy(
      locked,
      { status: DIAGNOSTIC_STATUS.VERIFIED, verified_by: currentUserId || null, verified_at: new Date() },
      { transaction: t }
    );
    return (await repository.findStudyById(id, { transaction: t })).toJSON();
  });

/**
 * Finalisation issues the report. Only reachable from VERIFIED — enforced by the
 * transition table, so no caller can shortcut it — and it creates the report row
 * carrying the number, template and signatory.
 */
const finalise = async (id, currentUserId) =>
  withCodeRetry(async () =>
    sequelize.transaction(async (t) => {
      const study = await repository.lockStudyById(id, t);
      if (!study) throw ApiError.notFound('Diagnostic study not found');
      assertTransition(study.status, DIAGNOSTIC_STATUS.FINAL);

      const year = currentYear();
      let report = await repository.findReportByStudy(id, { transaction: t });
      if (!report) {
        const sequence = await allocateForYear('diagnostic_report', year, { transaction: t });
        report = await repository.createReport(
          {
            study_id: id,
            report_number: reportNumber(year, sequence),
            template_key: templateFor(study.category, study.modality),
            status: 'final',
            generated_by: currentUserId || null,
            generated_at: new Date(),
            verified_by: study.verified_by,
            verified_at: study.verified_at,
          },
          { transaction: t }
        );
      } else {
        await repository.updateReport(
          report,
          {
            status: 'final',
            generated_by: currentUserId || null,
            generated_at: new Date(),
            verified_by: study.verified_by,
            verified_at: study.verified_at,
          },
          { transaction: t }
        );
      }

      await repository.updateStudy(
        study,
        { status: DIAGNOSTIC_STATUS.FINAL, finalized_by: currentUserId || null, finalized_at: new Date() },
        { transaction: t }
      );

      // The report content becomes permanent here. The snapshot is taken after the
      // study is marked final so it records the signed state, and inside the same
      // transaction so a report can never exist without its first version.
      const finalised = await repository.findStudyById(id, { transaction: t });
      const existingVersion = await repository.findCurrentVersion(report.id, { transaction: t });
      if (!existingVersion) {
        // eslint-disable-next-line global-require
        const versions = require('./diagnostics.versions.service');
        await versions.captureFinalVersion(finalised, report, currentUserId, t);
      }

      return (await repository.findStudyById(id, { transaction: t })).toJSON();
    })
  );

module.exports = {
  list,
  getById,
  historyForPatient,
  getMeta,
  create,
  update,
  remove,
  saveResult,
  changeStatus,
  verify,
  finalise,
  // internal: shared by saveResult and the amendment path, not routed directly
  applyResultPayload,
  // exported for the report/PDF layer and tests
  templateFor,
  hasRecordedResult,
  deriveFlag,
};
