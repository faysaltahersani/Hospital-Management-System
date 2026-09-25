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
const {
  Patient,
  User,
  Appointment,
  OpdVisit,
  Admission,
  Prescription,
  LabOrder,
  RadiologyOrder,
  Invoice,
  MedicineSale,
  EmergencyEncounter,
  VitalSign,
  ClinicalNote,
} = require('../../models');

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.created_at = range;
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { patient_code: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }
  return Patient.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role'],
      },
    ],
  });
};

const findById = (id) =>
  Patient.findByPk(id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role'],
      },
    ],
  });

const findTimelineByPatientId = async (patientId, { limit = 20 } = {}) => {
  const commonWhere = { patient_id: patientId };
  const [appointments, opdVisits, admissions, emergencyEncounters, prescriptions, labOrders, radiologyOrders, invoices, medicineSales, vitalSigns, clinicalNotes] =
    await Promise.all([
      Appointment.findAll({ where: commonWhere, limit, order: [['appointment_date', 'DESC'], ['appointment_time', 'DESC']] }),
      OpdVisit.findAll({ where: commonWhere, limit, order: [['visit_date', 'DESC']] }),
      Admission.findAll({ where: commonWhere, limit, order: [['admitted_at', 'DESC']] }),
      EmergencyEncounter.findAll({ where: commonWhere, limit, order: [['arrival_at', 'DESC']] }),
      Prescription.findAll({ where: commonWhere, limit, order: [['prescribed_at', 'DESC']] }),
      LabOrder.findAll({ where: commonWhere, limit, order: [['ordered_at', 'DESC']] }),
      RadiologyOrder.findAll({ where: commonWhere, limit, order: [['ordered_at', 'DESC']] }),
      Invoice.findAll({ where: commonWhere, limit, order: [['issued_at', 'DESC']] }),
      MedicineSale.findAll({ where: commonWhere, limit, order: [['sold_at', 'DESC']] }),
      VitalSign.findAll({ where: commonWhere, limit, order: [['captured_at', 'DESC']] }),
      ClinicalNote.findAll({ where: commonWhere, limit, order: [['created_at', 'DESC']] }),
    ]);

  return {
    appointments,
    opd_visits: opdVisits,
    admissions,
    emergency_encounters: emergencyEncounters,
    prescriptions,
    lab_orders: labOrders,
    radiology_orders: radiologyOrders,
    invoices,
    medicine_sales: medicineSales,
    vital_signs: vitalSigns,
    clinical_notes: clinicalNotes,
  };
};

const countForYear = (year, options = {}) =>
  Patient.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const create = (data, options = {}) => Patient.create(data, options);
const update = (patient, changes, options = {}) => patient.update(changes, options);
const destroy = (patient, options = {}) => patient.destroy(options);

module.exports = { findAndCount, findById, findTimelineByPatientId, countForYear, create, update, destroy };
