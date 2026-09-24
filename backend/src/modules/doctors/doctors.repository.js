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
const { dateTimeRange } = require('../../utils/dateUtils');
const { Appointment, Doctor, User, Department } = require('../../models');

const includeUser = { model: User, as: 'user', attributes: ['id', 'email', 'full_name', 'phone', 'is_active'] };
const includeDepartment = { model: Department, as: 'department', attributes: ['id', 'name', 'code'] };

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.created_at = range;
  if (search) {
    where[Op.or] = [
      { doctor_code: { [Op.like]: `%${search}%` } },
      { specialization: { [Op.like]: `%${search}%` } },
      { license_number: { [Op.like]: `%${search}%` } },
      { '$user.full_name$': { [Op.like]: `%${search}%` } },
      { '$user.email$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Doctor.findAndCountAll({
    where,
    include: [includeUser, includeDepartment],
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });
};

const findById = (id) =>
  Doctor.findByPk(id, { include: [includeUser, includeDepartment] });

const findByUserId = (userId) => Doctor.findOne({ where: { user_id: userId } });

const findAppointmentsForDate = ({ doctorId, date, statuses }) =>
  Appointment.findAll({
    where: {
      doctor_id: doctorId,
      appointment_date: date,
      status: { [Op.in]: statuses },
    },
    order: [['appointment_time', 'ASC']],
  });

const countForYear = (year, options = {}) =>
  Doctor.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const create = (data, options = {}) => Doctor.create(data, options);
const update = (doctor, changes, options = {}) => doctor.update(changes, options);
const destroy = (doctor, options = {}) => doctor.destroy(options);

module.exports = {
  findAndCount,
  findById,
  findByUserId,
  findAppointmentsForDate,
  countForYear,
  create,
  update,
  destroy,
};
