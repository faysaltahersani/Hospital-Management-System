'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const app = require('../src/app');
const config = require('../src/config');
const models = require('../src/models');
const { runWithTenant } = require('../src/utils/tenantContext');

const {
  sequelize, Patient, Invoice, InvoiceItem, ServiceType, ServiceCategory, Service, ServicePrice,
  ServiceSourceLink, Branch, Ward,
} = models;

let server;
let base;
let token;
const cleanup = { invoiceIds: [], priceIds: [], serviceIds: [], categoryIds: [], typeIds: [], wardIds: [] };

const api = async (path, { method='GET', body }={}) => {
  const response = await fetch(`${base}${config.apiPrefix}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    ...(body ? { body:JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  return { status:response.status, body:payload };
};

test.before(async () => {
  await sequelize.authenticate();
  server=http.createServer(app);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
  const login=await api('/auth/login',{method:'POST',body:{email:'admin@hospital.local',password:'HmsQaAdmin2026x'}});
  assert.equal(login.status,200,'admin login must succeed for catalogue tests');
  token=login.body.data.accessToken;
});

test.after(async () => {
  if(cleanup.invoiceIds.length){await InvoiceItem.destroy({where:{invoice_id:cleanup.invoiceIds},force:true});await Invoice.destroy({where:{id:cleanup.invoiceIds},force:true});}
  if(cleanup.priceIds.length)await ServicePrice.destroy({where:{id:cleanup.priceIds},force:true});
  if(cleanup.serviceIds.length)await Service.destroy({where:{id:cleanup.serviceIds},force:true});
  if(cleanup.categoryIds.length)await ServiceCategory.destroy({where:{id:cleanup.categoryIds},force:true});
  if(cleanup.typeIds.length)await ServiceType.destroy({where:{id:cleanup.typeIds},force:true});
  if(cleanup.wardIds.length)await Ward.destroy({where:{id:cleanup.wardIds},force:true});
  await new Promise(resolve=>server.close(resolve));
  await sequelize.close();
});

test('Phase A backfill has one source link and one canonical v1 price per service', async () => {
  const [[counts]]=await sequelize.query(`SELECT (SELECT COUNT(*) FROM services) services,(SELECT COUNT(*) FROM service_source_links) links`);
  assert.ok(Number(counts.services)>0,'catalogue must contain migrated services');
  assert.equal(Number(counts.links),Number(counts.services),'every migrated service needs its source link');
  const [duplicates]=await sequelize.query(`SELECT service_id,COUNT(*) count FROM service_prices WHERE version_no=1 GROUP BY service_id,organization_id,hospital_scope_key,branch_scope_key,payer_type,payer_reference_key,version_no HAVING COUNT(*)>1`);
  assert.equal(duplicates.length,0,'canonical price versions must be unique even when scope fields are null');
  const summary=await api('/service-catalog/reports/service-summary');
  const branchPricing=await api('/service-catalog/reports/branch-pricing?limit=5');
  const history=await api('/service-catalog/reports/price-history?limit=5');
  assert.equal(summary.status,200,JSON.stringify(summary.body));assert.ok(summary.body.data.length>0);
  assert.equal(branchPricing.status,200,JSON.stringify(branchPricing.body));
  if(branchPricing.body.data.length){const code=branchPricing.body.data[0].service.code;const filtered=await api(`/service-catalog/reports/branch-pricing?search=${encodeURIComponent(code)}&limit=100`);assert.equal(filtered.status,200,JSON.stringify(filtered.body));assert.ok(filtered.body.data.length>0);assert.ok(filtered.body.data.every(row=>row.service.code.includes(code)));}
  assert.equal(history.status,200,JSON.stringify(history.body));assert.ok(history.body.data.length>0);
});

test('catalogue CRUD, approval, resolver and invoice price snapshot are connected end to end', async () => {
  const stamp=Date.now();
  const type=await api('/service-catalog/types',{method:'POST',body:{code:`QA-TYPE-${stamp}`,name:`QA Type ${stamp}`}});
  assert.equal(type.status,201,JSON.stringify(type.body));cleanup.typeIds.push(type.body.data.id);
  const category=await api('/service-catalog/categories',{method:'POST',body:{service_type_id:type.body.data.id,code:`QA-CAT-${stamp}`,name:`QA Category ${stamp}`}});
  assert.equal(category.status,201,JSON.stringify(category.body));cleanup.categoryIds.push(category.body.data.id);
  const service=await api('/service-catalog/services',{method:'POST',body:{service_type_id:type.body.data.id,service_category_id:category.body.data.id,code:`QA-SVC-${stamp}`,name:`QA Service ${stamp}`,billing_unit:'unit',status:'active'}});
  assert.equal(service.status,201,JSON.stringify(service.body));cleanup.serviceIds.push(service.body.data.id);
  const price=await api('/service-catalog/prices',{method:'POST',body:{service_id:service.body.data.id,payer_type:'self',currency_code:'BDT',amount:321.45,tax_rate:0,effective_from:'2026-01-01'}});
  assert.equal(price.status,201,JSON.stringify(price.body));cleanup.priceIds.push(price.body.data.id);
  assert.equal(price.body.data.status,'draft');
  const overlap=await api('/service-catalog/prices',{method:'POST',body:{service_id:service.body.data.id,payer_type:'self',currency_code:'BDT',amount:400,effective_from:'2026-06-01'}});
  assert.equal(overlap.status,409,'overlapping effective periods must be rejected');
  const approved=await api(`/service-catalog/prices/${price.body.data.id}/approve`,{method:'POST',body:{}});
  assert.equal(approved.status,200,JSON.stringify(approved.body));assert.equal(approved.body.data.status,'approved');
  const resolved=await api(`/service-catalog/resolve?service_id=${service.body.data.id}&payer_type=self`);
  assert.equal(resolved.status,200,JSON.stringify(resolved.body));assert.equal(Number(resolved.body.data.amount),321.45);

  const patient=await Patient.findOne();
  const invoice=await api('/billing/invoices',{method:'POST',body:{patient_id:patient.id,items:[{item_type:'other',service_id:service.body.data.id,description:'Catalogue connected invoice',quantity:1,unit_price:999}]}});
  assert.equal(invoice.status,201,JSON.stringify(invoice.body));cleanup.invoiceIds.push(invoice.body.data.id);
  assert.equal(Number(invoice.body.data.total),321.45,'client/legacy amount must not override approved catalogue price');
  const line=await InvoiceItem.findOne({where:{invoice_id:invoice.body.data.id}});
  assert.equal(Number(line.service_id),Number(service.body.data.id));
  assert.equal(Number(line.service_price_id),Number(price.body.data.id));
  assert.equal(Number(line.pricing_snapshot.amount),321.45,'invoice must retain immutable price evidence');
});

test('branch tenant context fills ownership and prevents cross-branch reads', async (t) => {
  const branches=await Branch.findAll({order:[['id','ASC']]});
  if(branches.length<2){t.skip('two branches are required for an isolation proof');return;}
  const first=branches[0];const second=branches.find(row=>Number(row.id)!==Number(first.id)&&Number(row.hospital_id)===Number(first.hospital_id));
  if(!second){t.skip('two branches in one hospital are required');return;}
  const stamp=Date.now();
  const secondUser={id:1,role:'branch_admin',organization_id:1,hospital_id:first.hospital_id,branch_id:second.id,department_id:null};
  const ward=await runWithTenant(secondUser,()=>Ward.create({name:`QA tenant ward ${stamp}`,code:`QATW-${stamp}`,type:'general',is_active:true}));
  cleanup.wardIds.push(ward.id);
  assert.equal(Number(ward.branch_id),Number(second.id),'write scope must be filled from the authenticated tenant');
  const firstUser={...secondUser,branch_id:first.id};
  const hidden=await runWithTenant(firstUser,()=>Ward.findByPk(ward.id));
  assert.equal(hidden,null,'another branch must not be able to read the record');
  const visible=await runWithTenant(secondUser,()=>Ward.findByPk(ward.id));
  assert.equal(Number(visible.id),Number(ward.id));
});
