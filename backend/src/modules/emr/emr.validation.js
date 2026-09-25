'use strict';

const Joi = require('joi');

const recordTypes = ['allergies', 'problems', 'histories', 'vitals', 'notes'];
const patientParams = Joi.object({ patientId: Joi.number().integer().positive().required() });
const collectionParams = Joi.object({
  patientId: Joi.number().integer().positive().required(),
  recordType: Joi.string().valid(...recordTypes).required(),
});
const itemParams = Joi.object({
  recordType: Joi.string().valid(...recordTypes).required(),
  id: Joi.number().integer().positive().required(),
});

const fields = {
  allergen: Joi.string().trim().max(180),
  reaction: Joi.string().trim().max(255).allow('', null),
  severity: Joi.string().valid('mild', 'moderate', 'severe', 'life_threatening', 'unknown'),
  status: Joi.string().valid('active', 'inactive', 'resolved', 'draft', 'final', 'amended'),
  onset_date: Joi.date().iso().allow('', null),
  resolved_date: Joi.date().iso().allow('', null),
  notes: Joi.string().max(4000).allow('', null),
  code: Joi.string().trim().max(30).allow('', null),
  title: Joi.string().trim().max(220),
  problem_type: Joi.string().valid('diagnosis', 'chronic_disease', 'symptom', 'risk'),
  category: Joi.string().valid('medical', 'surgical', 'family', 'immunization', 'previous_treatment'),
  details: Joi.string().max(10000).allow('', null),
  occurred_on: Joi.date().iso().allow('', null),
  encounter_type: Joi.string().trim().max(30).allow('', null),
  encounter_id: Joi.number().integer().positive().allow('', null),
  captured_at: Joi.date().iso(),
  temperature_c: Joi.number().min(25).max(50).allow('', null),
  pulse_bpm: Joi.number().integer().min(0).max(300).allow('', null),
  respiratory_rate: Joi.number().integer().min(0).max(100).allow('', null),
  systolic_bp: Joi.number().integer().min(30).max(300).allow('', null),
  diastolic_bp: Joi.number().integer().min(20).max(200).allow('', null),
  spo2_percent: Joi.number().min(0).max(100).allow('', null),
  height_cm: Joi.number().min(20).max(300).allow('', null),
  weight_kg: Joi.number().min(0.1).max(1000).allow('', null),
  pain_score: Joi.number().integer().min(0).max(10).allow('', null),
  note_type: Joi.string().valid('doctor', 'nursing', 'progress', 'assessment', 'procedure', 'follow_up', 'discharge'),
  content: Joi.string().max(100000),
};

const body = Joi.object(fields).min(1);

module.exports = {
  summary: { params: patientParams },
  list: { params: collectionParams, query: Joi.object({ limit: Joi.number().integer().min(1).max(500), status: Joi.string().max(30) }) },
  create: { params: collectionParams, body },
  update: { params: itemParams, body },
  remove: { params: itemParams },
};

