'use strict';

// Diagnostic / investigation catalogue and report lifecycle.
//
// Kept in its own file rather than swelling config/constants.js, and referenced
// by the migration, the models, the validation schemas and the report templates
// so the category list has exactly one definition.
//
// The existing Pathology and Radiology modules are NOT replaced. A diagnostic
// study links back to the `lab_order_items` or `radiology_orders` row it came
// from, so ordering, billing and the existing bill-record screens keep working
// untouched; the study adds the clinical layer they never had (structured
// results, measurements, findings, impression, attachments, verified report).
// The other categories have no existing module, so their studies stand alone.

/** Top-level categories, in the order they should appear in the UI. */
const DIAGNOSTIC_CATEGORIES = Object.freeze({
  LABORATORY: 'laboratory',
  RADIOLOGY: 'radiology',
  CARDIOLOGY: 'cardiology',
  HISTOPATHOLOGY: 'histopathology',
  MICROBIOLOGY: 'microbiology',
  CYTOLOGY: 'cytology',
  OPHTHALMOLOGY: 'ophthalmology',
  ENT: 'ent',
  DENTAL: 'dental',
  PULMONARY: 'pulmonary',
  SPECIALIZED: 'specialized',
});
const DIAGNOSTIC_CATEGORY_VALUES = Object.values(DIAGNOSTIC_CATEGORIES);

/**
 * Modalities within a category. `null` parent means the category itself is the
 * modality. Each entry carries the report template that renders it and the
 * source module it reuses, if any.
 */
const DIAGNOSTIC_MODALITIES = Object.freeze([
  // ── Laboratory / Pathology ────────────────────────────────────────────────
  { key: 'laboratory', category: 'laboratory', label: 'Laboratory / Pathology', template: 'laboratory', source: 'lab_order_item' },

  // ── Radiology ─────────────────────────────────────────────────────────────
  { key: 'xray', category: 'radiology', label: 'X-Ray', template: 'radiology', source: 'radiology_order' },
  { key: 'ultrasonography', category: 'radiology', label: 'Ultrasonography', template: 'ultrasonography', source: 'radiology_order' },
  { key: 'ct', category: 'radiology', label: 'CT Scan', template: 'crosssectional', source: 'radiology_order' },
  { key: 'mri', category: 'radiology', label: 'MRI', template: 'crosssectional', source: 'radiology_order' },
  { key: 'doppler', category: 'radiology', label: 'Doppler', template: 'doppler', source: 'radiology_order' },
  { key: 'mammography', category: 'radiology', label: 'Mammography', template: 'mammography', source: 'radiology_order' },

  // ── Cardiology ────────────────────────────────────────────────────────────
  { key: 'ecg', category: 'cardiology', label: 'ECG', template: 'cardiology', source: null },
  { key: 'echocardiogram', category: 'cardiology', label: 'Echocardiogram', template: 'cardiology', source: null },
  { key: 'tmt', category: 'cardiology', label: 'TMT / Stress Test', template: 'cardiology', source: null },
  { key: 'holter', category: 'cardiology', label: 'Holter', template: 'cardiology', source: null },
  { key: 'abpm', category: 'cardiology', label: 'ABPM', template: 'cardiology', source: null },
  { key: 'cardiac_biomarkers', category: 'cardiology', label: 'Cardiac Biomarkers', template: 'laboratory', source: null },

  // ── Histopathology / Microbiology / Cytology ──────────────────────────────
  { key: 'histopathology', category: 'histopathology', label: 'Histopathology', template: 'histopathology', source: null },
  { key: 'microbiology', category: 'microbiology', label: 'Microbiology / Culture', template: 'microbiology', source: null },
  { key: 'cytology', category: 'cytology', label: 'Cytology', template: 'cytology', source: null },

  // ── Ophthalmology ─────────────────────────────────────────────────────────
  { key: 'visual_acuity', category: 'ophthalmology', label: 'Visual Acuity', template: 'ophthalmology', source: null },
  { key: 'iop', category: 'ophthalmology', label: 'Intraocular Pressure', template: 'ophthalmology', source: null },
  { key: 'refraction', category: 'ophthalmology', label: 'Refraction', template: 'ophthalmology', source: null },
  { key: 'fundus', category: 'ophthalmology', label: 'Fundus Examination', template: 'ophthalmology', source: null },
  { key: 'oct', category: 'ophthalmology', label: 'OCT', template: 'ophthalmology', source: null },
  { key: 'visual_field', category: 'ophthalmology', label: 'Visual Field', template: 'ophthalmology', source: null },
  { key: 'slit_lamp', category: 'ophthalmology', label: 'Slit Lamp', template: 'ophthalmology', source: null },

  // ── ENT ───────────────────────────────────────────────────────────────────
  { key: 'audiometry', category: 'ent', label: 'Audiometry', template: 'ent', source: null },
  { key: 'tympanometry', category: 'ent', label: 'Tympanometry', template: 'ent', source: null },
  { key: 'oae', category: 'ent', label: 'OAE', template: 'ent', source: null },
  { key: 'bera', category: 'ent', label: 'BERA', template: 'ent', source: null },
  { key: 'endoscopy', category: 'ent', label: 'Endoscopy', template: 'ent', source: null },
  { key: 'laryngoscopy', category: 'ent', label: 'Laryngoscopy', template: 'ent', source: null },

  // ── Dental ────────────────────────────────────────────────────────────────
  { key: 'dental_xray', category: 'dental', label: 'Dental X-Ray', template: 'dental', source: null },
  { key: 'opg', category: 'dental', label: 'OPG', template: 'dental', source: null },
  { key: 'cbct', category: 'dental', label: 'CBCT', template: 'dental', source: null },
  { key: 'intraoral', category: 'dental', label: 'Intraoral Images', template: 'dental', source: null },
  { key: 'clinical_photos', category: 'dental', label: 'Clinical Photographs', template: 'dental', source: null },

  // ── Pulmonary ─────────────────────────────────────────────────────────────
  { key: 'spirometry', category: 'pulmonary', label: 'Spirometry', template: 'pulmonary', source: null },
  { key: 'pft', category: 'pulmonary', label: 'Pulmonary Function Test', template: 'pulmonary', source: null },
  { key: 'peak_flow', category: 'pulmonary', label: 'Peak Flow', template: 'pulmonary', source: null },
  { key: 'bronchoscopy', category: 'pulmonary', label: 'Bronchoscopy', template: 'pulmonary', source: null },

  // ── Specialized / Molecular ───────────────────────────────────────────────
  { key: 'molecular', category: 'specialized', label: 'Molecular / Specialized', template: 'specialized', source: null },
]);

