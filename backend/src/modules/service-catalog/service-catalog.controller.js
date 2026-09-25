'use strict';
const asyncHandler=require('../../utils/asyncHandler');
const ApiResponse=require('../../utils/ApiResponse');
const service=require('./service-catalog.service');

const meta=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.getMeta(req.user),'Service catalogue metadata retrieved'));
const list=asyncHandler(async(req,res)=>{const result=await service.list(req.params.entity,req.query,req.user);return ApiResponse.success(res,result.items,'OK',result.meta);});
const getById=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.getById(req.params.entity,req.params.id,req.user),'OK'));
const create=asyncHandler(async(req,res)=>ApiResponse.created(res,await service.create(req.params.entity,req.body,req.user),'Catalogue record created'));
const update=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.update(req.params.entity,req.params.id,req.body,req.user),'Catalogue record updated'));
const remove=asyncHandler(async(req,res)=>{const result=await service.remove(req.params.entity,req.params.id,req.user);return ApiResponse.success(res,null,result.message);});
const resolve=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.resolvePrice(req.query,req.user),'Price resolved'));
const submit=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.submitForApproval(req.params.entity,req.params.id,req.user),'Submitted for approval'));
const approve=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.approve(req.params.entity,req.params.id,req.user),'Catalogue record approved'));
const reject=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.reject(req.params.entity,req.params.id,req.body.comments,req.user),'Catalogue record rejected'));
const serviceSummary=asyncHandler(async(req,res)=>ApiResponse.success(res,await service.serviceSummary(req.user),'Service-wise charge summary retrieved'));
const branchPricing=asyncHandler(async(req,res)=>{const result=await service.branchPricing(req.query,req.user);return ApiResponse.success(res,result.items,'Branch-wise pricing retrieved',result.meta);});
const priceHistory=asyncHandler(async(req,res)=>{const result=await service.priceHistory(req.query,req.user);return ApiResponse.success(res,result.items,'Price history retrieved',result.meta);});
module.exports={meta,list,getById,create,update,remove,resolve,submit,approve,reject,serviceSummary,branchPricing,priceHistory};
