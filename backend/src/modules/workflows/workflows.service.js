'use strict';

const { Op, fn, col } = require('sequelize');
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
} = require('../../models');
const { ROLES } = require('../../config/constants');
const { allocateForYear } = require('../../utils/codeSequence');
const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');

const DEFINITION_INCLUDE = [
  { model: WorkflowStep, as: 'steps', include: [{ model: User, as: 'approver_user', attributes: ['id', 'full_name', 'email', 'role'] }] },
  { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
  { model: Hospital, as: 'hospital', attributes: ['id', 'name', 'code'] },
  { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
];

const REQUEST_INCLUDE = [
  { model: WorkflowDefinition, as: 'definition', attributes: ['id', 'name', 'code', 'workflow_type'] },
  { model: User, as: 'requester', attributes: ['id', 'full_name', 'email', 'role'] },
  { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
];

const normalizeCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const scopeWhere = (user) => (user.organization_id ? { organization_id: user.organization_id } : {});
const isSystemAdmin = (user) => [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role);

const assertScopeHierarchy = async ({ organization_id, hospital_id, branch_id }, transaction) => {
  const organization = await Organization.findByPk(organization_id, { transaction });
  if (!organization || !organization.is_active) throw ApiError.badRequest('Active organization not found');
  let hospital = null;
  let branch = null;
  if (hospital_id) {
    hospital = await Hospital.findOne({ where: { id: hospital_id, organization_id, is_active: true }, transaction });
    if (!hospital) throw ApiError.badRequest('Hospital does not belong to the selected organization');
  }
  if (branch_id) {
    branch = await Branch.findOne({ where: { id: branch_id, hospital_id, is_active: true }, transaction });
    if (!branch) throw ApiError.badRequest('Branch does not belong to the selected hospital');
  }
};

const normalizedSteps = (steps = []) =>
  steps.map((step, index) => ({
    step_order: index + 1,
    name: step.name,
    approver_role: step.approver_role || null,
    approver_user_id: step.approver_user_id || null,
    min_approvals: step.min_approvals || 1,
    can_reject: step.can_reject !== false,
    due_hours: step.due_hours || null,
  }));

const getMeta = async (user) => {
  const where = { is_active: true, ...scopeWhere(user) };
  const [definitions, users, organizations, hospitals, branches] = await Promise.all([
    WorkflowDefinition.findAll({ where, attributes: ['id', 'code', 'name', 'workflow_type', 'entity_type', 'min_amount', 'max_amount', 'currency_code'], order: [['name', 'ASC']] }),
    User.findAll({ where: { is_active: true, ...scopeWhere(user) }, attributes: ['id', 'full_name', 'email', 'role', 'branch_id'], order: [['full_name', 'ASC']] }),
    Organization.findAll({ where: user.organization_id ? { id: user.organization_id } : { is_active: true }, attributes: ['id', 'name'], order: [['name', 'ASC']] }),
    Hospital.findAll({ where: { is_active: true, ...(user.organization_id ? { organization_id: user.organization_id } : {}) }, attributes: ['id', 'organization_id', 'name'], order: [['name', 'ASC']] }),
    Branch.findAll({ where: { is_active: true, ...(user.hospital_id ? { hospital_id: user.hospital_id } : {}) }, attributes: ['id', 'hospital_id', 'name'], order: [['name', 'ASC']] }),
  ]);
  return { definitions, users, organizations, hospitals, branches };
};

const listDefinitions = async (query, user) => {
  const { page, limit, offset } = parsePaging(query);
  const where = { ...scopeWhere(user) };
  if (query.workflow_type) where.workflow_type = query.workflow_type;
  if (query.is_active !== undefined) where.is_active = query.is_active;
  if (query.search) {
    where[Op.or] = ['name', 'code', 'workflow_type', 'entity_type'].map((field) => ({ [field]: { [Op.like]: `%${query.search}%` } }));
  }
  const { rows, count } = await WorkflowDefinition.findAndCountAll({
    where,
    include: DEFINITION_INCLUDE,
    distinct: true,
    limit,
    offset,
    order: [['name', 'ASC'], [{ model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC']],
  });
  return { items: rows, meta: buildMeta({ total: count, page, limit }) };
};

const getDefinition = async (id, user, options = {}) => {
  const row = await WorkflowDefinition.findOne({ where: { id, ...scopeWhere(user) }, include: DEFINITION_INCLUDE, ...options });
  if (!row) throw ApiError.notFound('Workflow definition not found');
  return row;
};

const createDefinition = async (input, user) =>
  sequelize.transaction(async (transaction) => {
    const organization_id = input.organization_id || user.organization_id;
    if (!organization_id) throw ApiError.badRequest('Organization is required');
    if (user.organization_id && Number(organization_id) !== Number(user.organization_id)) throw ApiError.forbidden('Cannot create a workflow outside your organization');
    await assertScopeHierarchy({ organization_id, hospital_id: input.hospital_id || null, branch_id: input.branch_id || null }, transaction);
    const code = normalizeCode(input.code || `${input.workflow_type}-${input.name}`);
    if (!code) throw ApiError.badRequest('A valid workflow code is required');
    const exists = await WorkflowDefinition.findOne({ where: { organization_id, code }, transaction, paranoid: false });
    if (exists) throw ApiError.conflict(`Workflow code ${code} already exists`);
    const { steps, ...definitionInput } = input;
    const definition = await WorkflowDefinition.create({
      ...definitionInput,
      organization_id,
      hospital_id: input.hospital_id || null,
      branch_id: input.branch_id || null,
      code,
      created_by: user.id,
      updated_by: user.id,
    }, { transaction });
    await WorkflowStep.bulkCreate(normalizedSteps(steps).map((step) => ({ ...step, workflow_definition_id: definition.id })), { transaction });
    return getDefinition(definition.id, user, { transaction });
  });

const updateDefinition = async (id, input, user) =>
  sequelize.transaction(async (transaction) => {
    const definition = await WorkflowDefinition.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!definition) throw ApiError.notFound('Workflow definition not found');
    if (input.steps || input.entity_type || input.workflow_type || input.min_amount !== undefined || input.max_amount !== undefined) {
      const active = await ApprovalRequest.count({ where: { workflow_definition_id: id, status: { [Op.in]: ['submitted', 'in_review'] } }, transaction });
      if (active) throw ApiError.conflict('Complete or cancel active requests before changing workflow logic');
    }
    const organization_id = input.organization_id || definition.organization_id;
    if (user.organization_id && Number(organization_id) !== Number(user.organization_id)) throw ApiError.forbidden('Cannot move a workflow outside your organization');
    const hierarchy = {
      organization_id,
      hospital_id: input.hospital_id !== undefined ? input.hospital_id || null : definition.hospital_id,
      branch_id: input.branch_id !== undefined ? input.branch_id || null : definition.branch_id,
    };
    await assertScopeHierarchy(hierarchy, transaction);
    const changes = { ...input, ...hierarchy, updated_by: user.id };
    delete changes.steps;
    if (input.code) changes.code = normalizeCode(input.code);
    await definition.update(changes, { transaction });
    if (input.steps) {
      await WorkflowStep.destroy({ where: { workflow_definition_id: id }, transaction });
      await WorkflowStep.bulkCreate(normalizedSteps(input.steps).map((step) => ({ ...step, workflow_definition_id: id })), { transaction });
    }
    return getDefinition(id, user, { transaction });
  });

const removeDefinition = async (id, user) =>
  sequelize.transaction(async (transaction) => {
    const definition = await WorkflowDefinition.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!definition) throw ApiError.notFound('Workflow definition not found');
    const requestCount = await ApprovalRequest.count({ where: { workflow_definition_id: id }, transaction, paranoid: false });
    if (requestCount) throw ApiError.conflict('Workflow has approval history and cannot be deleted; deactivate it instead');
    await definition.destroy({ transaction });
    return { message: 'Workflow definition deleted' };
  });

const requestDetail = async (id, user, options = {}) => {
  const request = await ApprovalRequest.findOne({
    where: { id, ...scopeWhere(user) },
    include: [
      {
        model: WorkflowDefinition,
        as: 'definition',
        attributes: ['id', 'name', 'code', 'workflow_type', 'entity_type'],
        include: [{ model: WorkflowStep, as: 'steps', include: [{ model: User, as: 'approver_user', attributes: ['id', 'full_name', 'role'] }] }],
      },
      { model: User, as: 'requester', attributes: ['id', 'full_name', 'email', 'role'] },
      { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] },
      { model: ApprovalAction, as: 'actions', include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'role'] }, { model: WorkflowStep, as: 'step', attributes: ['id', 'name', 'step_order'] }] },
    ],
    order: [
      [{ model: WorkflowDefinition, as: 'definition' }, { model: WorkflowStep, as: 'steps' }, 'step_order', 'ASC'],
      [{ model: ApprovalAction, as: 'actions' }, 'created_at', 'ASC'],
    ],
    distinct: true,
    ...options,
  });
  if (!request) throw ApiError.notFound('Approval request not found');
  return request;
};

