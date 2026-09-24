'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./prescriptions.controller');
const schemas = require('./prescriptions.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.PHARMACIST];
const WRITERS = [ROLES.ADMIN, ROLES.DOCTOR];

router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);
router.post(
  '/',
  authorize(WRITERS),
  validate(schemas.create),
  audit('create', 'prescription'),
  controller.create
);
router.patch(
  '/:id',
  authorize(WRITERS),
  validate(schemas.update),
  audit('update', 'prescription'),
  controller.update
);
router.patch(
  '/:id/status',
  authorize(WRITERS),
  validate(schemas.updateStatus),
  audit('update', 'prescription'),
  controller.updateStatus
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'prescription'),
  controller.remove
);

module.exports = router;
