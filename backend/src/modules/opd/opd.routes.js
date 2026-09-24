'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./opd.controller');
const schemas = require('./opd.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];
const WRITERS = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];

router.get('/bill-entry/meta', authorize(STAFF), controller.getBillEntryMeta);
router.post(
  '/bills',
  authorize(WRITERS),
  validate(schemas.createBill),
  audit('create', 'opd_bill'),
  controller.createBill
);

router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);


router.post(
  '/',
  authorize(WRITERS),
  validate(schemas.create),
  audit('create', 'opd_visit'),
  controller.create
);
router.patch(
  '/:id/complete',
  authorize([ROLES.ADMIN, ROLES.DOCTOR]),
  validate(schemas.complete),
  audit('update', 'opd_visit'),
  controller.complete
);
router.patch(
  '/:id/cancel',
  authorize([ROLES.ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST]),
  validate(schemas.cancel),
  audit('update', 'opd_visit'),
  controller.cancel
);
router.patch(
  '/:id',
  authorize([ROLES.ADMIN, ROLES.DOCTOR]),
  validate(schemas.update),
  audit('update', 'opd_visit'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'opd_visit'),
  controller.remove
);

module.exports = router;
