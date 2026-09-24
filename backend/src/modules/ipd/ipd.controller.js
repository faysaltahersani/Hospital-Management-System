'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./ipd.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const data = await service.getById(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const getDischargeSummary = asyncHandler(async (req, res) => {
  const data = await service.getDischargeSummary(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const admit = asyncHandler(async (req, res) => {
  const data = await service.admit(req.body, req.user.id);
  return ApiResponse.created(res, data, 'Patient admitted');
});

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Admission updated');
});

const transferBed = asyncHandler(async (req, res) => {
  const data = await service.transferBed(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Bed transferred');
});

const discharge = asyncHandler(async (req, res) => {
  const data = await service.discharge(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Patient discharged');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getBillPrint = asyncHandler(async (req, res) => {
  const data = await service.getBillPrint(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const addPayment = asyncHandler(async (req, res) => {
  const data = await service.addPayment(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, data, 'Payment added');
});

module.exports = { list, getById, getDischargeSummary, admit, addPayment, update, transferBed, discharge, remove, getBillPrint };
