'use strict';

const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

const authorize = (...allowedRoles) => {
  const flat = allowedRoles.flat();
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (req.user.role === ROLES.SUPER_ADMIN) return next();
    if (flat.length > 0 && !flat.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    return next();
  };
};

module.exports = { authorize };
