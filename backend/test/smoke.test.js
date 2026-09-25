'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

test('application, routes, and models load', () => {
  const app = require('../src/app');
  const routes = require('../src/routes');
  const models = require('../src/models');

  assert.equal(typeof app.handle, 'function');
  assert.equal(typeof routes, 'function');
  assert.equal(typeof models.sequelize.authenticate, 'function');
  assert.ok(models.User);
  assert.ok(models.AuditLog);
  assert.ok(models.Invoice);
});

test('new operational modules load', () => {
  const modules = [
    '../src/modules/audit-logs/audit-logs.routes',
    '../src/modules/reports/reports.routes',
    '../src/modules/billing/billing.routes',
    '../src/modules/pharmacy/pharmacy.routes',
    '../src/modules/laboratory/laboratory.routes',
    '../src/modules/radiology/radiology.routes',
    '../src/modules/hr/hr.routes',
    '../src/modules/organization/organization.routes',
    '../src/modules/emr/emr.routes',
    '../src/modules/workflows/workflows.routes',
  ];

  for (const modulePath of modules) {
    assert.equal(typeof require(modulePath), 'function');
  }
});

test('enterprise organization models load', () => {
  const models = require('../src/models');
  assert.ok(models.Organization);
  assert.ok(models.Hospital);
  assert.ok(models.Branch);
  assert.ok(models.PatientAllergy);
  assert.ok(models.PatientProblem);
  assert.ok(models.PatientHistory);
  assert.ok(models.VitalSign);
  assert.ok(models.ClinicalNote);
  assert.ok(models.WorkflowDefinition);
  assert.ok(models.WorkflowStep);
  assert.ok(models.ApprovalRequest);
  assert.ok(models.ApprovalAction);
});

test('enterprise role catalogue preserves legacy roles and exposes required roles', () => {
  const { ROLE_VALUES } = require('../src/config/constants');
  for (const role of ['admin', 'doctor', 'nurse', 'receptionist', 'accountant', 'pharmacist', 'lab_tech', 'patient']) {
    assert.ok(ROLE_VALUES.includes(role));
  }
  for (const role of ['super_admin', 'hospital_admin', 'branch_admin', 'ceo', 'cashier', 'finance_manager', 'pathologist', 'radiologist', 'icu_staff', 'procurement_officer', 'store_manager', 'hr_manager', 'insurance_officer']) {
    assert.ok(ROLE_VALUES.includes(role));
  }
  assert.equal(ROLE_VALUES.length, 28);
});
