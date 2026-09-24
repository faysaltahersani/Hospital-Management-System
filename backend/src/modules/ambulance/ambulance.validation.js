'use strict';

const Joi = require('joi');
const { AMBULANCE_STATUS_VALUES, TRIP_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const listAmbulances = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    status: Joi.string().valid(...AMBULANCE_STATUS_VALUES),
    search: Joi.string().max(150),
  }),
};

const createAmbulance = {
  body: Joi.object({
    vehicle_number: Joi.string().max(50).required(),
    model: Joi.string().max(150).allow('', null),
    manufacture_year: Joi.number().integer().min(1900).max(2100).allow('', null),
    driver_name: Joi.string().max(150).allow('', null),
    driver_phone: Joi.string().max(30).allow('', null),
    driver_license: Joi.string().max(1000).allow('', null),
    capacity: Joi.number().integer().min(1).default(1),
    base_fare: Joi.number().precision(2).min(0).default(0),
    per_km_rate: Joi.number().precision(2).min(0).default(0),
    status: Joi.string().valid(...AMBULANCE_STATUS_VALUES).default('available'),
    notes: Joi.string().max(255).allow('', null),
  }),
};

const updateAmbulance = {
  params: idParam.params,
  body: Joi.object({
    model: Joi.string().max(150).allow('', null),
    manufacture_year: Joi.number().integer().min(1900).max(2100).allow('', null),
    driver_name: Joi.string().max(150).allow('', null),
    driver_phone: Joi.string().max(30).allow('', null),
    driver_license: Joi.string().max(1000).allow('', null),
    capacity: Joi.number().integer().min(1),
    base_fare: Joi.number().precision(2).min(0),
    per_km_rate: Joi.number().precision(2).min(0),
    status: Joi.string().valid(...AMBULANCE_STATUS_VALUES),
    notes: Joi.string().max(255).allow('', null),
  }).min(1),
};

const listTrips = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    ambulance_id: Joi.number().integer().positive(),
    patient_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...TRIP_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const dispatchTrip = {
  body: Joi.object({
    ambulance_id: Joi.number().integer().positive().required(),
    patient_id: Joi.number().integer().positive().allow(null),
    requester_name: Joi.string().max(150).allow('', null),
    requester_phone: Joi.string().max(30).allow('', null),
    pickup_address: Joi.string().max(255).required(),
    dropoff_address: Joi.string().max(255).required(),
    distance_km: Joi.number().precision(2).min(0).default(0),
    fare: Joi.number().precision(2).min(0),
    dispatched_at: Joi.date().iso(),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

const updateTrip = {
  params: idParam.params,
  body: Joi.object({
    pickup_address: Joi.string().max(255),
    dropoff_address: Joi.string().max(255),
    distance_km: Joi.number().precision(2).min(0),
    fare: Joi.number().precision(2).min(0),
    notes: Joi.string().max(2000).allow('', null),
  }).min(1),
};

const completeTrip = {
  params: idParam.params,
  body: Joi.object({
    completed_at: Joi.date().iso(),
    distance_km: Joi.number().precision(2).min(0),
    fare: Joi.number().precision(2).min(0),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

const cancelTrip = {
  params: idParam.params,
  body: Joi.object({
    notes: Joi.string().max(2000).allow('', null),
  }),
};

module.exports = {
  listAmbulances,
  createAmbulance,
  updateAmbulance,
  getAmbulance: idParam,
  removeAmbulance: idParam,
  listTrips,
  dispatchTrip,
  updateTrip,
  completeTrip,
  cancelTrip,
  getTrip: idParam,
  removeTrip: idParam,
};
