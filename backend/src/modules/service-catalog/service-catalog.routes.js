'use strict';
const {Router}=require('express');
const {authenticate}=require('../../middlewares/auth.middleware');
const {authorize}=require('../../middlewares/role.middleware');
const {validate}=require('../../middlewares/validate.middleware');
const {audit}=require('../../middlewares/audit.middleware');
const {ROLES,ROLE_VALUES}=require('../../config/constants');
const controller=require('./service-catalog.controller');
const schemas=require('./service-catalog.validation');

const router=Router();
const STAFF=ROLE_VALUES.filter(role=>role!==ROLES.PATIENT);
const MANAGERS=[ROLES.SUPER_ADMIN,ROLES.ADMIN,ROLES.HOSPITAL_ADMIN,ROLES.BRANCH_ADMIN,ROLES.FINANCE_MANAGER,ROLES.ACCOUNTANT];
const APPROVERS=[ROLES.SUPER_ADMIN,ROLES.ADMIN,ROLES.HOSPITAL_ADMIN,ROLES.BRANCH_ADMIN,ROLES.FINANCE_MANAGER];
const entityAudit=req=>({types:'service_type',categories:'service_category',services:'service',prices:'service_price',rules:'pricing_rule'}[req.params.entity]||'service_catalogue');
const validateBody=(partial=false)=>(req,res,next)=>{
  const schema=schemas.bodies[req.params.entity];
  if(!schema)return next();
  const bodySchema=partial?schema.fork(Object.keys(schema.describe().keys),(field)=>field.optional()).min(1):schema;
  return validate({body:bodySchema})(req,res,next);
};

router.use(authenticate);
router.use(authorize(STAFF));
router.get('/meta',controller.meta);
router.get('/resolve',validate(schemas.resolve),controller.resolve);
router.get('/reports/service-summary',controller.serviceSummary);
router.get('/reports/branch-pricing',validate(schemas.list),controller.branchPricing);
router.get('/reports/price-history',validate(schemas.list),controller.priceHistory);
router.post('/:entity(prices|rules)/:id/submit',authorize(MANAGERS),validate(schemas.decision),audit('submit',entityAudit),controller.submit);
router.post('/:entity(prices|rules)/:id/approve',authorize(APPROVERS),validate(schemas.decision),audit('approve',entityAudit),controller.approve);
router.post('/:entity(prices|rules)/:id/reject',authorize(APPROVERS),validate(schemas.decision),audit('reject',entityAudit),controller.reject);
router.get('/:entity(types|categories|services|prices|rules)',validate(schemas.list),controller.list);
router.get('/:entity(types|categories|services|prices|rules)/:id',validate(schemas.id),controller.getById);
router.post('/:entity(types|categories|services|prices|rules)',authorize(MANAGERS),validateBody(false),audit('create',entityAudit),controller.create);
router.patch('/:entity(types|categories|services|prices|rules)/:id',authorize(MANAGERS),validate(schemas.id),validateBody(true),audit('update',entityAudit),controller.update);
router.delete('/:entity(types|categories|services|prices|rules)/:id',authorize(MANAGERS),validate(schemas.id),audit('delete',entityAudit),controller.remove);
module.exports=router;
