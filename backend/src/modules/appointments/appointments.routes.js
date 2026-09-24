'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./appointments.controller');
const schemas = require('./appointments.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];
const WRITERS = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.NURSE];

router.get('/slot-config/meta', authorize(STAFF), controller.getSlotConfigMeta);
router.get('/slot-config', authorize(STAFF), controller.getSlotConfig);
router.post('/slot-config/generate', authorize(STAFF), controller.generateSlots);
router.put('/slot-config', authorize(WRITERS), controller.saveSlotConfig);
router.get('/available-slots', authorize(STAFF), validate(schemas.availableSlots), controller.getAvailableSlots);

router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(WRITERS),
  validate(schemas.create),
  audit('create', 'appointment'),
  controller.create
);
router.patch(
  '/:id/status',
  authorize([ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST]),
  validate(schemas.updateStatus),
  audit('update', 'appointment'),
  controller.updateStatus
);
router.patch(
  '/:id',
  authorize(WRITERS),
  validate(schemas.update),
  audit('update', 'appointment'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'appointment'),
  controller.remove
);

module.exports = router;
