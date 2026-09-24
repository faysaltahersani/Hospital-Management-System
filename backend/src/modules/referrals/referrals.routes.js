'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./referrals.controller');
const schemas = require('./referrals.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];
const ALL_STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.ACCOUNTANT];

// ─── Referral Persons ────────────────────────────────────────────────────────
router.get('/persons', authorize(ALL_STAFF), controller.listPersons);
router.get('/persons/:id', authorize(ALL_STAFF), controller.getPersonById);
router.post('/persons', authorize(STAFF), audit('create', 'referral_person'), controller.createPerson);
router.patch('/persons/:id', authorize(STAFF), audit('update', 'referral_person'), controller.updatePerson);
router.delete('/persons/:id', authorize([ROLES.ADMIN]), audit('delete', 'referral_person'), controller.removePerson);

// ─── Referral Bills ──────────────────────────────────────────────────────────
router.get('/bills/accounts', authorize(ALL_STAFF), controller.getBillAccounts);
router.get('/bills', authorize(ALL_STAFF), controller.listBills);
router.post('/bills', authorize(STAFF), audit('create', 'referral_bill'), controller.createBill);
router.delete('/bills/:id', authorize([ROLES.ADMIN]), audit('delete', 'referral_bill'), controller.removeBill);

// ─── Referrals (existing) ────────────────────────────────────────────────────
router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);
router.post('/', authorize(STAFF), validate(schemas.create), audit('create', 'referral'), controller.create);
router.patch('/:id', authorize(STAFF), validate(schemas.update), audit('update', 'referral'), controller.update);
router.patch('/:id/status', authorize(STAFF), validate(schemas.updateStatus), audit('update', 'referral'), controller.updateStatus);
router.delete('/:id', authorize(ROLES.ADMIN), validate(schemas.remove), audit('delete', 'referral'), controller.remove);

module.exports = router;
