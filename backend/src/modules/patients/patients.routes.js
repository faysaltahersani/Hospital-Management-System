'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./patients.controller');
const schemas = require('./patients.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];
const WRITERS = [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.NURSE];

router.get('/meta', authorize(STAFF), (_req, res) => res.json({ success: true, message: 'OK', data: { patients: [], doctors: [], next_patient_code: 'PAT-' + Date.now().toString().slice(-6) } }));
router.get('/', authorize(STAFF), validate(schemas.list), controller.list);
router.get('/:id/timeline', authorize(STAFF), validate(schemas.timeline), controller.getTimeline);
router.get('/:id', authorize(STAFF), validate(schemas.getById), controller.getById);

router.post(
  '/',
  authorize(WRITERS),
  validate(schemas.create),
  audit('create', 'patient'),
  controller.create
);
router.patch(
  '/:id',
  authorize(WRITERS),
  validate(schemas.update),
  audit('update', 'patient'),
  controller.update
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.remove),
  audit('delete', 'patient'),
  controller.remove
);

module.exports = router;