const listRequests = async (query, user) => {
  const { page, limit, offset } = parsePaging(query);
  const where = { ...scopeWhere(user) };
  if (query.status) where.status = query.status;
  if (query.mine) where.requested_by = user.id;
  if (query.search) where[Op.or] = ['request_code', 'title', 'entity_type', 'entity_id'].map((field) => ({ [field]: { [Op.like]: `%${query.search}%` } }));
  const include = [...REQUEST_INCLUDE];
  if (query.workflow_type) include[0] = { ...include[0], where: { workflow_type: query.workflow_type }, required: true };
  const { rows, count } = await ApprovalRequest.findAndCountAll({ where, include, distinct: true, limit, offset, order: [['created_at', 'DESC']] });
  return { items: rows, meta: buildMeta({ total: count, page, limit }) };
};

const assertAmountRules = (definition, amount) => {
  if (amount == null) return;
  const value = Number(amount);
  if (definition.min_amount != null && value < Number(definition.min_amount)) throw ApiError.badRequest(`Amount must be at least ${definition.min_amount}`);
  if (definition.max_amount != null && value > Number(definition.max_amount)) throw ApiError.badRequest(`Amount cannot exceed ${definition.max_amount}`);
};

const submitLocked = async (request, userId, comments, transaction) => {
  if (request.status !== 'draft') throw ApiError.conflict('Only draft requests can be submitted');
  const firstStep = await WorkflowStep.findOne({ where: { workflow_definition_id: request.workflow_definition_id }, order: [['step_order', 'ASC']], transaction });
  if (!firstStep) throw ApiError.conflict('Workflow has no approval steps');
  const now = new Date();
  await request.update({ status: 'in_review', current_step_order: firstStep.step_order, submitted_at: now }, { transaction });
  await ApprovalAction.create({ approval_request_id: request.id, workflow_step_id: firstStep.id, step_order: firstStep.step_order, action: 'submit', user_id: userId, comments: comments || null }, { transaction });
};

