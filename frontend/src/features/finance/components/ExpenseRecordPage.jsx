import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Head", "By Account", "By Date", "By Search"];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function SelectField({ label, onChange, options, value, widthClass = "w-full" }) {
  return (
    <label className="block min-w-[180px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label || "\u00A0"}</span>
      <select
        className={`h-[40px] ${widthClass} appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#1f2c33] outline-none`}
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

function SearchField({ onChange, value }) {
  return (
    <label className="block min-w-[240px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">Search</span>
      <input
        className="h-[40px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none placeholder:text-[#5d6a72]"
        onChange={onChange}
        placeholder="Search Here"
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
        className="h-[40px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

export function ExpenseRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedHead, setSelectedHead] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [headOptions, setHeadOptions] = useState([{ value: "", label: "Select Head" }]);
  const [accountOptions, setAccountOptions] = useState([{ value: "", label: "Select Account" }]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMeta = async () => {
    const response = await apiRequest("/billing/expenses/meta");
    setHeadOptions([
      { value: "", label: "Select Head" },
      ...((response.data?.expense_heads || []).map((item) => ({ value: String(item.id), label: item.name }))),
    ]);
    setAccountOptions([
      { value: "", label: "Select Account" },
      ...((response.data?.accounts || []).map((item) => ({ value: String(item.id), label: item.name }))),
    ]);
  };

  const loadItems = async (targetPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      });
      if (filterType === "By Head" && selectedHead) params.set("category_id", selectedHead);
      if (filterType === "By Account" && selectedAccount) params.set("account_id", selectedAccount);
      if ((filterType === "By Search" || search.trim()) && search.trim()) params.set("search", search.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const response = await apiRequest(`/billing/expenses?${params.toString()}`);
      setItems(response.data || []);
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setErrorMessage(error.message || "Failed to load expense records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadMeta(), loadItems(1)]).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grandTotal = useMemo(
    () => items.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2),
    [items]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-7 text-[18px] font-medium text-[#1f2c33]">EXPENSE RECORD</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="Filter Type"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSelectedHead("");
              setSelectedAccount("");
              setSearch("");
            }}
            options={FILTER_TYPES.map((item) => ({ value: item, label: item }))}
            value={filterType}
          />
          {filterType === "By Head" ? <SelectField label="Head" onChange={(event) => setSelectedHead(event.target.value)} options={headOptions} value={selectedHead} /> : null}
          {filterType === "By Account" ? <SelectField label="Account" onChange={(event) => setSelectedAccount(event.target.value)} options={accountOptions} value={selectedAccount} /> : null}
          {filterType === "By Search" ? <SearchField onChange={(event) => setSearch(event.target.value)} value={search} /> : null}
          <DateField label="From Date" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="To Date" onChange={(event) => setToDate(event.target.value)} value={toDate} />
          <div className="flex items-end">
            <button className="h-[40px] w-full rounded-[3px] bg-black px-6 text-[14px] font-medium text-white" onClick={() => loadItems(1)} type="button">
              REPORT
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <button className="text-[#2d2d2d]" onClick={() => window.print()} type="button">
          <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
          </svg>
        </button>
      </div>

      <div className="mt-9 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Expense No</th>
              <th className="border border-black px-1 py-1 font-normal">Head</th>
              <th className="border border-black px-1 py-1 font-normal">Account</th>
              <th className="border border-black px-1 py-1 font-normal">Created By</th>
              <th className="border border-black px-1 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1 py-1 font-normal">Note</th>
              <th className="border border-black px-1 py-1 font-normal">Date</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1 py-6 text-center" colSpan="9">
                  Loading...
                </td>
              </tr>
            ) : items.length ? (
              items.map((row, index) => (
                <tr key={row.id}>
                  <td className="border border-black px-1 py-0.5">{(page - 1) * limit + index + 1}</td>
                  <td className="border border-black px-1 py-0.5">{row.expense_code || `EXP-${row.id}`}</td>
                  <td className="border border-black px-1 py-0.5">{row.category?.name || row.title || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5">{row.account?.name || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5">{row.creator?.full_name || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5">{row.updater?.full_name || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5">{row.description || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5">{formatDate(row.expense_date)}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{Number(row.amount || 0).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1 py-6 text-center" colSpan="9">
                  No records found.
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1 py-0.5">&nbsp;</td>
              <td className="border border-black px-1 py-0.5" colSpan="6">&nbsp;</td>
              <td className="border border-black px-1 py-0.5 text-right">Grand Total</td>
              <td className="border border-black px-1 py-0.5 text-right">{grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-center gap-5 text-[16px] text-[#91a1aa]">
        <button className="rounded-[4px] border border-[#cfd7dc] bg-[#f3f6f8] px-4 py-2 text-[#37474f]" type="button">
          {limit}
        </button>
        <button disabled={page <= 1} onClick={() => loadItems(page - 1)} type="button">
          ‹
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-[#1f73de] text-white" type="button">
          {page}
        </button>
        <button disabled={page >= totalPages} onClick={() => loadItems(page + 1)} type="button">
          ›
        </button>
      </div>
    </section>
  );
}
