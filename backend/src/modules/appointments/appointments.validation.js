'use strict';

const Joi = require('joi');
const { APPOINTMENT_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    department_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...APPOINTMENT_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const create = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().required(),
    appointment_date: Joi.date().iso().required(),
    appointment_time: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .required(),
    reason: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    consultation_fee: Joi.number().precision(2).min(0),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    appointment_date: Joi.date().iso(),
    appointment_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
    reason: Joi.string().max(255).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    consultation_fee: Joi.number().precision(2).min(0),
  }).min(1),
};

const updateStatus = {
  params: idParam.params,
  body: Joi.object({
    status: Joi.string().valid(...APPOINTMENT_STATUS_VALUES).required(),
  }),
};

const availableSlots = {
  query: Joi.object({
    doctor_id: Joi.number().integer().positive().required(),
    shift_id: Joi.number().integer().positive().allow(null, ''),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  }),
};

module.exports = {
  list,
  create,
  update,
  updateStatus,
  availableSlots,
  getById: idParam,
  remove: idParam,
};
