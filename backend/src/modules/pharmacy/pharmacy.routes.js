'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./pharmacy.controller');
const schemas = require('./pharmacy.validation');

const router = Router();

router.use(authenticate);

const PHARMACY_STAFF = [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.NURSE, ROLES.ACCOUNTANT, ROLES.LAB_TECH, ROLES.RECEPTIONIST];
const PHARMACY_MANAGERS = [ROLES.ADMIN, ROLES.PHARMACIST];

router.get('/categories', authorize(PHARMACY_STAFF), controller.listCategories);
router.get('/companies', authorize(PHARMACY_STAFF), controller.listCompanies);
router.get('/groups', authorize(PHARMACY_STAFF), controller.listGroups);
router.get('/units', authorize(PHARMACY_STAFF), controller.listUnits);

router.get('/suppliers/meta', authorize(PHARMACY_STAFF), controller.getSupplierMeta);
router.get('/suppliers', authorize(PHARMACY_STAFF), controller.listSuppliers);
router.post('/suppliers', authorize(PHARMACY_MANAGERS), controller.createSupplier);
router.patch('/suppliers/:id', authorize(PHARMACY_MANAGERS), controller.updateSupplier);
router.delete('/suppliers/:id', authorize(PHARMACY_MANAGERS), controller.deleteSupplier);

router.get('/sales-returns/meta', authorize(PHARMACY_STAFF), controller.getSalesReturnMeta);
router.get('/sales-returns', authorize(PHARMACY_STAFF), controller.listSalesReturns);
router.post('/sales-returns', authorize(PHARMACY_MANAGERS), controller.createSalesReturn);
router.delete('/sales-returns/:id', authorize(PHARMACY_MANAGERS), controller.deleteSalesReturn);

router.get('/purchases/meta', authorize(PHARMACY_STAFF), controller.getPurchaseMeta);
router.get('/purchases', authorize(PHARMACY_STAFF), controller.listPurchases);
router.get('/purchases/:id', authorize(PHARMACY_STAFF), controller.getPurchase);
router.post('/purchases', authorize(PHARMACY_MANAGERS), controller.createPurchase);
router.patch('/purchases/:id', authorize(PHARMACY_MANAGERS), controller.updatePurchase);
router.post('/purchases/:id/payments', authorize(PHARMACY_MANAGERS), controller.addPurchasePayment);
router.delete('/purchases/:id', authorize(PHARMACY_MANAGERS), controller.deletePurchase);

router.get('/purchase-returns/meta', authorize(PHARMACY_STAFF), controller.getPurchaseReturnMeta);
router.get('/purchase-returns', authorize(PHARMACY_STAFF), controller.listPurchaseReturns);
router.post('/purchase-returns', authorize(PHARMACY_MANAGERS), controller.createPurchaseReturn);
router.delete('/purchase-returns/:id', authorize(PHARMACY_MANAGERS), controller.deletePurchaseReturn);

router.get('/medicine-batch-stock', authorize(PHARMACY_STAFF), controller.listBatchStock);
router.get('/medicine-stock-report', authorize(PHARMACY_STAFF), controller.getStockReport);

router.get('/medicines/meta', authorize(PHARMACY_STAFF), controller.getMedicineMeta);
router.get('/medicines', authorize(PHARMACY_STAFF), validate(schemas.listMedicines), controller.listMedicines);
router.get('/medicines/:id', authorize(PHARMACY_STAFF), validate(schemas.getMedicine), controller.getMedicine);
router.post(
  '/medicines',
  authorize(PHARMACY_MANAGERS),
  validate(schemas.createMedicine),
  audit('create', 'medicine'),
  controller.createMedicine
);
router.post(
  '/medicines/:id/stock-adjustments',
  authorize(PHARMACY_MANAGERS),
  validate(schemas.adjustMedicineStock),
  audit('update', 'medicine_stock'),
  controller.adjustMedicineStock
);
router.patch(
  '/medicines/:id',
  authorize(PHARMACY_MANAGERS),
  validate(schemas.updateMedicine),
  audit('update', 'medicine'),
  controller.updateMedicine
);
router.delete(
  '/medicines/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeMedicine),
  audit('delete', 'medicine'),
  controller.removeMedicine
);

router.get('/sales', authorize(PHARMACY_MANAGERS), validate(schemas.listSales), controller.listSales);
router.get('/sales/:id', authorize(PHARMACY_MANAGERS), validate(schemas.getSale), controller.getSale);
router.post(
  '/sales',
  authorize(PHARMACY_MANAGERS),
  validate(schemas.createSale),
  audit('create', 'medicine_sale'),
  controller.createSale
);
router.patch(
  '/sales/:id/status',
  authorize(PHARMACY_MANAGERS),
  validate(schemas.updateSaleStatus),
  audit('update', 'medicine_sale'),
  controller.updateSaleStatus
);
router.delete(
  '/sales/:id',
  authorize(ROLES.ADMIN),
  validate(schemas.removeSale),
  audit('delete', 'medicine_sale'),
  controller.removeSale
);

module.exports = router;
