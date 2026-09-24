'use strict';

// Sequelize options (notably `transaction`) are forwarded by every helper below.
// They used to be dropped: a service inside `sequelize.transaction(async (t))`
// would call `repository.create(data, { transaction: t })` and the row was written
// on a DIFFERENT pooled connection, outside the transaction. Two consequences,
// both observed under a 50-user load test:
//   * the write was not rolled back with its transaction, leaving orphans (an OPD
//     visit with no invoice when the billing step failed)
//   * each request needed a second connection while holding one, so with
//     DB_POOL_MAX=10 concurrent writers deadlocked the pool until the acquire
//     timeout fired

const { Op, Sequelize } = require('sequelize');
const { dateOnlyRange, dateTimeRange } = require('../../utils/dateUtils');
const { Employee, Attendance, Payroll, User, Department } = require('../../models');

const employeeIncludes = [
  { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'role'] },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
];

const findAndCountEmployees = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { employee_code: { [Op.like]: `%${search}%` } },
      { full_name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  return Employee.findAndCountAll({
    where,
    include: employeeIncludes,
    limit,
    offset,
    order: [['full_name', 'ASC']],
    distinct: true,
  });
};

const findEmployeeById = (id, options = {}) => Employee.findByPk(id, { include: employeeIncludes, ...options });
const findEmployeeByCode = (code, options = {}) => Employee.findOne({ where: { employee_code: code }, ...options });
const countEmployeesForYear = (year, options = {}) =>
  Employee.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createEmployee = (data, options = {}) => Employee.create(data, options);
const updateEmployee = (employee, changes, options = {}) => employee.update(changes, options);
const destroyEmployee = (employee, options = {}) => employee.destroy(options);

const attendanceIncludes = [
  { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'full_name', 'designation'] },
];

const findAndCountAttendance = ({ filters = {}, dateRange, limit, offset }) => {
  const where = { ...filters };
  const range = dateOnlyRange(dateRange);
  if (range) where.attendance_date = range;
  return Attendance.findAndCountAll({
    where,
    include: attendanceIncludes,
    limit,
    offset,
    order: [['attendance_date', 'DESC']],
    distinct: true,
  });
};

const findAttendanceById = (id, options = {}) => Attendance.findByPk(id, { include: attendanceIncludes, ...options });
const findAttendanceByEmployeeDate = (employeeId, attendanceDate, options = {}) =>
  Attendance.findOne({ where: { employee_id: employeeId, attendance_date: attendanceDate }, ...options });
const createAttendance = (data, options = {}) => Attendance.create(data, options);
const updateAttendance = (attendance, changes, options = {}) => attendance.update(changes, options);
const destroyAttendance = (attendance, options = {}) => attendance.destroy(options);

const payrollIncludes = [
  { model: Employee, as: 'employee', attributes: ['id', 'employee_code', 'full_name', 'designation'] },
];

const findAndCountPayrolls = ({ filters = {}, search, dateRange, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.createdAt = range;
  if (search) {
    where[Op.or] = [
      { payroll_code: { [Op.like]: `%${search}%` } },
      { notes: { [Op.like]: `%${search}%` } },
      { '$employee.full_name$': { [Op.like]: `%${search}%` } },
      { '$employee.employee_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Payroll.findAndCountAll({
    where,
    include: payrollIncludes,
    limit,
    offset,
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
    distinct: true,
    subQuery: false,
  });
};

const findPayrollById = (id, options = {}) => Payroll.findByPk(id, { include: payrollIncludes, ...options });
const findPayrollByEmployeePeriod = (employeeId, year, month, options = {}) =>
  Payroll.findOne({ where: { employee_id: employeeId, period_year: year, period_month: month }, ...options });
const countPayrollsForYear = (year, options = {}) =>
  Payroll.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createPayroll = (data, options = {}) => Payroll.create(data, options);
const updatePayroll = (payroll, changes, options = {}) => payroll.update(changes, options);
const destroyPayroll = (payroll, options = {}) => payroll.destroy(options);

module.exports = {
  findAndCountEmployees,
  findEmployeeById,
  findEmployeeByCode,
  countEmployeesForYear,
  createEmployee,
  updateEmployee,
  destroyEmployee,
  findAndCountAttendance,
  findAttendanceById,
  findAttendanceByEmployeeDate,
  createAttendance,
  updateAttendance,
  destroyAttendance,
  findAndCountPayrolls,
  findPayrollById,
  findPayrollByEmployeePeriod,
  countPayrollsForYear,
  createPayroll,
  updatePayroll,
  destroyPayroll,
};
