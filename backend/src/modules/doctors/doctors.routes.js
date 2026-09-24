'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./doctors.controller');
const schemas = require('./doctors.validation');

const router = Router();

router.use(authenticate);

router.get('/meta', (_req, res) => res.json({ success: true, message: 'OK', data: { doctors: [] } }));
router.get('/', validate(schemas.list), controller.list);
router.get('/:id/available-slots', validate(schemas.availableSlots), controller.availableSlots);
router.get('/:id', validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(schemas.create),
  audit('create', 'doctor'),
  controller.create
);
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.update),
  audit('update', 'doctor'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'doctor'),
  controller.remove
);

module.exports = router;
