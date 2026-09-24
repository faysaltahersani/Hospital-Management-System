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
const { Ambulance, AmbulanceTrip, Patient } = require('../../models');

const findAndCountAmbulances = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { vehicle_number: { [Op.like]: `%${search}%` } },
      { driver_name: { [Op.like]: `%${search}%` } },
      { driver_phone: { [Op.like]: `%${search}%` } },
    ];
  }
  return Ambulance.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'DESC']],
  });
};

const findAmbulanceById = (id) => Ambulance.findByPk(id);
const findAmbulanceByVehicle = (vehicleNumber) =>
  Ambulance.findOne({ where: { vehicle_number: vehicleNumber } });
const createAmbulance = (data, options = {}) => Ambulance.create(data, options);
const updateAmbulance = (a, c, options = {}) => a.update(c, options);
const destroyAmbulance = (a, options = {}) => a.destroy(options);

const tripIncludes = [
  { model: Ambulance, as: 'ambulance', attributes: ['id', 'vehicle_number', 'driver_name', 'driver_phone'] },
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
];

const findAndCountTrips = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.dispatched_at = range;
  if (search) {
    where[Op.or] = [
      { trip_code: { [Op.like]: `%${search}%` } },
      { pickup_address: { [Op.like]: `%${search}%` } },
      { dropoff_address: { [Op.like]: `%${search}%` } },
    ];
  }
  return AmbulanceTrip.findAndCountAll({
    where,
    include: tripIncludes,
    limit,
    offset,
    order: [['dispatched_at', 'DESC']],
    distinct: true,
  });
};

const findTripById = (id, options = {}) =>
  AmbulanceTrip.findByPk(id, { include: tripIncludes, ...options });

const countTripsForYear = (year, options = {}) =>
  AmbulanceTrip.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });

const createTrip = (data, options = {}) => AmbulanceTrip.create(data, options);
const updateTrip = (trip, changes, options = {}) => trip.update(changes, options);
const destroyTrip = (trip, options = {}) => trip.destroy(options);

module.exports = {
  findAndCountAmbulances,
  findAmbulanceById,
  findAmbulanceByVehicle,
  createAmbulance,
  updateAmbulance,
  destroyAmbulance,
  findAndCountTrips,
  findTripById,
  countTripsForYear,
  createTrip,
  updateTrip,
  destroyTrip,
};
