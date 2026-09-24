'use strict';

const Joi = require('joi');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const dataTypes = ['string', 'number', 'boolean', 'json'];

const listSettings = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    group_name: Joi.string().max(80),
    is_public: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const settingFields = {
  group_name: Joi.string().max(80),
  key: Joi.string().max(1000),
  value: Joi.string().allow('', null),
  data_type: Joi.string().valid(...dataTypes),
  description: Joi.string().max(255).allow('', null),
  is_public: Joi.boolean(),
};

const createSetting = {
  body: Joi.object({
    ...settingFields,
    group_name: settingFields.group_name.default('general'),
    key: settingFields.key.required(),
    data_type: settingFields.data_type.default('string'),
    is_public: settingFields.is_public.default(false),
  }),
};

const updateSetting = {
  params: idParam.params,
  body: Joi.object(settingFields).min(1),
};

const listOptions = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    type: Joi.string().max(80),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const optionFields = {
  type: Joi.string().max(80),
  code: Joi.string().max(1000),
  label: Joi.string().max(200),
  description: Joi.string().max(255).allow('', null),
  sort_order: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
};

const createOption = {
  body: Joi.object({
    ...optionFields,
    type: optionFields.type.required(),
    code: optionFields.code.required(),
    label: optionFields.label.required(),
    sort_order: optionFields.sort_order.default(0),
    is_active: optionFields.is_active.default(true),
  }),
};

const updateOption = {
  params: idParam.params,
  body: Joi.object(optionFields).min(1),
};

module.exports = {
  listSettings,
  getSetting: idParam,
  createSetting,
  updateSetting,
  removeSetting: idParam,
  listOptions,
  getOption: idParam,
  createOption,
  updateOption,
  removeOption: idParam,
};
