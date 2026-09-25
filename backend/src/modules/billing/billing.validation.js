'use strict';

const Joi = require('joi');
const {
  INVOICE_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  INVOICE_ITEM_TYPE_VALUES,
} = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const invoiceItem = Joi.object({
  item_type: Joi.string().valid(...INVOICE_ITEM_TYPE_VALUES).required(),
  reference_id: Joi.number().integer().positive().allow(null),
  service_id: Joi.number().integer().positive().allow(null),
  description: Joi.string().max(255).required(),
  quantity: Joi.number().precision(2).min(0.01).default(1),
  unit_price: Joi.number().precision(2).min(0).required(),
});

const listInvoices = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...INVOICE_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const createInvoice = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    appointment_id: Joi.number().integer().positive().allow(null),
    issued_at: Joi.date().iso(),
    due_at: Joi.date().iso().allow(null),
    discount: Joi.number().precision(2).min(0).default(0),
    tax: Joi.number().precision(2).min(0).default(0),
    // BUG-039 - a new invoice starts from its payments (none yet), so the client
    // cannot declare it paid at creation.
    status: Joi.forbidden().messages({
      'any.unknown': 'Invoice status is derived from payment records and cannot be set on creation.',
    }),
    notes: Joi.string().max(2000).allow('', null),
    items: Joi.array().items(invoiceItem).min(1).required(),
  }),
};

const updateInvoice = {
  params: idParam.params,
  body: Joi.object({
    patient_id: Joi.number().integer().positive(),
    appointment_id: Joi.number().integer().positive().allow(null),
    issued_at: Joi.date().iso(),
    due_at: Joi.date().iso().allow(null),
    discount: Joi.number().precision(2).min(0),
    tax: Joi.number().precision(2).min(0),
    // BUG-039 - payment-derived statuses (draft/sent/partially_paid/paid/overdue)
    // are no longer accepted from the client: an accountant could previously
    // PATCH status:'paid' on an invoice with zero payments. Only `void` remains,
    // because voiding is a deliberate administrative decision that cannot be
    // derived from payment records.
    status: Joi.string().valid('void').messages({
      'any.only':
        'Invoice payment status is derived from payment records and cannot be set directly. ' +
        'Only "void" may be set explicitly.',
    }),
    notes: Joi.string().max(2000).allow('', null),
    items: Joi.array().items(invoiceItem).min(1),
  }).min(1),
};

const listPayments = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    invoice_id: Joi.number().integer().positive(),
    method: Joi.string().valid(...PAYMENT_METHOD_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const createPayment = {
  body: Joi.object({
    invoice_id: Joi.number().integer().positive().required(),
    amount: Joi.number().precision(2).positive().required(),
    method: Joi.string().valid(...PAYMENT_METHOD_VALUES).required(),
    reference: Joi.string().max(150).allow('', null),
    paid_at: Joi.date().iso(),
    notes: Joi.string().max(2000).allow('', null),
  }),
};

const listCategories = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const createCategory = {
  body: Joi.object({
    name: Joi.string().max(150).required(),
    description: Joi.string().max(4000).allow('', null),
    is_active: Joi.boolean().default(true),
  }),
};

const updateCategory = {
  params: idParam.params,
  body: Joi.object({
    name: Joi.string().max(150),
    description: Joi.string().max(4000).allow('', null),
    is_active: Joi.boolean(),
  }).min(1),
};

const listExpenses = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    category_id: Joi.number().integer().positive(),
    payment_method: Joi.string().valid(...PAYMENT_METHOD_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const createExpense = {
  body: Joi.object({
    category_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().max(200).required(),
    description: Joi.string().max(4000).allow('', null),
    amount: Joi.number().precision(2).min(0).required(),
    expense_date: Joi.date().iso(),
    payment_method: Joi.string().valid(...PAYMENT_METHOD_VALUES).default('cash'),
    reference: Joi.string().max(150).allow('', null),
    paid_by: Joi.number().integer().positive().allow(null),
  }),
};

const updateExpense = {
  params: idParam.params,
  body: Joi.object({
    category_id: Joi.number().integer().positive().allow(null),
    title: Joi.string().max(200),
    description: Joi.string().max(4000).allow('', null),
    amount: Joi.number().precision(2).min(0),
    expense_date: Joi.date().iso(),
    payment_method: Joi.string().valid(...PAYMENT_METHOD_VALUES),
    reference: Joi.string().max(150).allow('', null),
    paid_by: Joi.number().integer().positive().allow(null),
  }).min(1),
};

module.exports = {
  listInvoices,
  getInvoice: idParam,
  printInvoice: idParam,
  createInvoice,
  updateInvoice,
  removeInvoice: idParam,
  listPayments,
  getPayment: idParam,
  createPayment,
  removePayment: idParam,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory: idParam,
  listExpenses,
  getExpense: idParam,
  createExpense,
  updateExpense,
  removeExpense: idParam,
};
