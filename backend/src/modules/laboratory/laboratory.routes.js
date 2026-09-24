'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./laboratory.controller');
const schemas = require('./laboratory.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECH, ROLES.RECEPTIONIST];
const LAB_MANAGERS = [ROLES.ADMIN, ROLES.LAB_TECH];

router.get('/tests', authorize(STAFF), validate(schemas.listTests), controller.listTests);
router.get('/tests/:id', authorize(STAFF), validate(schemas.getTest), controller.getTest);
router.post('/tests', authorize(LAB_MANAGERS), validate(schemas.createTest), audit('create', 'lab_test'), controller.createTest);
router.patch('/tests/:id', authorize(LAB_MANAGERS), validate(schemas.updateTest), audit('update', 'lab_test'), controller.updateTest);
router.delete('/tests/:id', authorize(ROLES.ADMIN), validate(schemas.removeTest), audit('delete', 'lab_test'), controller.removeTest);

router.get('/bill-entry/meta', authorize(STAFF), controller.getBillEntryMeta);
router.get('/pathology-bill-entry/meta', authorize(STAFF), controller.getBillEntryMeta);
router.post('/pathology-bill-entry', authorize(STAFF), validate(schemas.createOrder), audit('create', 'lab_order'), controller.createOrder);
router.post('/pathology-bills', authorize(STAFF), validate(schemas.createOrder), audit('create', 'lab_order'), controller.createOrder);

router.get('/pathology-parameters/meta', authorize(STAFF), controller.getPathologyParametersMeta);
router.get('/pathology-parameters', authorize(STAFF), validate(schemas.listPathologyParameters), controller.listPathologyParameters);
router.get('/pathology-parameters/:id', authorize(STAFF), validate(schemas.getPathologyParameter), controller.getPathologyParameter);
router.post('/pathology-parameters', authorize(LAB_MANAGERS), validate(schemas.createPathologyParameter), audit('create', 'pathology_parameter'), controller.createPathologyParameter);
router.patch('/pathology-parameters/:id', authorize(LAB_MANAGERS), validate(schemas.updatePathologyParameter), audit('update', 'pathology_parameter'), controller.updatePathologyParameter);
router.get('/pathology-test-entry/meta', authorize(STAFF), controller.getPathologyTestEntryMeta);
router.post('/pathology-test-entry', authorize(LAB_MANAGERS), audit('create', 'lab_test'), controller.createPathologyTestEntry);

router.get('/orders', authorize(STAFF), validate(schemas.listOrders), controller.listOrders);
router.get('/orders/:id/report', authorize(STAFF), validate(schemas.getOrderReport), controller.getOrderReport);
router.get('/orders/:id', authorize(STAFF), validate(schemas.getOrder), controller.getOrder);
router.post('/orders', authorize(STAFF), validate(schemas.createOrder), audit('create', 'lab_order'), controller.createOrder);
router.patch('/orders/:id/status', authorize(LAB_MANAGERS), validate(schemas.updateOrderStatus), audit('update', 'lab_order'), controller.updateOrderStatus);
router.patch('/orders/:id/items/:itemId/result', authorize(LAB_MANAGERS), validate(schemas.updateOrderItemResult), audit('update', 'lab_result'), controller.updateOrderItemResult);
router.delete('/orders/:id', authorize(ROLES.ADMIN), validate(schemas.removeOrder), audit('delete', 'lab_order'), controller.removeOrder);

module.exports = router;
