'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  return ApiResponse.created(res, result, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  return ApiResponse.success(res, result, 'Login successful');
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
