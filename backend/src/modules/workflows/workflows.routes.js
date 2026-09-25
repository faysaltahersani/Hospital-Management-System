'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES, ROLE_VALUES } = require('../../config/constants');
const controller = require('./workflows.controller');
const schemas = require('./workflows.validation');

const router = Router();
const STAFF = ROLE_VALUES.filter((role) => role !== ROLES.PATIENT);
const WORKFLOW_ADMINS = [ROLES.ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.BRANCH_ADMIN];

router.use(authenticate);
router.use(authorize(STAFF));

router.get('/meta', controller.meta);
router.get('/reports/summary', controller.reportSummary);

router.get('/definitions', validate(schemas.listDefinitions), controller.listDefinitions);
router.get('/definitions/:id', validate(schemas.id), controller.getDefinition);
router.post('/definitions', authorize(WORKFLOW_ADMINS), validate(schemas.createDefinition), audit('create', 'workflow_definition'), controller.createDefinition);
router.patch('/definitions/:id', authorize(WORKFLOW_ADMINS), validate(schemas.updateDefinition), audit('update', 'workflow_definition'), controller.updateDefinition);
router.delete('/definitions/:id', authorize(WORKFLOW_ADMINS), validate(schemas.id), audit('delete', 'workflow_definition'), controller.removeDefinition);

router.get('/requests', validate(schemas.listRequests), controller.listRequests);
router.get('/requests/:id', validate(schemas.id), controller.getRequest);
router.post('/requests', validate(schemas.createRequest), audit('create', 'approval_request'), controller.createRequest);
router.post('/requests/:id/submit', validate(schemas.decision), audit('submit', 'approval_request'), controller.submitRequest);
router.post('/requests/:id/approve', validate(schemas.decision), audit('approve', 'approval_request'), controller.approveRequest);
router.post('/requests/:id/reject', validate(schemas.decision), audit('reject', 'approval_request'), controller.rejectRequest);
router.post('/requests/:id/cancel', validate(schemas.decision), audit('cancel', 'approval_request'), controller.cancelRequest);

module.exports = router;
