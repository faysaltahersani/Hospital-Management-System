'use strict';

const Joi = require('joi');
const { BLOOD_GROUPS, GENDER_VALUES, EMERGENCY_STATUS_VALUES, TRIAGE_LEVELS, PRESCRIPTION_STATUS_VALUES } = require('../../config/constants');

const id = Joi.number().integer().positive();
const idParam = { params: Joi.object({ id: id.required() }) };
const encounterParam = { params: Joi.object({ encounterId: id.required() }) };
const payment = Joi.object({ method: Joi.string().max(40), account_name: Joi.string().max(80), amount: Joi.number().precision(2).positive().required(), reference: Joi.string().max(150).allow('', null) });

const list = { query: Joi.object({
  page: Joi.number().integer().min(1), limit: Joi.number().integer().min(1).max(1000),
  status: Joi.string().valid(...EMERGENCY_STATUS_VALUES), priority: Joi.string().valid(...TRIAGE_LEVELS),
  patient_id: id, assigned_doctor_id: id, active: Joi.boolean(), from: Joi.date().iso(), to: Joi.date().iso().min(Joi.ref('from')),
  search: Joi.string().trim().max(150),
}) };

const register = { body: Joi.object({
  patient_id: id,
  new_patient: Joi.object({
    full_name: Joi.string().trim().min(2).max(150).required(), age: Joi.number().integer().min(0).max(130).allow(null),
    date_of_birth: Joi.date().iso().allow(null), gender: Joi.string().valid(...GENDER_VALUES).required(),
    blood_group: Joi.string().valid(...BLOOD_GROUPS), phone: Joi.string().max(30).allow('', null),
    email: Joi.string().email().max(150).allow('', null), address: Joi.string().max(2000).allow('', null),
    emergency_contact_name: Joi.string().max(150).allow('', null), emergency_contact_phone: Joi.string().max(30).allow('', null),
  }),
  arrival_mode: Joi.string().valid('walk_in', 'ambulance', 'transfer', 'police', 'other'),
  arrival_at: Joi.date().iso(), chief_complaint: Joi.string().trim().min(2).max(1000).required(),
}).xor('patient_id', 'new_patient') };

const vitals = Joi.object({
  captured_at: Joi.date().iso(), temperature_c: Joi.number().min(20).max(50), pulse_bpm: Joi.number().integer().min(0).max(300),
  respiratory_rate: Joi.number().integer().min(0).max(120), systolic_bp: Joi.number().integer().min(0).max(350),
  diastolic_bp: Joi.number().integer().min(0).max(250), spo2_percent: Joi.number().min(0).max(100),
  height_cm: Joi.number().positive().max(300), weight_kg: Joi.number().positive().max(1000), pain_score: Joi.number().integer().min(0).max(10),
  vital_notes: Joi.string().max(500).allow('', null),
});

const triage = { params: encounterParam.params, body: Joi.object({
  triage_level: Joi.string().valid(...TRIAGE_LEVELS).required(), chief_complaint: Joi.string().max(1000).allow('', null),
  consciousness: Joi.string().valid('alert', 'voice', 'pain', 'unresponsive'), priority_notes: Joi.string().max(1000).allow('', null),
  triage_notes: Joi.string().max(4000).allow('', null), status: Joi.string().valid('draft', 'final').default('final'), vitals,
}) };
const updateTriage = { params: idParam.params, body: triage.body.fork(['triage_level'], (schema) => schema.optional()).min(1) };

const assignDoctor = { params: encounterParam.params, body: Joi.object({ doctor_id: id.required(), reason: Joi.string().max(500).allow('', null) }) };
const assessmentBody = Joi.object({
  chief_complaint: Joi.string().max(4000).allow('', null), history: Joi.string().max(10000).allow('', null),
  examination: Joi.string().max(10000).allow('', null), diagnosis: Joi.string().trim().min(2).max(10000).required(),
  differential_diagnosis: Joi.string().max(10000).allow('', null), clinical_notes: Joi.string().max(20000).allow('', null),
  disposition_plan: Joi.string().max(10000).allow('', null), status: Joi.string().valid('draft', 'final').default('final'),
});
const assessment = { params: encounterParam.params, body: assessmentBody };
const updateAssessment = { params: idParam.params, body: assessmentBody.fork(['diagnosis'], (schema) => schema.optional()).min(1) };

