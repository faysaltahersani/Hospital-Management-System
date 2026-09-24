'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./reports.service');

const dashboard = asyncHandler(async (req, res) => {
  const report = await service.dashboard(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const appointments = asyncHandler(async (req, res) => {
  const report = await service.appointments(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const finance = asyncHandler(async (req, res) => {
  const report = await service.finance(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const bedOccupancy = asyncHandler(async (_req, res) => {
  const report = await service.bedOccupancy();
  return ApiResponse.success(res, report, 'OK');
});

const bloodStock = asyncHandler(async (_req, res) => {
  const report = await service.bloodStock();
  return ApiResponse.success(res, report, 'OK');
});

const pharmacyStock = asyncHandler(async (req, res) => {
  const report = await service.pharmacyStock(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const patientLedger = asyncHandler(async (req, res) => {
  const report = await service.patientLedger(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const patientBalance = asyncHandler(async (req, res) => {
  const report = await service.patientBalance(req.query);
  return ApiResponse.success(res, report.data, 'OK', report.meta);
});

const accountLedger = asyncHandler(async (req, res) => {
  const report = await service.accountLedger(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const accountBalance = asyncHandler(async (req, res) => {
  const report = await service.accountBalance(req.query);
  return ApiResponse.success(res, report.data, 'OK', report.meta);
});

const dailyLedger = asyncHandler(async (req, res) => {
  const report = await service.dailyLedger(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const dailyStatement = asyncHandler(async (req, res) => {
  const report = await service.dailyStatement(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const referralPersonLedger = asyncHandler(async (req, res) => {
  const report = await service.referralPersonLedger(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const referralPersonBalance = asyncHandler(async (req, res) => {
  const report = await service.referralPersonBalance(req.query);
  return ApiResponse.success(res, report.data, 'OK', report.meta);
});

const supplierLedger = asyncHandler(async (req, res) => {
  const report = await service.supplierLedger(req.query);
  return ApiResponse.success(res, report, 'OK');
});

const supplierBalance = asyncHandler(async (req, res) => {
  const report = await service.supplierBalance(req.query);
  return ApiResponse.success(res, report.data, 'OK', report.meta);
});

module.exports = {
  dashboard,
  appointments,
  finance,
  bedOccupancy,
  bloodStock,
  pharmacyStock,
  patientLedger,
  patientBalance,
  accountLedger,
  accountBalance,
  dailyLedger,
  dailyStatement,
  referralPersonLedger,
  referralPersonBalance,
  supplierLedger,
  supplierBalance,
};
