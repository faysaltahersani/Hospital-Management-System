'use strict';

class ApiError extends Error {
  constructor(statusCode, message, errors = null, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = options.isOperational !== false;
    if (options.stack) {
      this.stack = options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad request', errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized', errors = null) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Forbidden', errors = null) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Not found', errors = null) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = 'Conflict', errors = null) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Unprocessable entity', errors = null) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error', errors = null) {
    return new ApiError(500, message, errors);
  }
}

module.exports = ApiError;
