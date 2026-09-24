'use strict';

const { Router } = require('express');

const { authenticate } = require('../middlewares/auth.middleware');
const { requireModulePermission } = require('../middlewares/permission.middleware');

const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const departmentsRoutes = require('../modules/departments/departments.routes');
const patientsRoutes = require('../modules/patients/patients.routes');
const doctorsRoutes = require('../modules/doctors/doctors.routes');
const appointmentsRoutes = require('../modules/appointments/appointments.routes');
const bedsRoutes = require('../modules/beds/beds.routes');
const ipdRoutes = require('../modules/ipd/ipd.routes');
const opdRoutes = require('../modules/opd/opd.routes');
const pharmacyRoutes = require('../modules/pharmacy/pharmacy.routes');
const prescriptionsRoutes = require('../modules/prescriptions/prescriptions.routes');
const laboratoryRoutes = require('../modules/laboratory/laboratory.routes');
const diagnosticsRoutes = require('../modules/diagnostics/diagnostics.routes');
const radiologyRoutes = require('../modules/radiology/radiology.routes');
const billingRoutes = require('../modules/billing/billing.routes');
const ambulanceRoutes = require('../modules/ambulance/ambulance.routes');
const bloodBankRoutes = require('../modules/blood-bank/blood-bank.routes');
const referralsRoutes = require('../modules/referrals/referrals.routes');
const hrRoutes = require('../modules/hr/hr.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const auditLogsRoutes = require('../modules/audit-logs/audit-logs.routes');
const reportsRoutes = require('../modules/reports/reports.routes');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    data: {
      service: 'hospital-management-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Modules whose access is governed by the dynamic permission system are
// mounted behind `authenticate` + `requireModulePermission` so that direct API
// calls obey the same policy as the UI menu (BUG-001).
//
// Excluded by design:
//   /auth       - public + self-service endpoints
//   /users      - admin-only, except a user reading their own permissions
//   /settings   - exposes a public sub-route and is otherwise admin-only
//   /audit-logs - admin-only
//   /prescriptions - no menu-level permission exists in the UI catalogue
const guard = (moduleName) => [authenticate, requireModulePermission(moduleName)];

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/departments', guard('departments'), departmentsRoutes);
router.use('/patients', guard('patients'), patientsRoutes);
router.use('/doctors', guard('doctors'), doctorsRoutes);
router.use('/appointments', guard('appointments'), appointmentsRoutes);
router.use('/beds', guard('beds'), bedsRoutes);
router.use('/ipd', guard('ipd'), ipdRoutes);
router.use('/opd', guard('opd'), opdRoutes);
router.use('/pharmacy', guard('pharmacy'), pharmacyRoutes);
router.use('/prescriptions', prescriptionsRoutes);
router.use('/laboratory', guard('laboratory'), laboratoryRoutes);
router.use('/diagnostics', guard('diagnostics'), diagnosticsRoutes);
router.use('/radiology', guard('radiology'), radiologyRoutes);
router.use('/billing', guard('billing'), billingRoutes);
router.use('/ambulance', guard('ambulance'), ambulanceRoutes);
router.use('/blood-bank', guard('blood-bank'), bloodBankRoutes);
router.use('/referrals', guard('referrals'), referralsRoutes);
router.use('/hr', guard('hr'), hrRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/reports', guard('reports'), reportsRoutes);

// BUG-021 — a catch-all used to answer every unmatched GET with
// `{success:true, data:[]}` (and a large hardcoded object for `*/meta`). That
// turned missing endpoints and malformed ids into HTTP 200 "no records", so
// broken features were indistinguishable from empty ones and survived manual
// testing. Unmatched routes now fall through to `notFound` and return 404.

module.exports = router;
