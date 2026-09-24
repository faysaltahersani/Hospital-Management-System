'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const { uploadMedicalFiles, uploadSingleMedicalFile } = require('../../middlewares/medicalUpload.middleware');
const controller = require('./diagnostics.controller');
const schemas = require('./diagnostics.validation');

const router = Router();

router.use(authenticate);

/** Anyone who works with investigations may read them. */
const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECH, ROLES.RECEPTIONIST];

/** Ordering and recording a result: clinicians and technicians. */
const RECORDERS = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.LAB_TECH, ROLES.NURSE];

/**
 * Verification and finalisation are the clinician's signature on a diagnosis, so
 * they are restricted to the roles qualified to give it. A technician can record a
 * result but cannot sign it off — that separation is the point of the workflow.
 */
const VERIFIERS = [ROLES.ADMIN, ROLES.DOCTOR];

router.get('/meta', authorize(STAFF), controller.getMeta);

router.get(
  '/patient/:patientId/history',
  authorize(STAFF),
  validate(schemas.patientHistory),
  controller.patientHistory
);

router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(RECORDERS),
  validate(schemas.create),
  audit('create', 'diagnostic_study'),
  controller.create
);

router.patch(
  '/:id',
  authorize(RECORDERS),
  validate(schemas.update),
  audit('update', 'diagnostic_study'),
  controller.update
);

router.put(
  '/:id/result',
  authorize(RECORDERS),
  validate(schemas.saveResult),
  audit('update', 'diagnostic_result'),
  controller.saveResult
);

router.patch(
  '/:id/status',
  authorize(RECORDERS),
  validate(schemas.changeStatus),
  audit('update', 'diagnostic_status'),
  controller.changeStatus
);

router.post(
  '/:id/verify',
  authorize(VERIFIERS),
  validate(schemas.verify),
  audit('update', 'diagnostic_verification'),
  controller.verify
);

router.post(
  '/:id/finalise',
  authorize(VERIFIERS),
  validate(schemas.finalise),
  audit('update', 'diagnostic_report'),
  controller.finalise
);

/* ── report versions ───────────────────────────────────────────────────────── */

// Reading the version chain is how a clinician sees that a report was corrected,
// so it is open to everyone who can read the report itself.
router.get(
  '/:id/versions',
  authorize(STAFF),
  validate(schemas.listVersions),
  controller.listVersions
);

router.get(
  '/:id/versions/:versionNo',
  authorize(STAFF),
  validate(schemas.getVersion),
  audit('view', 'diagnostic_report_version'),
  controller.getVersion
);

// Rendering the PDF of a signed report is a read, and it is audited like any other
// look at a patient's record. `versionNo` accepts `current`.
router.get(
  '/:id/versions/:versionNo/pdf',
  authorize(STAFF),
  validate(schemas.reportPdf),
  audit('view', 'diagnostic_report_pdf'),
  controller.reportPdf
);

// Amending a signed report is a clinical act, restricted to the roles that could
// have signed it in the first place.
router.post(
  '/:id/amend',
  authorize(VERIFIERS),
  validate(schemas.amend),
  audit('update', 'diagnostic_report_amendment'),
  controller.amend
);

/* ── files: images, original uploads and generated reports ─────────────────── */

router.get(
  '/:id/files',
  authorize(STAFF),
  validate(schemas.listFiles),
  controller.listFiles
);

// Viewing a patient's medical image is itself an auditable event, which is why the
// audit middleware is attached to a GET here.
router.get(
  '/:id/files/:fileId/download',
  authorize(STAFF),
  validate(schemas.downloadFile),
  audit('view', 'diagnostic_file'),
  controller.downloadFile
);

router.get(
  '/:id/files/verify',
  authorize(VERIFIERS),
  validate(schemas.verifyFiles),
  controller.verifyFiles
);

// Multer runs before validation because the body is multipart and does not exist
// as parsed fields until it has.
router.post(
  '/:id/files',
  authorize(RECORDERS),
  uploadMedicalFiles,
  validate(schemas.uploadFiles),
  audit('create', 'diagnostic_file'),
  controller.uploadFiles
);

router.post(
  '/:id/files/:fileId/replace',
  authorize(RECORDERS),
  uploadSingleMedicalFile,
  validate(schemas.replaceFile),
  audit('update', 'diagnostic_file'),
  controller.replaceFile
);

router.delete(
  '/:id/files/:fileId',
  authorize(RECORDERS),
  validate(schemas.removeFile),
  audit('delete', 'diagnostic_file'),
  controller.removeFile
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'diagnostic_study'),
  controller.remove
);

module.exports = router;
