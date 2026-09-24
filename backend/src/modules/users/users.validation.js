'use strict';

const Joi = require('joi');
const { ROLE_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    role: Joi.string().valid(...ROLE_VALUES),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

// BUG-040 - the admin panel accepted 4-character passwords while /auth/register
// required 8, so the weaker path was the one administrators actually used.
// One policy now applies everywhere: at least 8 characters with a mix of letters
// and numbers.
const strongPassword = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.name': 'Password must contain both letters and numbers',
  });

const create = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: strongPassword.required(),
    full_name: Joi.string().min(1).max(150).allow('', null),
    role: Joi.string().allow('', null),
    username: Joi.string().allow('', null),
    phone: Joi.string().max(30).allow('', null),
    branch: Joi.string().allow('', null),
    is_two_factor_enabled: Joi.boolean().allow(null),
    role_id: Joi.any().allow(null),
    user_type_ids: Joi.any().allow(null),
    user_type_id: Joi.any().allow(null),
    is_active: Joi.boolean().default(true),
  }).unknown(true),
};

const update = {
  params: idParam.params,
  body: Joi.object({
    email: Joi.string().email().lowercase().allow('', null),
    password: strongPassword.allow('', null),
    full_name: Joi.string().min(1).max(150).allow('', null),
    role: Joi.string().allow('', null),
    username: Joi.string().allow('', null),
    phone: Joi.string().max(30).allow('', null),
    branch: Joi.string().allow('', null),
    is_two_factor_enabled: Joi.boolean().allow(null),
    role_id: Joi.any().allow(null),
    user_type_ids: Joi.any().allow(null),
    user_type_id: Joi.any().allow(null),
    is_active: Joi.boolean(),
  }).min(1).unknown(true),
};

const remove = idParam;
const getById = idParam;

module.exports = { list, create, update, remove, getById };
