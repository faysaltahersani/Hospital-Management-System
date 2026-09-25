'use strict';

const Joi = require('joi');

const positiveId = Joi.number().integer().positive();
const nullableId = positiveId.allow(null, '');
const money = Joi.number().precision(2).min(0).max(999999999999.99);
const status = Joi.string().valid('draft', 'submitted', 'in_review', 'approved', 'rejected', 'cancelled');

const step = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  approver_role: Joi.string().trim().lowercase().max(60).allow('', null),
  approver_user_id: nullableId,
  min_approvals: Joi.number().integer().min(1).max(20).default(1),
  can_reject: Joi.boolean().default(true),
  due_hours: Joi.number().integer().min(1).max(8760).allow(null, ''),
}).custom((value, helpers) => {
  if (!value.approver_role && !value.approver_user_id) return helpers.error('any.custom');
  return value;
}, 'approver assignment').messages({ 'any.custom': 'Each step needs an approver role or approver user' });

const definitionBody = Joi.object({
  organization_id: positiveId,
  hospital_id: nullableId,
  branch_id: nullableId,
  code: Joi.string().trim().uppercase().max(60),
  name: Joi.string().trim().min(3).max(180).required(),
  workflow_type: Joi.string().trim().lowercase().max(60).required(),
  entity_type: Joi.string().trim().lowercase().max(80).required(),
  description: Joi.string().trim().max(4000).allow('', null),
  min_amount: money.allow(null, ''),
  max_amount: money.allow(null, ''),
  currency_code: Joi.string().trim().uppercase().length(3).default('BDT'),
  is_active: Joi.boolean().default(true),
  steps: Joi.array().items(step).min(1).max(20).required(),
}).custom((value, helpers) => {
  if (value.min_amount != null && value.max_amount != null && value.min_amount > value.max_amount) {
    return helpers.error('any.custom');
  }
  return value;
}, 'amount range').messages({ 'any.custom': 'Minimum amount cannot exceed maximum amount' });

const paging = {
  page: positiveId,
  limit: positiveId.max(100),
  search: Joi.string().trim().max(180).allow(''),
};

module.exports = {
  listDefinitions: { query: Joi.object({ ...paging, workflow_type: Joi.string().trim().max(60), is_active: Joi.boolean() }) },
  createDefinition: { body: definitionBody },
  updateDefinition: {
    params: Joi.object({ id: positiveId.required() }),
    body: definitionBody.fork(['name', 'workflow_type', 'entity_type', 'steps'], (schema) => schema.optional()).min(1),
  },
  id: { params: Joi.object({ id: positiveId.required() }) },
  listRequests: {
    query: Joi.object({ ...paging, status, workflow_type: Joi.string().trim().max(60), mine: Joi.boolean() }),
  },
  createRequest: {
    body: Joi.object({
      workflow_definition_id: positiveId.required(),
      entity_type: Joi.string().trim().lowercase().max(80),
      entity_id: Joi.string().trim().max(80).allow('', null),
      title: Joi.string().trim().min(3).max(220).required(),
      description: Joi.string().trim().max(8000).allow('', null),
      amount: money.allow(null, ''),
      currency_code: Joi.string().trim().uppercase().length(3),
      payload: Joi.object().unknown(true).allow(null),
      submit_now: Joi.boolean().default(false),
    }),
  },
  decision: {
    params: Joi.object({ id: positiveId.required() }),
    body: Joi.object({ comments: Joi.string().trim().max(4000).allow('', null) }),
  },
};
