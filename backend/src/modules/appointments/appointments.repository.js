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
const { dateOnlyRange } = require('../../utils/dateUtils');
const { Appointment, Patient, Doctor, Department, User } = require('../../models');

const includes = [
  {
    model: Patient,
    as: 'patient',
    attributes: ['id', 'patient_code', 'full_name', 'gender', 'phone'],
  },
  {
    model: Doctor,
    as: 'doctor',
    attributes: ['id', 'doctor_code', 'specialization', 'consultation_fee'],
    include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
  },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateOnlyRange(dateRange);
  if (range) where.appointment_date = range;
  if (search) {
    where[Op.or] = [
      { appointment_code: { [Op.like]: `%${search}%` } },
      { reason: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
    ];
  }
  return Appointment.findAndCountAll({
    where,
    include: includes,
    limit,
    offset,
    order: [
      ['appointment_date', 'DESC'],
      ['appointment_time', 'DESC'],
    ],
    distinct: true,
    subQuery: false,
  });
};

const findById = (id) => Appointment.findByPk(id, { include: includes });

const findConflict = ({ doctor_id, appointment_date, appointment_time, excludeId }) => {
  const where = {
    doctor_id,
    appointment_date,
    appointment_time,
    status: { [Op.notIn]: ['cancelled', 'no_show'] },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  return Appointment.findOne({ where });
};

const countForYear = (year, options = {}) =>
  Appointment.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const create = (data, options = {}) => Appointment.create(data, options);
const update = (appt, changes, options = {}) => appt.update(changes, options);
const destroy = (appt, options = {}) => appt.destroy(options);

const findAppointmentsForDate = ({ doctorId, date, statuses }) =>
  Appointment.findAll({
    where: {
      doctor_id: doctorId,
      appointment_date: date,
      status: { [Op.in]: statuses },
    },
    order: [['appointment_time', 'ASC']],
  });

module.exports = {
  findAndCount,
  findById,
  findConflict,
  findAppointmentsForDate,
  countForYear,
  create,
  update,
  destroy,
};
