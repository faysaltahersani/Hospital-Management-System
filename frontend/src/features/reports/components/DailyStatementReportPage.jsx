import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DateField({ label, onChange, value }) {
  return (
    <label className="block min-w-[180px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <input
        className="h-[44px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

function SectionTable({ children, title }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[14px] font-medium text-[#203446]">{title}</div>
      <div className="overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        {children}
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, isLoading, label }) {
  return (
    <tr>
      <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={colSpan}>
        {isLoading ? "Loading..." : label}
      </td>
    </tr>
  );
}

export function DailyStatementReportPage() {
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState({
    pathology: [],
    opd: [],
    income: [],
    pharmacy: [],
    radiology: [],
    ipd: [],
    ambulance: [],
    totals: {
      pathology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
      opd: { amount: 0, paid: 0, due: 0 },
      income: 0,
      pharmacy: { sub_total: 0, amount: 0, paid: 0, due: 0 },
      radiology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
      ipd: { amount: 0 },
      ambulance: { amount: 0 },
    },
    final_income: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = async (from = fromDate, to = toDate) => {
    if (!from || !to) {
      setErrorMessage("Please select both from and to dates.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ from, to });
      const response = await apiRequest(`/reports/daily-statement?${params.toString()}`);
      setReport(
        response.data || {
          pathology: [],
          opd: [],
          income: [],
          pharmacy: [],
          radiology: [],
          ipd: [],
          ambulance: [],
          totals: {
            pathology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
            opd: { amount: 0, paid: 0, due: 0 },
            income: 0,
            pharmacy: { sub_total: 0, amount: 0, paid: 0, due: 0 },
            radiology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
            ipd: { amount: 0 },
            ambulance: { amount: 0 },
          },
          final_income: 0,
        }
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load daily statement.");
      setReport({
        pathology: [],
        opd: [],
        income: [],
        pharmacy: [],
        radiology: [],
        ipd: [],
        ambulance: [],
        totals: {
          pathology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
          opd: { amount: 0, paid: 0, due: 0 },
          income: 0,
          pharmacy: { sub_total: 0, amount: 0, paid: 0, due: 0 },
          radiology: { sub_total: 0, amount: 0, paid: 0, due: 0 },
          ipd: { amount: 0 },
          ambulance: { amount: 0 },
        },
        final_income: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(formatDateInput(firstDayOfMonth), formatDateInput(today));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(
    () => ({
      pathology: report.totals?.pathology || { sub_total: 0, amount: 0, paid: 0, due: 0 },
      opd: report.totals?.opd || { amount: 0, paid: 0, due: 0 },
      income: Number(report.totals?.income || 0),
      pharmacy: report.totals?.pharmacy || { sub_total: 0, amount: 0, paid: 0, due: 0 },
      radiology: report.totals?.radiology || { sub_total: 0, amount: 0, paid: 0, due: 0 },
      ipd: report.totals?.ipd || { amount: 0 },
      ambulance: report.totals?.ambulance || { amount: 0 },
      finalIncome: Number(report.final_income || 0),
    }),
    [report]
  );

  const pairedIncomePharmacyRowCount = Math.max((report?.income || []).length, (report?.pharmacy || []).length);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">Daily Statement</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <DateField label="FROM DATE" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="TO DATE" onChange={(event) => setToDate(event.target.value)} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[44px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => loadReport()}
              type="button"
            >
              {isLoading ? "Loading..." : "Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <button className="text-[#2d2d2d]" onClick={() => window.print()} type="button">
          <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
          </svg>
        </button>
      </div>

      <SectionTable title="Pathology Bill Record">
        <table className="min-w-[820px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Bill No</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Doctor</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Sub Total</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Paid</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {(report?.pathology || []).length
              ? (report?.pathology || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.ordered_at)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.order_no}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor || row.doctor_name || "Pathology"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.sub_total)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.paid)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.due)}</td>
                  </tr>
                ))
              : <EmptyRow colSpan={9} isLoading={isLoading} label="No pathology bills found." />}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pathology.sub_total)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pathology.amount)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pathology.paid)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pathology.due)}</td>
            </tr>
          </tbody>
        </table>
      </SectionTable>

      <SectionTable title="Opd Bill Record">
        <table className="min-w-[760px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Bill No</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Doctor</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Paid</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {(report?.opd || []).length
              ? (report?.opd || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.visit_date)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.visit_no}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor || row.doctor_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.paid)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.due)}</td>
                  </tr>
                ))
              : <EmptyRow colSpan={8} isLoading={isLoading} label="No OPD bills found." />}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.opd.amount)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.opd.paid)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.opd.due)}</td>
            </tr>
          </tbody>
        </table>
      </SectionTable>

      <SectionTable title="Radiology Bill Record">
        <table className="min-w-[820px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Bill No</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Doctor</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Sub Total</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Paid</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {(report?.radiology || []).length
              ? (report?.radiology || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.ordered_at)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.order_no}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor || row.doctor_name || "Radiology"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.sub_total)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.paid)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.due)}</td>
                  </tr>
                ))
              : <EmptyRow colSpan={9} isLoading={isLoading} label="No radiology bills found." />}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.radiology.sub_total)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.radiology.amount)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.radiology.paid)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.radiology.due)}</td>
            </tr>
          </tbody>
        </table>
      </SectionTable>

      <SectionTable title="IPD Admission Record">
        <table className="min-w-[700px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Admission No</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Doctor</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Total Charges</th>
            </tr>
          </thead>
          <tbody>
            {(report?.ipd || []).length
              ? (report?.ipd || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.admitted_at)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.admission_no}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor || row.doctor_name || row.room_bed || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                  </tr>
                ))
              : <EmptyRow colSpan={6} isLoading={isLoading} label="No IPD admissions found." />}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.ipd.amount)}</td>
            </tr>
          </tbody>
        </table>
      </SectionTable>

      <SectionTable title="Ambulance Call Record">
        <table className="min-w-[600px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Call No</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(report?.ambulance || []).length
              ? (report?.ambulance || []).map((row, index) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.dispatched_at)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.trip_no}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                  </tr>
                ))
              : <EmptyRow colSpan={5} isLoading={isLoading} label="No ambulance calls found." />}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="3">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.ambulance.amount)}</td>
            </tr>
          </tbody>
        </table>
      </SectionTable>

      <div className="mt-8 grid grid-cols-[1fr_1fr] gap-6 max-lg:grid-cols-1">
        <SectionTable title="Income Record">
          <table className="min-w-[620px] border-collapse text-left text-[11px] text-[#1f2c33]">
            <thead className="bg-[#eef3f6]">
              <tr>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Code</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Head</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(report?.income || []).length
                ? (report?.income || []).map((row, index) => (
                    <tr key={row.id}>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.paid_at)}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.code || row.receipt_no}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.head || row.patient_name || "General Income"}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                    </tr>
                  ))
                : <EmptyRow colSpan={5} isLoading={isLoading} label="No income records found." />}
              {(report?.income || []).length > 0 && (report?.income || []).length < pairedIncomePharmacyRowCount
                ? Array.from({ length: pairedIncomePharmacyRowCount - (report?.income || []).length }, (_, index) => (
                    <tr key={`income-spacer-${index}`}>
                      <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="5">&nbsp;</td>
                    </tr>
                  ))
                : null}
              <tr className="bg-[#fafcfd]">
                <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="3">&nbsp;</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.income)}</td>
              </tr>
            </tbody>
          </table>
        </SectionTable>

        <SectionTable title="Pharmacy Sales Record">
          <table className="min-w-[820px] border-collapse text-left text-[11px] text-[#1f2c33]">
            <thead className="bg-[#eef3f6]">
              <tr>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Invoice No</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Patient</th>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Doctor</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Sub Total</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Paid</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {(report?.pharmacy || []).length
                ? (report?.pharmacy || []).map((row, index) => (
                    <tr key={row.id}>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.sl || index + 1}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date || row.sold_at)}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.bill_no || row.invoice_no || row.sale_no}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient || row.patient_name || "N/A"}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor || row.doctor_name || "Pharmacy"}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.sub_total)}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.amount)}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.paid)}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.due)}</td>
                    </tr>
                  ))
                : <EmptyRow colSpan={9} isLoading={isLoading} label="No pharmacy sales found." />}
              {(report?.pharmacy || []).length > 0 && (report?.pharmacy || []).length < pairedIncomePharmacyRowCount
                ? Array.from({ length: pairedIncomePharmacyRowCount - (report?.pharmacy || []).length }, (_, index) => (
                    <tr key={`pharmacy-spacer-${index}`}>
                      <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="9">&nbsp;</td>
                    </tr>
                  ))
                : null}
              <tr className="bg-[#fafcfd]">
                <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">TOTAL:</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pharmacy.sub_total)}</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pharmacy.amount)}</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pharmacy.paid)}</td>
                <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.pharmacy.due)}</td>
              </tr>
            </tbody>
          </table>
        </SectionTable>
      </div>

      <div className="mt-6 rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-3 text-right text-[13px] font-semibold text-[#1f2c33] shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        Final Income : {money(totals.finalIncome)}
      </div>
    </section>
  );
}
