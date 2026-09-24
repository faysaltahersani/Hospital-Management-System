'use strict';

const Joi = require('joi');
const {
  RADIOLOGY_CATEGORIES,
  RADIOLOGY_ORDER_STATUS_VALUES,
} = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const listTests = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    category: Joi.string().valid(...RADIOLOGY_CATEGORIES),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
    from: Joi.date().iso().allow('', null),
    to: Joi.date().iso().allow('', null),
  }),
};

const testFields = {
  code: Joi.string().max(50),
  name: Joi.string().max(200),
  category: Joi.string().valid(...RADIOLOGY_CATEGORIES),
  price: Joi.number().precision(2).min(0),
  description: Joi.string().max(4000).allow('', null),
  is_active: Joi.boolean(),
};

const createTest = {
  body: Joi.object({
    ...testFields,
    code: testFields.code.required(),
    name: testFields.name.required(),
    category: testFields.category.default('other'),
    price: testFields.price.default(0),
    is_active: testFields.is_active.default(true),
  }),
};

const updateTest = {
  params: idParam.params,
  body: Joi.object(testFields).min(1),
};

const listOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    test_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...RADIOLOGY_ORDER_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const createOrder = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().allow(null),
    test_id: Joi.number().integer().positive().required(),
    ordered_at: Joi.date().iso(),
    price: Joi.number().precision(2).min(0),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

const createBill = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    doctor_id: Joi.number().integer().positive().allow(null, ''),
    ordered_at: Joi.date().iso().allow('', null),
    notes: Joi.string().max(2000).allow('', null),
    previous_report_comment: Joi.string().max(2000).allow('', null),
    discount: Joi.number().min(0).allow(null),
    // BUG-042 - percentage forms were being stripped by stripUnknown, so a
    // discount/tax entered in the UI silently became zero on the invoice.
    discount_percent: Joi.number().min(0).max(100).allow(null),
    tax: Joi.number().min(0).allow(null),
    tax_rate: Joi.number().min(0).max(100).allow(null),
    items: Joi.array().items(Joi.object({
      test_id: Joi.number().integer().positive().required(),
      price: Joi.number().precision(2).min(0),
    })).min(1).required(),
    payments: Joi.array().items(Joi.object({
      account_name: Joi.string().max(100).allow('', null),
      amount: Joi.number().precision(2).min(0),
    })).allow(null),
  }),
};

const updateOrderStatus = {
  params: idParam.params,
  body: Joi.object({ status: Joi.string().valid(...RADIOLOGY_ORDER_STATUS_VALUES).required() }),
};

const updateOrderResult = {
  params: idParam.params,
  body: Joi.object({
    findings: Joi.string().max(20000).allow('', null),
    impression: Joi.string().max(20000).allow('', null),
    result_notes: Joi.string().max(4000).allow('', null),
    result_image_url: Joi.string().max(500).uri().allow('', null),
    result_at: Joi.date().iso(),
    status: Joi.string().valid(...RADIOLOGY_ORDER_STATUS_VALUES),
  }).min(1),
};

const listRadiologyParameters = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    search: Joi.string().max(150),
  }),
};

const createRadiologyParameter = {
  body: Joi.object({
    name: Joi.string().max(200).required(),
    ref_range_from: Joi.string().max(100).allow('', null),
    ref_range_to: Joi.string().max(100).allow('', null),
    unit_option_id: Joi.number().integer().positive().allow(null),
    description: Joi.string().max(2000).allow('', null),
  }),
};

const updateRadiologyParameter = {
  params: idParam.params,
  body: Joi.object({
    name: Joi.string().max(200),
    ref_range_from: Joi.string().max(100).allow('', null),
    ref_range_to: Joi.string().max(100).allow('', null),
    unit_option_id: Joi.number().integer().positive().allow(null),
    description: Joi.string().max(2000).allow('', null),
  }).min(1),
};

module.exports = {
  listTests,
  getTest: idParam,
  createTest,
  updateTest,
  removeTest: idParam,
  listOrders,
  getOrder: idParam,
  getOrderReport: idParam,
  createOrder,
  createBill,
  updateOrderStatus,
  updateOrderResult,
  removeOrder: idParam,
  listRadiologyParameters,
  createRadiologyParameter,
  updateRadiologyParameter,
  getRadiologyParameter: idParam,
  removeRadiologyParameter: idParam,
};
