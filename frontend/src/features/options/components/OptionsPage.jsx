import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { secondaryNavMenus } from "../../navbar/data/menuSections";
import { allNavItems } from "../../navbar/data/navigation";

const optionRoutes = {
  Options: "/options",
  "Quick Options": "/quick-options",
  Dashboard: "/",
  Modules: "/modules",
  Pathology: "/pathology",
  Radiology: "/radiology",
  Appointment: "/appointment",
  OPD: "/opd",
  IPD: "/ipd",
  Ambulance: "/ambulance",
  Blood: "/blood",
  Pharmacy: "/pharmacy",
  Medicine: "/medicine",
  Finance: "/finance",
  Reports: "/reports",
  BED: "/bed",
  Patient: "/patient",
  Doctor: "/doctor",
  Referral: "/referral",
  "HR & Payroll": "/hr-payroll",
  Settings: "/settings",
  "Pathology Bill Entry": "/pathology/bill-entry",
  "Pathology Bill Record": "/reports/pathology-bill-record",
  "Radiology Bill Entry": "/radiology/bill-entry",
  "Radiology Bill Record": "/reports/radiology-bill-record",
  "Radiology Test": "/radiology/test-entry",
  "Radiology Test Category Entry": "/radiology/test-category-entry",
  "Radiology Parameter Entry": "/radiology/parameter-entry",
  "Radiology Test Unit": "/radiology/test-unit-entry",
  "Radiology Test List": "/radiology/test-list",
  "OPD Bill Entry": "/opd/bill-entry",
  "OPD Bill Record": "/reports/opd-bill-record",
  "IPD Bill Entry": "/ipd/bill-entry",
  "IPD Bill Record": "/reports/ipd-bill-record",
  "Blood Issue": "/blood/issue",
  "Blood Issue Record": "/reports/blood-issue-record",
  "Blood Component Issue": "/blood/component-issue",
  "Blood Component Issue Record": "/reports/blood-component-issue-record",
  "Blood Donate": "/blood/donate",
  "Blood Donate Record": "/reports/blood-donate-record",
  "Component Separation Entry": "/blood/component-separation",
  "Component Separation Record": "/reports/component-separation-record",
  "Pharmacy Sales": "/pharmacy/sales",
  "Pharmacy Sales Record": "/reports/pharmacy-sales-record",
  "Pharmacy Purchase": "/pharmacy/purchase",
  "Pharmacy Purchase Record": "/reports/pharmacy-purchase-record",
  "Pharmacy Sales Return": "/pharmacy/sales-return",
  "Pharmacy Sales Return Record": "/reports/pharmacy-sales-return-record",
  "Pharmacy Purchase Return": "/pharmacy/purchase-return",
  "Pharmacy Purchase Return Record": "/reports/pharmacy-purchase-return-record",
  "Call Ambulance Entry": "/ambulance/call-entry",
  "Call Ambulance Record": "/reports/call-ambulance-record",
  "Ambulance Entry": "/ambulance/entry",
  "Bed Entry": "/bed/entry",
  "Bed Management": "/bed/management",
  "Bed Availability": "/bed/availability",
  "Department Entry": "/hr-payroll/department-entry",
  "Doctor Entry": "/doctor/entry",
  "Doctor Department": "/doctor/department",
  "Doctor Specialization": "/doctor/specialization",
  "Employee Salary Payment Entry": "/hr-payroll/salary-payment-entry",
  "Employee Salary Payment Record": "/reports/employee-salary-payment-record",
  "Salary Sheet": "/hr-payroll/salary-sheet",
  "Employee Entry": "/hr-payroll/employee-entry",
  "Expense Head Entry": "/finance/expense-head-entry",
  "Income Entry": "/finance/income-entry",
  "Income Head Entry": "/finance/income-head-entry",
  "Income Record": "/reports/income-record",
  "Contra Entry": "/finance/contra-entry",
  "Contra Record": "/reports/contra-record",
  "Tax Rate": "/finance/tax-rate",
  "Account Entry": "/finance/account-entry",
  "Patient Due Collection List": "/finance/patient-due-collection-list",
  "Account Balance": "/reports/account-balance",
  "Account Ledger": "/reports/account-ledger",
  "Daily Ledger": "/reports/daily-ledger",
  "Daily Statement": "/reports/daily-statement",
  "Patient Balance": "/reports/patient-balance",
  "Patient Ledger": "/reports/patient-ledger",
  "Supplier Balance": "/reports/supplier-balance",
  "Supplier Ledger": "/reports/supplier-ledger",
  "Referral Person Balance": "/reports/referral-person-balance",
  "Referral Person Ledger": "/reports/referral-person-ledger",
  "Current Stock Expiry": "/reports/current-stock-expiry",
  "Referral Bill Entry": "/referral/bill-entry",
  "Referral Bill Record": "/reports/referral-bill-record",
  "Referral Person Entry": "/referral/person-entry",
  "Referral Person List": "/referral/person-list",
  "Patient Entry": "/patient/entry",
  "Patient List": "/patient/list",
  "Medicine Batch Wise Stock Report": "/reports/medicine-batch-wise-stock",
  "Expense Entry": "/finance/expense-entry",
  "Expense Record": "/reports/expense-record",
  "Blood Donor": "/blood/donor",
  "Blood Group": "/blood/group",
  "Blood Unit": "/blood/unit",
  "Component Entry": "/blood/component-entry",
  "Blood Bank Stock Ui": "/blood/stock",
  "Branch Manage": "/settings/branch-manage",
  "Charge Manage": "/settings/charge-manage",
  "Company Profile": "/settings/company-profile",
  "User Manage": "/settings/user-manage",
  Backup: "/settings/backup",
  "Import Data": "/settings/import-data",
};

