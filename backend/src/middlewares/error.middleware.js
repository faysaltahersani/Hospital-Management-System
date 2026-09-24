'use strict';

const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } = require('sequelize');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const config = require('../config');

const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof UniqueConstraintError) {
    const fields = err.errors?.map((e) => ({ path: e.path, message: `${e.path} must be unique` })) || null;
    return new ApiError(409, 'Resource already exists', fields);
  }

  if (err instanceof ValidationError) {
    const fields = err.errors?.map((e) => ({ path: e.path, message: e.message })) || null;
    return new ApiError(422, 'Validation failed', fields);
  }

  if (err instanceof ForeignKeyConstraintError) {
    return new ApiError(409, 'Foreign key constraint failed');
  }

  if (err instanceof DatabaseError) {
    return new ApiError(500, config.env === 'development' ? err.message : 'Database error', null, {
      isOperational: false,
      stack: err.stack,
    });
  }

  // body-parser surfaces these as plain Error objects with a .type tag.
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Invalid JSON payload');
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'Request payload too large');
  }
  if (err.type === 'charset.unsupported' || err.type === 'encoding.unsupported') {
    return new ApiError(415, 'Unsupported request encoding');
  }

  return new ApiError(err.statusCode || 500, err.message || 'Internal server error', null, {
    isOperational: false,
    stack: err.stack,
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500 || !apiError.isOperational) {
    logger.error(`[${req.method} ${req.originalUrl}] ${apiError.message}`, { stack: apiError.stack });
  } else {
    logger.warn(`[${req.method} ${req.originalUrl}] ${apiError.statusCode} ${apiError.message}`);
  }

  const body = {
    success: false,
    message: apiError.message,
  };
  if (apiError.errors) body.errors = apiError.errors;
  if (config.env !== 'production' && apiError.statusCode >= 500) body.stack = apiError.stack;

  res.status(apiError.statusCode).json(body);
};

module.exports = { errorHandler };
