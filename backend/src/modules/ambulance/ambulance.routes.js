'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./ambulance.controller');
const schemas = require('./ambulance.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR];

// Call Entry & Meta
router.get('/call-entry/meta', authorize(STAFF), controller.getCallEntryMeta);
// BUG-021 — these two were requested by the Call Ambulance Record page but never
// existed; the catch-all answered the list with an empty 200 and the payment
// with a 404.
router.get('/calls/list', authorize(STAFF), controller.listCalls);
router.post(
  '/calls/:id/payments',
  authorize([ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.ACCOUNTANT]),
  audit('create', 'ambulance_call_payment'),
  controller.addCallPayment
);
router.post('/calls', authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]), controller.createCall);
router.patch('/calls/:id', authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]), controller.updateCall);
router.delete('/calls/:id', authorize(ROLES.ADMIN), controller.removeCall);
router.post('/symptom-types', authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]), controller.createSymptomType);
router.post('/symptom-heads', authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]), controller.createSymptomHead);

// Trips
router.get('/trips/list', authorize(STAFF), validate(schemas.listTrips), controller.listTrips);
router.get('/trips/:id', authorize(STAFF), validate(schemas.getTrip), controller.getTrip);
router.post(
  '/trips',
  authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  validate(schemas.dispatchTrip),
  audit('create', 'ambulance_trip'),
  controller.dispatchTrip
);
router.patch(
  '/trips/:id/complete',
  authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  validate(schemas.completeTrip),
  audit('update', 'ambulance_trip'),
  controller.completeTrip
);
router.patch(
  '/trips/:id/cancel',
  authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  validate(schemas.cancelTrip),
  audit('update', 'ambulance_trip'),
  controller.cancelTrip
);
router.patch(
  '/trips/:id',
  authorize([ROLES.ADMIN, ROLES.RECEPTIONIST]),
  validate(schemas.updateTrip),
  audit('update', 'ambulance_trip'),
  controller.updateTrip
);
router.delete(
  '/trips/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeTrip),
  audit('delete', 'ambulance_trip'),
  controller.removeTrip
);

// Ambulances
router.get('/', authorize(STAFF), validate(schemas.listAmbulances), controller.listAmbulances);
router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(schemas.createAmbulance),
  audit('create', 'ambulance'),
  controller.createAmbulance
);
router.get('/:id', authorize(STAFF), validate(schemas.getAmbulance), controller.getAmbulance);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.updateAmbulance),
  audit('update', 'ambulance'),
  controller.updateAmbulance
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeAmbulance),
  audit('delete', 'ambulance'),
  controller.removeAmbulance
);

module.exports = router;
