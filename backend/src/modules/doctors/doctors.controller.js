'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./doctors.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const doctor = await service.getById(req.params.id);
  return ApiResponse.success(res, doctor, 'OK');
});

const availableSlots = asyncHandler(async (req, res) => {
  const slots = await service.availableSlots(req.params.id, req.query);
  return ApiResponse.success(res, slots, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const doctor = await service.create(req.body);
  return ApiResponse.created(res, doctor, 'Doctor created');
});

const update = asyncHandler(async (req, res) => {
  const doctor = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, doctor, 'Doctor updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { list, getById, availableSlots, create, update, remove };
