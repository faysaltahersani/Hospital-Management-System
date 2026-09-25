'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./auth.service');
const { writeAuditLog } = require('../../middlewares/audit.middleware');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  return ApiResponse.created(res, result, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  try {
    const result = await service.login(req.body);
    await writeAuditLog({
      userId: result.user?.id,
      action: 'login',
      entityType: 'authentication',
      entityId: result.user?.id,
      changes: { success: true, email: result.user?.email },
      req,
    });
    return ApiResponse.success(res, result, 'Login successful');
  } catch (error) {
    await writeAuditLog({
      userId: null,
      action: 'login',
      entityType: 'authentication',
      entityId: null,
      changes: {
        success: false,
        email: String(req.body?.email || req.body?.identifier || '').toLowerCase(),
        reason: error.message,
      },
      req,
    });
    throw error;
  }
});

const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh(req.body);
  return ApiResponse.success(res, result, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const result = await service.logout(req.body);
  return ApiResponse.success(res, null, result.message);
});

const me = asyncHandler(async (req, res) => {
  const user = await service.me(req.user.id);
  return ApiResponse.success(res, { user }, 'OK');
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await service.changePassword(req.user.id, req.body);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { register, login, refresh, logout, me, changePassword };
