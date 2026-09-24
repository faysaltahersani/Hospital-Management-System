'use strict';

const Joi = require('joi');

const dateRange = {
  query: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
  }),
};

const pharmacyStock = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(1000),
  }),
};

// BUG-033 — the patient-balance report was unbounded: `?limit=100000` was
// accepted and fanned out into hundreds of thousands of queries. The page size
// is now capped, and the service clamps it independently.
const patientBalance = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200).messages({
      'number.max': 'limit cannot exceed 200 rows per page; use `page` to read further rows.',
    }),
    patient_id: Joi.number().integer().positive(),
    search: Joi.string().max(150).allow(''),
    from: Joi.date().iso(),
    to: Joi.date().iso().min(Joi.ref('from')),
  }),
};

module.exports = {
  dashboard: dateRange,
  appointments: dateRange,
  finance: dateRange,
  pharmacyStock,
  patientBalance,
};
