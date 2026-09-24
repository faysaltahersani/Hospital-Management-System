'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./prescriptions.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const prescription = await service.getById(req.params.id);
  return ApiResponse.success(res, prescription, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const prescription = await service.create(req.body);
  return ApiResponse.created(res, prescription, 'Prescription created');
});

const update = asyncHandler(async (req, res) => {
  const prescription = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, prescription, 'Prescription updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const prescription = await service.updateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, prescription, 'Prescription status updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { list, getById, create, update, updateStatus, remove };
