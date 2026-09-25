import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  AmbulanceEntryPage,
  AmbulancePage,
  CallAmbulanceEntryPage,
  CallAmbulanceRecordPage,
} from "../features/ambulance";
import {
  AppointmentBillRecordPage,
  AppointmentEntryPage,
  AppointmentPage,
  AppointmentPriorityEntryPage,
  AppointmentShiftEntryPage,
  AppointmentSlotsPage,
} from "../features/appointment";
import { LoginPage } from "../features/auth";
import { BedAvailabilityPage, BedEntryPage, BedManagementPage, BedPage } from "../features/bed";
import {
  BloodComponentIssuePage,
  BloodComponentIssueRecordPage,
  BloodComponentEntryPage,
  BloodComponentSeparationRecordPage,
  BloodComponentSeparationPage,
  BloodDonatePage,
  BloodDonateRecordPage,
  BloodDonorPage,
  BloodGroupPage,
  BloodIssueRecordPage,
  BloodIssuePage,
  BloodPage,
  BloodStockPage,
  BloodUnitPage,
} from "../features/blood";
import { DashboardPage } from "../features/dashboard";
import { DoctorDepartmentPage, DoctorEntryPage, DoctorPage, DoctorSpecializationPage } from "../features/doctor";
import {
  AccountEntryPage,
  ContraEntryPage,
  ContraRecordPage,
  ExpenseEntryPage,
  ExpenseRecordPage,
  ExpenseHeadEntryPage,
  FinancePage,
  FinanceReportsPage,
  IncomeEntryPage,
  IncomeHeadEntryPage,
  IncomeRecordPage,
  PatientDueCollectionListPage,
  TaxRatePage,
} from "../features/finance";
import {
  DepartmentEntryPage,
  EmployeeEntryPage,
  EmployeeSalaryPaymentEntryPage,
  HrPayrollPage,
  SalarySheetPage,
} from "../features/hr-payroll";
import {
  IpdBillEntryPage,
  IpdBillRecordPage,
  IpdPage,
  IpdSymptomsManagePage,
} from "../features/ipd";
import {
  MedicineCategoryPage,
  MedicineCompanyPage,
  MedicineEntryPage,
  MedicineGroupPage,
  MedicineListPage,
  MedicinePage,
  MedicineUnitPage,
} from "../features/medicine";
import { ModulesPage } from "../features/modules";
import {
  OpdBillEntryPage,
  OpdBillRecordPage,
  OpdPage,
  OpdSymptomsManagePage,
} from "../features/opd";
import { OptionsPage } from "../features/options";
import {
  PathologyBillRecordPage,
  PathologyBillEntryPage,
  PathologyParameterEntryPage,
  PathologyPage,
  PathologyTestCategoryEntryPage,
  PathologyTestEntryPage,
  PathologyTestListPage,
  PathologyTestUnitEntryPage,
} from "../features/pathology";
import { DiagnosticHistoryPage } from "../features/diagnostics";
import { PatientEmrPage, PatientEntryPage, PatientListPage, PatientPage } from "../features/patient";
import {
  PharmacyPage,
  PharmacyPurchasePage,
  PharmacyPurchaseReturnPage,
  PharmacySalesPage,
  PharmacySalesRecordPage,
  PharmacySalesReturnPage,
  PharmacySalesReturnRecordPage,
  PharmacySupplierPage,
  MedicineBatchStockPage,
  MedicineStockReportPage,
  PharmacyPurchaseRecordPage,
  PharmacyPurchaseReturnRecordPage,
} from "../features/pharmacy";
import { QuickOptionsPage } from "../features/quick-options";
import {
  RadiologyBillEntryPage,
  RadiologyBillRecordPage,
  RadiologyParameterEntryPage,
  RadiologyPage,
  RadiologyTestCategoryEntryPage,
  RadiologyTestEntryPage,
  RadiologyTestListPage,
  RadiologyTestUnitEntryPage,
} from "../features/radiology";
import { ReferralBillEntryPage, ReferralBillRecordPage, ReferralPage, ReferralPersonEntryPage, ReferralPersonListPage } from "../features/referral";
import {
  AccountBalanceReportPage,
  AccountLedgerReportPage,
  AppointmentsReportPage,
  BedOccupancyReportPage,
  BloodComponentIssueRecordReportPage,
  BloodStockReportPage,
  BloodDonateRecordReportPage,
  BloodIssueRecordReportPage,
  CallAmbulanceRecordReportPage,
  ContraRecordReportPage,
  ComponentSeparationRecordReportPage,
  CurrentStockExpiryReportPage,
  DailyLedgerReportPage,
  DailyStatementReportPage,
  EmployeeSalaryPaymentRecordReportPage,
  ExpenseRecordReportPage,
  FinanceSummaryReportPage,
  IncomeRecordReportPage,
  IpdBillRecordReportPage,
  MedicineBatchWiseStockReportPage,
  MedicineStockReportListPage,
  OpdBillRecordReportPage,
  PatientBalanceReportPage,
  PatientLedgerReportPage,
  PathologyBillRecordReportPage,
  PharmacyPurchaseRecordReportPage,
  PharmacyPurchaseReturnRecordReportPage,
  PharmacySalesRecordReportPage,
  PharmacyStockReportPage,
  PharmacySalesReturnRecordReportPage,
  RadiologyBillRecordReportPage,
  ReferralBillRecordReportPage,
  ReferralPersonBalanceReportPage,
  ReferralPersonLedgerReportPage,
  ReportsPage,
  SupplierBalanceReportPage,
  SupplierLedgerReportPage,
} from "../features/reports";
import {
  BackupPage,
  BranchManagePage,
  ChargeManagePage,
  CompanyProfilePage,
  ImportDataPage,
  SettingsPage,
  SecurityActivityPage,
  UserAccessPage,
  UserManagePage,
  WorkflowApprovalPage,
  ServiceCataloguePage,
} from "../features/settings";
import { canAccessPath, getDefaultPathForRole, getStoredRole, hasStoredToken, subscribeToAuthChanges } from "../lib/auth";
import { allNavItems } from "../features/navbar/data/navigation";
import { Navbar } from "../features/navbar";

