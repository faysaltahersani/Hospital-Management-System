'use strict';

const Joi = require('joi');
const { PRESCRIPTION_STATUS, PRESCRIPTION_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const item = Joi.object({
  medicine_id: Joi.number().integer().positive().allow(null),
  medicine_name: Joi.string().max(200).when('medicine_id', {
    is: Joi.exist().not(null),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  dosage: Joi.string().max(1000).allow('', null),
  frequency: Joi.string().max(1000).allow('', null),
  duration: Joi.string().max(1000).allow('', null),
  quantity: Joi.number().integer().min(1).default(1),
  instructions: Joi.string().max(2000).allow('', null),
});

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...PRESCRIPTION_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const create = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().required(),
    appointment_id: Joi.number().integer().positive().allow(null),
    prescribed_at: Joi.date().iso(),
    diagnosis: Joi.string().max(4000).allow('', null),
    notes: Joi.string().max(4000).allow('', null),
    status: Joi.string().valid(...PRESCRIPTION_STATUS_VALUES).default(PRESCRIPTION_STATUS.DRAFT),
    items: Joi.array().items(item).default([]),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    appointment_id: Joi.number().integer().positive().allow(null),
    prescribed_at: Joi.date().iso(),
    diagnosis: Joi.string().max(4000).allow('', null),
    notes: Joi.string().max(4000).allow('', null),
    status: Joi.string().valid(...PRESCRIPTION_STATUS_VALUES),
    items: Joi.array().items(item),
  }).min(1),
};

const updateStatus = {
  params: idParam.params,
  body: Joi.object({ status: Joi.string().valid(...PRESCRIPTION_STATUS_VALUES).required() }),
};

module.exports = { list, getById: idParam, create, update, updateStatus, remove: idParam };
