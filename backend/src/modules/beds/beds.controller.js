'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./beds.service');

const listWards = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listWards(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getWard = asyncHandler(async (req, res) => {
  const ward = await service.getWard(req.params.id);
  return ApiResponse.success(res, ward, 'OK');
});

const createWard = asyncHandler(async (req, res) => {
  const ward = await service.createWard(req.body);
  return ApiResponse.created(res, ward, 'Ward created');
});

const updateWard = asyncHandler(async (req, res) => {
  const ward = await service.updateWard(req.params.id, req.body);
  return ApiResponse.success(res, ward, 'Ward updated');
});

const removeWard = asyncHandler(async (req, res) => {
  const result = await service.removeWard(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listBeds = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listBeds(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getBed = asyncHandler(async (req, res) => {
  const bed = await service.getBed(req.params.id);
  return ApiResponse.success(res, bed, 'OK');
});

const createBed = asyncHandler(async (req, res) => {
  const bed = await service.createBed(req.body);
  return ApiResponse.created(res, bed, 'Bed created');
});

const updateBed = asyncHandler(async (req, res) => {
  const bed = await service.updateBed(req.params.id, req.body);
  return ApiResponse.success(res, bed, 'Bed updated');
});

const removeBed = asyncHandler(async (req, res) => {
  const result = await service.removeBed(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const summary = asyncHandler(async (_req, res) => {
  const data = await service.getBedSummary();
  return ApiResponse.success(res, data, 'OK');
});

const listBuildings = asyncHandler(async (_req, res) => {
  const data = await service.listBuildings();
  return ApiResponse.success(res, data, 'OK');
});

const createBuilding = asyncHandler(async (req, res) => {
  const data = await service.createBuilding(req.body);
  return ApiResponse.created(res, data, 'Building created');
});

const updateBuilding = asyncHandler(async (req, res) => {
  const data = await service.updateBuilding(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Building updated');
});

const removeBuilding = asyncHandler(async (req, res) => {
  const result = await service.removeBuilding(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listFloors = asyncHandler(async (_req, res) => {
  const data = await service.listFloors();
  return ApiResponse.success(res, data, 'OK');
});

const createFloor = asyncHandler(async (req, res) => {
  const data = await service.createFloor(req.body);
  return ApiResponse.created(res, data, 'Floor created');
});

const updateFloor = asyncHandler(async (req, res) => {
  const data = await service.updateFloor(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Floor updated');
});

const removeFloor = asyncHandler(async (req, res) => {
  const result = await service.removeFloor(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listRooms = asyncHandler(async (_req, res) => {
  const data = await service.listRooms();
  return ApiResponse.success(res, data, 'OK');
});

const createRoom = asyncHandler(async (req, res) => {
  const data = await service.createRoom(req.body);
  return ApiResponse.created(res, data, 'Room created');
});

const updateRoom = asyncHandler(async (req, res) => {
  const data = await service.updateRoom(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Room updated');
});

const removeRoom = asyncHandler(async (req, res) => {
  const result = await service.removeRoom(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listBedTypes = asyncHandler(async (_req, res) => {
  const data = await service.listBedTypes();
  return ApiResponse.success(res, data, 'OK');
});

const createBedType = asyncHandler(async (req, res) => {
  const data = await service.createBedType(req.body);
  return ApiResponse.created(res, data, 'Bed type created');
});

const updateBedType = asyncHandler(async (req, res) => {
  const data = await service.updateBedType(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Bed type updated');
});

const removeBedType = asyncHandler(async (req, res) => {
  const result = await service.removeBedType(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = {
  listWards,
  getWard,
  createWard,
  updateWard,
  removeWard,
  listBeds,
  getBed,
  createBed,
  updateBed,
  removeBed,
  summary,
  listBuildings,
  createBuilding,
  updateBuilding,
  removeBuilding,
  listFloors,
  createFloor,
  updateFloor,
  removeFloor,
  listRooms,
  createRoom,
  updateRoom,
  removeRoom,
  listBedTypes,
  createBedType,
  updateBedType,
  removeBedType,
};
