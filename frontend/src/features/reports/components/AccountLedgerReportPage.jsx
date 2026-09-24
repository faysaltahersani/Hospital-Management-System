import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const today = new Date();
const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function IconButton({ children, onClick }) {
  return (
    <button className="text-[#2d2d2d] transition-opacity hover:opacity-70" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block min-w-[280px]">
      <span className="mb-1 block px-3 pt-1 text-[11px] uppercase text-[#5a6775]">{label}</span>
      <select
        className="h-[46px] w-full appearance-none border-0 border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-4 pr-10 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({ label, onChange, value }) {
  return (
    <label className="block min-w-[180px]">
      <span className="mb-1 block px-3 pt-1 text-[11px] uppercase text-[#5a6775]">{label}</span>
      <input
        className="h-[46px] w-full border-0 border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

export function AccountLedgerReportPage() {
  const [accounts, setAccounts] = useState([{ value: "", label: "SELECT CASH/ BANK ACCOUNT" }]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState({
    account: null,
    opening_balance: 0,
    totals: { debit: 0, credit: 0, closing_balance: 0 },
    entries: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAccounts = async () => {
    const response = await apiRequest("/billing/accounts?limit=100");
    setAccounts([
      { value: "", label: "SELECT CASH/ BANK ACCOUNT" },
      ...(response.data || []).map((account) => ({
        value: String(account.id),
        label: account.name,
      })),
    ]);
  };

  const loadReport = async () => {
    if (!selectedAccount) {
      setErrorMessage("Please select an account.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ account_id: selectedAccount });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const response = await apiRequest(`/reports/account-ledger?${params.toString()}`);
      setReport(
        response.data || {
          account: null,
          opening_balance: 0,
          totals: { debit: 0, credit: 0, closing_balance: 0 },
          entries: [],
        }
      );
    } catch (error) {
      setReport({
        account: null,
        opening_balance: 0,
        totals: { debit: 0, credit: 0, closing_balance: 0 },
        entries: [],
      });
      setErrorMessage(error.message || "Failed to load account ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts().catch(() => {});
  }, []);

  const csvRows = useMemo(
    () => [
      ["SL", "Date", "Particular", "Code", "Type", "Debit", "Credit", "Balance"],
      ...report.entries.map((entry, index) => [
        index + 1,
        formatDate(entry.date),
        entry.particulars,
        entry.code,
        entry.type || "",
        money(entry.debit),
        money(entry.credit),
        money(entry.balance),
      ]),
    ],
    [report.entries]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 px-2 text-[18px] font-medium text-[#1f2c33]">ACCOUNT LEDGER</div>

        <div className="grid grid-cols-[minmax(280px,1.3fr)_180px_180px_110px] gap-5 max-lg:grid-cols-1">
          <SelectField
            label="SELECT CASH/ BANK ACCOUNT"
            onChange={(event) => setSelectedAccount(event.target.value)}
            options={accounts}
            value={selectedAccount}
          />
          <DateField label="FROM DATE" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="TO DATE" onChange={(event) => setToDate(event.target.value)} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[34px] w-full rounded-[6px] bg-black px-4 text-[14px] font-semibold text-white"
              onClick={loadReport}
              type="button"
            >
              Report
            </button>
          </div>
        </div>
      </div>

      {report.account ? (
        <>
          <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-1.5 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="flex items-center gap-4 text-[#2d2d2d]">
              <IconButton onClick={() => window.print()}>
                <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
                </svg>
              </IconButton>
              <IconButton onClick={() => downloadCsv(`account-ledger-${report.account.name}.csv`, csvRows)}>
                <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 3h2v10h3l-4 4-4-4h3V3Zm-6 16h14v2H5v-2Z" />
                </svg>
              </IconButton>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
              <thead>
                <tr className="bg-[#efefef] uppercase">
                  <th className="border border-black px-1 py-1 font-normal">SL</th>
                  <th className="border border-black px-1 py-1 font-normal">Date</th>
                  <th className="border border-black px-1 py-1 font-normal">Particular</th>
                  <th className="border border-black px-1 py-1 font-normal">Code</th>
                  <th className="border border-black px-1 py-1 font-normal">Type</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">Debit</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">Credit</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="border border-black px-1 py-6 text-center" colSpan="8">
                      Loading...
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="border border-black px-1 py-0.5" colSpan="6">&nbsp;</td>
                      <td className="border border-black px-1 py-0.5 text-right">Opening Balance:</td>
                      <td className="border border-black px-1 py-0.5 text-right">{money(report.opening_balance)}</td>
                    </tr>
                    {report.entries.length ? (
                      report.entries.map((entry, index) => (
                        <tr key={entry.id}>
                          <td className="border border-black px-1 py-0.5">{index + 1}</td>
                          <td className="border border-black px-1 py-0.5">{formatDate(entry.date)}</td>
                          <td className="border border-black px-1 py-0.5">{entry.particulars}</td>
                          <td className="border border-black px-1 py-0.5">{entry.code}</td>
                          <td className="border border-black px-1 py-0.5">{entry.type || ""}</td>
                          <td className="border border-black px-1 py-0.5 text-right">{money(entry.debit)}</td>
                          <td className="border border-black px-1 py-0.5 text-right">{money(entry.credit)}</td>
                          <td className="border border-black px-1 py-0.5 text-right">{money(entry.balance)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="border border-black px-1 py-6 text-center" colSpan="8">
                          No records found.
                        </td>
                      </tr>
                    )}
                    <tr className="bg-[#fafafa]">
                      <td className="border border-black px-1 py-0.5" colSpan="5">&nbsp;</td>
                      <td className="border border-black px-1 py-0.5 text-right">{money(report.totals.debit)}</td>
                      <td className="border border-black px-1 py-0.5 text-right">{money(report.totals.credit)}</td>
                      <td className="border border-black px-1 py-0.5 text-right">{money(report.totals.closing_balance)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
