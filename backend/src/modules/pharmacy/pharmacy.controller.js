'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./pharmacy.service');

const listMedicines = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMedicines(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getMedicine = asyncHandler(async (req, res) => {
  const medicine = await service.getMedicine(req.params.id);
  return ApiResponse.success(res, medicine, 'OK');
});

const createMedicine = asyncHandler(async (req, res) => {
  const medicine = await service.createMedicine(req.body);
  return ApiResponse.created(res, medicine, 'Medicine created');
});

const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await service.updateMedicine(req.params.id, req.body);
  return ApiResponse.success(res, medicine, 'Medicine updated');
});

const adjustMedicineStock = asyncHandler(async (req, res) => {
  const result = await service.adjustMedicineStock(req.params.id, req.body);
  return ApiResponse.success(res, result, 'Medicine stock adjusted');
});

const removeMedicine = asyncHandler(async (req, res) => {
  const result = await service.removeMedicine(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listSales = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSales(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await service.getSale(req.params.id);
  return ApiResponse.success(res, sale, 'OK');
});

const createSale = asyncHandler(async (req, res) => {
  const sale = await service.createSale(req.body, req.user.id);
  return ApiResponse.created(res, sale, 'Medicine sale created');
});

const updateSaleStatus = asyncHandler(async (req, res) => {
  const sale = await service.updateSaleStatus(req.params.id, req.body.status);
  return ApiResponse.success(res, sale, 'Medicine sale updated');
});

const removeSale = asyncHandler(async (req, res) => {
  const result = await service.removeSale(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listCategories = asyncHandler(async (_req, res) => {
  const data = await service.listCategories();
  return ApiResponse.success(res, data, 'OK');
});

const listCompanies = asyncHandler(async (_req, res) => {
  const data = await service.listCompanies();
  return ApiResponse.success(res, data, 'OK');
});

const listGroups = asyncHandler(async (_req, res) => {
  const data = await service.listGroups();
  return ApiResponse.success(res, data, 'OK');
});

const listUnits = asyncHandler(async (_req, res) => {
  const data = await service.listUnits();
  return ApiResponse.success(res, data, 'OK');
});

const getSupplierMeta = asyncHandler(async (_req, res) => {
  const data = await service.getSupplierMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listSuppliers = asyncHandler(async (_req, res) => {
  const data = await service.listSuppliers();
  return ApiResponse.success(res, data, 'OK');
});

const createSupplier = asyncHandler(async (req, res) => {
  const data = await service.createSupplier(req.body);
  return ApiResponse.created(res, data, 'Supplier created');
});

const updateSupplier = asyncHandler(async (req, res) => {
  const data = await service.updateSupplier(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Supplier updated');
});

const deleteSupplier = asyncHandler(async (req, res) => {
  const result = await service.deleteSupplier(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getSalesReturnMeta = asyncHandler(async (_req, res) => {
  const data = await service.getSalesReturnMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listSalesReturns = asyncHandler(async (_req, res) => {
  const data = await service.listSalesReturns();
  return ApiResponse.success(res, data, 'OK');
});

const createSalesReturn = asyncHandler(async (req, res) => {
  const data = await service.createSalesReturn(req.body);
  return ApiResponse.created(res, data, 'Sales return recorded');
});

const deleteSalesReturn = asyncHandler(async (req, res) => {
  const result = await service.deleteSalesReturn(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getPurchaseMeta = asyncHandler(async (_req, res) => {
  const data = await service.getPurchaseMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listPurchases = asyncHandler(async (_req, res) => {
  const { items, meta } = await service.listPurchases();
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPurchase = asyncHandler(async (req, res) => {
  const data = await service.getPurchase(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const createPurchase = asyncHandler(async (req, res) => {
  const data = await service.createPurchase(req.body);
  return ApiResponse.created(res, data, 'Purchase recorded');
});

const updatePurchase = asyncHandler(async (req, res) => {
  const data = await service.updatePurchase(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Purchase updated');
});

const addPurchasePayment = asyncHandler(async (req, res) => {
  const data = await service.addPurchasePayment(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Purchase payment recorded');
});

const deletePurchase = asyncHandler(async (req, res) => {
  const result = await service.deletePurchase(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getPurchaseReturnMeta = asyncHandler(async (_req, res) => {
  const data = await service.getPurchaseReturnMeta();
  return ApiResponse.success(res, data, 'OK');
});

const listPurchaseReturns = asyncHandler(async (_req, res) => {
  const data = await service.listPurchaseReturns();
  return ApiResponse.success(res, data, 'OK');
});

const createPurchaseReturn = asyncHandler(async (req, res) => {
  const data = await service.createPurchaseReturn(req.body);
  return ApiResponse.created(res, data, 'Purchase return recorded');
});

const deletePurchaseReturn = asyncHandler(async (req, res) => {
  const result = await service.deletePurchaseReturn(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listBatchStock = asyncHandler(async (req, res) => {
  const data = await service.listBatchStock(req.query);
  return ApiResponse.success(res, data, 'OK');
});

const getStockReport = asyncHandler(async (req, res) => {
  const data = await service.getStockReport(req.query);
  return ApiResponse.success(res, data, 'OK');
});

const getMedicineMeta = asyncHandler(async (_req, res) => {
  const data = await service.getMedicineMeta();
  return ApiResponse.success(res, data, 'OK');
});

module.exports = {
  getMedicineMeta,
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  adjustMedicineStock,
  removeMedicine,
  listSales,
  getSale,
  createSale,
  updateSaleStatus,
  removeSale,
  listCategories,
  listCompanies,
  listGroups,
  listUnits,
  getSupplierMeta,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSalesReturnMeta,
  listSalesReturns,
  createSalesReturn,
  deleteSalesReturn,
  getPurchaseMeta,
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  addPurchasePayment,
  deletePurchase,
  getPurchaseReturnMeta,
  listPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  listBatchStock,
  getStockReport,
};
