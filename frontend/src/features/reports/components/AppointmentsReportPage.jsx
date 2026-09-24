import { useEffect, useState } from "react";

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

const STATUS_LABELS = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function AppointmentsReportPage() {
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState({ by_status: {}, by_date: [] });
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
      const response = await apiRequest(`/reports/appointments?${params.toString()}`);
      setReport(response.data || { by_status: {}, by_date: [] });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load appointments report.");
      setReport({ by_status: {}, by_date: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(formatDateInput(firstDayOfMonth), formatDateInput(today));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = Object.values(report.by_status).reduce((sum, v) => sum + Number(v || 0), 0);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">Appointments Report</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <label className="block min-w-[180px]">
            <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">FROM DATE</span>
            <input className="h-[44px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none" onChange={(e) => setFromDate(e.target.value)} type="date" value={fromDate} />
          </label>
          <label className="block min-w-[180px]">
            <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">TO DATE</span>
            <input className="h-[44px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none" onChange={(e) => setToDate(e.target.value)} type="date" value={toDate} />
          </label>
          <div className="flex items-end">
            <button className="h-[44px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoading} onClick={() => loadReport()} type="button">
              {isLoading ? "Loading..." : "Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-4 text-center shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="text-[24px] font-bold text-[#1f2c33]">{Number(report.by_status[key] || 0)}</div>
            <div className="mt-1 text-[12px] text-[#5a6775]">{label}</div>
          </div>
        ))}
        <div className="rounded-[4px] border border-[#d9e1e5] bg-[#f4f8fb] px-4 py-4 text-center shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
          <div className="text-[24px] font-bold text-[#1f2c33]">{total}</div>
          <div className="mt-1 text-[12px] text-[#5a6775]">Total</div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Daily Breakdown</div>
        <table className="min-w-[480px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">COUNT</th>
            </tr>
          </thead>
          <tbody>
            {report.by_date.length
              ? report.by_date.map((row) => (
                  <tr key={row.date}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{row.count}</td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={2}>
                    {isLoading ? "Loading..." : "No appointments found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
