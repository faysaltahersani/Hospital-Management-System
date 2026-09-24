'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./billing.controller');
const schemas = require('./billing.validation');

const router = Router();

router.use(authenticate);

const BILLING_STAFF = [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.RECEPTIONIST];
const ACCOUNTANTS = [ROLES.ADMIN, ROLES.ACCOUNTANT];

router.get('/invoices', authorize(BILLING_STAFF), validate(schemas.listInvoices), controller.listInvoices);
router.get('/invoices/:id/print', authorize(BILLING_STAFF), validate(schemas.printInvoice), controller.getInvoicePrint);
router.get('/invoices/:id', authorize(BILLING_STAFF), validate(schemas.getInvoice), controller.getInvoice);
router.post('/invoices', authorize(BILLING_STAFF), validate(schemas.createInvoice), audit('create', 'invoice'), controller.createInvoice);
router.patch('/invoices/:id', authorize(ACCOUNTANTS), validate(schemas.updateInvoice), audit('update', 'invoice'), controller.updateInvoice);
router.delete('/invoices/:id', authorize(ROLES.ADMIN), validate(schemas.removeInvoice), audit('delete', 'invoice'), controller.removeInvoice);

router.get('/patient-due-collections/meta', authorize(BILLING_STAFF), controller.getPatientDueCollectionMeta);
router.get('/patient-due-collections', authorize(BILLING_STAFF), controller.getPatientDueCollections);
router.get('/payments', authorize(BILLING_STAFF), validate(schemas.listPayments), controller.listPayments);
router.get('/payments/:id', authorize(BILLING_STAFF), validate(schemas.getPayment), controller.getPayment);
router.post('/payments', authorize(BILLING_STAFF), validate(schemas.createPayment), audit('create', 'payment'), controller.createPayment);
router.delete('/payments/:id', authorize(ROLES.ADMIN), validate(schemas.removePayment), audit('delete', 'payment'), controller.removePayment);

router.get('/expense-categories', authorize(ACCOUNTANTS), validate(schemas.listCategories), controller.listCategories);
router.post('/expense-categories', authorize(ACCOUNTANTS), validate(schemas.createCategory), audit('create', 'expense_category'), controller.createCategory);
router.patch('/expense-categories/:id', authorize(ACCOUNTANTS), validate(schemas.updateCategory), audit('update', 'expense_category'), controller.updateCategory);
router.delete('/expense-categories/:id', authorize(ROLES.ADMIN), validate(schemas.removeCategory), audit('delete', 'expense_category'), controller.removeCategory);

router.get('/expenses', authorize(ACCOUNTANTS), validate(schemas.listExpenses), controller.listExpenses);
router.get('/expenses/meta', authorize(ACCOUNTANTS), controller.getExpenseMeta);
router.get('/expenses/:id', authorize(ACCOUNTANTS), validate(schemas.getExpense), controller.getExpense);
router.post('/expenses', authorize(ACCOUNTANTS), validate(schemas.createExpense), audit('create', 'expense'), controller.createExpense);
router.patch('/expenses/:id', authorize(ACCOUNTANTS), validate(schemas.updateExpense), audit('update', 'expense'), controller.updateExpense);
router.get('/accounts', authorize(ACCOUNTANTS), controller.listAccounts);
router.post('/accounts', authorize(ACCOUNTANTS), audit('create', 'account'), controller.createAccount);
router.patch('/accounts/:id', authorize(ACCOUNTANTS), audit('update', 'account'), controller.updateAccount);
router.delete('/accounts/:id', authorize(ROLES.ADMIN), audit('delete', 'account'), controller.removeAccount);

router.get('/tax-rates/meta', authorize(ACCOUNTANTS), controller.getTaxRateMeta);
router.get('/tax-rates', authorize(ACCOUNTANTS), controller.listTaxRates);
router.post('/tax-rates', authorize(ACCOUNTANTS), audit('create', 'tax_rate'), controller.createTaxRate);
router.patch('/tax-rates/:id', authorize(ACCOUNTANTS), audit('update', 'tax_rate'), controller.updateTaxRate);
router.delete('/tax-rates/:id', authorize(ROLES.ADMIN), audit('delete', 'tax_rate'), controller.removeTaxRate);

router.get('/income-heads', authorize(ACCOUNTANTS), controller.listIncomeHeads);
router.post('/income-heads', authorize(ACCOUNTANTS), audit('create', 'income_head'), controller.createIncomeHead);
router.patch('/income-heads/:id', authorize(ACCOUNTANTS), audit('update', 'income_head'), controller.updateIncomeHead);
router.delete('/income-heads/:id', authorize(ROLES.ADMIN), audit('delete', 'income_head'), controller.removeIncomeHead);

router.get('/income/meta', authorize(ACCOUNTANTS), controller.getIncomeMeta);
router.get('/income', authorize(ACCOUNTANTS), controller.listIncomes);
router.get('/incomes', authorize(ACCOUNTANTS), controller.listIncomes);
router.post('/income', authorize(ACCOUNTANTS), audit('create', 'income'), controller.createIncome);
router.post('/incomes', authorize(ACCOUNTANTS), audit('create', 'income'), controller.createIncome);

router.get('/contra/meta', authorize(ACCOUNTANTS), controller.getContraMeta);
router.get('/contra', authorize(ACCOUNTANTS), controller.listContra);
router.post('/contra', authorize(ACCOUNTANTS), audit('create', 'contra_entry'), controller.createContra);
router.delete('/contra/:id', authorize(ROLES.ADMIN), audit('delete', 'contra_entry'), controller.removeContra);

module.exports = router;
