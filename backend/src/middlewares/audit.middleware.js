'use strict';

const logger = require('../config/logger');
const { AuditLog } = require('../models');

// Fields that must never be persisted into the audit log even if they appear
// in a request body. The audit log is read by support/admins, so leaking
// passwords or tokens here would defeat the purpose of hashing them.
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'current_password',
  'new_password',
  'confirm_password',
  'refresh_token',
  'token',
  'access_token',
  'authorization',
]);

const redact = (input) => {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(redact);
  if (typeof input !== 'object') return input;
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(value);
  }
  return out;
};

const writeAuditLog = async ({ userId, action, entityType, entityId, changes, req }) => {
  try {
    let serialized = null;
    if (changes && Object.keys(changes).length > 0) {
      try {
        serialized = JSON.stringify(redact(changes));
      } catch (_) {
        serialized = null;
      }
    }
    await AuditLog.create({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      changes: serialized,
      ip_address: req?.ip || null,
      user_agent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    logger.warn(`Failed to write audit log: ${err.message}`);
  }
};

// BUG-034 - the audit log recorded that something was deleted but not what: all
// 41 delete entries in the shipped data had entity_id NULL and no snapshot of the
// row. The id now falls back to the route parameter and, for updates and deletes,
// the prior state is captured BEFORE the handler runs so the change is
// reconstructable.
const ENTITY_MODEL = Object.freeze({
  patient: 'Patient',
  doctor: 'Doctor',
  appointment: 'Appointment',
  admission: 'Admission',
  opd_visit: 'OpdVisit',
  invoice: 'Invoice',
  payment: 'Payment',
  medicine: 'Medicine',
  medicine_sale: 'MedicineSale',
  lab_test: 'LabTest',
  lab_order: 'LabOrder',
  radiology_test: 'RadiologyTest',
  radiology_order: 'RadiologyOrder',
  blood_donor: 'BloodDonor',
  blood_bag: 'BloodBag',
  blood_issue: 'BloodIssue',
  ward: 'Ward',
  bed: 'Bed',
  employee: 'Employee',
  payroll: 'Payroll',
  attendance: 'Attendance',
  referral: 'Referral',
  user: 'User',
  department: 'Department',
  expense: 'Expense',
  setting: 'Setting',
  master_option: 'MasterOption',
  organization: 'Organization',
  hospital: 'Hospital',
  branch: 'Branch',
  patient_allergy: 'PatientAllergy',
  patient_problem: 'PatientProblem',
  patient_history: 'PatientHistory',
  vital_sign: 'VitalSign',
  clinical_note: 'ClinicalNote',
  workflow_definition: 'WorkflowDefinition',
  approval_request: 'ApprovalRequest',
  service_type: 'ServiceType',
  service_category: 'ServiceCategory',
  service: 'Service',
  service_price: 'ServicePrice',
  pricing_rule: 'PricingRule',
  emergency_encounter: 'EmergencyEncounter',
  emergency_triage: 'EmergencyTriage',
  emergency_doctor_assignment: 'EmergencyDoctorAssignment',
  emergency_assessment: 'EmergencyAssessment',
  emergency_order: 'EmergencyOrder',
  emergency_procedure: 'EmergencyProcedure',
  emergency_observation: 'EmergencyObservation',
  emergency_disposition: 'EmergencyDisposition',
});

const capturePriorState = async (action, entityType, id) => {
  if (!id || (action !== 'update' && action !== 'delete')) return null;
  const modelName = ENTITY_MODEL[entityType];
  if (!modelName) return null;
  try {
    const models = require('../models');
    const Model = models[modelName];
    if (!Model) return null;
    const row = await Model.findByPk(id, { paranoid: false });
    return row ? redact(row.toJSON()) : null;
  } catch (err) {
    logger.warn(`Audit prior-state capture failed for ${entityType}#${id}: ${err.message}`);
    return null;
  }
};

const audit = (action, entityType) => (req, res, next) => {
  const resolvedEntityType = typeof entityType === 'function' ? entityType(req) : entityType;
  const send = res.send.bind(res);
  // BUG-034 — the id used to be read only from the response body, but delete
  // handlers respond with `data: null`, so all 41 delete entries in the shipped
  // audit log recorded entity_id = NULL: the trail said something was deleted
  // but never what. Capture the route parameter up front and fall back to it.
  const paramId = req.params?.id ?? null;
  // Started now, awaited inside the write, so the read happens before the
  // handler mutates or removes the row.
  const priorStatePromise = capturePriorState(action, resolvedEntityType, paramId);

  res.send = function patched(body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let entityId = null;
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        entityId = parsed?.data?.id || parsed?.data?.[resolvedEntityType]?.id || null;
      } catch (_) {
        entityId = null;
      }
      if (entityId === null || entityId === undefined) entityId = paramId;
      // Fire-and-forget: we do not want auditing failures to take down the
      // primary request path. Errors are logged inside writeAuditLog.
      priorStatePromise
        .then((priorState) =>
          writeAuditLog({
            userId: req.user?.id,
            action,
            entityType: resolvedEntityType,
            entityId,
            changes: {
              ...(req.body && Object.keys(req.body).length > 0 ? { request: req.body } : {}),
              ...(priorState ? { previous: priorState } : {}),
            },
            req,
          })
        )
        .catch((err) => logger.warn(`Audit pipeline error: ${err.message}`));
    }
    return send(body);
  };
  next();
};

module.exports = { audit, writeAuditLog };
