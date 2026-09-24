'use strict';

const Joi = require('joi');
const { AUDIT_ACTIONS } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    user_id: Joi.number().integer().positive(),
    action: Joi.string().valid(...Object.values(AUDIT_ACTIONS)),
    entity_type: Joi.string().max(80),
    entity_id: Joi.string().max(64),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

module.exports = { list, getById: idParam, remove: idParam };
