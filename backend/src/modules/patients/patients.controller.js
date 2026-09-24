'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./patients.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => {
  const patient = await service.getById(req.params.id);
  return ApiResponse.success(res, patient, 'OK');
});

const getTimeline = asyncHandler(async (req, res) => {
  const timeline = await service.getTimeline(req.params.id, req.query);
  return ApiResponse.success(res, timeline, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const patient = await service.create({
    ...req.body,
    created_by: req.body.created_by || req.user?.id || null,
  });
  return ApiResponse.created(res, patient, 'Patient created');
});

const update = asyncHandler(async (req, res) => {
  const patient = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, patient, 'Patient updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = { list, getById, getTimeline, create, update, remove };
