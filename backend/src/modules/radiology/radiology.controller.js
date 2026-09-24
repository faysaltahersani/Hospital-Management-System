'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./radiology.service');

const listTests = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTests(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getTest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getTest(req.params.id), 'OK'));

const createTest = asyncHandler(async (req, res) => {
  const test = await service.createTest(req.body);
  return ApiResponse.created(res, test, 'Radiology test created');
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await service.updateTest(req.params.id, req.body);
  return ApiResponse.success(res, test, 'Radiology test updated');
});

const removeTest = asyncHandler(async (req, res) => {
  const result = await service.removeTest(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listOrders = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOrders(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getOrder = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getOrder(req.params.id), 'OK'));

const getOrderReport = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getOrderReport(req.params.id), 'OK')
);

const createOrder = asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.body, req.user.id);
  return ApiResponse.created(res, order, 'Radiology order created');
});

const createBill = asyncHandler(async (req, res) => {
  const bill = await service.createBill(req.body, req.user.id);
  return ApiResponse.created(res, bill, 'Radiology bill created');
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await service.updateOrderStatus(req.params.id, req.body.status, req.user?.id);
  return ApiResponse.success(res, order, 'Radiology order updated');
});

const updateOrderResult = asyncHandler(async (req, res) => {
  const order = await service.updateOrderResult(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, order, 'Radiology result updated');
});

const removeOrder = asyncHandler(async (req, res) => {
  const result = await service.removeOrder(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getBillEntryMeta = asyncHandler(async (req, res) => {
  const data = await service.getBillEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const getRadiologyParametersMeta = asyncHandler(async (req, res) => {
  const data = await service.getRadiologyParametersMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listRadiologyParameters = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listRadiologyParameters(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getRadiologyParameter = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getRadiologyParameter(req.params.id), 'OK')
);

const createRadiologyParameter = asyncHandler(async (req, res) => {
  const param = await service.createRadiologyParameter(req.body);
  return ApiResponse.created(res, param, 'Radiology parameter created');
});

const updateRadiologyParameter = asyncHandler(async (req, res) => {
  const param = await service.updateRadiologyParameter(req.params.id, req.body);
  return ApiResponse.success(res, param, 'Radiology parameter updated');
});

const removeRadiologyParameter = asyncHandler(async (req, res) => {
  const result = await service.removeRadiologyParameter(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getRadiologyTestEntryMeta = asyncHandler(async (req, res) => {
  const data = await service.getRadiologyTestEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const createRadiologyTestEntry = asyncHandler(async (req, res) => {
  const test = await service.createRadiologyTestEntry(req.body);
  return ApiResponse.created(res, test, 'Radiology test created');
});

module.exports = {
  listTests,
  getTest,
  createTest,
  updateTest,
  removeTest,
  listOrders,
  getOrder,
  getOrderReport,
  createOrder,
  createBill,
  updateOrderStatus,
  updateOrderResult,
  removeOrder,
  getBillEntryMeta,
  getRadiologyParametersMeta,
  listRadiologyParameters,
  getRadiologyParameter,
  createRadiologyParameter,
  updateRadiologyParameter,
  removeRadiologyParameter,
  getRadiologyTestEntryMeta,
  createRadiologyTestEntry,
};