function ModulePlaceholderPage() {
  const location = useLocation();
  const currentPage = allNavItems.find((item) => item.path === location.pathname);
  const title = currentPage?.label ?? "Page";

  return (
    <section>
      <div className="mx-auto grid min-h-[220px] max-w-[1180px] place-items-center rounded-[20px] border border-dashed border-[rgba(14,132,136,0.25)] bg-[rgba(255,255,255,0.75)] p-6 text-center text-[#537579] shadow-[0_18px_48px_rgba(11,44,53,0.08)]">
        <h2 className="mb-2 text-[28px] text-[#15393d]">{title}</h2>
        <p>This module screen has not been built yet.</p>
      </div>
    </section>
  );
}

function ProtectedApp() {
  const location = useLocation();
  const currentRole = getStoredRole();
  const isAuthenticated = hasStoredToken();

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!canAccessPath(location.pathname, currentRole)) {
    const fallbackPath = getDefaultPathForRole(currentRole);
    const safeTarget = fallbackPath === location.pathname ? "/" : fallbackPath;
    return <Navigate replace to={safeTarget} />;
  }

  const placeholderRoutes = Array.from(
    new Map(
      allNavItems
        .filter(
          (item) =>
            item.path !== "/" &&
            item.path !== "/quick-options" &&
            item.path !== "/modules" &&
            item.path !== "/appointment" &&
            item.path !== "/ambulance" &&
            item.path !== "/bed" &&
            item.path !== "/blood" &&
            item.path !== "/doctor" &&
            item.path !== "/finance" &&
            item.path !== "/finance-reports" &&
            item.path !== "/hr-payroll" &&
            item.path !== "/ipd" &&
            item.path !== "/medicine" &&
            item.path !== "/options" &&
            item.path !== "/opd" &&
            item.path !== "/patient" &&
            item.path !== "/pathology" &&
            item.path !== "/pharmacy" &&
            item.path !== "/radiology" &&
            item.path !== "/referral" &&
            item.path !== "/reports" &&
            item.path !== "/settings"
        )
        .map((item) => [item.path, item]),
    ).values(),
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-3.5 pt-[18px] pb-[30px] max-md:px-[10px] max-md:pt-4 max-md:pb-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/quick-options" element={<QuickOptionsPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/ambulance/call-entry" element={<CallAmbulanceEntryPage />} />
          <Route path="/ambulance/call-record" element={<CallAmbulanceRecordPage />} />
          <Route path="/ambulance/entry" element={<AmbulanceEntryPage />} />
          <Route path="/ambulance" element={<AmbulancePage />} />
          <Route path="/appointment/bill-record" element={<AppointmentBillRecordPage />} />
          <Route path="/appointment/entry" element={<AppointmentEntryPage />} />
          <Route path="/appointment/priority-entry" element={<AppointmentPriorityEntryPage />} />
          <Route path="/appointment/shift-entry" element={<AppointmentShiftEntryPage />} />
          <Route path="/appointment/slots" element={<AppointmentSlotsPage />} />
          <Route path="/appointment" element={<AppointmentPage />} />
          <Route path="/bed" element={<BedPage />} />
          <Route path="/bed/availability" element={<BedAvailabilityPage />} />
          <Route path="/bed/entry" element={<BedEntryPage />} />
          <Route path="/bed/management" element={<BedManagementPage />} />
          <Route path="/blood/component-issue" element={<BloodComponentIssuePage />} />
          <Route path="/blood/component-issue-record" element={<BloodComponentIssueRecordPage />} />
          <Route path="/blood/component-entry" element={<BloodComponentEntryPage />} />
          <Route path="/blood/component-separation-record" element={<BloodComponentSeparationRecordPage />} />
          <Route path="/blood/component-separation" element={<BloodComponentSeparationPage />} />
          <Route path="/blood/donate" element={<BloodDonatePage />} />
          <Route path="/blood/donate-record" element={<BloodDonateRecordPage />} />
          <Route path="/blood/donor" element={<BloodDonorPage />} />
          <Route path="/blood/group" element={<BloodGroupPage />} />
          <Route path="/blood/issue-record" element={<BloodIssueRecordPage />} />
          <Route path="/blood/issue" element={<BloodIssuePage />} />
          <Route path="/blood/stock" element={<BloodStockPage />} />
          <Route path="/blood/unit" element={<BloodUnitPage />} />
          <Route path="/blood" element={<BloodPage />} />
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/doctor/department" element={<DoctorDepartmentPage />} />
          <Route path="/doctor/entry" element={<DoctorEntryPage />} />
          <Route path="/doctor/specialization" element={<DoctorSpecializationPage />} />
          <Route path="/finance/account-entry" element={<AccountEntryPage />} />
          <Route path="/finance/contra-entry" element={<ContraEntryPage />} />
          <Route path="/finance/contra-record" element={<ContraRecordPage />} />
          <Route path="/finance/expense-entry" element={<ExpenseEntryPage />} />
          <Route path="/finance/expense-record" element={<ExpenseRecordPage />} />
          <Route path="/finance/expense-head-entry" element={<ExpenseHeadEntryPage />} />
          <Route path="/finance/income-entry" element={<IncomeEntryPage />} />
          <Route path="/finance/income-head-entry" element={<IncomeHeadEntryPage />} />
          <Route path="/finance/income-record" element={<IncomeRecordPage />} />
          <Route path="/finance/patient-due-collection-list" element={<PatientDueCollectionListPage />} />
          <Route path="/finance/tax-rate" element={<TaxRatePage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/finance-reports" element={<FinanceReportsPage />} />
          <Route path="/hr-payroll" element={<HrPayrollPage />} />
          <Route path="/hr-payroll/department-entry" element={<DepartmentEntryPage />} />
          <Route path="/hr-payroll/employee-entry" element={<EmployeeEntryPage />} />
          <Route path="/hr-payroll/salary-payment-entry" element={<EmployeeSalaryPaymentEntryPage />} />
          <Route path="/hr-payroll/salary-sheet" element={<SalarySheetPage />} />
          <Route path="/ipd/bill-entry" element={<IpdBillEntryPage />} />
          <Route path="/ipd/bill-record" element={<IpdBillRecordPage />} />
          <Route path="/ipd/symptoms-manage" element={<IpdSymptomsManagePage />} />
          <Route path="/ipd" element={<IpdPage />} />
          <Route path="/medicine/category" element={<MedicineCategoryPage />} />
          <Route path="/medicine/company" element={<MedicineCompanyPage />} />
          <Route path="/medicine/entry" element={<MedicineEntryPage />} />
          <Route path="/medicine/group" element={<MedicineGroupPage />} />
          <Route path="/medicine/list" element={<MedicineListPage />} />
          <Route path="/medicine/unit" element={<MedicineUnitPage />} />
          <Route path="/medicine" element={<MedicinePage />} />
          <Route path="/opd/bill-entry" element={<OpdBillEntryPage />} />
          <Route path="/opd/bill-record" element={<OpdBillRecordPage />} />
          <Route path="/opd/symptoms-manage" element={<OpdSymptomsManagePage />} />
          <Route path="/opd" element={<OpdPage />} />
          <Route path="/diagnostics/history" element={<DiagnosticHistoryPage />} />
          <Route path="/patient" element={<PatientPage />} />
          <Route path="/patient/entry" element={<PatientEntryPage />} />
          <Route path="/patient/list" element={<PatientListPage />} />
          <Route path="/patient/:patientId/emr" element={<PatientEmrPage />} />
          <Route path="/pathology/bill-record" element={<PathologyBillRecordPage />} />
          <Route path="/pathology/bill-entry" element={<PathologyBillEntryPage />} />
          <Route path="/pathology/parameter-entry" element={<PathologyParameterEntryPage />} />
          <Route path="/pathology/test-category-entry" element={<PathologyTestCategoryEntryPage />} />
          <Route path="/pathology/test-entry" element={<PathologyTestEntryPage />} />
          <Route path="/pathology/test-list" element={<PathologyTestListPage />} />
          <Route path="/pathology/test-unit-entry" element={<PathologyTestUnitEntryPage />} />
          <Route path="/pathology" element={<PathologyPage />} />
          <Route path="/pharmacy" element={<PharmacyPage />} />
          <Route path="/pharmacy/purchase" element={<PharmacyPurchasePage />} />
          <Route path="/pharmacy/purchase-record" element={<PharmacyPurchaseRecordPage />} />
          <Route path="/pharmacy/purchase-return" element={<PharmacyPurchaseReturnPage />} />
          <Route path="/pharmacy/purchase-return-record" element={<PharmacyPurchaseReturnRecordPage />} />
          <Route path="/pharmacy/sales" element={<PharmacySalesPage />} />
          <Route path="/pharmacy/sales-record" element={<PharmacySalesRecordPage />} />
          <Route path="/pharmacy/sales-return" element={<PharmacySalesReturnPage />} />
          <Route path="/pharmacy/sales-return-record" element={<PharmacySalesReturnRecordPage />} />
          <Route path="/pharmacy/supplier" element={<PharmacySupplierPage />} />
          <Route path="/pharmacy/medicine-batch-stock" element={<MedicineBatchStockPage />} />
          <Route path="/pharmacy/medicine-stock-report" element={<MedicineStockReportPage />} />
          <Route path="/radiology/bill-entry" element={<RadiologyBillEntryPage />} />
          <Route path="/radiology/bill-record" element={<RadiologyBillRecordPage />} />
          <Route path="/radiology/parameter-entry" element={<RadiologyParameterEntryPage />} />
          <Route path="/radiology/test-category-entry" element={<RadiologyTestCategoryEntryPage />} />
          <Route path="/radiology/test-entry" element={<RadiologyTestEntryPage />} />
          <Route path="/radiology/test-list" element={<RadiologyTestListPage />} />
          <Route path="/radiology/test-unit-entry" element={<RadiologyTestUnitEntryPage />} />
          <Route path="/radiology" element={<RadiologyPage />} />
          <Route path="/referral" element={<ReferralPage />} />
          <Route path="/referral/bill-entry" element={<ReferralBillEntryPage />} />
          <Route path="/referral/bill-record" element={<ReferralBillRecordPage />} />
          <Route path="/referral/person-entry" element={<ReferralPersonEntryPage />} />
          <Route path="/referral/person-list" element={<ReferralPersonListPage />} />
          <Route path="/reports/account-balance" element={<AccountBalanceReportPage />} />
          <Route path="/reports/account-ledger" element={<AccountLedgerReportPage />} />
          <Route path="/reports/appointments-report" element={<AppointmentsReportPage />} />
          <Route path="/reports/bed-occupancy" element={<BedOccupancyReportPage />} />
          <Route path="/reports/blood-stock" element={<BloodStockReportPage />} />
          <Route path="/reports/finance-summary" element={<FinanceSummaryReportPage />} />
          <Route path="/reports/pharmacy-stock-report" element={<PharmacyStockReportPage />} />
          <Route path="/reports/blood-component-issue-record" element={<BloodComponentIssueRecordReportPage />} />
          <Route path="/reports/blood-donate-record" element={<BloodDonateRecordReportPage />} />
          <Route path="/reports/blood-issue-record" element={<BloodIssueRecordReportPage />} />
          <Route path="/reports/call-ambulance-record" element={<CallAmbulanceRecordReportPage />} />
          <Route path="/reports/contra-record" element={<ContraRecordReportPage />} />
          <Route path="/reports/component-separation-record" element={<ComponentSeparationRecordReportPage />} />
          <Route path="/reports/current-stock-expiry" element={<CurrentStockExpiryReportPage />} />
          <Route path="/reports/daily-ledger" element={<DailyLedgerReportPage />} />
          <Route path="/reports/daily-statement" element={<DailyStatementReportPage />} />
          <Route path="/reports/employee-salary-payment-record" element={<EmployeeSalaryPaymentRecordReportPage />} />
          <Route path="/reports/expense-record" element={<ExpenseRecordReportPage />} />
          <Route path="/reports/income-record" element={<IncomeRecordReportPage />} />
          <Route path="/reports/ipd-bill-record" element={<IpdBillRecordReportPage />} />
          <Route path="/reports/medicine-batch-wise-stock" element={<MedicineBatchWiseStockReportPage />} />
          <Route path="/reports/medicine-stock-report" element={<MedicineStockReportListPage />} />
          <Route path="/reports/opd-bill-record" element={<OpdBillRecordReportPage />} />
          <Route path="/reports/pathology-bill-record" element={<PathologyBillRecordReportPage />} />
          <Route path="/reports/pharmacy-purchase-record" element={<PharmacyPurchaseRecordReportPage />} />
          <Route path="/reports/pharmacy-purchase-return-record" element={<PharmacyPurchaseReturnRecordReportPage />} />
          <Route path="/reports/pharmacy-sales-record" element={<PharmacySalesRecordReportPage />} />
          <Route path="/reports/pharmacy-sales-return-record" element={<PharmacySalesReturnRecordReportPage />} />
          <Route path="/reports/radiology-bill-record" element={<RadiologyBillRecordReportPage />} />
          <Route path="/reports/referral-bill-record" element={<ReferralBillRecordReportPage />} />
          <Route path="/reports/patient-balance" element={<PatientBalanceReportPage />} />
          <Route path="/reports/patient-ledger" element={<PatientLedgerReportPage />} />
          <Route path="/reports/referral-person-balance" element={<ReferralPersonBalanceReportPage />} />
          <Route path="/reports/referral-person-ledger" element={<ReferralPersonLedgerReportPage />} />
          <Route path="/reports/supplier-balance" element={<SupplierBalanceReportPage />} />
          <Route path="/reports/supplier-ledger" element={<SupplierLedgerReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/backup" element={<BackupPage />} />
          <Route path="/settings/branch-manage" element={<BranchManagePage />} />
          <Route path="/settings/charge-manage" element={<ChargeManagePage />} />
          <Route path="/settings/service-catalog" element={<ServiceCataloguePage />} />
          <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
          <Route path="/settings/import-data" element={<ImportDataPage />} />
          <Route path="/settings/user-access/:role" element={<UserAccessPage />} />
          <Route path="/settings/user-manage" element={<UserManagePage />} />
          <Route path="/settings/security-activity" element={<SecurityActivityPage />} />
          <Route path="/settings/workflows" element={<WorkflowApprovalPage />} />
          {placeholderRoutes.map((item) => (
            <Route key={item.path} path={item.path} element={<ModulePlaceholderPage />} />
          ))}
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredToken);

  useEffect(() => {
    return subscribeToAuthChanges(() => {
      setIsAuthenticated(hasStoredToken());
    });
  }, []);

  const currentRole = getStoredRole();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate replace to={getDefaultPathForRole(currentRole)} /> : <LoginPage />}
      />
      <Route path="*" element={<ProtectedApp />} />
    </Routes>
  );
}
