'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./referrals.service');

// ─── Referral (existing) ─────────────────────────────────────────────────────

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getById = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getById(req.params.id), 'OK'));

const create = asyncHandler(async (req, res) => {
  const referral = await service.create(req.body);
  return ApiResponse.created(res, referral, 'Referral created');
});

const update = asyncHandler(async (req, res) => {
  const referral = await service.update(req.params.id, req.body);
  return ApiResponse.success(res, referral, 'Referral updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const referral = await service.updateStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, referral, 'Referral status updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

// ─── Referral Persons ────────────────────────────────────────────────────────

const listPersons = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPersons(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPersonById = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.getPersonById(req.params.id), 'OK');
});

const createPerson = asyncHandler(async (req, res) => {
  const person = await service.createPerson(req.body);
  return ApiResponse.created(res, person, 'Referral person created');
});

const updatePerson = asyncHandler(async (req, res) => {
  const person = await service.updatePerson(req.params.id, req.body);
  return ApiResponse.success(res, person, 'Referral person updated');
});

const removePerson = asyncHandler(async (req, res) => {
  const result = await service.removePerson(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

// ─── Referral Bills ──────────────────────────────────────────────────────────

const listBills = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listBills(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getBillAccounts = asyncHandler(async (req, res) => {
  const accounts = await service.getBillAccounts();
  return ApiResponse.success(res, accounts, 'OK');
});

const createBill = asyncHandler(async (req, res) => {
  const bill = await service.createBill(req.body, req.user?.id);
  return ApiResponse.created(res, bill, 'Referral bill created');
});

const removeBill = asyncHandler(async (req, res) => {
  const result = await service.removeBill(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = {
  list, getById, create, update, updateStatus, remove,
  listPersons, getPersonById, createPerson, updatePerson, removePerson,
  listBills, getBillAccounts, createBill, removeBill,
};
