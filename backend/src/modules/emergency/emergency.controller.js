'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./emergency.service');

const list = asyncHandler(async (req, res) => { const { items, meta } = await service.list(req.query); return ApiResponse.success(res, items, 'OK', meta); });
const getById = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getById(req.params.id), 'OK'));
const register = asyncHandler(async (req, res) => ApiResponse.created(res, await service.register(req.body, req.user), 'Emergency encounter registered'));
const triage = asyncHandler(async (req, res) => ApiResponse.created(res, await service.triage(req.params.encounterId, req.body, req.user), 'Emergency triage recorded'));
const updateTriage = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateTriage(req.params.id, req.body, req.user), 'Emergency triage updated'));
const assignDoctor = asyncHandler(async (req, res) => ApiResponse.created(res, await service.assignDoctor(req.params.encounterId, req.body, req.user), 'Doctor assigned'));
const assessment = asyncHandler(async (req, res) => ApiResponse.created(res, await service.assessment(req.params.encounterId, req.body, req.user), 'Emergency assessment recorded'));
const updateAssessment = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateAssessment(req.params.id, req.body, req.user), 'Emergency assessment updated'));
const addLabOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await service.addLabOrder(req.params.encounterId, req.body, req.user), 'Laboratory order created'));
const addRadiologyOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await service.addRadiologyOrder(req.params.encounterId, req.body, req.user), 'Radiology order created'));
const addMedicationOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await service.addMedicationOrder(req.params.encounterId, req.body, req.user), 'Medication order created'));
const addProcedure = asyncHandler(async (req, res) => ApiResponse.created(res, await service.addProcedure(req.params.encounterId, req.body, req.user), 'Emergency procedure and invoice created'));
const updateProcedureStatus = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateProcedureStatus(req.params.id, req.body, req.user), 'Procedure status updated'));
const assignObservation = asyncHandler(async (req, res) => ApiResponse.created(res, await service.assignObservation(req.params.encounterId, req.body, req.user), 'Observation bed assigned'));
const releaseObservation = asyncHandler(async (req, res) => ApiResponse.success(res, await service.releaseObservation(req.params.id, req.user), 'Observation bed released'));
const disposition = asyncHandler(async (req, res) => ApiResponse.created(res, await service.disposition(req.params.encounterId, req.body, req.user), 'Emergency disposition completed'));
const getMeta = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getMeta(req.user), 'OK'));
const report = asyncHandler(async (req, res) => ApiResponse.success(res, await service.report(req.query), 'OK'));
const dashboard = asyncHandler(async (_req, res) => ApiResponse.success(res, await service.dashboard(), 'OK'));
const getOrders = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getOrders(req.params.encounterId), 'OK'));
const getBilling = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getBilling(req.params.encounterId), 'OK'));

module.exports = { list, getById, register, triage, updateTriage, assignDoctor, assessment, updateAssessment,
  addLabOrder, addRadiologyOrder, addMedicationOrder, addProcedure, updateProcedureStatus,
  assignObservation, releaseObservation, disposition, getMeta, report, dashboard, getOrders, getBilling };

