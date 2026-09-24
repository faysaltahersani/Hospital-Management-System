'use strict';

const { Router } = require('express');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { authRateLimiter, accountThrottle } = require('../../middlewares/rateLimit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./auth.controller');
const schemas = require('./auth.validation');

const router = Router();

router.post('/login', authRateLimiter, accountThrottle, validate(schemas.login), controller.login);
// Refresh is also rate-limited because a stolen refresh token would
// otherwise allow unlimited mint-and-rotate attempts.
router.post('/refresh', authRateLimiter, validate(schemas.refresh), controller.refresh);
router.post('/logout', validate(schemas.logout), controller.logout);

router.post(
  '/register',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(schemas.register),
  controller.register
);

router.get('/me', authenticate, controller.me);
router.post(
  '/change-password',
  authenticate,
  validate(schemas.changePassword),
  controller.changePassword
);

module.exports = router;
