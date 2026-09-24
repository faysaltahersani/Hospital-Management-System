'use strict';

const ApiError = require('../utils/ApiError');

const authorize = (...allowedRoles) => {
  const flat = allowedRoles.flat();
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (flat.length > 0 && !flat.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    return next();
  };
};

module.exports = { authorize };
