'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./users.controller');
const schemas = require('./users.validation');

const router = Router();

router.use(authenticate);

router.get(
  '/:id/permissions',
  (req, res, next) => {
    if (req.user.role === ROLES.ADMIN || String(req.user.id) === String(req.params.id)) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden' });
  },
  controller.getPermissions
);

router.use(authorize(ROLES.ADMIN));

router.get('/meta', (_req, res) => res.json({ success: true, message: 'OK', data: { users: [] } }));
router.get('/', validate(schemas.list), controller.list);
router.put('/:id/permissions', controller.setPermissions);
router.get('/:id', validate(schemas.getById), controller.getById);
router.post('/', validate(schemas.create), audit('create', 'user'), controller.create);
router.patch('/:id', validate(schemas.update), audit('update', 'user'), controller.update);
router.delete('/:id', validate(schemas.remove), audit('delete', 'user'), controller.remove);

module.exports = router;
