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

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_REPORT = {
  totals: { billed: 0, revenue: 0, expenses: 0, net: 0, outstanding: 0 },
  invoices_by_status: {},
  payments_by_method: {},
  expenses_by_category: [],
};

export function FinanceSummaryReportPage() {
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState(EMPTY_REPORT);
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
      const response = await apiRequest(`/reports/finance?${params.toString()}`);
      setReport(response.data || EMPTY_REPORT);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load finance summary.");
      setReport(EMPTY_REPORT);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(formatDateInput(firstDayOfMonth), formatDateInput(today));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = report.totals || EMPTY_REPORT.totals;

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">Finance Summary Report</div>
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

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {[
          { label: "Total Billed", value: totals.billed },
          { label: "Revenue Collected", value: totals.revenue },
          { label: "Total Expenses", value: totals.expenses },
          { label: "Net Income", value: totals.net },
          { label: "Outstanding", value: totals.outstanding },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-4 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="text-[13px] text-[#5a6775]">{label}</div>
            <div className="mt-1 text-[18px] font-bold text-[#1f2c33]">{money(value)}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_1fr] gap-5 max-lg:grid-cols-1">
        <div className="overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
          <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Payments by Method</div>
          <table className="min-w-[320px] border-collapse text-left text-[11px] text-[#1f2c33]">
            <thead className="bg-[#eef3f6]">
              <tr>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Method</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.payments_by_method || {}).length
                ? Object.entries(report.payments_by_method).map(([method, amount]) => (
                    <tr key={method}>
                      <td className="border border-[#1f2c33] px-2 py-1.5 capitalize">{method}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(amount)}</td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={2}>
                      {isLoading ? "Loading..." : "No payments found."}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
          <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Expenses by Category</div>
          <table className="min-w-[320px] border-collapse text-left text-[11px] text-[#1f2c33]">
            <thead className="bg-[#eef3f6]">
              <tr>
                <th className="border border-[#1f2c33] px-2 py-2 font-medium">Category</th>
                <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(report.expenses_by_category || []).length
                ? report.expenses_by_category.map((row) => (
                    <tr key={row.category_id ?? row.category_name}>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.category_name}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.total)}</td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={2}>
                      {isLoading ? "Loading..." : "No expenses found."}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Invoices by Status</div>
        <table className="min-w-[400px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Status</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(report.invoices_by_status || {}).length
              ? Object.entries(report.invoices_by_status).map(([status, count]) => (
                  <tr key={status}>
                    <td className="border border-[#1f2c33] px-2 py-1.5 capitalize">{status}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{count}</td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={2}>
                    {isLoading ? "Loading..." : "No invoices found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
