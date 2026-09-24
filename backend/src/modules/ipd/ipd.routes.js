'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./ipd.controller');
const schemas = require('./ipd.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];
const WRITERS = [ROLES.ADMIN, ROLES.NURSE, ROLES.RECEPTIONIST];

router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get(
  '/:id/discharge-summary',
  authorize(STAFF),
  validate(schemas.dischargeSummary),
  controller.getDischargeSummary
);
router.get('/:id/bill-print', authorize(STAFF), validate(schemas.getById), controller.getBillPrint);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(WRITERS),
  validate(schemas.admit),
  audit('create', 'admission'),
  controller.admit
);
router.post('/:id/payments', authorize(WRITERS), controller.addPayment);
router.patch(
  '/:id/transfer-bed',
  authorize(WRITERS),
  validate(schemas.transferBed),
  audit('update', 'admission'),
  controller.transferBed
);
router.patch(
  '/:id/discharge',
  authorize(WRITERS),
  validate(schemas.discharge),
  audit('update', 'admission'),
  controller.discharge
);
router.patch(
  '/:id',
  authorize(WRITERS),
  validate(schemas.update),
  audit('update', 'admission'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'admission'),
  controller.remove
);

module.exports = router;
