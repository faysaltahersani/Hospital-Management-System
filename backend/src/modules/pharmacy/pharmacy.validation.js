'use strict';

const Joi = require('joi');
const { PAYMENT_METHOD_VALUES, SALE_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const listMedicines = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    category: Joi.string().max(1000),
    unit: Joi.string().max(50),
    group_name: Joi.string().max(100),
    company: Joi.string().max(200),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const medicineBody = {
  code: Joi.string().max(50),
  name: Joi.string().max(200),
  generic_name: Joi.string().max(200).allow('', null),
  manufacturer: Joi.string().max(200).allow('', null),
  category: Joi.string().max(1000).allow('', null),
  unit: Joi.string().max(50),
  purchase_price: Joi.number().precision(2).min(0),
  sale_price: Joi.number().precision(2).min(0),
  stock_quantity: Joi.number().integer().min(0),
  reorder_level: Joi.number().integer().min(0),
  expiry_date: Joi.date().iso().allow(null),
  is_active: Joi.boolean(),
};

const createMedicine = {
  body: Joi.object({
    ...medicineBody,
    code: medicineBody.code.required(),
    name: medicineBody.name.required(),
    unit: medicineBody.unit.default('piece'),
    purchase_price: medicineBody.purchase_price.default(0),
    sale_price: medicineBody.sale_price.default(0),
    stock_quantity: medicineBody.stock_quantity.default(0),
    reorder_level: medicineBody.reorder_level.default(10),
    is_active: medicineBody.is_active.default(true),
  }),
};

const updateMedicine = {
  params: idParam.params,
  body: Joi.object(medicineBody).min(1),
};

const adjustMedicineStock = {
  params: idParam.params,
  body: Joi.object({
    adjustment_type: Joi.string().valid('add', 'remove', 'set').required(),
    quantity: Joi.number().integer().min(0).required(),
    reason: Joi.string().max(500).allow('', null),
  }),
};

const saleItem = Joi.object({
  medicine_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().min(1).required(),
  unit_price: Joi.number().precision(2).min(0),
});

const listSales = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    patient_id: Joi.number().integer().positive(),
    prescription_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...SALE_STATUS_VALUES),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
    search: Joi.string().max(150),
  }),
};

const createSale = {
  body: Joi.object({
    patient_id: Joi.number().integer().positive().allow(null),
    prescription_id: Joi.number().integer().positive().allow(null),
    sold_at: Joi.date().iso(),
    discount: Joi.number().precision(2).min(0).default(0),
    payment_method: Joi.string().valid(...PAYMENT_METHOD_VALUES).default('cash'),
    notes: Joi.string().max(2000).allow('', null),
    items: Joi.array().items(saleItem).min(1).required(),
  }),
};

const updateSaleStatus = {
  params: idParam.params,
  body: Joi.object({
    status: Joi.string().valid(...SALE_STATUS_VALUES).required(),
  }),
};

module.exports = {
  listMedicines,
  getMedicine: idParam,
  createMedicine,
  updateMedicine,
  adjustMedicineStock,
  removeMedicine: idParam,
  listSales,
  getSale: idParam,
  createSale,
  updateSaleStatus,
  removeSale: idParam,
};
