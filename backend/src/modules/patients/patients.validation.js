'use strict';

const Joi = require('joi');
const { GENDER_VALUES, BLOOD_GROUPS } = require('../../config/constants');

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    gender: Joi.string().valid(...GENDER_VALUES),
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    search: Joi.string().max(150),
  }),
};

const timeline = {
  params: idParam.params,
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(1000),
  }),
};

const create = {
  body: Joi.object({
    full_name: Joi.string().min(2).max(150).required(),
    gender: Joi.string().valid(...GENDER_VALUES).required(),
    age: Joi.number().integer().min(0).max(150).allow(null),
    date_of_birth: Joi.date().iso().less('now').allow(null),
    blood_group: Joi.string().valid(...BLOOD_GROUPS).default('unknown'),
    marital_status: Joi.string().valid('single', 'married', 'widowed', 'divorced', 'other').allow(null),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    address: Joi.string().max(1000).allow('', null),
    emergency_contact_name: Joi.string().max(150).allow('', null),
    emergency_contact_phone: Joi.string().max(30).allow('', null),
    id_type: Joi.string().valid('nid', 'passport', 'birth_certificate', 'driving_license', 'other').allow(null),
    id_number: Joi.string().max(100).allow('', null),
    remarks: Joi.string().max(2000).allow('', null),
    user_id: Joi.number().integer().positive().allow(null),
    created_by: Joi.number().integer().positive().allow(null),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    full_name: Joi.string().min(2).max(150),
    gender: Joi.string().valid(...GENDER_VALUES),
    age: Joi.number().integer().min(0).max(150).allow(null),
    date_of_birth: Joi.date().iso().less('now').allow(null),
    blood_group: Joi.string().valid(...BLOOD_GROUPS),
    marital_status: Joi.string().valid('single', 'married', 'widowed', 'divorced', 'other').allow(null),
    phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email().lowercase().allow('', null),
    address: Joi.string().max(1000).allow('', null),
    emergency_contact_name: Joi.string().max(150).allow('', null),
    emergency_contact_phone: Joi.string().max(30).allow('', null),
    id_type: Joi.string().valid('nid', 'passport', 'birth_certificate', 'driving_license', 'other').allow(null),
    id_number: Joi.string().max(100).allow('', null),
    remarks: Joi.string().max(2000).allow('', null),
  }).min(1),
};

module.exports = { list, create, update, timeline, getById: idParam, remove: idParam };
