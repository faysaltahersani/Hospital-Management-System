'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  sequelize,
  Organization,
  Hospital,
  Branch,
  User,
  WorkflowDefinition,
  WorkflowStep,
  ApprovalRequest,
  ApprovalAction,
} = require('../src/models');
const service = require('../src/modules/workflows/workflows.service');

const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
let organization;
let hospital;
let branch;
let requester;
let firstApprover;
let finalApprover;
let definition;
const requestIds = [];

test.before(async () => {
  await sequelize.authenticate();
  organization = await Organization.findOne({ order: [['id', 'ASC']] });
  hospital = await Hospital.findOne({ where: { organization_id: organization.id }, order: [['id', 'ASC']] });
  branch = await Branch.findOne({ where: { hospital_id: hospital.id }, order: [['id', 'ASC']] });
  const common = { password_hash: 'qa-not-a-login-password', organization_id: organization.id, hospital_id: hospital.id, branch_id: branch.id, is_active: true };
  requester = await User.create({ ...common, email: `workflow-requester-${suffix}@example.test`, full_name: 'Workflow Requester QA', role: 'accountant' });
  firstApprover = await User.create({ ...common, email: `workflow-doctor-${suffix}@example.test`, full_name: 'Workflow First Approver QA', role: 'doctor' });
  finalApprover = await User.create({ ...common, email: `workflow-nurse-${suffix}@example.test`, full_name: 'Workflow Final Approver QA', role: 'nurse' });
});

test.after(async () => {
  if (requestIds.length) {
    await ApprovalAction.destroy({ where: { approval_request_id: requestIds }, force: true });
    await ApprovalRequest.destroy({ where: { id: requestIds }, force: true });
  }
  if (definition?.id) {
    await WorkflowStep.destroy({ where: { workflow_definition_id: definition.id }, force: true });
    await WorkflowDefinition.destroy({ where: { id: definition.id }, force: true });
  }
  for (const user of [requester, firstApprover, finalApprover]) {
    if (user?.id) await User.destroy({ where: { id: user.id }, force: true });
  }
  await sequelize.close();
});

test('a configurable two-step approval request advances atomically to approved', async () => {
  definition = await service.createDefinition({
    organization_id: organization.id,
    hospital_id: hospital.id,
    branch_id: branch.id,
    code: `QA-WF-${suffix}`,
    name: `QA Purchase Approval ${suffix}`,
    workflow_type: 'purchase_approval',
    entity_type: 'purchase_requisition',
    min_amount: 100,
    max_amount: 100000,
    steps: [
      { name: 'Clinical review', approver_user_id: firstApprover.id, min_approvals: 1 },
      { name: 'Nursing review', approver_role: 'nurse', min_approvals: 1 },
    ],
  }, requester);

  const created = await service.createRequest({
    workflow_definition_id: definition.id,
    title: 'QA medical supplies purchase',
    description: 'Automated approval engine validation',
    amount: 2500,
    submit_now: true,
  }, requester);
  requestIds.push(created.id);
  assert.equal(created.status, 'in_review');
  assert.equal(created.current_step_order, 1);

  const firstDecision = await service.approveRequest(created.id, 'Clinical need verified', firstApprover);
  assert.equal(firstDecision.status, 'in_review');
  assert.equal(firstDecision.current_step_order, 2);

  const finalDecision = await service.approveRequest(created.id, 'Approved for purchase', finalApprover);
  assert.equal(finalDecision.status, 'approved');
  assert.equal(finalDecision.current_step_order, null);
  assert.ok(finalDecision.completed_at);
  assert.deepEqual(finalDecision.actions.map((item) => item.action), ['submit', 'approve', 'approve']);
});

test('workflow rules enforce amount limits, separation of duties and permanent history', async () => {
  await assert.rejects(
    () => service.createRequest({ workflow_definition_id: definition.id, title: 'Below threshold', amount: 10 }, requester),
    (error) => error.statusCode === 400 && /at least/i.test(error.message)
  );

  const request = await service.createRequest({ workflow_definition_id: definition.id, title: 'Separation check', amount: 500, submit_now: true }, requester);
  requestIds.push(request.id);
  await assert.rejects(
    () => service.approveRequest(request.id, 'Trying to self approve', requester),
    (error) => error.statusCode === 403
  );
  await assert.rejects(
    () => service.rejectRequest(request.id, '', firstApprover),
    (error) => error.statusCode === 400 && /reason/i.test(error.message)
  );
  const rejected = await service.rejectRequest(request.id, 'Budget is not available', firstApprover);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.actions.at(-1).comments, 'Budget is not available');

  await assert.rejects(
    () => service.removeDefinition(definition.id, requester),
    (error) => error.statusCode === 409 && /history/i.test(error.message)
  );
});

test('workflow reporting is calculated from persisted requests', async () => {
  const report = await service.reportSummary(requester);
  assert.ok(Number(report.totals.total) >= 2);
  assert.ok(report.by_status.some((row) => row.status === 'approved'));
  assert.ok(report.by_status.some((row) => row.status === 'rejected'));
  assert.ok(report.by_type.some((row) => row.workflow_type === 'purchase_approval'));
});
