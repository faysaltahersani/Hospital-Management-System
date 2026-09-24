import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Supplier", "By Date"];

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function SelectField({ label, onChange, options, value, widthClass = "min-w-[180px]" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className="h-[44px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#1f2c33] outline-none"
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

function TextField({ label, onChange, placeholder, value, widthClass = "min-w-[180px]" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <input
        className="h-[44px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none placeholder:text-[#596778]"
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
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

export function SupplierBalanceReportPage() {
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [supplierOptions, setSupplierOptions] = useState([{ value: "", label: "Select Supplier" }]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totals, setTotals] = useState({ opening: 0, debit: 0, credit: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSuppliers = async () => {
    try {
      const response = await apiRequest("/pharmacy/suppliers?limit=100");
      setSupplierOptions([
        { value: "", label: "Select Supplier" },
        ...((response.data || []).map((supplier) => ({
          value: String(supplier.id),
          label: `${supplier.name} (${supplier.supplier_code || "No Code"})`,
        }))),
      ]);
    } catch {
      // Safely ignore options fetch errors if role does not allow pharmacy access
    }
  };

  const loadRows = async (targetPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (filterType === "By Supplier" && selectedSupplier) params.set("supplier_id", selectedSupplier);
      if (search.trim()) params.set("search", search.trim());
      if (filterType === "By Date" && fromDate) params.set("from", fromDate);
      if (filterType === "By Date" && toDate) params.set("to", toDate);

      const response = await apiRequest(`/reports/supplier-balance?${params.toString()}`);
      setRows(response.data || []);
      setTotals(response.meta?.totals || { opening: 0, debit: 0, credit: 0, balance: 0 });
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setRows([]);
      setTotals({ opening: 0, debit: 0, credit: 0, balance: 0 });
      setTotalPages(1);
      setErrorMessage(error.message || "Failed to load supplier balance report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadSuppliers(), loadRows(1)]).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const csvRows = useMemo(
    () => [
      ["SL", "Name", "Opening", "Debit", "Credit", "Balance"],
      ...rows.map((row, index) => [
        (page - 1) * limit + index + 1,
        row.name,
        money(row.opening),
        money(row.debit),
        money(row.credit),
        money(row.balance),
      ]),
      ["", "Total Balance", money(totals.opening), money(totals.debit), money(totals.credit), money(totals.balance)],
    ],
    [limit, page, rows, totals]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">SUPPLIER BALANCE REPORT</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="FILTER TYPE"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSelectedSupplier("");
              setFromDate("");
              setToDate("");
            }}
            options={FILTER_TYPES.map((item) => ({ value: item, label: item }))}
            value={filterType}
          />
          {filterType === "By Supplier" ? (
            <SelectField label="SUPPLIER" onChange={(event) => setSelectedSupplier(event.target.value)} options={supplierOptions} value={selectedSupplier} />
          ) : null}
          {filterType === "By Date" ? (
            <>
              <DateField label="FROM DATE" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
              <DateField label="TO DATE" onChange={(event) => setToDate(event.target.value)} value={toDate} />
            </>
          ) : null}
          <TextField label="SEARCH" onChange={(event) => setSearch(event.target.value)} placeholder="SEARCH" value={search} />
          <div className="flex items-end">
            <button className="h-[44px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white" onClick={() => loadRows(1)} type="button">
              Report
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="flex items-center gap-5 text-[#2d2d2d]">
          <button onClick={() => window.print()} type="button">
            <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
            </svg>
          </button>
          <button onClick={() => downloadCsv("supplier-balance-report.csv", csvRows)} type="button">
            <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 3h2v10h3l-4 4-4-4h3V3Zm-6 16h14v2H5v-2Z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">NAME</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">OPENING</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">DEBIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">CREDIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="6">Loading...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{(page - 1) * limit + index + 1}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{row.name}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.opening)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.debit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.credit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.balance)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="6">No records found.</td>
              </tr>
            )}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Total Balance:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.opening)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.debit)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.credit)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(totals.balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-8 text-[#9aa7ad]">
        <div className="flex h-[40px] min-w-[64px] items-center justify-between rounded-[4px] border border-[#bfc8cf] bg-[#f5f7f8] px-3 text-[16px] text-[#33424f]">
          <span>{limit}</span>
          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 6h8l-4 4-4-4Z" />
          </svg>
        </div>
        <button className="text-[18px] text-[#33424f] disabled:opacity-40" disabled={page <= 1} onClick={() => loadRows(page - 1)} type="button">‹</button>
        <div className="grid h-8 min-w-8 place-items-center rounded-full bg-[#2b79d0] px-3 text-[15px] text-white">{page}</div>
        <button className="text-[18px] text-[#33424f] disabled:opacity-40" disabled={page >= totalPages} onClick={() => loadRows(page + 1)} type="button">›</button>
      </div>
    </section>
  );
}
