'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./appointments.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const appt = await service.getById(req.params.id);
  return ApiResponse.success(res, appt, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const appt = await service.create(req.body, req.user.id);
  return ApiResponse.created(res, appt, 'Appointment created');
});

const update = asyncHandler(async (req, res) => {
  const appt = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, appt, 'Appointment updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const appt = await service.updateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, appt, 'Appointment status updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getSlotConfigMeta = asyncHandler(async (_req, res) => {
  const data = await service.getSlotConfigMeta();
  return ApiResponse.success(res, data, 'OK');
});

const getSlotConfig = asyncHandler(async (req, res) => {
  const data = await service.getSlotConfig(req.query);
  return ApiResponse.success(res, data, 'OK');
});

const generateSlots = asyncHandler(async (req, res) => {
  const data = await service.generateSlots(req.body);
  return ApiResponse.success(res, data, 'OK');
});

const getAvailableSlots = asyncHandler(async (req, res) => {
  const data = await service.getAvailableSlots(req.query);
  return ApiResponse.success(res, data, 'OK');
});

const saveSlotConfig = asyncHandler(async (req, res) => {
  const data = await service.saveSlotConfig(req.body);
  return ApiResponse.success(res, data, 'OK');
});

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  getAvailableSlots,
  getSlotConfigMeta,
  getSlotConfig,
  generateSlots,
  saveSlotConfig,
};
