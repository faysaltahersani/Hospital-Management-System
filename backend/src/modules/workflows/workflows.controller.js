'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./workflows.service');

const meta = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getMeta(req.user), 'Workflow metadata retrieved'));
const listDefinitions = asyncHandler(async (req, res) => {
  const result = await service.listDefinitions(req.query, req.user);
  return ApiResponse.success(res, result.items, 'OK', result.meta);
});
const getDefinition = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getDefinition(req.params.id, req.user), 'OK'));
const createDefinition = asyncHandler(async (req, res) => ApiResponse.created(res, await service.createDefinition(req.body, req.user), 'Workflow created'));
const updateDefinition = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateDefinition(req.params.id, req.body, req.user), 'Workflow updated'));
const removeDefinition = asyncHandler(async (req, res) => {
  const result = await service.removeDefinition(req.params.id, req.user);
  return ApiResponse.success(res, null, result.message);
});
const listRequests = asyncHandler(async (req, res) => {
  const result = await service.listRequests(req.query, req.user);
  return ApiResponse.success(res, result.items, 'OK', result.meta);
});
const getRequest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.requestDetail(req.params.id, req.user), 'OK'));
const createRequest = asyncHandler(async (req, res) => ApiResponse.created(res, await service.createRequest(req.body, req.user), 'Approval request created'));
const submitRequest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.submitRequest(req.params.id, req.body.comments, req.user), 'Request submitted'));
const approveRequest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.approveRequest(req.params.id, req.body.comments, req.user), 'Approval recorded'));
const rejectRequest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.rejectRequest(req.params.id, req.body.comments, req.user), 'Request rejected'));
const cancelRequest = asyncHandler(async (req, res) => ApiResponse.success(res, await service.cancelRequest(req.params.id, req.body.comments, req.user), 'Request cancelled'));
const reportSummary = asyncHandler(async (req, res) => ApiResponse.success(res, await service.reportSummary(req.user), 'Workflow report retrieved'));

module.exports = {
  meta,
  listDefinitions,
  getDefinition,
  createDefinition,
  updateDefinition,
  removeDefinition,
  listRequests,
  getRequest,
  createRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  reportSummary,
};
