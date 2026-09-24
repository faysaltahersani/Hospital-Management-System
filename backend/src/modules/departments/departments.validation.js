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
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const create = {
  body: Joi.object({
    name: Joi.string().min(2).max(150).required(),
    code: Joi.string().min(2).max(30).uppercase().optional().allow('', null),
    description: Joi.string().max(1000).allow('', null),
    is_active: Joi.boolean().default(true),
  }),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    name: Joi.string().min(2).max(150),
    code: Joi.string().min(2).max(30).uppercase(),
    description: Joi.string().max(1000).allow('', null),
    is_active: Joi.boolean(),
  }).min(1),
};

module.exports = { list, create, update, getById: idParam, remove: idParam };
