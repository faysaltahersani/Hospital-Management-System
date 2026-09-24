'use strict';

const Joi = require('joi');
const { ADMISSION_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    ward_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...ADMISSION_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const admit = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().allow(null),
    bed_id: Joi.number().integer().positive().required(),
    admitted_at: Joi.date().iso(),
    total_charges: Joi.number().min(0).allow(null),
    reason: Joi.string().max(2000).allow('', null),
    diagnosis: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(4000).allow('', null),
    payments: Joi.array().items(
      Joi.object({
        account_name: Joi.string().allow('', null),
        amount: Joi.number().min(0),
        paid_at: Joi.date().iso().allow(null),
      })
    ).allow(null),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    doctor_id: Joi.number().integer().positive().allow(null),
    reason: Joi.string().max(255).allow('', null),
    diagnosis: Joi.string().max(2000).allow('', null),
    notes: Joi.string().max(2000).allow('', null),
  }).min(1),
};

const transferBed = {
  params: idParam.params,
  body: Joi.object({
    bed_id: Joi.number().integer().positive().required(),
  }),
};

const discharge = {
  params: idParam.params,
  body: Joi.object({
    discharged_at: Joi.date().iso(),
    total_charges: Joi.number().precision(2).min(0),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

module.exports = {
  list,
  admit,
  update,
  transferBed,
  discharge,
  dischargeSummary: idParam,
  getById: idParam,
  remove: idParam,
};
