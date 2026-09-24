'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./ambulance.service');

const listAmbulances = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAmbulances(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getAmbulance = asyncHandler(async (req, res) => {
  const data = await service.getAmbulance(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const createAmbulance = asyncHandler(async (req, res) => {
  const data = await service.createAmbulance(req.body);
  return ApiResponse.created(res, data, 'Ambulance created');
});

const updateAmbulance = asyncHandler(async (req, res) => {
  const data = await service.updateAmbulance(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Ambulance updated');
});

const removeAmbulance = asyncHandler(async (req, res) => {
  const result = await service.removeAmbulance(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listTrips = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTrips(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getTrip = asyncHandler(async (req, res) => {
  const data = await service.getTrip(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const dispatchTrip = asyncHandler(async (req, res) => {
  const data = await service.dispatchTrip(req.body, req.user.id);
  return ApiResponse.created(res, data, 'Trip dispatched');
});

const updateTrip = asyncHandler(async (req, res) => {
  const data = await service.updateTrip(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Trip updated');
});

const completeTrip = asyncHandler(async (req, res) => {
  const data = await service.completeTrip(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Trip completed');
});

const cancelTrip = asyncHandler(async (req, res) => {
  const data = await service.cancelTrip(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Trip cancelled');
});

const removeTrip = asyncHandler(async (req, res) => {
  const result = await service.removeTrip(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getCallEntryMeta = asyncHandler(async (_req, res) => {
  const data = await service.getCallEntryMeta();
  return ApiResponse.success(res, data, 'OK');
});

const createCall = asyncHandler(async (req, res) => {
  const data = await service.createCall(req.body, req.user?.id);
  return ApiResponse.created(res, data, 'Ambulance call created');
});

const createSymptomType = asyncHandler(async (req, res) => {
  const data = await service.createSymptomType(req.body);
  return ApiResponse.created(res, data, 'Symptom type created');
});

const createSymptomHead = asyncHandler(async (req, res) => {
  const data = await service.createSymptomHead(req.body);
  return ApiResponse.created(res, data, 'Symptom head created');
});

const updateCall = asyncHandler(async (req, res) => {
  const data = await service.updateCall(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Call record updated');
});

const removeCall = asyncHandler(async (req, res) => {
  const result = await service.removeCall(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listCalls = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCalls(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const addCallPayment = asyncHandler(async (req, res) => {
  const data = await service.addCallPayment(req.params.id, req.body, req.user?.id);
  return ApiResponse.created(res, data, 'Payment recorded');
});

module.exports = {
  listCalls,
  addCallPayment,
  listAmbulances,
  getAmbulance,
  createAmbulance,
  updateAmbulance,
  removeAmbulance,
  listTrips,
  getTrip,
  dispatchTrip,
  updateTrip,
  completeTrip,
  cancelTrip,
  removeTrip,
  getCallEntryMeta,
  createCall,
  createSymptomType,
  createSymptomHead,
  updateCall,
  removeCall,
};
