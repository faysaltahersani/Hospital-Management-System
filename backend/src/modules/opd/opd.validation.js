'use strict';

const Joi = require('joi');
const { OPD_VISIT_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    department_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...OPD_VISIT_STATUS_VALUES),
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
    visit_date: Joi.date().iso(),
    chief_complaint: Joi.string().max(255).allow('', null),
    vitals: Joi.string().max(2000).allow('', null),
    diagnosis: Joi.string().max(4000).allow('', null),
    advice: Joi.string().max(4000).allow('', null),
    consultation_fee: Joi.number().precision(2).min(0),
    follow_up_date: Joi.date().iso().allow(null),
    status: Joi.string().valid(...OPD_VISIT_STATUS_VALUES),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    chief_complaint: Joi.string().max(255).allow('', null),
    vitals: Joi.string().max(2000).allow('', null),
    diagnosis: Joi.string().max(4000).allow('', null),
    advice: Joi.string().max(4000).allow('', null),
    consultation_fee: Joi.number().precision(2).min(0),
    follow_up_date: Joi.date().iso().allow(null),
  }).min(1),
};

const complete = {
  params: idParam.params,
  body: Joi.object({
    diagnosis: Joi.string().max(4000).allow('', null),
    advice: Joi.string().max(4000).allow('', null),
    follow_up_date: Joi.date().iso().allow(null),
  }),
};

// BUG-004 — POST /opd/bills previously had no schema at all, so any body was
// accepted (including negative fees). Money fields are validated here and
// recomputed server-side in the service.
const createBill = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().required(),
    visit_date: Joi.date().iso(),
    chief_complaint: Joi.string().max(5000).allow('', null),
    vitals: Joi.string().max(5000).allow('', null),
    diagnosis: Joi.string().max(5000).allow('', null),
    advice: Joi.string().max(5000).allow('', null),
    notes: Joi.string().max(5000).allow('', null),
    consultation_fee: Joi.number().precision(2).min(0),
    discount: Joi.number().precision(2).min(0),
    discount_percent: Joi.number().min(0).max(100),
    tax: Joi.number().precision(2).min(0),
    tax_rate: Joi.number().min(0).max(100),
    payments: Joi.array().items(
      Joi.object({
        account_name: Joi.string().max(100).allow('', null),
        method: Joi.string().max(100).allow('', null),
        amount: Joi.number().precision(2).min(0).required(),
        reference: Joi.string().max(150).allow('', null),
      })
    ),
    // Accepted for backward compatibility with the entry form; not persisted as
    // structured data (see BUG-048).
    charge_description: Joi.any(),
    symptoms: Joi.any(),
    symptoms_type_id: Joi.any(),
    symptoms_head_id: Joi.any(),
    reference: Joi.string().max(150).allow('', null),
  }),
};

module.exports = {
  createBill,
  list,
  create,
  update,
  complete,
  cancel: idParam,
  getById: idParam,
  remove: idParam,
};
