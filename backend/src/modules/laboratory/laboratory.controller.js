'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./laboratory.service');

const listTests = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTests(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getTest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getTest(req.params.id), 'OK'));

const createTest = asyncHandler(async (req, res) => {
  const test = await service.createTest(req.body);
  return ApiResponse.created(res, test, 'Lab test created');
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await service.updateTest(req.params.id, req.body);
  return ApiResponse.success(res, test, 'Lab test updated');
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
  return ApiResponse.created(res, order, 'Lab order created');
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await service.updateOrderStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, order, 'Lab order updated');
});

const updateOrderItemResult = asyncHandler(async (req, res) => {
  const order = await service.updateOrderItemResult(req.params.id, req.params.itemId, req.body, req.user?.id);
  return ApiResponse.success(res, order, 'Lab result updated');
});

const removeOrder = asyncHandler(async (req, res) => {
  const result = await service.removeOrder(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getBillEntryMeta = asyncHandler(async (req, res) => {
  const data = await service.getBillEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const getPathologyParametersMeta = asyncHandler(async (req, res) => {
  const data = await service.getPathologyParametersMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listPathologyParameters = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPathologyParameters(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPathologyParameter = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getPathologyParameter(req.params.id), 'OK')
);

const createPathologyParameter = asyncHandler(async (req, res) => {
  const param = await service.createPathologyParameter(req.body);
  return ApiResponse.created(res, param, 'Pathology parameter created');
});

const updatePathologyParameter = asyncHandler(async (req, res) => {
  const param = await service.updatePathologyParameter(req.params.id, req.body);
  return ApiResponse.success(res, param, 'Pathology parameter updated');
});

const removePathologyParameter = asyncHandler(async (req, res) => {
  const result = await service.removePathologyParameter(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getPathologyTestEntryMeta = asyncHandler(async (req, res) => {
  const data = await service.getPathologyTestEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const createPathologyTestEntry = asyncHandler(async (req, res) => {
  const test = await service.createPathologyTestEntry(req.body);
  return ApiResponse.created(res, test, 'Pathology test created');
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
  updateOrderStatus,
  updateOrderItemResult,
  removeOrder,
  getBillEntryMeta,
  getPathologyParametersMeta,
  listPathologyParameters,
  getPathologyParameter,
  createPathologyParameter,
  updatePathologyParameter,
  removePathologyParameter,
  getPathologyTestEntryMeta,
  createPathologyTestEntry,
};
