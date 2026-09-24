'use strict';

const Joi = require('joi');
const { ROLE_VALUES } = require('../../config/constants');

// BUG-040 - one shared policy, matching users.validation.
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/[0-9]/, 'number')
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.name': 'Password must contain both letters and numbers',
  });

const register = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password,
    full_name: Joi.string().min(2).max(150).required(),
    role: Joi.string().valid(...ROLE_VALUES).default('receptionist'),
    phone: Joi.string().max(30).allow('', null),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().trim(),
    identifier: Joi.string().trim(),
    password: Joi.string().required(),
  }).or('email', 'identifier'),
};

const refresh = {
  body: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

const changePassword = {
  body: Joi.object({
    current_password: Joi.string().required(),
    new_password: password,
  }),
};

module.exports = { register, login, refresh, logout, changePassword };
