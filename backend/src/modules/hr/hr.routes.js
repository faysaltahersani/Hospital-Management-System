'use strict';

const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { audit } = require('../../middlewares/audit.middleware');
const { ROLES } = require('../../config/constants');
const controller = require('./hr.controller');
const schemas = require('./hr.validation');

const router = Router();

router.use(authenticate);

const HR_STAFF = [ROLES.ADMIN, ROLES.ACCOUNTANT];

router.get('/employees', authorize(HR_STAFF), validate(schemas.listEmployees), controller.listEmployees);
router.get('/employees/:id', authorize(HR_STAFF), validate(schemas.getEmployee), controller.getEmployee);
router.post('/employees', authorize(ROLES.ADMIN), validate(schemas.createEmployee), audit('create', 'employee'), controller.createEmployee);
router.patch('/employees/:id', authorize(ROLES.ADMIN), validate(schemas.updateEmployee), audit('update', 'employee'), controller.updateEmployee);
router.delete('/employees/:id', authorize(ROLES.ADMIN), validate(schemas.removeEmployee), audit('delete', 'employee'), controller.removeEmployee);

router.get('/attendance', authorize(HR_STAFF), validate(schemas.listAttendance), controller.listAttendance);
router.post('/attendance', authorize(HR_STAFF), validate(schemas.createAttendance), audit('create', 'attendance'), controller.createAttendance);
router.patch('/attendance/:id', authorize(HR_STAFF), validate(schemas.updateAttendance), audit('update', 'attendance'), controller.updateAttendance);
router.delete('/attendance/:id', authorize(ROLES.ADMIN), validate(schemas.removeAttendance), audit('delete', 'attendance'), controller.removeAttendance);

router.get('/payrolls', authorize(HR_STAFF), validate(schemas.listPayrolls), controller.listPayrolls);
router.get('/payrolls/:id', authorize(HR_STAFF), validate(schemas.getPayroll), controller.getPayroll);
router.post('/payrolls', authorize(HR_STAFF), validate(schemas.createPayroll), audit('create', 'payroll'), controller.createPayroll);
router.patch('/payrolls/:id', authorize(HR_STAFF), validate(schemas.updatePayroll), audit('update', 'payroll'), controller.updatePayroll);
router.delete('/payrolls/:id', authorize(ROLES.ADMIN), validate(schemas.removePayroll), audit('delete', 'payroll'), controller.removePayroll);

module.exports = router;
