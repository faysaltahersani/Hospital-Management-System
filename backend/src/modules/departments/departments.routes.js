'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./departments.controller');
const schemas = require('./departments.validation');

const router = Router();

router.use(authenticate);

router.get('/', validate(schemas.list), controller.list);
router.get('/:id', validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(schemas.create),
  audit('create', 'department'),
  controller.create
);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.update),
  audit('update', 'department'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'department'),
  controller.remove
);

module.exports = router;
