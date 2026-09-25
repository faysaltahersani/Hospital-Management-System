'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./emr.controller');
const schemas = require('./emr.validation');

const router = Router();
const CLINICAL = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PATHOLOGIST, ROLES.RADIOLOGIST, ROLES.OT_STAFF, ROLES.ANESTHETIST, ROLES.ICU_STAFF];
const EMR_AUDIT_ENTITY = Object.freeze({
  allergies: 'patient_allergy',
  problems: 'patient_problem',
  histories: 'patient_history',
  vitals: 'vital_sign',
  notes: 'clinical_note',
});
const emrAuditEntity = (req) => EMR_AUDIT_ENTITY[req.params.recordType] || 'emr_record';

router.use(authenticate);
router.use(authorize(CLINICAL));

router.get('/patients/:patientId/summary', validate(schemas.summary), controller.summary);
router.get('/patients/:patientId/:recordType', validate(schemas.list), controller.list);
router.post('/patients/:patientId/:recordType', validate(schemas.create), audit('create', emrAuditEntity), controller.create);
router.patch('/:recordType/:id', validate(schemas.update), audit('update', emrAuditEntity), controller.update);
router.delete('/:recordType/:id', validate(schemas.remove), audit('delete', emrAuditEntity), controller.remove);

module.exports = router;
