'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { sequelize, Organization, Hospital, Branch } = require('../src/models');
const service = require('../src/modules/organization/organization.service');

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
let organization;
let hospital;
let branch;

test.before(async () => {
  await sequelize.authenticate();
});

test.after(async () => {
  if (branch?.id) await Branch.destroy({ where: { id: branch.id }, force: true });
  if (hospital?.id) await Hospital.destroy({ where: { id: hospital.id }, force: true });
  if (organization?.id) await Organization.destroy({ where: { id: organization.id }, force: true });
  await sequelize.close();
});

test('enterprise organization hierarchy is persisted and returned with its parents', async () => {
  organization = await service.create('organizations', {
    code: `QA-ORG-${suffix}`,
    name: `QA Organization ${suffix}`,
    legal_name: `QA Organization ${suffix} Ltd`,
  }, null);

  hospital = await service.create('hospitals', {
    organization_id: organization.id,
    code: `QA-HOSP-${suffix}`,
    name: `QA Hospital ${suffix}`,
  }, null);

  branch = await service.create('branches', {
    hospital_id: hospital.id,
    code: `QA-BR-${suffix}`,
    name: `QA Branch ${suffix}`,
    is_main: true,
  }, null);

  const listed = await service.list('branches', { hospital_id: hospital.id, limit: 10 });
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].hospital.id, hospital.id);
  assert.equal(listed.items[0].hospital.organization.id, organization.id);

  const hierarchy = await service.getHierarchy();
  const savedOrganization = hierarchy.find((item) => item.id === organization.id);
  assert.ok(savedOrganization);
  assert.equal(savedOrganization.hospitals[0].branches[0].id, branch.id);
});

test('a hospital that still owns a branch cannot be deleted', async () => {
  await assert.rejects(
    () => service.remove('hospitals', hospital.id),
    (error) => error.statusCode === 409 && /branches/i.test(error.message)
  );
});

