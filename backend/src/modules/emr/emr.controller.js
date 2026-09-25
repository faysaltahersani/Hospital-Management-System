'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./emr.service');

const summary = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.summary(req.params.patientId), 'EMR profile retrieved')
);
const list = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.list(req.params.patientId, req.params.recordType, req.query), 'OK')
);
const create = asyncHandler(async (req, res) =>
  ApiResponse.created(res, await service.create(req.params.patientId, req.params.recordType, req.body, req.user.id), 'Clinical record created')
);
const update = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.update(req.params.recordType, req.params.id, req.body, req.user.id), 'Clinical record updated')
);
const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.recordType, req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { summary, list, create, update, remove };

