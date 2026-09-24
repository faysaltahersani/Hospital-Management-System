'use strict';

const Joi = require('joi');
const { GENDER_VALUES, PAYROLL_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const attendanceStatuses = ['present', 'absent', 'leave', 'half_day', 'holiday'];

const listEmployees = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    department_id: Joi.number().integer().positive(),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const employeeFields = {
  user_id: Joi.number().integer().positive().allow(null),
  department_id: Joi.number().integer().positive().allow(null),
  full_name: Joi.string().max(150),
  designation: Joi.string().max(150).allow('', null),
  gender: Joi.string().valid(...GENDER_VALUES).allow(null),
  date_of_birth: Joi.date().iso().allow(null),
  phone: Joi.string().max(30).allow('', null),
  email: Joi.string().email().max(150).allow('', null),
  address: Joi.string().max(4000).allow('', null),
  joining_date: Joi.date().iso(),
  leaving_date: Joi.date().iso().allow(null),
  basic_salary: Joi.number().precision(2).min(0),
  bank_account: Joi.string().max(1000).allow('', null),
  is_active: Joi.boolean(),
};

const createEmployee = {
  body: Joi.object({
    ...employeeFields,
    full_name: employeeFields.full_name.required(),
    basic_salary: employeeFields.basic_salary.default(0),
    is_active: employeeFields.is_active.default(true),
  }),
};

const updateEmployee = {
  params: idParam.params,
  body: Joi.object(employeeFields).min(1),
};

const listAttendance = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    employee_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...attendanceStatuses),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
  }),
};

const attendanceFields = {
  employee_id: Joi.number().integer().positive(),
  attendance_date: Joi.date().iso(),
  check_in: Joi.date().iso().allow(null),
  check_out: Joi.date().iso().allow(null),
  status: Joi.string().valid(...attendanceStatuses),
  hours_worked: Joi.number().precision(2).min(0),
  notes: Joi.string().max(255).allow('', null),
};

const createAttendance = {
  body: Joi.object({
    ...attendanceFields,
    employee_id: attendanceFields.employee_id.required(),
    attendance_date: attendanceFields.attendance_date.required(),
    status: attendanceFields.status.default('present'),
    hours_worked: attendanceFields.hours_worked.default(0),
  }),
};

const updateAttendance = {
  params: idParam.params,
  body: Joi.object({
    check_in: attendanceFields.check_in,
    check_out: attendanceFields.check_out,
    status: attendanceFields.status,
    hours_worked: attendanceFields.hours_worked,
    notes: attendanceFields.notes,
  }).min(1),
};

const listPayrolls = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    employee_id: Joi.number().integer().positive(),
    period_year: Joi.number().integer().min(2000).max(2100),
    period_month: Joi.number().integer().min(1).max(12),
    status: Joi.string().valid(...PAYROLL_STATUS_VALUES),
  }),
};

const payrollFields = {
  employee_id: Joi.number().integer().positive(),
  period_year: Joi.number().integer().min(2000).max(2100),
  period_month: Joi.number().integer().min(1).max(12),
  basic_salary: Joi.number().precision(2).min(0),
  allowances: Joi.number().precision(2).min(0),
  deductions: Joi.number().precision(2).min(0),
  tax: Joi.number().precision(2).min(0),
  working_days: Joi.number().integer().min(0),
  present_days: Joi.number().integer().min(0),
  status: Joi.string().valid(...PAYROLL_STATUS_VALUES),
  paid_at: Joi.date().iso().allow(null),
  paid_by: Joi.number().integer().positive().allow(null),
  notes: Joi.string().max(4000).allow('', null),
};

const createPayroll = {
  body: Joi.object({
    ...payrollFields,
    employee_id: payrollFields.employee_id.required(),
    period_year: payrollFields.period_year.required(),
    period_month: payrollFields.period_month.required(),
    allowances: payrollFields.allowances.default(0),
    deductions: payrollFields.deductions.default(0),
    tax: payrollFields.tax.default(0),
    working_days: payrollFields.working_days.default(0),
    present_days: payrollFields.present_days.default(0),
  }),
};

const updatePayroll = {
  params: idParam.params,
  body: Joi.object({
    basic_salary: payrollFields.basic_salary,
    allowances: payrollFields.allowances,
    deductions: payrollFields.deductions,
    tax: payrollFields.tax,
    working_days: payrollFields.working_days,
    present_days: payrollFields.present_days,
    status: payrollFields.status,
    paid_at: payrollFields.paid_at,
    paid_by: payrollFields.paid_by,
    notes: payrollFields.notes,
  }).min(1),
};

module.exports = {
  listEmployees,
  getEmployee: idParam,
  createEmployee,
  updateEmployee,
  removeEmployee: idParam,
  listAttendance,
  createAttendance,
  updateAttendance,
  removeAttendance: idParam,
  listPayrolls,
  getPayroll: idParam,
  createPayroll,
  updatePayroll,
  removePayroll: idParam,
};
