'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { generateEmployeeCode, generatePayrollCode } = require('../../utils/codeGenerator');
const { currentYear } = require('../../utils/dateUtils');
const { withCodeRetry } = require('../../utils/sequence');
const { PAYROLL_STATUS } = require('../../config/constants');
const { User, Department } = require('../../models');
const repository = require('./hr.repository');

const toMoney = (value) => Number(value || 0);

const listEmployees = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.department_id) filters.department_id = query.department_id;
  if (query.is_active !== undefined) filters.is_active = query.is_active;
  const { rows, count } = await repository.findAndCountEmployees({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((e) => e.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getEmployee = async (id) => {
  const employee = await repository.findEmployeeById(id);
  if (!employee) throw ApiError.notFound('Employee not found');
  return employee.toJSON();
};

const ensureEmployeeReferences = async (input) => {
  if (input.user_id) {
    const user = await User.findByPk(input.user_id);
    if (!user) throw ApiError.badRequest('User not found');
  }
  if (input.department_id) {
    const department = await Department.findByPk(input.department_id);
    if (!department) throw ApiError.badRequest('Department not found');
  }
};

const createEmployee = async (input) => {
  await ensureEmployeeReferences(input);
  const year = currentYear();
  const employee = await withCodeRetry(async () => {
    const sequence = (await repository.countEmployeesForYear(year)) + 1;
    const employee_code = generateEmployeeCode(year, sequence);
    return repository.createEmployee({ ...input, employee_code });
  });
  return (await repository.findEmployeeById(employee.id)).toJSON();
};

const updateEmployee = async (id, changes) => {
  const employee = await repository.findEmployeeById(id);
  if (!employee) throw ApiError.notFound('Employee not found');
  await ensureEmployeeReferences(changes);
  await repository.updateEmployee(employee, changes);
  return (await repository.findEmployeeById(id)).toJSON();
};

const removeEmployee = async (id) => {
  const employee = await repository.findEmployeeById(id);
  if (!employee) throw ApiError.notFound('Employee not found');
  await repository.destroyEmployee(employee);
  return { message: 'Employee deleted' };
};

const listAttendance = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.employee_id) filters.employee_id = query.employee_id;
  if (query.status) filters.status = query.status;
  const { rows, count } = await repository.findAndCountAttendance({
    filters,
    dateRange: { from: query.from, to: query.to },
    limit,
    offset,
  });
  return { items: rows.map((a) => a.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const createAttendance = async (input) => {
  const employee = await repository.findEmployeeById(input.employee_id);
  if (!employee) throw ApiError.badRequest('Employee not found');
  const existing = await repository.findAttendanceByEmployeeDate(input.employee_id, input.attendance_date);
  if (existing) throw ApiError.conflict('Attendance already exists for this date');
  const attendance = await repository.createAttendance(input);
  return (await repository.findAttendanceById(attendance.id)).toJSON();
};

const updateAttendance = async (id, changes) => {
  const attendance = await repository.findAttendanceById(id);
  if (!attendance) throw ApiError.notFound('Attendance not found');
  await repository.updateAttendance(attendance, changes);
  return (await repository.findAttendanceById(id)).toJSON();
};

const removeAttendance = async (id) => {
  const attendance = await repository.findAttendanceById(id);
  if (!attendance) throw ApiError.notFound('Attendance not found');
  await repository.destroyAttendance(attendance);
  return { message: 'Attendance deleted' };
};

const listPayrolls = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.employee_id) filters.employee_id = query.employee_id;
  if (query.period_year) filters.period_year = query.period_year;
  if (query.period_month) filters.period_month = query.period_month;
  if (query.status) filters.status = query.status;
  const { rows, count } = await repository.findAndCountPayrolls({
    filters,
    search: query.search,
    dateRange: { from: query.from, to: query.to },
    limit,
    offset,
  });
  return { items: rows.map((p) => p.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getPayroll = async (id) => {
  const payroll = await repository.findPayrollById(id);
  if (!payroll) throw ApiError.notFound('Payroll not found');
  return payroll.toJSON();
};

const createPayroll = async (input) => {
  const employee = await repository.findEmployeeById(input.employee_id);
  if (!employee) throw ApiError.badRequest('Employee not found');
  const existing = await repository.findPayrollByEmployeePeriod(
    input.employee_id,
    input.period_year,
    input.period_month
  );
  if (existing) throw ApiError.conflict('Payroll already exists for this employee and period');

  const basicSalary = input.basic_salary !== undefined ? toMoney(input.basic_salary) : toMoney(employee.basic_salary);
  const netPay = basicSalary + toMoney(input.allowances) - toMoney(input.deductions) - toMoney(input.tax);
  const year = currentYear();
  const payroll = await withCodeRetry(async () => {
    const sequence = (await repository.countPayrollsForYear(year)) + 1;
    const payroll_code = generatePayrollCode(year, sequence);
    return repository.createPayroll({
      payroll_code,
      employee_id: input.employee_id,
      period_year: input.period_year,
      period_month: input.period_month,
      basic_salary: basicSalary,
      allowances: input.allowances || 0,
      deductions: input.deductions || 0,
      tax: input.tax || 0,
      net_pay: netPay,
      working_days: input.working_days || 0,
      present_days: input.present_days || 0,
      status: input.status || PAYROLL_STATUS.PENDING,
      paid_at: input.paid_at || null,
      paid_by: input.paid_by || null,
      notes: input.notes || null,
    });
  });
  return (await repository.findPayrollById(payroll.id)).toJSON();
};

const updatePayroll = async (id, changes) => {
  const payroll = await repository.findPayrollById(id);
  if (!payroll) throw ApiError.notFound('Payroll not found');
  const basicSalary = changes.basic_salary !== undefined ? toMoney(changes.basic_salary) : toMoney(payroll.basic_salary);
  const allowances = changes.allowances !== undefined ? toMoney(changes.allowances) : toMoney(payroll.allowances);
  const deductions = changes.deductions !== undefined ? toMoney(changes.deductions) : toMoney(payroll.deductions);
  const tax = changes.tax !== undefined ? toMoney(changes.tax) : toMoney(payroll.tax);
  const next = {
    ...changes,
    net_pay: basicSalary + allowances - deductions - tax,
  };
  if (next.status === PAYROLL_STATUS.PAID && !next.paid_at && !payroll.paid_at) {
    next.paid_at = new Date();
  }
  await repository.updatePayroll(payroll, next);
  return (await repository.findPayrollById(id)).toJSON();
};

const removePayroll = async (id) => {
  const payroll = await repository.findPayrollById(id);
  if (!payroll) throw ApiError.notFound('Payroll not found');
  await repository.destroyPayroll(payroll);
  return { message: 'Payroll deleted' };
};

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
