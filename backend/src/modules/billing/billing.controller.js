'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./billing.service');

const listInvoices = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listInvoices(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getInvoice = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getInvoice(req.params.id), 'OK'));

const getInvoicePrint = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getInvoicePrint(req.params.id), 'OK')
);

const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.createInvoice(req.body, req.user.id);
  return ApiResponse.created(res, invoice, 'Invoice created');
});

const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.updateInvoice(req.params.id, req.body);
  return ApiResponse.success(res, invoice, 'Invoice updated');
});

const removeInvoice = asyncHandler(async (req, res) => {
  const result = await service.removeInvoice(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listPayments = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayments(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPayment = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getPayment(req.params.id), 'OK'));

const createPayment = asyncHandler(async (req, res) => {
  const payment = await service.createPayment(req.body, req.user.id);
  return ApiResponse.created(res, payment, 'Payment recorded');
});

const removePayment = asyncHandler(async (req, res) => {
  const result = await service.removePayment(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listCategories = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCategories(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await service.createCategory(req.body);
  return ApiResponse.created(res, category, 'Expense category created');
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await service.updateCategory(req.params.id, req.body);
  return ApiResponse.success(res, category, 'Expense category updated');
});

const removeCategory = asyncHandler(async (req, res) => {
  const result = await service.removeCategory(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listExpenses = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listExpenses(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getExpense = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getExpense(req.params.id), 'OK'));

const createExpense = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user.id);
  return ApiResponse.created(res, expense, 'Expense created');
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await service.updateExpense(req.params.id, req.body);
  return ApiResponse.success(res, expense, 'Expense updated');
});

const removeExpense = asyncHandler(async (req, res) => {
  const result = await service.removeExpense(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getExpenseMeta = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getExpenseMeta(), 'OK')
);

const listAccounts = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listAccounts(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createAccount = asyncHandler(async (req, res) => {
  const account = await service.createAccount(req.body);
  return ApiResponse.created(res, account, 'Account created');
});

const updateAccount = asyncHandler(async (req, res) => {
  const account = await service.updateAccount(req.params.id, req.body);
  return ApiResponse.success(res, account, 'Account updated');
});

const removeAccount = asyncHandler(async (req, res) => {
  const result = await service.removeAccount(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getTaxRateMeta = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getTaxRateMeta(), 'OK')
);

const listTaxRates = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTaxRates(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createTaxRate = asyncHandler(async (req, res) => {
  const taxRate = await service.createTaxRate(req.body);
  return ApiResponse.created(res, taxRate, 'Tax rate created');
});

const updateTaxRate = asyncHandler(async (req, res) => {
  const taxRate = await service.updateTaxRate(req.params.id, req.body);
  return ApiResponse.success(res, taxRate, 'Tax rate updated');
});

const removeTaxRate = asyncHandler(async (req, res) => {
  const result = await service.removeTaxRate(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listIncomeHeads = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listIncomeHeads(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createIncomeHead = asyncHandler(async (req, res) => {
  const head = await service.createIncomeHead(req.body);
  return ApiResponse.created(res, head, 'Income head created');
});

const updateIncomeHead = asyncHandler(async (req, res) => {
  const head = await service.updateIncomeHead(req.params.id, req.body);
  return ApiResponse.success(res, head, 'Income head updated');
});

const removeIncomeHead = asyncHandler(async (req, res) => {
  const result = await service.removeIncomeHead(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getIncomeMeta = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getIncomeMeta(), 'OK')
);

const updateIncome = asyncHandler(async (req, res) => {
  const data = await service.updateIncome(req.params.id, req.body);
  return ApiResponse.success(res, data, 'Income updated');
});

const removeIncome = asyncHandler(async (req, res) => {
  const result = await service.removeIncome(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listIncomes = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listIncomes(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createIncome = asyncHandler(async (req, res) => {
  const income = await service.createIncome(req.body, req.user.id);
  return ApiResponse.created(res, income, 'Income recorded');
});

const getContraMeta = asyncHandler(async (req, res) =>
  ApiResponse.success(res, await service.getContraMeta(), 'OK')
);

const listContra = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listContra(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const createContra = asyncHandler(async (req, res) => {
  const contra = await service.createContra(req.body, req.user?.id);
  return ApiResponse.created(res, contra, 'Contra entry created');
});

const removeContra = asyncHandler(async (req, res) => {
  const result = await service.removeContra(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getPatientDueCollections = asyncHandler(async (req, res) => {
  const { items, meta } = await service.getPatientDueCollections(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getPatientDueCollectionMeta = asyncHandler(async (_req, res) => {
  const data = await service.getPatientDueCollectionMeta();
  return ApiResponse.success(res, data, 'OK');
});

module.exports = {
  getPatientDueCollections,
  getPatientDueCollectionMeta,
  listInvoices,
  getInvoice,
  getInvoicePrint,
  createInvoice,
  updateInvoice,
  removeInvoice,
  listPayments,
  getPayment,
  createPayment,
  removePayment,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  listExpenses,
  getExpense,
  getExpenseMeta,
  createExpense,
  updateExpense,
  removeExpense,
  listAccounts,
  createAccount,
  updateAccount,
  removeAccount,
  getTaxRateMeta,
  listTaxRates,
  createTaxRate,
  updateTaxRate,
  removeTaxRate,
  listIncomeHeads,
  createIncomeHead,
  updateIncomeHead,
  removeIncomeHead,
  getIncomeMeta,
  listIncomes,
  createIncome,
  getContraMeta,
  listContra,
  createContra,
  removeContra,
};
