'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./radiology.controller');
const schemas = require('./radiology.validation');

const router = Router();

router.use(authenticate);

const STAFF = [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECH, ROLES.RECEPTIONIST];
const RADIOLOGY_MANAGERS = [ROLES.ADMIN, ROLES.LAB_TECH];

router.get('/tests', authorize(STAFF), validate(schemas.listTests), controller.listTests);
router.get('/tests/:id', authorize(STAFF), validate(schemas.getTest), controller.getTest);
router.post('/tests', authorize(RADIOLOGY_MANAGERS), validate(schemas.createTest), audit('create', 'radiology_test'), controller.createTest);
router.patch('/tests/:id', authorize(RADIOLOGY_MANAGERS), validate(schemas.updateTest), audit('update', 'radiology_test'), controller.updateTest);
router.delete('/tests/:id', authorize(ROLES.ADMIN), validate(schemas.removeTest), audit('delete', 'radiology_test'), controller.removeTest);

router.get('/bill-entry/meta', authorize(STAFF), controller.getBillEntryMeta);
router.post('/bill-entry', authorize(STAFF), validate(schemas.createBill), audit('create', 'radiology_order'), controller.createBill);
router.post('/bills', authorize(STAFF), validate(schemas.createBill), audit('create', 'radiology_order'), controller.createBill);

router.get('/test-entry/meta', authorize(STAFF), controller.getRadiologyTestEntryMeta);
router.post('/test-entry', authorize(RADIOLOGY_MANAGERS), audit('create', 'radiology_test'), controller.createRadiologyTestEntry);

router.get('/parameters/meta', authorize(STAFF), controller.getRadiologyParametersMeta);
router.get('/parameters', authorize(STAFF), validate(schemas.listRadiologyParameters), controller.listRadiologyParameters);
router.get('/parameters/:id', authorize(STAFF), validate(schemas.getRadiologyParameter), controller.getRadiologyParameter);
router.post('/parameters', authorize(RADIOLOGY_MANAGERS), validate(schemas.createRadiologyParameter), audit('create', 'radiology_parameter'), controller.createRadiologyParameter);
router.patch('/parameters/:id', authorize(RADIOLOGY_MANAGERS), validate(schemas.updateRadiologyParameter), audit('update', 'radiology_parameter'), controller.updateRadiologyParameter);
router.delete('/parameters/:id', authorize(ROLES.ADMIN), validate(schemas.removeRadiologyParameter), audit('delete', 'radiology_parameter'), controller.removeRadiologyParameter);

router.get('/orders', authorize(STAFF), validate(schemas.listOrders), controller.listOrders);
router.get('/orders/:id/report', authorize(STAFF), validate(schemas.getOrderReport), controller.getOrderReport);
router.get('/orders/:id', authorize(STAFF), validate(schemas.getOrder), controller.getOrder);
router.post('/orders', authorize(STAFF), validate(schemas.createOrder), audit('create', 'radiology_order'), controller.createOrder);
router.patch('/orders/:id/status', authorize(RADIOLOGY_MANAGERS), validate(schemas.updateOrderStatus), audit('update', 'radiology_order'), controller.updateOrderStatus);
router.patch('/orders/:id/result', authorize(RADIOLOGY_MANAGERS), validate(schemas.updateOrderResult), audit('update', 'radiology_result'), controller.updateOrderResult);
router.delete('/orders/:id', authorize(ROLES.ADMIN), validate(schemas.removeOrder), audit('delete', 'radiology_order'), controller.removeOrder);

module.exports = router;
