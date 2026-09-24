'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./blood-bank.service');

const listDonors = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listDonors(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});
const getDonor = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.getDonor(req.params.id), 'OK');
});
const createDonor = asyncHandler(async (req, res) => {
  return ApiResponse.created(res, await service.createDonor(req.body), 'Donor created');
});
const updateDonor = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.updateDonor(req.params.id, req.body), 'Donor updated');
});
const removeDonor = asyncHandler(async (req, res) => {
  const r = await service.removeDonor(req.params.id);
  return ApiResponse.success(res, null, r.message);
});

const listBags = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listBags(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});
const getBag = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.getBag(req.params.id), 'OK');
});
const createBag = asyncHandler(async (req, res) => {
  return ApiResponse.created(res, await service.createBag(req.body), 'Blood bag added');
});
const updateBag = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.updateBag(req.params.id, req.body), 'Blood bag updated');
});
const recordBagScreening = asyncHandler(async (req, res) => {
  const data = await service.recordBagScreening(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, data, 'Screening result recorded');
});
const removeBag = asyncHandler(async (req, res) => {
  const r = await service.removeBag(req.params.id);
  return ApiResponse.success(res, null, r.message);
});
const stockSummary = asyncHandler(async (_req, res) => {
  return ApiResponse.success(res, await service.getStockSummary(), 'OK');
});

const listIssues = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listIssues(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});
const getIssue = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.getIssue(req.params.id), 'OK');
});
const issueBag = asyncHandler(async (req, res) => {
  return ApiResponse.created(res, await service.issueBag(req.body, req.user.id), 'Blood bag issued');
});
const removeIssue = asyncHandler(async (req, res) => {
  const r = await service.removeIssue(req.params.id);
  return ApiResponse.success(res, null, r.message);
});

const listComponents = asyncHandler(async (req, res) => ApiResponse.success(res, await service.listBloodMasterOptions('blood_component', req.query)));
const createComponent = asyncHandler(async (req, res) => ApiResponse.created(res, await service.createBloodMasterOption('blood_component', req.body)));
const updateComponent = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateBloodMasterOption(req.params.id, req.body)));
const deleteComponent = asyncHandler(async (req, res) => ApiResponse.success(res, await service.deleteBloodMasterOption(req.params.id)));

const listUnits = asyncHandler(async (req, res) => ApiResponse.success(res, await service.listBloodMasterOptions('blood_unit', req.query)));
const createUnit = asyncHandler(async (req, res) => ApiResponse.created(res, await service.createBloodMasterOption('blood_unit', req.body)));
const updateUnit = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateBloodMasterOption(req.params.id, req.body)));
const deleteUnit = asyncHandler(async (req, res) => ApiResponse.success(res, await service.deleteBloodMasterOption(req.params.id)));

const listGroups = asyncHandler(async (req, res) => ApiResponse.success(res, await service.listBloodMasterOptions('blood_group', req.query)));
const createGroup = asyncHandler(async (req, res) => ApiResponse.created(res, await service.createBloodMasterOption('blood_group', req.body)));
const updateGroup = asyncHandler(async (req, res) => ApiResponse.success(res, await service.updateBloodMasterOption(req.params.id, req.body)));
const deleteGroup = asyncHandler(async (req, res) => ApiResponse.success(res, await service.deleteBloodMasterOption(req.params.id)));

module.exports = {
  listDonors,
  getDonor,
  createDonor,
  updateDonor,
  removeDonor,
  listBags,
  getBag,
  createBag,
  updateBag,
  recordBagScreening,
  removeBag,
  stockSummary,
  listIssues,
  getIssue,
  issueBag,
  removeIssue,
  listComponents,
  createComponent,
  updateComponent,
  deleteComponent,
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
