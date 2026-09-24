'use strict';

const Joi = require('joi');

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    department_id: Joi.number().integer().positive(),
    is_available: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const create = {
  body: Joi.object({
    user_id: Joi.number().integer().positive().allow(null),
    full_name: Joi.string().min(2).max(150).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    phone: Joi.string().max(30).allow('', null),
    gender: Joi.string().allow('', null),
    blood_group: Joi.string().allow('', null),
    department_id: Joi.number().integer().positive().required(),
    specialization: Joi.string().max(150).allow('', null),
    qualifications: Joi.string().max(255).allow('', null),
    license_number: Joi.string().max(1000).allow('', null),
    years_of_experience: Joi.number().integer().min(0).default(0),
    consultation_fee: Joi.number().precision(2).min(0).default(0),
    is_available: Joi.boolean().default(true),
    appointment_shifts: Joi.array().allow(null),
    appointment_charge_categories: Joi.array().allow(null),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    full_name: Joi.string().min(2).max(150).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    phone: Joi.string().max(30).allow('', null),
    gender: Joi.string().allow('', null),
    blood_group: Joi.string().allow('', null),
    department_id: Joi.number().integer().positive(),
    specialization: Joi.string().max(150).allow('', null),
    qualifications: Joi.string().max(255).allow('', null),
    license_number: Joi.string().max(1000).allow('', null),
    years_of_experience: Joi.number().integer().min(0),
    consultation_fee: Joi.number().precision(2).min(0),
    is_available: Joi.boolean(),
    appointment_shifts: Joi.array().allow(null),
    appointment_charge_categories: Joi.array().allow(null),
  }).min(1),
};

const availableSlots = {
  params: idParam.params,
  query: Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
    end_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
    slot_minutes: Joi.number().integer().min(5).max(240),
  }),
};

module.exports = { list, create, update, availableSlots, getById: idParam, remove: idParam };
