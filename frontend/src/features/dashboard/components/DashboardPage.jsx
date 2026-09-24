import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { filterNavigationItems, getStoredRole } from "../../../lib/auth";
import { savedOptionItems } from "../../options/data/optionsData";

const billingToneClasses = {
  amber: "bg-[#f6b247]",
  blue: "bg-[#4ea0f3]",
  coral: "bg-[#ff5a56]",
  green: "bg-[#35ca85]",
  magenta: "bg-[#d857f5]",
  mint: "bg-[#4bd597]",
  orange: "bg-[#dd7a16]",
  sea: "bg-[#88b8c0]",
  slate: "bg-[#466971]",
};

const chartToneClasses = {
  indigo: "bg-[#9199df]",
};

const savedOptionRoutes = {
  "Pathology Bill Entry": "/pathology/bill-entry",
  "Pathology Bill Record": "/pathology/bill-record",
  "Radiology Bill Entry": "/radiology/bill-entry",
  "Radiology Bill Record": "/radiology/bill-record",
  "OPD Bill Entry": "/opd/bill-entry",
  "OPD Bill Record": "/opd/bill-record",
  "IPD Bill Entry": "/ipd/bill-entry",
  "IPD Bill Record": "/ipd/bill-record",
  "Blood Issue": "/blood/issue",
  "Blood Issue Record": "/blood/issue-record",
  "Blood Component Issue": "/blood/component-issue",
  "Blood Component Issue Record": "/blood/component-issue-record",
  "Blood Donate": "/blood/donate",
  "Blood Donate Record": "/blood/donate-record",
  "Component Separation Entry": "/blood/component-separation",
  "Component Separation Record": "/blood/component-separation-record",
  "Pharmacy Sales": "/pharmacy/sales",
  "Pharmacy Sales Record": "/pharmacy/sales-record",
  "Pharmacy Purchase": "/pharmacy/purchase",
  "Pharmacy Purchase Record": "/pharmacy/purchase-record",
  "Pharmacy Sales Return": "/pharmacy/sales-return",
  "Pharmacy Sales Return Record": "/pharmacy/sales-return-record",
  "Pharmacy Purchase Return": "/pharmacy/purchase-return",
  "Pharmacy Purchase Return Record": "/pharmacy/purchase-return-record",
  "Call Ambulance Entry": "/ambulance/call-entry",
  "Call Ambulance Record": "/ambulance/call-record",
  "Referral Bill Entry": "/referral/bill-entry",
  "Referral Bill Record": "/referral/bill-record",
  "Expense Entry": "/finance/expense-entry",
  "Expense Record": "/finance/expense-record",
};

const dashboardIcons = {
  ambulance:
    "M4 9h1.2l.8-2.1h4.2L12 9h1v3h-.8a1.7 1.7 0 1 1-3.4 0H7.2a1.7 1.7 0 1 1-3.4 0H3V9.9A.9.9 0 0 1 4 9Zm3-3h2V4h1v2h2v1h-2v2H9V7H7V6Z",
  bed: "M3 6h2.4a2 2 0 0 1 1.7.9l.6.9H12a1 1 0 0 1 1 1V12h-1v1H11v-1H5v1H4v-1H3V6Zm2 4h7V9H5v1Z",
  bedOutline:
    "M3 7.2A2.2 2.2 0 0 1 5.2 5h2.1a2 2 0 0 1 1.6.8l.7.9h2.2A1.2 1.2 0 0 1 13 7.9V12h-1v1H11v-1H5v1H4v-1H3V7.2Zm2 .6v2.2h7V7.8H5Z",
  document: "M5 3h4l2 2v6.8A1.2 1.2 0 0 1 9.8 13H5.2A1.2 1.2 0 0 1 4 11.8V4.2A1.2 1.2 0 0 1 5.2 3Zm1 3h4v1H6V6Zm0 2h4v1H6V8Z",
  heart:
    "M8 12.5 3.6 8.2a2.7 2.7 0 0 1 3.8-3.8L8 5l.6-.6a2.7 2.7 0 0 1 3.8 3.8L8 12.5ZM5 7h1.5L7 5.8 8 8l.6-1H11v1H8.9L8 9.5 7 7.3 6.9 8H5V7Z",
  medical:
    "M4.8 3h6.4A1.8 1.8 0 0 1 13 4.8v6.4A1.8 1.8 0 0 1 11.2 13H4.8A1.8 1.8 0 0 1 3 11.2V4.8A1.8 1.8 0 0 1 4.8 3ZM7.3 5.2v1.4H5.9V8h1.4v1.4h1.4V8h1.4V6.6H8.7V5.2H7.3Z",
  pharmacy:
    "M6 3h4v1.4H9.1l-.4 1.5H10a2.5 2.5 0 0 1 0 5H6a2.5 2.5 0 0 1-.7-4.9L5.8 4.4H5V3h1Zm1 4.2V8h1V7.2h.8v-1H8V5.4H7v.8h-.8v1H7Z",
  plus: "M7.2 3h1.6v3.2H12v1.6H8.8V11H7.2V7.8H4V6.2h3.2V3Z",
  wallet:
    "M4.5 4h5.3A1.2 1.2 0 0 1 11 5.2v.6h1.2A.8.8 0 0 1 13 6.6v4.8a.8.8 0 0 1-.8.8H4.5A1.5 1.5 0 0 1 3 10.7V5.5A1.5 1.5 0 0 1 4.5 4Zm4.8 3.1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z",
};

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const EMPTY_STAT = { count: 0, amount: 0 };

