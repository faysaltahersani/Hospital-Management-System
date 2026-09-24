'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./beds.controller');
const schemas = require('./beds.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.RECEPTIONIST];

// Wards
router.get('/wards', authorize(STAFF), validate(schemas.listWards), controller.listWards);
router.get('/wards/:id', authorize(STAFF), validate(schemas.getWard), controller.getWard);
router.post(
  '/wards',
  authorize(ROLES.ADMIN),
  validate(schemas.createWard),
  audit('create', 'ward'),
  controller.createWard
);
router.patch(
  '/wards/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.updateWard),
  audit('update', 'ward'),
  controller.updateWard
);
router.delete(
  '/wards/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeWard),
  audit('delete', 'ward'),
  controller.removeWard
);

// Helper Static Routes & Facility Management (MUST be defined before /:id)
router.get('/summary', authorize(STAFF), controller.summary);

router.get('/buildings', authorize(STAFF), controller.listBuildings);
router.post('/buildings', authorize(ROLES.ADMIN), controller.createBuilding);
router.patch('/buildings/:id', authorize(ROLES.ADMIN), controller.updateBuilding);
router.delete('/buildings/:id', authorize(ROLES.ADMIN), controller.removeBuilding);

router.get('/floors', authorize(STAFF), controller.listFloors);
router.post('/floors', authorize(ROLES.ADMIN), controller.createFloor);
router.patch('/floors/:id', authorize(ROLES.ADMIN), controller.updateFloor);
router.delete('/floors/:id', authorize(ROLES.ADMIN), controller.removeFloor);

router.get('/rooms', authorize(STAFF), controller.listRooms);
router.post('/rooms', authorize(ROLES.ADMIN), controller.createRoom);
router.patch('/rooms/:id', authorize(ROLES.ADMIN), controller.updateRoom);
router.delete('/rooms/:id', authorize(ROLES.ADMIN), controller.removeRoom);

router.get('/types', authorize(STAFF), controller.listBedTypes);
router.post('/types', authorize(ROLES.ADMIN), controller.createBedType);
router.patch('/types/:id', authorize(ROLES.ADMIN), controller.updateBedType);
router.delete('/types/:id', authorize(ROLES.ADMIN), controller.removeBedType);


// Beds List & Create
router.get('/', authorize(STAFF), validate(schemas.listBeds), controller.listBeds);
router.post(
  '/',
  authorize(ROLES.ADMIN),
  validate(schemas.createBed),
  audit('create', 'bed'),
  controller.createBed
);

// Dynamic Parameter Routes
router.get('/:id', authorize(STAFF), validate(schemas.getBed), controller.getBed);
router.patch(
  '/:id',
  authorize([ROLES.ADMIN, ROLES.NURSE]),
  validate(schemas.updateBed),
  audit('update', 'bed'),
  controller.updateBed
);
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeBed),
  audit('delete', 'bed'),
  controller.removeBed
);

module.exports = router;
