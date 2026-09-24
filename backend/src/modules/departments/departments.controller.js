'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./departments.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const dept = await service.getById(req.params.id);
  return ApiResponse.success(res, dept, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const dept = await service.create(req.body);
  return ApiResponse.created(res, dept, 'Department created');
});

const update = asyncHandler(async (req, res) => {
  const dept = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, dept, 'Department updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { list, getById, create, update, remove };
