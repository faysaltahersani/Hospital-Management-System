'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./opd.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user.id);
  return ApiResponse.created(res, data, 'OPD visit created');
});

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'OPD visit updated');
});

const complete = asyncHandler(async (req, res) => {
  const data = await service.complete(req.params.id, req.body);
  return ApiResponse.success(res, data, 'OPD visit completed');
});

const cancel = asyncHandler(async (req, res) => {
  const data = await service.cancel(req.params.id);
  return ApiResponse.success(res, data, 'OPD visit cancelled');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getBillEntryMeta = asyncHandler(async (_req, res) => {
  const data = await service.getBillEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const createBill = asyncHandler(async (req, res) => {
  const data = await service.createBill(req.body, req.user?.id);
  return ApiResponse.created(res, data, 'OPD bill created');
});

module.exports = { list, getById, create, update, complete, cancel, remove, getBillEntryMeta, createBill };
