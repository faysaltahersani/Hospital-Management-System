'use strict';

const Joi = require('joi');
const {
  GENDER_VALUES,
  BLOOD_GROUPS,
  BLOOD_BAG_STATUS_VALUES,
} = require('../../config/constants');

const COMPONENTS = ['whole_blood', 'rbc', 'plasma', 'platelets', 'cryo'];

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const listDonors = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    gender: Joi.string().valid(...GENDER_VALUES),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const createDonor = {
  body: Joi.object({
    full_name: Joi.string().min(2).max(150).required(),
    gender: Joi.string().valid(...GENDER_VALUES).required(),
    blood_group: Joi.string().valid(...BLOOD_GROUPS).required(),
    date_of_birth: Joi.date().iso().less('now').allow(null),
    phone: Joi.string().max(30).allow('', null),
    guardian_contact_no: Joi.string().max(30).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    address: Joi.string().max(1000).allow('', null),
    is_active: Joi.boolean().default(true),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

const updateDonor = {
  params: idParam.params,
  body: Joi.object({
    full_name: Joi.string().min(2).max(150),
    gender: Joi.string().valid(...GENDER_VALUES),
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    date_of_birth: Joi.date().iso().less('now').allow(null),
    phone: Joi.string().max(30).allow('', null),
    guardian_contact_no: Joi.string().max(30).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    address: Joi.string().max(1000).allow('', null),
    is_active: Joi.boolean(),
    notes: Joi.string().max(2000).allow('', null),
  }).min(1),
};

const listBags = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    component: Joi.string().valid(...COMPONENTS),
    status: Joi.string().valid(...BLOOD_BAG_STATUS_VALUES),
    donor_id: Joi.number().integer().positive(),
    search: Joi.string().max(150),
  }),
};

const createBag = {
  body: Joi.object({
    donor_id: Joi.number().integer().positive().allow(null),
    blood_group: Joi.string().valid(...BLOOD_GROUPS).required(),
    component: Joi.string().valid(...COMPONENTS).default('whole_blood'),
    volume_ml: Joi.number().min(1).max(5000).default(450),
    collected_at: Joi.date().iso().allow('', null),
    expires_at: Joi.date().iso().allow('', null),
    price: Joi.number().precision(2).min(0).default(0),
    notes: Joi.string().max(2000).allow('', null),
  }).unknown(true),
};

const updateBag = {
  params: idParam.params,
  body: Joi.object({
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    component: Joi.string().valid(...COMPONENTS),
    volume_ml: Joi.number().integer().min(50).max(2000),
    collected_at: Joi.date().iso(),
    expires_at: Joi.date().iso(),
    price: Joi.number().precision(2).min(0),
    status: Joi.string().valid(...BLOOD_BAG_STATUS_VALUES),
    notes: Joi.string().max(2000).allow('', null),
  }).min(1),
};

// A screening result is its own action, not a bag field.
const recordBagScreening = {
  params: idParam.params,
  body: Joi.object({
    screening_status: Joi.string().valid('passed', 'failed', 'pending').required(),
    screened_at: Joi.date().iso(),
    notes: Joi.string().max(500).allow('', null),
  }),
};

const listIssues = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const issueBag = {
  body: Joi.object({
    // BUG-042 - counter collection recorded against the blood-issue invoice.
    payments: Joi.array().items(
      Joi.object({
        account_name: Joi.string().max(100).allow('', null),
        method: Joi.string().max(100).allow('', null),
        amount: Joi.number().precision(2).min(0).required(),
        reference: Joi.string().max(150).allow('', null),
      })
    ).allow(null),
    bag_id: Joi.number().integer().positive().required(),
    patient_id: Joi.number().integer().positive().allow(null),
    issued_to: Joi.string().max(150).allow('', null),
    issued_at: Joi.date().iso(),
    price: Joi.number().precision(2).min(0),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

module.exports = {
  listDonors,
  createDonor,
  updateDonor,
  getDonor: idParam,
  removeDonor: idParam,
  listBags,
  createBag,
  updateBag,
  recordBagScreening,
  getBag: idParam,
  removeBag: idParam,
  listIssues,
  issueBag,
  getIssue: idParam,
  removeIssue: idParam,
};
