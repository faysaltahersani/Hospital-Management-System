'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./organization.service');

const entityFrom = (req) => req.params.entity;

const list = asyncHandler(async (req, res) => {
  const result = await service.list(entityFrom(req), req.query);
  return ApiResponse.success(res, result.items, 'OK', result.meta);
});

const getById = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getById(entityFrom(req), req.params.id), 'OK')
);

const create = asyncHandler(async (req, res) =>
  ApiResponse.created(res, await service.create(entityFrom(req), req.body, req.user.id), 'Created')
);

const update = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.update(entityFrom(req), req.params.id, req.body, req.user.id), 'Updated')
);

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(entityFrom(req), req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const hierarchy = asyncHandler(async (_req, res) =>
  ApiResponse.success(res, await service.getHierarchy(), 'Organization hierarchy retrieved')
);

module.exports = { list, getById, create, update, remove, hierarchy };