const labOrder = { params: encounterParam.params, body: Joi.object({
  doctor_id: id.allow(null), ordered_at: Joi.date().iso(), notes: Joi.string().max(4000).allow('', null),
  items: Joi.array().min(1).items(Joi.object({ test_id: id.required(), name: Joi.string().max(200) })).required(),
  payments: Joi.array().items(payment), discount: Joi.number().min(0), discount_percent: Joi.number().min(0).max(100), tax: Joi.number().min(0), tax_rate: Joi.number().min(0).max(100),
}) };
const radiologyOrder = { params: encounterParam.params, body: labOrder.body.keys({
  items: Joi.array().min(1).items(Joi.object({ test_id: id.required() })).required(),
}) };
const medicationOrder = { params: encounterParam.params, body: Joi.object({
  doctor_id: id.allow(null), prescribed_at: Joi.date().iso(), diagnosis: Joi.string().max(4000).allow('', null), notes: Joi.string().max(4000).allow('', null),
  status: Joi.string().valid(...PRESCRIPTION_STATUS_VALUES).default('finalized'),
  items: Joi.array().min(1).items(Joi.object({ medicine_id: id.allow(null), medicine_name: Joi.string().max(200), dosage: Joi.string().max(100).allow('', null), frequency: Joi.string().max(100).allow('', null), duration: Joi.string().max(100).allow('', null), quantity: Joi.number().positive(), instructions: Joi.string().max(500).allow('', null) }).or('medicine_id', 'medicine_name')).required(),
}) };

const procedure = { params: encounterParam.params, body: Joi.object({
  service_id: id.required(), quantity: Joi.number().precision(2).positive().default(1), status: Joi.string().valid('ordered', 'completed').default('completed'),
  performed_at: Joi.date().iso(), notes: Joi.string().max(4000).allow('', null), payer_type: Joi.string().valid('self', 'corporate', 'insurance', 'government', 'all'),
  payer_reference: Joi.string().max(120).allow('', null), payments: Joi.array().items(payment),
  discount: Joi.number().min(0), discount_percent: Joi.number().min(0).max(100), tax: Joi.number().min(0), tax_rate: Joi.number().min(0).max(100),
}) };
const procedureStatus = { params: idParam.params, body: Joi.object({ status: Joi.string().valid('in_progress', 'completed', 'cancelled').required(), notes: Joi.string().max(4000).allow('', null) }) };
const observation = { params: encounterParam.params, body: Joi.object({ bed_id: id.required(), notes: Joi.string().max(4000).allow('', null) }) };

const disposition = { params: encounterParam.params, body: Joi.object({
  disposition_type: Joi.string().valid('discharge', 'ipd_admission', 'icu_transfer', 'referral', 'transfer').required(),
  bed_id: id, doctor_id: id.allow(null), to_doctor_id: id.allow(null), workflow_request_id: id.allow(null),
  destination: Joi.string().max(255).allow('', null), external_doctor_name: Joi.string().max(150).allow('', null),
  external_facility: Joi.string().max(200).allow('', null), external_phone: Joi.string().max(30).allow('', null),
  reason: Joi.string().max(10000).allow('', null), diagnosis: Joi.string().max(10000).allow('', null),
  instructions: Joi.string().max(10000).allow('', null), total_charges: Joi.number().precision(2).min(0),
}) };
const report = { query: Joi.object({ from: Joi.date().iso(), to: Joi.date().iso().min(Joi.ref('from')) }) };

module.exports = { list, register, getById: idParam, triage, updateTriage, assignDoctor, assessment, updateAssessment,
  labOrder, radiologyOrder, medicationOrder, procedure, procedureStatus, observation, releaseObservation: idParam,
  disposition, report, encounterParam };

