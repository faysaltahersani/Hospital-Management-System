'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./blood-bank.controller');
const schemas = require('./blood-bank.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECH, ROLES.RECEPTIONIST];
const WRITERS = [ROLES.ADMIN, ROLES.LAB_TECH, ROLES.NURSE];

// Donors
router.get('/donors', authorize(STAFF), validate(schemas.listDonors), controller.listDonors);
router.get('/donors/:id', authorize(STAFF), validate(schemas.getDonor), controller.getDonor);
router.post(
  '/donors',
  authorize(WRITERS),
  validate(schemas.createDonor),
  audit('create', 'blood_donor'),
  controller.createDonor
);
router.patch(
  '/donors/:id',
  authorize(WRITERS),
  validate(schemas.updateDonor),
  audit('update', 'blood_donor'),
  controller.updateDonor
);
router.delete(
  '/donors/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeDonor),
  audit('delete', 'blood_donor'),
  controller.removeDonor
);

// Bags
router.get('/bags/summary', authorize(STAFF), controller.stockSummary);
router.get('/bags', authorize(STAFF), validate(schemas.listBags), controller.listBags);
router.get('/bags/:id', authorize(STAFF), validate(schemas.getBag), controller.getBag);
router.post(
  '/bags',
  authorize(WRITERS),
  validate(schemas.createBag),
  audit('create', 'blood_bag'),
  controller.createBag
);
router.patch(
  '/bags/:id',
  authorize(WRITERS),
  validate(schemas.updateBag),
  audit('update', 'blood_bag'),
  controller.updateBag
);
// Recording a screening result is restricted to the roles that perform it — a
// receptionist can list bags but must not be able to clear a unit for transfusion.
router.patch(
  '/bags/:id/screening',
  authorize([ROLES.ADMIN, ROLES.LAB_TECH]),
  validate(schemas.recordBagScreening),
  audit('update', 'blood_bag_screening'),
  controller.recordBagScreening
);
router.delete(
  '/bags/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeBag),
  audit('delete', 'blood_bag'),
  controller.removeBag
);

// Issues
router.get('/issues', authorize(STAFF), validate(schemas.listIssues), controller.listIssues);
router.get('/issues/:id', authorize(STAFF), validate(schemas.getIssue), controller.getIssue);
router.post(
  '/issues',
  authorize(WRITERS),
  validate(schemas.issueBag),
  audit('create', 'blood_issue'),
  controller.issueBag
);
router.delete(
  '/issues/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeIssue),
  audit('delete', 'blood_issue'),
  controller.removeIssue
);

// Components
router.get('/components', authorize(STAFF), controller.listComponents);
router.post('/components', authorize(WRITERS), audit('create', 'blood_component'), controller.createComponent);
router.patch('/components/:id', authorize(WRITERS), audit('update', 'blood_component'), controller.updateComponent);
router.delete('/components/:id', authorize(ROLES.ADMIN), audit('delete', 'blood_component'), controller.deleteComponent);

// Units
router.get('/units', authorize(STAFF), controller.listUnits);
router.post('/units', authorize(WRITERS), audit('create', 'blood_unit'), controller.createUnit);
router.patch('/units/:id', authorize(WRITERS), audit('update', 'blood_unit'), controller.updateUnit);
router.delete('/units/:id', authorize(ROLES.ADMIN), audit('delete', 'blood_unit'), controller.deleteUnit);

// Groups
router.get('/groups', authorize(STAFF), controller.listGroups);
router.post('/groups', authorize(WRITERS), audit('create', 'blood_group'), controller.createGroup);
router.patch('/groups/:id', authorize(WRITERS), audit('update', 'blood_group'), controller.updateGroup);
router.delete('/groups/:id', authorize(ROLES.ADMIN), audit('delete', 'blood_group'), controller.deleteGroup);

module.exports = router;
