'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./audit-logs.controller');
const schemas = require('./audit-logs.validation');

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

router.get('/', validate(schemas.list), controller.list);
router.get('/:id', validate(schemas.getById), controller.getById);
router.delete('/:id', validate(schemas.remove), controller.remove);

module.exports = router;
