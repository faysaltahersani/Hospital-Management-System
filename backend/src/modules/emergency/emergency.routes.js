'use strict';

const { Router } = require('express');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { requirePermissionKey } = require('../../middlewares/permission.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./emergency.controller');
const schemas = require('./emergency.validation');

const router = Router();
const ADMIN = [ROLES.ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.BRANCH_ADMIN];
const READERS = [...ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.ICU_STAFF, ROLES.AMBULANCE_STAFF];
const REGISTRATION = [...ADMIN, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.AMBULANCE_STAFF];
const CLINICAL = [...ADMIN, ROLES.DOCTOR];
const NURSING = [...ADMIN, ROLES.NURSE, ROLES.DOCTOR];
const permission = (key, action) => requirePermissionKey(`emergency_${key}`, action);

router.get('/meta', authorize(READERS), permission('dashboard', 'read'), controller.getMeta);
router.get('/dashboard', authorize(READERS), permission('dashboard', 'read'), controller.dashboard);
router.get('/reports/summary', authorize(READERS), permission('reports', 'read'), validate(schemas.report), controller.report);
router.get('/encounters', authorize(READERS), permission('patient_list', 'read'), validate(schemas.list), controller.list);
router.post('/encounters', authorize(REGISTRATION), permission('emergency_registration', 'create'), validate(schemas.register), audit('create', 'emergency_encounter'), controller.register);
router.get('/encounters/:id', authorize(READERS), permission('emergency_encounter', 'read'), validate(schemas.getById), controller.getById);

router.post('/encounters/:encounterId/triage', authorize(NURSING), permission('triage', 'create'), validate(schemas.triage), audit('create', 'emergency_triage'), controller.triage);
router.patch('/triages/:id', authorize(NURSING), permission('triage', 'update'), validate(schemas.updateTriage), audit('update', 'emergency_triage'), controller.updateTriage);
router.post('/encounters/:encounterId/assign-doctor', authorize(REGISTRATION), permission('doctor_assignment', 'create'), validate(schemas.assignDoctor), audit('create', 'emergency_doctor_assignment'), controller.assignDoctor);
router.post('/encounters/:encounterId/assessments', authorize(CLINICAL), permission('assessment', 'create'), validate(schemas.assessment), audit('create', 'emergency_assessment'), controller.assessment);
router.patch('/assessments/:id', authorize(CLINICAL), permission('assessment', 'update'), validate(schemas.updateAssessment), audit('update', 'emergency_assessment'), controller.updateAssessment);

router.get('/encounters/:encounterId/orders', authorize(READERS), permission('orders', 'read'), validate(schemas.encounterParam), controller.getOrders);
router.post('/encounters/:encounterId/orders/laboratory', authorize(CLINICAL), permission('lab_orders', 'create'), validate(schemas.labOrder), audit('create', 'emergency_order'), controller.addLabOrder);
router.post('/encounters/:encounterId/orders/radiology', authorize(CLINICAL), permission('radiology_orders', 'create'), validate(schemas.radiologyOrder), audit('create', 'emergency_order'), controller.addRadiologyOrder);
router.post('/encounters/:encounterId/orders/medication', authorize(CLINICAL), permission('medication', 'create'), validate(schemas.medicationOrder), audit('create', 'emergency_order'), controller.addMedicationOrder);
router.post('/encounters/:encounterId/procedures', authorize(NURSING), permission('procedures', 'create'), validate(schemas.procedure), audit('create', 'emergency_procedure'), controller.addProcedure);
router.patch('/procedures/:id/status', authorize(NURSING), permission('procedures', 'update'), validate(schemas.procedureStatus), audit('update', 'emergency_procedure'), controller.updateProcedureStatus);

router.get('/encounters/:encounterId/billing', authorize(READERS), permission('billing', 'read'), validate(schemas.encounterParam), controller.getBilling);
router.post('/encounters/:encounterId/observations', authorize(NURSING), permission('observation', 'create'), validate(schemas.observation), audit('create', 'emergency_observation'), controller.assignObservation);
router.post('/observations/:id/release', authorize(NURSING), permission('observation', 'update'), validate(schemas.releaseObservation), audit('update', 'emergency_observation'), controller.releaseObservation);
router.post('/encounters/:encounterId/disposition', authorize(CLINICAL), permission('disposition', 'create'), validate(schemas.disposition), audit('create', 'emergency_disposition'), controller.disposition);

module.exports = router;

