'use strict';

const Joi = require('joi');
const {
  DIAGNOSTIC_CATEGORY_VALUES,
  DIAGNOSTIC_STATUS_VALUES,
  MODALITY_KEYS,
  RESULT_FLAG_VALUES,
  ATTACHMENT_KIND_VALUES,
  LATERALITY,
} = require('../../config/diagnostics');

const idParam = { params: Joi.object({ id: Joi.number().integer().positive().required() }) };

const listQuery = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200),
    patient_id: Joi.number().integer().positive(),
    category: Joi.string().valid(...DIAGNOSTIC_CATEGORY_VALUES),
    modality: Joi.string().valid(...MODALITY_KEYS),
    status: Joi.string().valid(...DIAGNOSTIC_STATUS_VALUES),
    referring_doctor_id: Joi.number().integer().positive(),
    performing_doctor_id: Joi.number().integer().positive(),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150).allow(''),
  }),
};

const patientHistory = {
  params: Joi.object({ patientId: Joi.number().integer().positive().required() }),
  query: listQuery.query,
};

/** Fields describing the study itself, shared by create and update. */
const studyFields = {
  category: Joi.string().valid(...DIAGNOSTIC_CATEGORY_VALUES),
  modality: Joi.string().valid(...MODALITY_KEYS).allow(null, ''),
  test_name: Joi.string().min(1).max(255),
  referring_doctor_id: Joi.number().integer().positive().allow(null),
  performing_doctor_id: Joi.number().integer().positive().allow(null),
  invoice_id: Joi.number().integer().positive().allow(null),
  study_datetime: Joi.date().iso(),
  clinical_history: Joi.string().max(5000).allow('', null),
  procedure_note: Joi.string().max(5000).allow('', null),
  body_part: Joi.string().max(120).allow('', null),
  laterality: Joi.string().valid(...LATERALITY).allow(null),
  views: Joi.string().max(255).allow('', null),
  contrast_used: Joi.boolean(),
  contrast_agent: Joi.string().max(180).allow('', null),
  series_or_sequences: Joi.string().max(5000).allow('', null),
  specimen: Joi.string().max(255).allow('', null),
  sample_type: Joi.string().max(120).allow('', null),
  collection_method: Joi.string().max(180).allow('', null),
  adequacy: Joi.string().max(180).allow('', null),
};

const create = {
  body: Joi.object({
    ...studyFields,
    patient_id: Joi.number().integer().positive().required(),
    category: studyFields.category.required(),
    test_name: studyFields.test_name.required(),
    source_type: Joi.string().valid('lab_order_item', 'radiology_order', 'standalone').default('standalone'),
    source_id: Joi.number().integer().positive().allow(null),
    // The lifecycle owns these; accepting them here would let a caller create a
    // study that is already verified.
    status: Joi.forbidden().messages({
      'any.unknown': 'A new study always starts as "ordered"; status cannot be set on creation.',
    }),
    verified_by: Joi.forbidden(),
    verified_at: Joi.forbidden(),
    finalized_by: Joi.forbidden(),
    finalized_at: Joi.forbidden(),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    ...studyFields,
    status: Joi.forbidden().messages({
      'any.unknown': 'Use PATCH /diagnostics/:id/status, /verify or /finalise to move a study.',
    }),
    verified_by: Joi.forbidden(),
    verified_at: Joi.forbidden(),
    finalized_by: Joi.forbidden(),
    finalized_at: Joi.forbidden(),
    study_code: Joi.forbidden(),
    patient_id: Joi.forbidden().messages({
      'any.unknown': 'A study cannot be moved to a different patient.',
    }),
  }).min(1),
};

const parameter = Joi.object({
  group_label: Joi.string().max(150).allow('', null),
  parameter_name: Joi.string().min(1).max(200).required(),
  result_value: Joi.string().max(255).allow('', null),
  result_numeric: Joi.number().allow(null, ''),
  unit: Joi.string().max(60).allow('', null),
  ref_range_low: Joi.number().allow(null, ''),
  ref_range_high: Joi.number().allow(null, ''),
  ref_range_text: Joi.string().max(180).allow('', null),
  flag: Joi.string().valid(...RESULT_FLAG_VALUES).allow(null, ''),
  method: Joi.string().max(180).allow('', null),
  comments: Joi.string().max(2000).allow('', null),
  sort_order: Joi.number().integer().min(0),
});

const measurement = Joi.object({
  site: Joi.string().max(150).allow('', null),
  label: Joi.string().min(1).max(180).required(),
  value_numeric: Joi.number().allow(null, ''),
  value_text: Joi.string().max(180).allow('', null),
  unit: Joi.string().max(60).allow('', null),
  normal_range: Joi.string().max(180).allow('', null),
  laterality: Joi.string().valid(...LATERALITY).allow(null, ''),
  notes: Joi.string().max(2000).allow('', null),
  sort_order: Joi.number().integer().min(0),
});

const finding = Joi.object({
  section: Joi.string().max(180).allow('', null),
  body: Joi.string().min(1).max(20000).required(),
  is_abnormal: Joi.boolean(),
  sort_order: Joi.number().integer().min(0),
});

