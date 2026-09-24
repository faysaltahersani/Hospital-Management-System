'use strict';

const ApiError = require('../utils/ApiError');

const SOURCES = ['body', 'query', 'params'];

const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const source of SOURCES) {
    const schema = schemas?.[source];
    if (!schema) continue;
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      // If req.params.id validation failed because id is not numeric (e.g. "meta", "summary"), skip to next route handler
      if (source === 'params' && req.params?.id && isNaN(Number(req.params.id))) {
        return next('route');
      }
      for (const detail of error.details) {
        errors.push({
          source,
          path: detail.path.join('.'),
          message: detail.message,
        });
      }
    } else {
      req[source] = value;
    }
  }

  if (errors.length > 0) {
    return next(new ApiError(422, 'Validation failed', errors));
  }
  return next();
};

module.exports = { validate };