const moduleOverrideRoutes = {
  "/ambulance": {
    "Call Ambulance Record": "/ambulance/call-record",
  },
  "/ipd": {
    "Symptoms Manage": "/ipd/symptoms-manage",
    "IPD Bill Record": "/ipd/bill-record",
  },
  "/opd": {
    "Symptoms Manage": "/opd/symptoms-manage",
    "OPD Bill Record": "/opd/bill-record",
  },
  "/pathology": {
    "Pathology Bill Record": "/pathology/bill-record",
  },
  "/pharmacy": {
    "Pharmacy Sales Record": "/pharmacy/sales-record",
    "Pharmacy Purchase Record": "/pharmacy/purchase-record",
    "Pharmacy Sales Return Record": "/pharmacy/sales-return-record",
    "Pharmacy Purchase Return Record": "/pharmacy/purchase-return-record",
  },
  "/radiology": {
    "Radiology Bill Record": "/radiology/bill-record",
  },
  "/reports": {
    "Medicine Batch Wise Stock": "/reports/medicine-batch-wise-stock",
    "Medicine Stock Report": "/reports/medicine-stock-report",
    "Call Ambulance Record": "/reports/call-ambulance-record",
    "Pathology Bill Record": "/reports/pathology-bill-record",
    "Radiology Bill Record": "/reports/radiology-bill-record",
    "OPD Bill Record": "/reports/opd-bill-record",
    "IPD Bill Record": "/reports/ipd-bill-record",
    "Blood Issue Record": "/reports/blood-issue-record",
    "Blood Component Issue Record": "/reports/blood-component-issue-record",
    "Blood Donate Record": "/reports/blood-donate-record",
    "Component Separation Record": "/reports/component-separation-record",
    "Pharmacy Sales Record": "/reports/pharmacy-sales-record",
    "Pharmacy Purchase Record": "/reports/pharmacy-purchase-record",
    "Pharmacy Sales Return Record": "/reports/pharmacy-sales-return-record",
    "Pharmacy Purchase Return Record": "/reports/pharmacy-purchase-return-record",
    "Contra Record": "/reports/contra-record",
    "Expense Record": "/reports/expense-record",
    "Income Record": "/reports/income-record",
    "Employee Salary Payment Record": "/reports/employee-salary-payment-record",
    "Referral Bill Record": "/reports/referral-bill-record",
  },
};

