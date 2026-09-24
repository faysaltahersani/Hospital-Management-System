/// Paths for the HMS REST API, relative to `AppConfig.apiBaseUrl`.
///
/// The backend exposes 174 endpoints across 22 modules; these are the ones the
/// mobile app consumes. See `HMS Api EndPoint.txt` in the backend repo for the
/// full catalogue.
class Api {
  Api._();

  // Auth
  static const login = '/auth/login';
  static const refresh = '/auth/refresh';
  static const logout = '/auth/logout';
  static const me = '/auth/me';
  static const changePassword = '/auth/change-password';

  // Directory
  static const departments = '/departments';
  static const doctors = '/doctors';
  static String doctorSlots(String id) => '/doctors/$id/available-slots';

  // Patients
  static const patients = '/patients';
  static String patientTimeline(String id) => '/patients/$id/timeline';

  // Appointments
  static const appointments = '/appointments';
  static String appointmentStatus(String id) => '/appointments/$id/status';

  // Diagnostics
  static const labOrders = '/laboratory/orders';
  static String labReport(String id) => '/laboratory/orders/$id/report';
  static const radiologyOrders = '/radiology/orders';
  static String radiologyReport(String id) => '/radiology/orders/$id/report';

  // Prescriptions
  static const prescriptions = '/prescriptions';
  static String prescriptionStatus(String id) => '/prescriptions/$id/status';

  // Billing
  static const invoices = '/billing/invoices';
  static const payments = '/billing/payments';
  static String invoicePrint(String id) => '/billing/invoices/$id/print';

  // Beds & wards — the admin app's occupancy tab
  static const bedSummary = '/beds/summary';
  static const wards = '/beds/wards';
  static const beds = '/beds';

  // Inpatient admissions (also backs the doctor's OT list)
  static const ipd = '/ipd';
  static String ipdRecord(String id) => '/ipd/$id';

  // Pharmacy & blood bank stock
  static const medicines = '/pharmacy/medicines';
  static const bloodBagSummary = '/blood-bank/bags/summary';

  // HR — powers the doctor's leave requests and duty roster
  static const employees = '/hr/employees';
  static const attendance = '/hr/attendance';
  static const payrolls = '/hr/payrolls';

  // Audit trail
  static const auditLogs = '/audit-logs';

  // Reports
  static const dashboardReport = '/reports/dashboard';
  static const appointmentsReport = '/reports/appointments';
  static const financeReport = '/reports/finance';
  static const bedOccupancyReport = '/reports/bed-occupancy';
  static const bloodStockReport = '/reports/blood-stock';
  static const pharmacyStockReport = '/reports/pharmacy-stock';

  // Settings
  static const publicSettings = '/settings/public';
  static const settings = '/settings';

  static const health = '/health';
}