const createRequest = async (input, user) =>
  sequelize.transaction(async (transaction) => {
    const definition = await WorkflowDefinition.findOne({ where: { id: input.workflow_definition_id, is_active: true, ...scopeWhere(user) }, include: [{ model: WorkflowStep, as: 'steps' }], transaction });
    if (!definition) throw ApiError.badRequest('Active workflow definition not found');
    if (input.entity_type && input.entity_type !== definition.entity_type) throw ApiError.badRequest(`This workflow only accepts ${definition.entity_type} records`);
    assertAmountRules(definition, input.amount);
    const year = new Date().getUTCFullYear();
    const sequence = await allocateForYear('approval_request', year, { transaction });
    const request = await ApprovalRequest.create({
      workflow_definition_id: definition.id,
      organization_id: definition.organization_id,
      hospital_id: definition.hospital_id || user.hospital_id || null,
      branch_id: definition.branch_id || user.branch_id || null,
      request_code: `APR-${year}-${String(sequence).padStart(6, '0')}`,
      entity_type: definition.entity_type,
      entity_id: input.entity_id || null,
      title: input.title,
      description: input.description || null,
      amount: input.amount ?? null,
      currency_code: input.currency_code || definition.currency_code,
      payload: input.payload || null,
      requested_by: user.id,
    }, { transaction });
    if (input.submit_now) await submitLocked(request, user.id, null, transaction);
    return requestDetail(request.id, user, { transaction });
  });

const submitRequest = async (id, comments, user) =>
  sequelize.transaction(async (transaction) => {
    const request = await ApprovalRequest.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw ApiError.notFound('Approval request not found');
    if (Number(request.requested_by) !== Number(user.id) && !isSystemAdmin(user)) throw ApiError.forbidden('Only the requester or an administrator can submit this request');
    await submitLocked(request, user.id, comments, transaction);
    return requestDetail(id, user, { transaction });
  });

const currentStep = async (request, transaction) => {
  const step = await WorkflowStep.findOne({ where: { workflow_definition_id: request.workflow_definition_id, step_order: request.current_step_order }, transaction });
  if (!step) throw ApiError.conflict('Current approval step is missing from the workflow');
  return step;
};

