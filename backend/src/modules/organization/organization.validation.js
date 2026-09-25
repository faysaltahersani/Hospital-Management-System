'use strict';

const Joi = require('joi');

const entities = ['organizations', 'hospitals', 'branches'];
const entityParam = Joi.string().valid(...entities).required();
const positiveId = Joi.number().integer().positive();

const params = (withId = false) =>
  Joi.object({
    entity: entityParam,
    ...(withId ? { id: positiveId.required() } : {}),
  });

const list = {
  params: params(),
  query: Joi.object({
    page: positiveId,
    limit: positiveId.max(1000),
    search: Joi.string().trim().max(180),
    is_active: Joi.boolean(),
    organization_id: positiveId,
    hospital_id: positiveId,
  }),
};

const common = {
  code: Joi.string().trim().max(40),
  name: Joi.string().trim().min(2).max(180),
  is_active: Joi.boolean(),
};

const create = {
  params: params(),
  body: Joi.object({
    ...common,
    name: common.name.required(),
    organization_id: positiveId,
    hospital_id: positiveId,
    legal_name: Joi.string().trim().max(220).allow('', null),
    registration_number: Joi.string().trim().max(100).allow('', null),
    timezone: Joi.string().trim().max(60),
    currency_code: Joi.string().trim().uppercase().length(3),
    hospital_type: Joi.string().trim().max(60).allow('', null),
    license_number: Joi.string().trim().max(100).allow('', null),
    phone: Joi.string().trim().max(30).allow('', null),
    email: Joi.string().trim().email().max(150).allow('', null),
    address: Joi.string().trim().max(2000).allow('', null),
    is_main: Joi.boolean(),
  }),
};

const update = {
  params: params(true),
  body: create.body.fork(['name'], (schema) => schema.optional()).min(1),
};

module.exports = {
  list,
  getById: { params: params(true) },
  create,
  update,
  remove: { params: params(true) },
};