const moduleLabelsByPath = Object.fromEntries(allNavItems.map((item) => [item.path, item.label]));

const allOptionEntries = (() => {
  const topLevelEntries = allNavItems.map((item) => ({
    label: item.label,
    path: item.path,
  }));

  const submenuEntries = Object.entries(secondaryNavMenus).flatMap(([modulePath, sections]) =>
    sections.flatMap((section) =>
      section.items.map((item) => ({
        label: item,
        modulePath,
        path: moduleOverrideRoutes[modulePath]?.[item] ?? optionRoutes[item] ?? null,
      })),
    ),
  );

  const labelCounts = submenuEntries.reduce((counts, item) => {
    counts[item.label] = (counts[item.label] ?? 0) + 1;
    return counts;
  }, {});

  return Array.from(
    new Map(
      [...topLevelEntries, ...submenuEntries]
        .filter((item) => item.path)
        .map((item) => {
          const displayLabel =
            item.modulePath && labelCounts[item.label] > 1
              ? `${moduleLabelsByPath[item.modulePath]} - ${item.label}`
              : item.label;

          return [displayLabel, { label: displayLabel, path: item.path }];
        }),
    ).values(),
  );
})();

function DropdownIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 11 3 5h10L8 11Z" />
    </svg>
  );
}

export function OptionsPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return allOptionEntries;
    }

    return allOptionEntries.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const handleOptionSelect = (item) => {
    setQuery(item.label);
    setIsMenuOpen(false);

    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <section className="mx-auto flex max-w-[1180px] items-start justify-center px-2 pt-5 pb-10 max-md:px-0">
      <div className="w-full max-w-[760px] rounded-[24px] border border-[#d6e6ea] bg-white shadow-[0_28px_70px_rgba(10,40,48,0.18)]">
        <div className="border-b border-[#e7eef0] bg-linear-to-r from-[#f8fbfc] to-[#ffffff] px-6 py-5">
          <label className="mb-2 block text-[15px] font-semibold text-[#2f7680]">Search Option</label>
          <div className="relative" ref={containerRef}>
            <input
              className="h-[58px] w-full rounded-[18px] border-2 border-[#2f7af8] bg-white px-4 pr-16 text-[15px] text-[#29424c] shadow-[inset_0_1px_2px_rgba(15,23,31,0.04)] outline-none placeholder:text-[#97a5ae]"
              placeholder="Search saved option"
              onChange={(event) => {
                setQuery(event.target.value);
                setIsMenuOpen(true);
              }}
              onFocus={() => setIsMenuOpen(true)}
              value={query}
              type="text"
            />
            <button
              className="absolute top-1/2 right-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#eef3f6] text-[#95a2aa] transition-colors hover:bg-[#e6edf2]"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              type="button"
            >
              <DropdownIcon />
            </button>
            {isMenuOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-10 overflow-hidden rounded-[18px] border border-[#d6e6ea] bg-white shadow-[0_20px_45px_rgba(10,40,48,0.16)]">
                <div className="max-h-[320px] overflow-y-auto py-2">
                  {filteredOptions.length ? (
                    filteredOptions.map((item) => (
                      <button
                        className="flex w-full items-center px-4 py-3 text-left text-[14px] text-[#38515d] transition-colors hover:bg-[#f1f7fb]"
                        key={item.label}
                        onClick={() => handleOptionSelect(item)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-[14px] text-[#84939c]">No matching option found.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-6 max-md:px-4">
          <button
            className="rounded-[8px] border border-[#77a9f9] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#1f73dc] shadow-[0_6px_14px_rgba(64,123,204,0.12)] transition-colors hover:bg-[#f5f9ff]"
            onClick={() => navigate("/")}
            type="button"
          >
            CLOSE
          </button>
        </div>
      </div>
    </section>
  );
}
