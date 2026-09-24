'use strict';

class ApiResponse {
  static success(res, data = null, message = 'OK', meta = null, statusCode = 200) {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created(res, data = null, message = 'Created', meta = null) {
    return ApiResponse.success(res, data, message, meta, 201);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
