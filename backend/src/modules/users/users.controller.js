'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./users.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const user = await service.getById(req.params.id);
  return ApiResponse.success(res, user, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const user = await service.create(req.body);
  return ApiResponse.created(res, user, 'User created');
});

const update = asyncHandler(async (req, res) => {
  const user = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, user, 'User updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id, req.user.id);
  return ApiResponse.success(res, null, result.message);
});

const getPermissions = asyncHandler(async (req, res) => {
  const data = await service.getUserPermissions(req.params.id);
  return ApiResponse.success(res, data, 'Permissions retrieved');
});

const setPermissions = asyncHandler(async (req, res) => {
  const permissions = req.body.permissions || [];
  const data = await service.setUserPermissions(req.params.id, permissions);
  return ApiResponse.success(res, data, 'Permissions saved');
});

module.exports = { list, getById, create, update, remove, getPermissions, setPermissions };
