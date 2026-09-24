'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./reports.controller');
const schemas = require('./reports.validation');

const router = Router();

router.use(authenticate);

const STAFF = [
  ROLES.ADMIN,
  ROLES.DOCTOR,
  ROLES.NURSE,
  ROLES.RECEPTIONIST,
  ROLES.ACCOUNTANT,
  ROLES.PHARMACIST,
  ROLES.LAB_TECH,
];
const FINANCE = [ROLES.ADMIN, ROLES.ACCOUNTANT];

router.get('/dashboard', authorize(STAFF), validate(schemas.dashboard), controller.dashboard);
router.get('/appointments', authorize(STAFF), validate(schemas.appointments), controller.appointments);
router.get('/finance', authorize(FINANCE), validate(schemas.finance), controller.finance);
router.get('/bed-occupancy', authorize(STAFF), controller.bedOccupancy);
router.get('/blood-stock', authorize(STAFF), controller.bloodStock);
router.get('/pharmacy-stock', authorize([ROLES.ADMIN, ROLES.PHARMACIST]), validate(schemas.pharmacyStock), controller.pharmacyStock);

router.get('/patient-ledger', authorize(STAFF), controller.patientLedger);
router.get(
  '/patient-balance',
  authorize(STAFF),
  validate(schemas.patientBalance),
  controller.patientBalance
);
router.get('/account-ledger', authorize(STAFF), controller.accountLedger);
router.get('/account-balance', authorize(STAFF), controller.accountBalance);
router.get('/daily-ledger', authorize(STAFF), controller.dailyLedger);
router.get('/daily-statement', authorize(STAFF), controller.dailyStatement);
router.get('/referral-person-ledger', authorize(STAFF), controller.referralPersonLedger);
router.get('/referral-person-balance', authorize(STAFF), controller.referralPersonBalance);
router.get('/supplier-ledger', authorize(STAFF), controller.supplierLedger);
router.get('/supplier-balance', authorize(STAFF), controller.supplierBalance);

module.exports = router;
