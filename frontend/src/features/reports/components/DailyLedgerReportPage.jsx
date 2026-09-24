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
        className="h-[48px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

export function DailyLedgerReportPage() {
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState({
    opening_balance: 0,
    totals: { debit: 0, credit: 0, closing_balance: 0 },
    items: [],
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
      const response = await apiRequest(`/reports/daily-ledger?${params.toString()}`);
      setReport(
        response.data || {
          opening_balance: 0,
          totals: { debit: 0, credit: 0, closing_balance: 0 },
          items: [],
        }
      );
    } catch (error) {
      setReport({
        opening_balance: 0,
        totals: { debit: 0, credit: 0, closing_balance: 0 },
        items: [],
      });
      setErrorMessage(error.message || "Failed to load daily ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport(formatDateInput(firstDayOfMonth), formatDateInput(today));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(
    () => ({
      debit: Number(report.totals?.debit || 0),
      credit: Number(report.totals?.credit || 0),
      closing_balance: Number(report.totals?.closing_balance || report.opening_balance || 0),
    }),
    [report]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">DAILY LEDGER</div>

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

      <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">PARTICULAR</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">CODE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">TYPE</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">DEBIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">CREDIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Opening Balance:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(report.opening_balance)}</td>
            </tr>

            {isLoading ? (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="8">
                  Loading daily ledger...
                </td>
              </tr>
            ) : (report?.items || report?.entries || []).length ? (
              (report?.items || report?.entries || []).map((row, index) => (
                <tr key={row.id}>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{index + 1}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.date)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{row.particular || row.description || "N/A"}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{row.code || row.voucher_no || "N/A"}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{row.type || row.voucher_type || "N/A"}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.debit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.credit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.balance)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="8">
                  No ledger entries found for the selected date range.
                </td>
              </tr>
            )}

            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Total:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.debit)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.credit)}</td>
            </tr>
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="6">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Closing Balance: {money(totals.closing_balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
