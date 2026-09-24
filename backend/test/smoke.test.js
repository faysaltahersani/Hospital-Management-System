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
  ];

  for (const modulePath of modules) {
    assert.equal(typeof require(modulePath), 'function');
  }
});