const assertApprover = (request, step, user) => {
  if (isSystemAdmin(user)) return;
  if (Number(request.requested_by) === Number(user.id)) throw ApiError.forbidden('A requester cannot approve or reject their own request');
  const assignedUser = step.approver_user_id && Number(step.approver_user_id) === Number(user.id);
  const assignedRole = step.approver_role && step.approver_role === user.role;
  if (!assignedUser && !assignedRole) throw ApiError.forbidden('You are not assigned to the current approval step');
};

const approveRequest = async (id, comments, user) =>
  sequelize.transaction(async (transaction) => {
    const request = await ApprovalRequest.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw ApiError.notFound('Approval request not found');
    if (request.status !== 'in_review') throw ApiError.conflict('Request is not awaiting approval');
    const step = await currentStep(request, transaction);
    assertApprover(request, step, user);
    const duplicate = await ApprovalAction.findOne({ where: { approval_request_id: id, workflow_step_id: step.id, action: 'approve', user_id: user.id }, transaction });
    if (duplicate) throw ApiError.conflict('You already approved this step');
    await ApprovalAction.create({ approval_request_id: id, workflow_step_id: step.id, step_order: step.step_order, action: 'approve', user_id: user.id, comments: comments || null }, { transaction });
    const approvals = await ApprovalAction.count({ where: { approval_request_id: id, workflow_step_id: step.id, action: 'approve' }, transaction });
    if (approvals >= step.min_approvals) {
      const nextStep = await WorkflowStep.findOne({ where: { workflow_definition_id: request.workflow_definition_id, step_order: { [Op.gt]: step.step_order } }, order: [['step_order', 'ASC']], transaction });
      if (nextStep) await request.update({ current_step_order: nextStep.step_order }, { transaction });
      else await request.update({ status: 'approved', current_step_order: null, completed_at: new Date() }, { transaction });
    }
    return requestDetail(id, user, { transaction });
  });

const rejectRequest = async (id, comments, user) => {
  if (!comments) throw ApiError.badRequest('A rejection reason is required');
  return sequelize.transaction(async (transaction) => {
    const request = await ApprovalRequest.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw ApiError.notFound('Approval request not found');
    if (request.status !== 'in_review') throw ApiError.conflict('Request is not awaiting approval');
    const step = await currentStep(request, transaction);
    assertApprover(request, step, user);
    if (!step.can_reject) throw ApiError.forbidden('This step does not allow rejection');
    await ApprovalAction.create({ approval_request_id: id, workflow_step_id: step.id, step_order: step.step_order, action: 'reject', user_id: user.id, comments }, { transaction });
    await request.update({ status: 'rejected', current_step_order: null, completed_at: new Date() }, { transaction });
    return requestDetail(id, user, { transaction });
  });
};

const cancelRequest = async (id, comments, user) =>
  sequelize.transaction(async (transaction) => {
    const request = await ApprovalRequest.findOne({ where: { id, ...scopeWhere(user) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw ApiError.notFound('Approval request not found');
    if (!['draft', 'in_review'].includes(request.status)) throw ApiError.conflict('Completed requests cannot be cancelled');
    if (Number(request.requested_by) !== Number(user.id) && !isSystemAdmin(user)) throw ApiError.forbidden('Only the requester or an administrator can cancel this request');
    await ApprovalAction.create({ approval_request_id: id, step_order: request.current_step_order, action: 'cancel', user_id: user.id, comments: comments || null }, { transaction });
    await request.update({ status: 'cancelled', current_step_order: null, completed_at: new Date() }, { transaction });
    return requestDetail(id, user, { transaction });
  });

const reportSummary = async (user) => {
  const where = scopeWhere(user);
  const [byStatus, byType, totals] = await Promise.all([
    ApprovalRequest.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'amount']], where, group: ['status'], raw: true }),
    ApprovalRequest.findAll({
      attributes: [[col('definition.workflow_type'), 'workflow_type'], [fn('COUNT', col('ApprovalRequest.id')), 'count']],
      where,
      include: [{ model: WorkflowDefinition, as: 'definition', attributes: [] }],
      group: [col('definition.workflow_type')],
      raw: true,
    }),
    ApprovalRequest.findOne({ attributes: [[fn('COUNT', col('id')), 'total'], [fn('COALESCE', fn('SUM', col('amount')), 0), 'total_amount']], where, raw: true }),
  ]);
  return { totals, by_status: byStatus, by_type: byType };
};

module.exports = {
  getMeta,
  listDefinitions,
  getDefinition,
  createDefinition,
  updateDefinition,
  removeDefinition,
  listRequests,
  requestDetail,
  createRequest,
  submitRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
  reportSummary,
};