const INITIAL_DATA = {
  totals: { patients: 0, doctors: 0, active_admissions: 0, today_appointments: 0, low_stock_medicines: 0, available_blood_bags: 0, available_beds: 0 },
  finance: { billed: 0, revenue: 0, expenses: 0, net: 0, outstanding: 0 },
  today_billing: {
    pathology: EMPTY_STAT, radiology: EMPTY_STAT, pharmacy: EMPTY_STAT,
    ipd: EMPTY_STAT, ambulance: EMPTY_STAT, opd: EMPTY_STAT,
    appointment: EMPTY_STAT, collections: 0,
  },
  accounts: { cash: 0, bank: 0 },
  monthly_billing: { pathology: 0, radiology: 0, opd: 0, ipd: 0, pharmacy: 0, appointment: 0, ambulance: 0 },
  appointments_by_status: {},
  beds_by_status: {},
};

function DashboardIcon({ icon }) {
  return (
    <span aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-[18px] w-[18px]">
        <path d={dashboardIcons[icon]} />
      </svg>
    </span>
  );
}

function BalanceSummary({ data, loading }) {
  const accounts = data?.accounts || INITIAL_DATA.accounts;
  const items = [
    { label: "Cash Balance", value: loading ? "—" : fmt(accounts?.cash) },
    { label: "Bank Balance", value: loading ? "—" : fmt(accounts?.bank) },
  ];
  return (
    <article className="min-h-[280px] rounded-[3px] bg-linear-to-b from-[#47c8d7] to-[#31ada6] px-4 pt-[18px] pb-4 text-[#071c24] shadow-[0_2px_4px_rgba(12,42,50,0.22)]">
      <h2 className="mb-[22px] text-center text-[20px] leading-none font-medium text-white">
        BALANCE SUMMARY
      </h2>
      <div>
        {items.map((item) => (
          <div
            className="grid grid-cols-[1fr_auto] items-center border-b border-white/65 px-4 py-[17px] text-[14px] leading-none"
            key={item.label}
          >
            <span>{item.label}</span>
            <strong className="font-normal">{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function BillingCard({ title, value, amount, icon, tone }) {
  return (
    <article className="min-h-[86px] rounded-[3px] border border-[#d5dce4] bg-[rgba(255,255,255,0.94)] shadow-[0_2px_3px_rgba(21,43,52,0.28)]">
      <div className="flex min-h-full items-center gap-[14px] p-[11px_8px]">
        <div
          className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full text-white shadow-[0_6px_10px_rgba(26,42,51,0.18)] ${billingToneClasses[tone]}`}
        >
          <DashboardIcon icon={icon} />
        </div>
        <div className="min-w-0">
          <h3 className="mb-1 max-w-[116px] text-[12px] leading-[1.35] font-bold text-[#3a434a] uppercase">
            {title}
          </h3>
          {value !== null && value !== undefined ? (
            <div className="mb-[2px] text-[22px] leading-[0.9] font-bold text-[#05090d]">{value}</div>
          ) : null}
          {amount !== null && amount !== undefined ? (
            <p className="m-0 text-[14px] leading-none text-[#4d4d4d]">Amount: {amount}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DashboardStats({ data, loading }) {
  const totals = data?.totals || INITIAL_DATA.totals;
  const items = [
    { label: "Total Doctors", value: loading ? "—" : fmt(totals?.doctors) },
    { label: "Total Patients", value: loading ? "—" : fmt(totals?.patients) },
    { label: "Active Admissions", value: loading ? "—" : fmt(totals?.active_admissions) },
    { label: "Low Stock Medicines", value: loading ? "—" : fmt(totals?.low_stock_medicines) },
    { label: "Available Blood Bags", value: loading ? "—" : fmt(totals?.available_blood_bags) },
  ];
  return (
    <article className="min-h-[280px] rounded-[3px] bg-linear-to-b from-[#b6bfef] to-[#8994d7] px-4 py-[22px] shadow-[0_2px_4px_rgba(24,43,70,0.2)]">
      {items.map((item) => (
        <div
          className="grid grid-cols-[1fr_auto] items-center border-b border-white/55 px-4 py-[15px] text-[14px] leading-none text-[#0b1824]"
          key={item.label}
        >
          <span>{item.label}</span>
          <strong className="font-normal">{item.value}</strong>
        </div>
      ))}
    </article>
  );
}

function DepartmentBillingChart({ monthly, loading }) {
  const departments = ["Pathology", "Radiology", "OPD", "IPD", "Pharmacy", "Appoint.", "Amb"];
  const keys = ["pathology", "radiology", "opd", "ipd", "pharmacy", "appointment", "ambulance"];
  const values = keys.map((k) => Number(monthly[k] || 0));
  const maxValue = Math.max(...values, 1);
  const yStep = maxValue / 4;
  const yAxisLabels = [
    Math.round(maxValue),
    Math.round(yStep * 3),
    Math.round(yStep * 2),
    Math.round(yStep),
    0,
  ];

  return (
    <section className="min-w-0">
      <h3 className="m-0 mb-4 text-[20px] leading-none font-normal uppercase text-[#182a33]">
        Department-wise Billing (Current Month)
      </h3>
      {loading ? (
        <div className="flex h-[192px] items-center justify-center text-[#8b949b] text-[14px]">Loading…</div>
      ) : (
        <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-0 max-md:grid-cols-[48px_minmax(0,1fr)]">
          <div className="grid h-[192px] grid-rows-5 items-start border-r border-r-[#8b949b] pr-2 text-right text-[13px] leading-none text-[#56616a]">
            {yAxisLabels.map((label, i) => (
              <span className="-translate-y-[3px]" key={i}>{fmt(label)}</span>
            ))}
          </div>
          <div className="relative h-[192px] border-b border-b-[#8b949b]">
            <div className="absolute inset-x-0 top-0 bottom-0 grid grid-rows-4">
              {yAxisLabels.slice(0, -1).map((_, i) => (
                <span className="border-t border-dashed border-t-[#cfd6d9]" key={i} />
              ))}
            </div>
            <div className="absolute inset-0 grid grid-cols-7">
              {departments.map((label) => (
                <span className="border-r border-dashed border-r-[#d9dee1]" key={label} />
              ))}
            </div>
            <div className="relative z-10 grid h-full grid-cols-7 items-end gap-[18px] px-3 max-lg:gap-3 max-sm:gap-1 max-sm:px-1">
              {values.map((value, index) => (
                <div className="flex h-full flex-col items-center justify-end" key={departments[index]}>
                  <div
                    className={`min-h-[4px] w-full max-w-[100px] rounded-none ${chartToneClasses.indigo}`}
                    style={{ height: `${(value / maxValue) * 100}%` }}
                    title={`${departments[index]}: ${fmt(value)}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" />
          <div className="grid grid-cols-7 gap-[18px] px-3 pt-2 text-center text-[13px] leading-none text-[#56616a] max-lg:gap-3 max-sm:gap-1 max-sm:px-1 max-sm:text-[11px]">
            {departments.map((label) => (
              <span className="truncate" key={label}>{label}</span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-center text-[13px] leading-none text-[#7f80db]">
        <span className="mr-1.5 h-[11px] w-[14px] bg-[#8f8be2]" aria-hidden="true" />
        amount
      </div>
    </section>
  );
}

function CurrentExpenseChart({ data, loading }) {
  const finance = data?.finance || INITIAL_DATA.finance;
  const expenses = Number(finance.expenses || 0);
  const revenue = Number(finance.revenue || 0);
  const net = Number(finance.net || 0);
  const total = expenses + revenue || 1;
  const expensePercent = Math.round((expenses / total) * 100);

  return (
    <section>
      <h3 className="m-0 mb-4 text-[20px] leading-none font-normal uppercase text-[#182a33]">
        Current Month Expense
      </h3>
      {loading ? (
        <div className="flex h-[190px] items-center justify-center text-[#8b949b] text-[14px]">Loading…</div>
      ) : (
        <>
          <div className="flex items-center justify-center">
            <svg className="h-[190px] w-[240px]" viewBox="0 0 240 190" role="img" aria-label="Current month expense chart">
              <text x="14" y="85" fill="#0b89ff" fontSize="13">{expensePercent}%</text>
              <line x1="48" y1="82" x2="70" y2="82" stroke="#0b89ff" strokeWidth="1" />
              <circle cx="150" cy="82" r="80" fill="#0b89ff" />
              <line x1="150" y1="82" x2="230" y2="82" stroke="#dfeffb" strokeWidth="1" />
              <rect x="119" y="166" width="14" height="11" fill="#0b89ff" />
              <text x="138" y="176" fill="#0b89ff" fontSize="13">Expense</text>
            </svg>
          </div>
          <div className="mt-3 space-y-1 text-[13px] text-[#3a434a]">
            <div className="flex justify-between">
              <span>Revenue</span>
              <strong>{fmt(revenue)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Expenses</span>
              <strong>{fmt(expenses)}</strong>
            </div>
            <div className="flex justify-between border-t border-[#e0e5e9] pt-1">
              <span>Net</span>
              <strong className={net >= 0 ? "text-[#218739]" : "text-[#d64545]"}>
                {fmt(net)}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SavedOptions() {
  // NEW-01 — the saved-options shortcuts were rendered unconditionally, so a
  // pathology-only or patient user saw chips for Pharmacy, Blood Bank, IPD and
  // Referral and was bounced by the route guard on click. The navbar already
  // resolves visibility from the stored role and permissions; the same helper is
  // reused here so both surfaces agree instead of drifting apart.
  //
  // This is presentation only: the backend permission middleware remains the
  // authority, and hiding a chip is not a substitute for it.
  const currentRole = getStoredRole();
  const visibleItems = filterNavigationItems(
    savedOptionItems.map((label) => ({ label, path: savedOptionRoutes[label] ?? "/" })),
    currentRole
  );

  if (visibleItems.length === 0) return null;

  return (
    <section className="mt-10 px-2">
      <h3 className="m-0 mb-1 text-[12px] leading-none font-normal text-[#56616a]">
        Important saved options...
      </h3>
      <div className="flex flex-wrap gap-x-2 gap-y-[7px]">
        {visibleItems.map((item) => (
          <Link
            className="rounded-full bg-[#f5f7fb] px-2.5 py-[6px] text-[13px] leading-none text-[#07121a] no-underline shadow-[0_1px_2px_rgba(20,38,45,0.05)] transition-colors hover:bg-white"
            key={item.label}
            to={item.path}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const [data, setData] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiRequest("/reports/dashboard");
        if (!cancelled) {
          setData(res.data || INITIAL_DATA);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const tb = data?.today_billing || INITIAL_DATA.today_billing;
  const totals = data?.totals || INITIAL_DATA.totals;

  const billingCards = [
    { title: "Today Pathology Bill", value: fmt(tb?.pathology?.count), amount: fmt(tb?.pathology?.amount), icon: "plus", tone: "coral" },
    { title: "Today OPD Bill", value: fmt(tb?.opd?.count), amount: fmt(tb?.opd?.amount), icon: "medical", tone: "blue" },
    { title: "Today IPD Bill", value: fmt(tb?.ipd?.count), amount: fmt(tb?.ipd?.amount), icon: "bed", tone: "mint" },
    { title: "Today Pharmacy Bill", value: fmt(tb?.pharmacy?.count), amount: fmt(tb?.pharmacy?.amount), icon: "pharmacy", tone: "amber" },
    { title: "Today Radiology Bill", value: fmt(tb?.radiology?.count), amount: fmt(tb?.radiology?.amount), icon: "heart", tone: "magenta" },
    { title: "Today Appointment Bill", value: fmt(tb?.appointment?.count), amount: fmt(tb?.appointment?.amount), icon: "document", tone: "green" },
    { title: "Today Ambulance Service", value: fmt(tb?.ambulance?.count), amount: fmt(tb?.ambulance?.amount), icon: "ambulance", tone: "orange" },
    { title: "Total Today Collections", value: null, amount: fmt(tb?.collections), icon: "wallet", tone: "slate" },
    { title: "Total Available Bed", value: fmt(totals?.available_beds), amount: null, icon: "bedOutline", tone: "sea" },
  ];

  return (
    <section className="mx-auto max-w-[1280px]">
      {error ? (
        <div className="mb-4 rounded-[4px] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#d64545]">{error}</div>
      ) : null}

      <div className="mb-[26px] grid grid-cols-[302px_minmax(0,620px)_302px] gap-[14px] max-xl:grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-1">
        <BalanceSummary data={data} loading={loading} />

        <div className="grid grid-cols-3 gap-[10px] max-md:grid-cols-2 max-sm:grid-cols-1">
          {billingCards.map((card) => (
            <BillingCard
              key={card.title}
              {...card}
              value={loading ? "—" : card.value}
              amount={card.amount !== null ? (loading ? "—" : card.amount) : null}
            />
          ))}
        </div>

        <DashboardStats data={data} loading={loading} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-lg:grid-cols-1">
        <DepartmentBillingChart monthly={data.monthly_billing} loading={loading} />
        <CurrentExpenseChart data={data} loading={loading} />
      </div>

      <SavedOptions />
    </section>
  );
}
