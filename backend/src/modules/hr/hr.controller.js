'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./hr.service');

const listEmployees = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listEmployees(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getEmployee = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getEmployee(req.params.id), 'OK'));

const createEmployee = asyncHandler(async (req, res) => {
  const employee = await service.createEmployee(req.body);
  return ApiResponse.created(res, employee, 'Employee created');
});

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await service.updateEmployee(req.params.id, req.body);
  return ApiResponse.success(res, employee, 'Employee updated');
});

const removeEmployee = asyncHandler(async (req, res) => {
  const result = await service.removeEmployee(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listAttendance = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAttendance(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createAttendance = asyncHandler(async (req, res) => {
  const attendance = await service.createAttendance(req.body);
  return ApiResponse.created(res, attendance, 'Attendance created');
});

const updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await service.updateAttendance(req.params.id, req.body);
  return ApiResponse.success(res, attendance, 'Attendance updated');
});

const removeAttendance = asyncHandler(async (req, res) => {
  const result = await service.removeAttendance(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listPayrolls = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayrolls(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPayroll = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getPayroll(req.params.id), 'OK'));

const createPayroll = asyncHandler(async (req, res) => {
  const payroll = await service.createPayroll(req.body);
  return ApiResponse.created(res, payroll, 'Payroll created');
});

const updatePayroll = asyncHandler(async (req, res) => {
  const payroll = await service.updatePayroll(req.params.id, req.body);
  return ApiResponse.success(res, payroll, 'Payroll updated');
});

const removePayroll = asyncHandler(async (req, res) => {
  const result = await service.removePayroll(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  removeEmployee,
  listAttendance,
  createAttendance,
  updateAttendance,
  removeAttendance,
  listPayrolls,
  getPayroll,
  createPayroll,
  updatePayroll,
  removePayroll,
};
