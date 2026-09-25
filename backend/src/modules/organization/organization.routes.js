'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./organization.controller');
const schemas = require('./organization.validation');

const router = Router();
const organizationAuditEntity = (req) => ({
  organizations: 'organization',
  hospitals: 'hospital',
  branches: 'branch',
}[req.params.entity] || 'organization_unit');

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/hierarchy', controller.hierarchy);
router.get('/:entity', validate(schemas.list), controller.list);
router.get('/:entity/:id', validate(schemas.getById), controller.getById);
router.post('/:entity', validate(schemas.create), audit('create', organizationAuditEntity), controller.create);
router.patch('/:entity/:id', validate(schemas.update), audit('update', organizationAuditEntity), controller.update);
router.delete('/:entity/:id', validate(schemas.remove), audit('delete', organizationAuditEntity), controller.remove);

module.exports = router;
