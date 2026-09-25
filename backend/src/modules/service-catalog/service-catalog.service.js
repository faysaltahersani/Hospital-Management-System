'use strict';
const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize, Organization, Hospital, Branch, ServiceType, ServiceCategory, Service, ServicePrice, PricingRule,
  ServiceSourceLink, ApprovalRequest, WorkflowDefinition,
} = require('../../models');
const { ROLES } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const workflows = require('../workflows/workflows.service');
const repository = require('./service-catalog.repository');

const ADMIN_ROLES = new Set([ROLES.SUPER_ADMIN,ROLES.ADMIN,ROLES.HOSPITAL_ADMIN,ROLES.BRANCH_ADMIN,ROLES.FINANCE_MANAGER]);
const normalizeCode = (value, max=80) => String(value||'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max);
const orgIdFor = (user, input={}) => Number(input.organization_id || user.organization_id || 0) || null;
const scopeForWrite = (user, input={}) => ({
  organization_id: orgIdFor(user,input),
  hospital_id: input.hospital_id !== undefined ? input.hospital_id : (user.role === ROLES.HOSPITAL_ADMIN ? user.hospital_id : null),
  branch_id: input.branch_id !== undefined ? input.branch_id : (user.role === ROLES.BRANCH_ADMIN ? user.branch_id : null),
});
const visibleScope = (user) => {
  if ([ROLES.SUPER_ADMIN,ROLES.ADMIN].includes(user.role)) return {};
  const clauses = [];
  if (user.organization_id) clauses.push({ organization_id:user.organization_id });
  if (![ROLES.CEO,ROLES.MANAGEMENT].includes(user.role) && user.hospital_id) clauses.push({ [Op.or]:[{hospital_id:null},{hospital_id:user.hospital_id}] });
  if (![ROLES.CEO,ROLES.MANAGEMENT,ROLES.HOSPITAL_ADMIN].includes(user.role) && user.branch_id) clauses.push({ [Op.or]:[{branch_id:null},{branch_id:user.branch_id}] });
  return clauses.length ? { [Op.and]:clauses } : {};
};
const organizationScope = (user) => ([ROLES.SUPER_ADMIN,ROLES.ADMIN].includes(user.role)||!user.organization_id?{}:{organization_id:user.organization_id});
const assertHierarchy = async (scope, transaction) => {
  if (!scope.organization_id) throw ApiError.badRequest('Organization is required');
  const org=await Organization.findByPk(scope.organization_id,{transaction}); if(!org||!org.is_active) throw ApiError.badRequest('Active organization not found');
  if(scope.hospital_id){const h=await Hospital.findOne({where:{id:scope.hospital_id,organization_id:scope.organization_id,is_active:true},transaction});if(!h)throw ApiError.badRequest('Hospital does not belong to organization');}
  if(scope.branch_id){if(!scope.hospital_id)throw ApiError.badRequest('Hospital is required for a branch price');const b=await Branch.findOne({where:{id:scope.branch_id,hospital_id:scope.hospital_id,is_active:true},transaction});if(!b)throw ApiError.badRequest('Branch does not belong to hospital');}
};
const assertUserScope = (scope,user) => {
  if ([ROLES.SUPER_ADMIN,ROLES.ADMIN].includes(user.role)) return;
  if(user.organization_id&&Number(scope.organization_id)!==Number(user.organization_id))throw ApiError.forbidden('Cannot write outside your organization');
  if(user.role===ROLES.HOSPITAL_ADMIN&&scope.hospital_id&&Number(scope.hospital_id)!==Number(user.hospital_id))throw ApiError.forbidden('Cannot write outside your hospital');
  if(user.role===ROLES.BRANCH_ADMIN&&Number(scope.branch_id)!==Number(user.branch_id))throw ApiError.forbidden('Branch administrators must use their own branch');
};
const includeFor = (entity) => ({
  categories:[{model:ServiceType,as:'type',attributes:['id','code','name']}],
  services:[{model:ServiceType,as:'type',attributes:['id','code','name']},{model:ServiceCategory,as:'category',attributes:['id','code','name']},{model:ServicePrice,as:'prices',required:false,separate:true,order:[['effective_from','DESC'],['version_no','DESC']]}],
  prices:[{model:Service,as:'service',attributes:['id','code','name','billing_unit']}],
  rules:[{model:Service,as:'service',attributes:['id','code','name'],required:false},{model:ServiceCategory,as:'category',attributes:['id','code','name'],required:false}],
}[entity]||[]);

const list = async (entity,query,user) => {
  const Model=repository.modelFor(entity); if(!Model)throw ApiError.notFound('Catalogue resource not found');
  const {page,limit,offset}=parsePaging(query); const where={...(entity==='types'||entity==='categories'?organizationScope(user):visibleScope(user))};
  if(query.status) where.status=query.status;
  if(query.service_type_id) where.service_type_id=query.service_type_id;
  if(query.service_category_id) where.service_category_id=query.service_category_id;
  if(query.service_id) where.service_id=query.service_id;
  if(query.payer_type) where.payer_type=query.payer_type;
  if(query.search){const fields=entity==='prices'?['payer_reference']:['name','code'];where[Op.or]=fields.map(field=>({[field]:{[Op.like]:`%${query.search}%`}}));}
  const result=await Model.findAndCountAll({where,include:includeFor(entity),distinct:true,limit,offset,order:entity==='prices'?[['effective_from','DESC'],['version_no','DESC']]:[['id','DESC']]});
  return {items:result.rows,meta:buildMeta({total:result.count,page,limit})};
};
const getById=async(entity,id,user)=>{const row=await repository.modelFor(entity)?.findOne({where:{id,...(entity==='types'||entity==='categories'?organizationScope(user):visibleScope(user))},include:includeFor(entity)});if(!row)throw ApiError.notFound('Catalogue record not found');return row;};

const assertNoPriceOverlap=async(input,ignoreId,transaction)=>{
  const end=input.effective_to||'9999-12-31';
  const where={service_id:input.service_id,organization_id:input.organization_id,hospital_id:input.hospital_id??{[Op.is]:null},branch_id:input.branch_id??{[Op.is]:null},payer_type:input.payer_type||'self',payer_reference:input.payer_reference||{[Op.is]:null},effective_from:{[Op.lte]:end},[Op.or]:[{effective_to:null},{effective_to:{[Op.gte]:input.effective_from}}]};
  if(ignoreId)where.id={[Op.ne]:ignoreId};
  if(await ServicePrice.count({where,transaction}))throw ApiError.conflict('An overlapping price already exists for this service, scope and payer');
};
const parentChecks=async(entity,data,transaction)=>{
  if(entity==='categories'){const t=await ServiceType.findOne({where:{id:data.service_type_id,organization_id:data.organization_id},transaction});if(!t)throw ApiError.badRequest('Service type not found in this organization');}
  if(entity==='services'){const t=await ServiceType.findOne({where:{id:data.service_type_id,organization_id:data.organization_id},transaction});if(!t)throw ApiError.badRequest('Service type not found');if(data.service_category_id){const c=await ServiceCategory.findOne({where:{id:data.service_category_id,service_type_id:data.service_type_id,organization_id:data.organization_id},transaction});if(!c)throw ApiError.badRequest('Category does not belong to selected type');}}
  if(entity==='prices'||entity==='rules'){if(data.service_id){const s=await Service.findOne({where:{id:data.service_id,organization_id:data.organization_id},transaction});if(!s)throw ApiError.badRequest('Service not found in this organization');}if(data.service_category_id){const c=await ServiceCategory.findOne({where:{id:data.service_category_id,organization_id:data.organization_id},transaction});if(!c)throw ApiError.badRequest('Category not found in this organization');}}
};
const create=async(entity,input,user)=>sequelize.transaction(async transaction=>{
  const Model=repository.modelFor(entity);if(!Model)throw ApiError.notFound('Catalogue resource not found');
  const scope=scopeForWrite(user,input);assertUserScope(scope,user);await assertHierarchy(scope,transaction);
  const data={...input,...scope,created_by:user.id,updated_by:user.id};
  if(['types','categories'].includes(entity)){delete data.hospital_id;delete data.branch_id;}
  data.code=normalizeCode(input.code||input.name,entity==='types'?50:entity==='categories'?60:80);if(entity!=='prices'&&!data.code)throw ApiError.badRequest('A valid code or name is required');
  await parentChecks(entity,data,transaction);
  if(entity==='prices'){data.status='draft';const max=await ServicePrice.max('version_no',{where:{service_id:data.service_id,organization_id:data.organization_id,hospital_id:data.hospital_id??{[Op.is]:null},branch_id:data.branch_id??{[Op.is]:null},payer_type:data.payer_type||'self'},transaction});data.version_no=Number(max||0)+1;await assertNoPriceOverlap(data,null,transaction);}
  if(entity==='rules')data.status='draft';
  try{return await repository.create(entity,data,{transaction});}catch(error){if(error.name==='SequelizeUniqueConstraintError')throw ApiError.conflict('Code or version already exists in this scope');throw error;}
});
const update=async(entity,id,input,user)=>sequelize.transaction(async transaction=>{
  const row=await repository.modelFor(entity)?.findOne({where:{id,...(entity==='types'||entity==='categories'?organizationScope(user):visibleScope(user))},transaction,lock:transaction.LOCK.UPDATE});if(!row)throw ApiError.notFound('Catalogue record not found');
  if(['prices','rules'].includes(entity)&&['approved','retired'].includes(row.status))throw ApiError.conflict('Approved history is immutable; create a new version or retire it');
  const merged={...row.toJSON(),...input};const scope=scopeForWrite(user,merged);assertUserScope(scope,user);await assertHierarchy(scope,transaction);
  const changes={...input,...scope,updated_by:user.id};if(['types','categories'].includes(entity)){delete changes.hospital_id;delete changes.branch_id;}if(input.code)changes.code=normalizeCode(input.code,entity==='types'?50:entity==='categories'?60:80);
  await parentChecks(entity,{...merged,...scope},transaction);if(entity==='prices')await assertNoPriceOverlap({...merged,...scope},id,transaction);
  return repository.update(row,changes,{transaction});
});
const remove=async(entity,id,user)=>sequelize.transaction(async transaction=>{
  const row=await repository.modelFor(entity)?.findOne({where:{id,...(entity==='types'||entity==='categories'?organizationScope(user):visibleScope(user))},transaction,lock:transaction.LOCK.UPDATE});if(!row)throw ApiError.notFound('Catalogue record not found');
  if(entity==='types'&&await ServiceCategory.count({where:{service_type_id:id},transaction}))throw ApiError.conflict('Type has categories; deactivate it instead');
  if(entity==='categories'&&await Service.count({where:{service_category_id:id},transaction}))throw ApiError.conflict('Category has services; deactivate it instead');
  if(entity==='services'&&(await ServicePrice.count({where:{service_id:id},transaction})||await ServiceSourceLink.count({where:{service_id:id},transaction})))throw ApiError.conflict('Service has price/source history; retire it instead');
  if(['prices','rules'].includes(entity)&&['approved','retired'].includes(row.status))throw ApiError.conflict('Approved history cannot be deleted; retire it instead');
  await repository.remove(row,{transaction});return {message:'Catalogue record deleted'};
});

const submitForApproval=async(entity,id,user)=>{
  const model=entity==='prices'?ServicePrice:PricingRule;const entityType=entity==='prices'?'service_price':'pricing_rule';
  const row=await model.findOne({where:{id,...visibleScope(user)}});if(!row)throw ApiError.notFound('Catalogue record not found');if(row.status!=='draft')throw ApiError.conflict('Only draft records can be submitted');
  const definition=await WorkflowDefinition.findOne({where:{organization_id:row.organization_id,entity_type:entityType,is_active:true,[Op.and]:[{[Op.or]:[{hospital_id:null},{hospital_id:row.hospital_id}]},{[Op.or]:[{branch_id:null},{branch_id:row.branch_id}]}]},order:[[literal('branch_id IS NOT NULL'),'DESC'],[literal('hospital_id IS NOT NULL'),'DESC']]});
  let request=null;if(definition){request=await workflows.createRequest({workflow_definition_id:definition.id,entity_type:entityType,entity_id:String(row.id),title:`${entityType.replace('_',' ')} approval`,amount:entity==='prices'?row.amount:null,currency_code:row.currency_code||'BDT',payload:{catalogue_entity:entity,catalogue_id:row.id},submit_now:true},user);}
  await row.update({status:'pending',approval_request_id:request?.id||null,updated_by:user.id});return row.reload();
};
const approve=async(entity,id,user)=>{
  if(!ADMIN_ROLES.has(user.role))throw ApiError.forbidden('Catalogue approval requires an administrator');
  const model=entity==='prices'?ServicePrice:PricingRule;const row=await model.findOne({where:{id,...visibleScope(user)}});if(!row)throw ApiError.notFound('Catalogue record not found');if(!['draft','pending'].includes(row.status))throw ApiError.conflict('Record is not awaiting approval');
  if(row.approval_request_id){const request=await ApprovalRequest.findByPk(row.approval_request_id);if(request?.status!=='approved'&&![ROLES.SUPER_ADMIN,ROLES.ADMIN].includes(user.role))throw ApiError.conflict('Complete the configured approval workflow first');}
  await row.update({status:'approved',approved_by:user.id,approved_at:new Date(),rejection_reason:null,updated_by:user.id});return row;
};
const reject=async(entity,id,comments,user)=>{if(!ADMIN_ROLES.has(user.role))throw ApiError.forbidden('Catalogue rejection requires an administrator');if(!comments)throw ApiError.badRequest('A rejection reason is required');const model=entity==='prices'?ServicePrice:PricingRule;const row=await model.findOne({where:{id,...visibleScope(user)}});if(!row)throw ApiError.notFound('Catalogue record not found');if(!['draft','pending'].includes(row.status))throw ApiError.conflict('Record is not awaiting decision');await row.update({status:'rejected',rejection_reason:comments,updated_by:user.id});return row;};

const resolvePrice=async(input,user,options={})=>{
  const at=(input.at?new Date(input.at):new Date()).toISOString().slice(0,10);const payer=input.payer_type||'self';
  const price=await ServicePrice.findOne({where:{service_id:input.service_id,status:'approved',effective_from:{[Op.lte]:at},[Op.and]:[{[Op.or]:[{effective_to:null},{effective_to:{[Op.gte]:at}}]},visibleScope(user),{[Op.or]:[{payer_type:payer,payer_reference:input.payer_reference||{[Op.is]:null}},{payer_type:'all'}]}]},order:[[literal('branch_id IS NOT NULL'),'DESC'],[literal('hospital_id IS NOT NULL'),'DESC'],[literal(`payer_type='${payer.replace(/'/g,"''")}'`),'DESC'],['version_no','DESC']],transaction:options.transaction});
  if(!price)throw ApiError.notFound('No approved effective price found for this service and payer');
  const service=await Service.findByPk(input.service_id,{transaction:options.transaction});if(!service)throw ApiError.notFound('Service not found');
  const rules=await PricingRule.findAll({where:{status:'approved',effective_from:{[Op.lte]:at},[Op.and]:[{[Op.or]:[{effective_to:null},{effective_to:{[Op.gte]:at}}]},visibleScope(user),{[Op.or]:[{service_id:input.service_id},{service_id:null,service_category_id:service.service_category_id}]},{[Op.or]:[{payer_type:payer},{payer_type:'all'}]}]},order:[['priority','ASC'],['id','ASC']],transaction:options.transaction});
  let amount=Number(price.amount);let taxRate=Number(price.tax_rate||0);const adjustments=[];
  for(const rule of rules){const value=Number(rule.value);if(rule.rule_type==='percentage_discount')amount-=amount*value/100;if(rule.rule_type==='flat_discount')amount-=value;if(rule.rule_type==='surcharge')amount+=value;if(rule.rule_type==='tax_override')taxRate=value;amount=Math.max(0,Math.round((amount+Number.EPSILON)*100)/100);adjustments.push({id:rule.id,code:rule.code,type:rule.rule_type,value});}
  return {service_id:Number(input.service_id),service_price_id:price.id,currency_code:price.currency_code,base_amount:Number(price.amount),amount,tax_rate:taxRate,adjustments,scope:{organization_id:price.organization_id,hospital_id:price.hospital_id,branch_id:price.branch_id},effective_from:price.effective_from,effective_to:price.effective_to,version_no:price.version_no};
};
const getMeta=async(user)=>{const scope=visibleScope(user);const orgScope=organizationScope(user);const [types,categories,organizations,hospitals,branches,counts,approvedValue]=await Promise.all([ServiceType.findAll({where:{...orgScope,is_active:true},order:[['sort_order','ASC'],['name','ASC']]}),ServiceCategory.findAll({where:{...orgScope,is_active:true},order:[['sort_order','ASC'],['name','ASC']]}),Organization.findAll({where:user.organization_id?{id:user.organization_id}:{is_active:true},attributes:['id','code','name']}),Hospital.findAll({where:{is_active:true,...(user.organization_id?{organization_id:user.organization_id}:{})},attributes:['id','organization_id','code','name']}),Branch.findAll({where:{is_active:true,...(user.hospital_id?{hospital_id:user.hospital_id}:{})},attributes:['id','hospital_id','code','name']}),Promise.all([ServiceType.count({where:orgScope}),ServiceCategory.count({where:orgScope}),Service.count({where:scope}),ServicePrice.count({where:scope}),PricingRule.count({where:scope})]),ServicePrice.sum('amount',{where:{...scope,status:'approved'}})]);return {types,categories,organizations,hospitals,branches,summary:{types:counts[0],categories:counts[1],services:counts[2],prices:counts[3],rules:counts[4],approved_price_value:Number(approvedValue||0)}};};

const resolveSourcePrice=async({source_type,source_id,payer_type='self',payer_reference=null,at},user,options={})=>{
  if(!user||!source_type||!source_id)return null;
  const link=await ServiceSourceLink.findOne({where:{organization_id:user.organization_id,source_type,source_id},transaction:options.transaction});
  if(!link)return null;
  return resolvePrice({service_id:link.service_id,payer_type,payer_reference,at},user,options);
};

const serviceSummary=async(user)=>{
  const services=await Service.findAll({where:visibleScope(user),attributes:['id','service_type_id'],include:[{model:ServiceType,as:'type',attributes:['id','code','name']},{model:ServicePrice,as:'prices',attributes:['amount','status'],required:false,where:{status:'approved'},separate:true}]});
  const grouped=new Map();
  for(const service of services){const key=String(service.service_type_id);const current=grouped.get(key)||{service_type_id:service.service_type_id,code:service.type?.code||'',name:service.type?.name||'Uncategorized',service_count:0,approved_price_count:0,min_price:null,max_price:null,average_price:0,total_price:0};current.service_count+=1;for(const price of service.prices||[]){const amount=Number(price.amount);current.approved_price_count+=1;current.total_price+=amount;current.min_price=current.min_price==null?amount:Math.min(current.min_price,amount);current.max_price=current.max_price==null?amount:Math.max(current.max_price,amount);}grouped.set(key,current);}
  return [...grouped.values()].map(row=>({...row,average_price:row.approved_price_count?Math.round((row.total_price/row.approved_price_count)*100)/100:0})).sort((a,b)=>a.name.localeCompare(b.name));
};
const branchPricing=async(query,user)=>{
  const {page,limit,offset}=parsePaging(query);const where={...visibleScope(user),status:'approved',branch_id:{[Op.ne]:null}};if(query.branch_id)where.branch_id=query.branch_id;if(query.service_id)where.service_id=query.service_id;
  if(query.search)where[Op.or]=['$service.name$','$service.code$','$branch.name$','$branch.code$'].map(field=>({[field]:{[Op.like]:`%${query.search}%`}}));
  const result=await ServicePrice.findAndCountAll({where,include:[{model:Service,as:'service',attributes:['id','code','name','billing_unit']},{model:Hospital,as:'hospital',attributes:['id','code','name']},{model:Branch,as:'branch',attributes:['id','code','name']}],distinct:true,limit,offset,order:[[{model:Branch,as:'branch'},'name','ASC'],[{model:Service,as:'service'},'name','ASC'],['version_no','DESC']]});
  return {items:result.rows,meta:buildMeta({total:result.count,page,limit})};
};
const priceHistory=(query,user)=>list('prices',query,user);

module.exports={list,getById,create,update,remove,submitForApproval,approve,reject,resolvePrice,resolveSourcePrice,getMeta,serviceSummary,branchPricing,priceHistory,visibleScope};
