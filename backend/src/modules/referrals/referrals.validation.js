'use strict';

const Joi = require('joi');
const { REFERRAL_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    from_doctor_id: Joi.number().integer().positive(),
    to_doctor_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...REFERRAL_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const referralFields = {
  patient_id: Joi.number().integer().positive(),
  from_doctor_id: Joi.number().integer().positive().allow(null),
  to_doctor_id: Joi.number().integer().positive().allow(null),
  external_doctor_name: Joi.string().max(150).allow('', null),
  external_facility: Joi.string().max(200).allow('', null),
  external_phone: Joi.string().max(30).allow('', null),
  reason: Joi.string().max(255).allow('', null),
  notes: Joi.string().max(4000).allow('', null),
  referred_at: Joi.date().iso(),
  status: Joi.string().valid(...REFERRAL_STATUS_VALUES),
};

const create = {
  body: Joi.object({
    ...referralFields,
    patient_id: referralFields.patient_id.required(),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object(referralFields).min(1),
};

const updateStatus = {
  params: idParam.params,
  body: Joi.object({ status: Joi.string().valid(...REFERRAL_STATUS_VALUES).required() }),
};

module.exports = { list, getById: idParam, create, update, updateStatus, remove: idParam };