const MODALITY_KEYS = Object.freeze(DIAGNOSTIC_MODALITIES.map((m) => m.key));
const modalityByKey = (key) => DIAGNOSTIC_MODALITIES.find((m) => m.key === key) || null;
const modalitiesForCategory = (category) => DIAGNOSTIC_MODALITIES.filter((m) => m.category === category);

const REPORT_TEMPLATES = Object.freeze([
  ...new Set(DIAGNOSTIC_MODALITIES.map((m) => m.template)),
]);

/**
 * Report lifecycle. A study advances through these; `CANCELLED` is reachable
 * from any non-final state.
 *
 * FINAL is deliberately NOT a status a user can pick: it is only reached from
 * VERIFIED, because a report that has not been verified by the responsible
 * specialist must never be presentable as final. See STATUS_TRANSITIONS.
 */
const DIAGNOSTIC_STATUS = Object.freeze({
  ORDERED: 'ordered',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  RESULT_ENTERED: 'result_entered',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  FINAL: 'final',
  CANCELLED: 'cancelled',
});
const DIAGNOSTIC_STATUS_VALUES = Object.values(DIAGNOSTIC_STATUS);

/** Allowed next states. Anything not listed here is rejected by the service. */
const STATUS_TRANSITIONS = Object.freeze({
  ordered: ['sample_collected', 'processing', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['result_entered', 'cancelled'],
  result_entered: ['under_review', 'processing', 'cancelled'],
  under_review: ['verified', 'result_entered', 'cancelled'],
  verified: ['final', 'under_review'],
  final: [],
  cancelled: [],
});

/** States in which a result may still be edited. */
const RESULT_EDITABLE_STATUSES = Object.freeze([
  DIAGNOSTIC_STATUS.ORDERED,
  DIAGNOSTIC_STATUS.SAMPLE_COLLECTED,
  DIAGNOSTIC_STATUS.PROCESSING,
  DIAGNOSTIC_STATUS.RESULT_ENTERED,
  DIAGNOSTIC_STATUS.UNDER_REVIEW,
]);

/** A study must carry a result before it can be reviewed or verified. */
const STATUSES_REQUIRING_RESULT = Object.freeze([
  DIAGNOSTIC_STATUS.RESULT_ENTERED,
  DIAGNOSTIC_STATUS.UNDER_REVIEW,
  DIAGNOSTIC_STATUS.VERIFIED,
  DIAGNOSTIC_STATUS.FINAL,
]);

/** Abnormality flags for a structured result line. */
const RESULT_FLAGS = Object.freeze({
  NORMAL: 'normal',
  LOW: 'low',
  HIGH: 'high',
  CRITICAL_LOW: 'critical_low',
  CRITICAL_HIGH: 'critical_high',
  ABNORMAL: 'abnormal',
  INCONCLUSIVE: 'inconclusive',
});
const RESULT_FLAG_VALUES = Object.values(RESULT_FLAGS);

/** What an attachment represents, so the viewer can pick how to render it. */
const ATTACHMENT_KINDS = Object.freeze({
  IMAGE: 'image',
  DICOM: 'dicom',
  PDF: 'pdf',
  VIDEO: 'video',
  AUDIO: 'audio',
  WAVEFORM: 'waveform',
  DOCUMENT: 'document',
  ORIGINAL_REPORT: 'original_report',
  GENERATED_REPORT: 'generated_report',
});
const ATTACHMENT_KIND_VALUES = Object.values(ATTACHMENT_KINDS);

/** Laterality, used by mammography, ophthalmology, ENT and limb imaging. */
const LATERALITY = Object.freeze(['left', 'right', 'bilateral', 'not_applicable']);

module.exports = {
  DIAGNOSTIC_CATEGORIES,
  DIAGNOSTIC_CATEGORY_VALUES,
  DIAGNOSTIC_MODALITIES,
  MODALITY_KEYS,
  modalityByKey,
  modalitiesForCategory,
  REPORT_TEMPLATES,
  DIAGNOSTIC_STATUS,
  DIAGNOSTIC_STATUS_VALUES,
  STATUS_TRANSITIONS,
  RESULT_EDITABLE_STATUSES,
  STATUSES_REQUIRING_RESULT,
  RESULT_FLAGS,
  RESULT_FLAG_VALUES,
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_VALUES,
  LATERALITY,
};