const sensitivity = Joi.object({
  antibiotic: Joi.string().min(1).max(180).required(),
  interpretation: Joi.string().max(60).allow('', null),
  mic: Joi.string().max(60).allow('', null),
  zone_diameter_mm: Joi.number().allow(null, ''),
  notes: Joi.string().max(1000).allow('', null),
  sort_order: Joi.number().integer().min(0),
});

const organism = Joi.object({
  organism_name: Joi.string().min(1).max(200).required(),
  culture_medium: Joi.string().max(180).allow('', null),
  colony_count: Joi.string().max(120).allow('', null),
  growth: Joi.string().max(120).allow('', null),
  notes: Joi.string().max(2000).allow('', null),
  sort_order: Joi.number().integer().min(0),
  sensitivities: Joi.array().items(sensitivity),
});

const saveResult = {
  params: idParam.params,
  body: Joi.object({
    parameters: Joi.array().items(parameter),
    measurements: Joi.array().items(measurement),
    findings: Joi.array().items(finding),
    organisms: Joi.array().items(organism),
    interpretation: Joi.string().max(20000).allow('', null),
    impression: Joi.string().max(20000).allow('', null),
    conclusion: Joi.string().max(20000).allow('', null),
    recommendation: Joi.string().max(20000).allow('', null),
    sample_collected_at: Joi.date().iso().allow(null),
    result_at: Joi.date().iso(),
  }).min(1),
};

const changeStatus = {
  params: idParam.params,
  body: Joi.object({
    // verified/final are excluded: they run through their own endpoints so the
    // signatory is taken from the session rather than the request body.
    status: Joi.string()
      .valid('sample_collected', 'processing', 'result_entered', 'under_review', 'cancelled')
      .required()
      .messages({
        'any.only':
          'status must be one of sample_collected, processing, result_entered, under_review, cancelled. ' +
          'Use /verify or /finalise for verification and finalisation.',
      }),
    reason: Joi.string().max(500).allow('', null),
    sample_collected_at: Joi.date().iso(),
  }),
};

/**
 * An amendment carries the correction itself plus the reason for it. The reason is
 * required and substantive: "why" is part of the medical record, not a formality,
 * so a one-word entry is rejected.
 */
const amend = {
  params: idParam.params,
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(1000).required().messages({
      'string.min': 'Explain the correction in at least 10 characters; it is stored with the amendment.',
      'any.required': 'An amendment reason is required.',
    }),
    parameters: Joi.array().items(parameter),
    measurements: Joi.array().items(measurement),
    findings: Joi.array().items(finding),
    organisms: Joi.array().items(organism),
    interpretation: Joi.string().max(20000).allow('', null),
    impression: Joi.string().max(20000).allow('', null),
    conclusion: Joi.string().max(20000).allow('', null),
    recommendation: Joi.string().max(20000).allow('', null),
    // The signed study itself is not re-datable through an amendment.
    result_at: Joi.forbidden(),
    sample_collected_at: Joi.forbidden(),
  })
    .min(2)
    .messages({
      'object.min': 'An amendment must change something: send the corrected content alongside the reason.',
    }),
};

const reportPdf = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    versionNo: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string().valid('current'))
      .default('current'),
  }),
  query: Joi.object({ download: Joi.boolean() }),
};

const versionParams = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    // `current` is accepted so a viewer can ask for the version in force without
    // first reading the chain to discover its number.
    versionNo: Joi.alternatives()
      .try(Joi.number().integer().positive(), Joi.string().valid('current'))
      .required(),
  }),
};

const fileParams = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    fileId: Joi.number().integer().positive().required(),
  }),
};

/**
 * Multipart bodies arrive as strings, so `captions` may come through as a single
 * value or an array. Both are accepted.
 */
const uploadFiles = {
  params: idParam.params,
  body: Joi.object({
    kind: Joi.string().valid(...ATTACHMENT_KIND_VALUES),
    caption: Joi.string().max(500).allow(''),
    captions: Joi.alternatives().try(
      Joi.array().items(Joi.string().max(500).allow('')),
      Joi.string().max(500).allow('')
    ),
    series_id: Joi.number().integer().positive(),
  }).unknown(false),
};

const listFiles = {
  params: idParam.params,
  query: Joi.object({ current_only: Joi.boolean() }),
};

const downloadFile = {
  params: fileParams.params,
  query: Joi.object({ download: Joi.boolean(), verify: Joi.boolean() }),
};

const replaceFile = {
  params: fileParams.params,
  body: Joi.object({
    caption: Joi.string().max(500).allow(''),
    reason: Joi.string().max(500).allow(''),
  }).unknown(false),
};

module.exports = {
  list: listQuery,
  getById: idParam,
  patientHistory,
  create,
  update,
  remove: idParam,
  saveResult,
  changeStatus,
  verify: idParam,
  finalise: idParam,
  amend,
  listVersions: idParam,
  getVersion: versionParams,
  reportPdf,
  uploadFiles,
  listFiles,
  downloadFile,
  replaceFile,
  removeFile: fileParams,
  verifyFiles: idParam,
};
