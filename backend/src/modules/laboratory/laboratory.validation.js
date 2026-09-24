'use strict';

const Joi = require('joi');
const { LAB_ORDER_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const itemParam = {
  params: Joi.object({
    id: Joi.number().integer().positive().required(),
    itemId: Joi.number().integer().positive().required(),
  }),
};

const listTests = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    category: Joi.string().max(1000),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
    from: Joi.date().iso().allow('', null),
    to: Joi.date().iso().allow('', null),
  }),
};

const testFields = {
  code: Joi.string().max(50),
  name: Joi.string().max(200),
  category: Joi.string().max(1000).allow('', null),
  sample_type: Joi.string().max(1000).allow('', null),
  normal_range: Joi.string().max(255).allow('', null),
  unit: Joi.string().max(50).allow('', null),
  price: Joi.number().precision(2).min(0),
  is_active: Joi.boolean(),
};

const createTest = {
  body: Joi.object({
    ...testFields,
    code: testFields.code.required(),
    name: testFields.name.required(),
    price: testFields.price.default(0),
    is_active: testFields.is_active.default(true),
  }),
};

const updateTest = {
  params: idParam.params,
  body: Joi.object(testFields).min(1),
};

const orderItem = Joi.object({
  test_id: Joi.number().integer().positive().required(),
  price: Joi.number().precision(2).min(0),
});

const listOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    doctor_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...LAB_ORDER_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const paymentItem = Joi.object({
  account_name: Joi.string().max(100).allow('', null),
  amount: Joi.number().precision(2).min(0),
});

const createOrder = {
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
    items: Joi.array().items(orderItem).min(1).required(),
    payments: Joi.array().items(paymentItem).allow(null),
  }),
};

const updateOrderStatus = {
  params: idParam.params,
  body: Joi.object({ status: Joi.string().valid(...LAB_ORDER_STATUS_VALUES).required() }),
};

const updateOrderItemResult = {
  params: itemParam.params,
  body: Joi.object({
    result_value: Joi.string().max(255).allow('', null),
    result_notes: Joi.string().max(4000).allow('', null),
    result_at: Joi.date().iso(),
    status: Joi.string().valid(...LAB_ORDER_STATUS_VALUES),
  }).min(1),
};

const listPathologyParameters = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    search: Joi.string().max(150),
  }),
};

const createPathologyParameter = {
  body: Joi.object({
    name: Joi.string().max(200).required(),
    ref_range_from: Joi.string().max(100).allow('', null),
    ref_range_to: Joi.string().max(100).allow('', null),
    unit_option_id: Joi.number().integer().positive().allow(null),
    description: Joi.string().max(2000).allow('', null),
  }),
};

const updatePathologyParameter = {
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
  updateOrderStatus,
  updateOrderItemResult,
  removeOrder: idParam,
  listPathologyParameters,
  createPathologyParameter,
  updatePathologyParameter,
  getPathologyParameter: idParam,
  removePathologyParameter: idParam,
};
