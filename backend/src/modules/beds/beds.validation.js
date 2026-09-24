'use strict';

const Joi = require('joi');
const { WARD_TYPES, BED_STATUS_VALUES } = require('../../config/constants');

const idParam = {
  params: Joi.object({ id: Joi.number().integer().positive().required() }),
};

const listWards = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    type: Joi.string().valid(...WARD_TYPES),
    is_active: Joi.boolean(),
    search: Joi.string().max(150),
  }),
};

const createWard = {
  body: Joi.object({
    name: Joi.string().min(1).max(150).required(),
    code: Joi.string().max(30).allow('', null),
    type: Joi.string().allow('', null).default('general'),
    floor: Joi.string().max(30).allow('', null),
    floor_id: Joi.number().integer().positive().allow('', null),
    building_id: Joi.number().integer().positive().allow('', null),
    description: Joi.string().max(2000).allow('', null),
    is_active: Joi.boolean().default(true),
  }),
};

const updateWard = {
  params: idParam.params,
  body: Joi.object({
    name: Joi.string().min(1).max(150),
    code: Joi.string().max(30).allow('', null),
    type: Joi.string().allow('', null),
    floor: Joi.string().max(30).allow('', null),
    floor_id: Joi.number().integer().positive().allow('', null),
    building_id: Joi.number().integer().positive().allow('', null),
    description: Joi.string().max(2000).allow('', null),
    is_active: Joi.boolean(),
  }).min(1),
};



const listBeds = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(1000),
    ward_id: Joi.number().integer().positive(),
    status: Joi.string().valid(...BED_STATUS_VALUES),
    search: Joi.string().max(150),
  }),
};

const createBed = {
  body: Joi.object({
    ward_id: Joi.number().integer().positive().required(),
    bed_number: Joi.string().max(30).required(),
    room_number: Joi.string().max(30).allow('', null),
    daily_rate: Joi.number().precision(2).min(0).default(0),
    status: Joi.string().valid(...BED_STATUS_VALUES).default('available'),
    notes: Joi.string().max(255).allow('', null),
  }),
};

const updateBed = {
  params: idParam.params,
  body: Joi.object({
    ward_id: Joi.number().integer().positive(),
    bed_number: Joi.string().max(30),
    room_number: Joi.string().max(30).allow('', null),
    daily_rate: Joi.number().precision(2).min(0),
    status: Joi.string().valid(...BED_STATUS_VALUES),
    notes: Joi.string().max(255).allow('', null),
  }).min(1),
};

module.exports = {
  listWards,
  createWard,
  updateWard,
  getWard: idParam,
  removeWard: idParam,
  listBeds,
  createBed,
  updateBed,
  getBed: idParam,
  removeBed: idParam,
};
