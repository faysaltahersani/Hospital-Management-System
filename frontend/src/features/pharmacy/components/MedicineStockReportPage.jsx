import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";

const filterOptions = ["All", "Low Stock", "Out of Stock", "By Search"];

export function MedicineStockReportPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchReport = async (filter, searchQuery) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (filter === "By Search" && searchQuery.trim()) params.set("search", searchQuery.trim());

      const response = await apiRequest(`/pharmacy/medicine-stock-report?${params.toString()}`);
      let rows = response.data || [];

      if (filter === "Low Stock") rows = rows.filter((row) => row.status === "Low Stock");
      else if (filter === "Out of Stock") rows = rows.filter((row) => row.status === "Out of Stock");

      setReportRows(rows);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load medicine stock report.");
    } finally {
      setIsLoading(false);
    }
  };

  // Page open হলে এবং filter (By Search ছাড়া) change হলে auto-load
  useEffect(() => {
    if (activeFilter !== "By Search") {
      fetchReport(activeFilter, "");
    }
  }, [activeFilter]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">MEDICINE STOCK REPORT</h1>

        <div className="flex flex-wrap items-start gap-4">
          <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
            <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Filter Type</legend>
            <select
              className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
              onChange={(event) => setActiveFilter(event.target.value)}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
                backgroundPosition: "right 9px center",
              }}
              value={activeFilter}
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </fieldset>

          {activeFilter === "By Search" ? (
            <fieldset className="min-w-[220px] rounded-[3px] border border-[#c7d0d5] bg-white">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">By Search</legend>
              <input
                className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Medicine name or code"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}

          <button
            className="h-[32px] rounded-[2px] bg-black px-12 text-[11px] font-medium tracking-[0.02em] text-white disabled:opacity-50"
            disabled={isLoading}
            onClick={() => fetchReport(activeFilter, query)}
            type="button"
          >
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-3 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px] text-[#1f2c33]">
              <thead className="border-b border-[#d9e1e5] bg-[#f8fbfc]">
                <tr>
                  <th className="px-3 py-3 font-semibold">SL</th>
                  <th className="px-3 py-3 font-semibold">Medicine Code</th>
                  <th className="px-3 py-3 font-semibold">Medicine Name</th>
                  <th className="px-3 py-3 font-semibold">Unit</th>
                  <th className="px-3 py-3 font-semibold text-right">Current Stock</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length ? (
                  reportRows.map((row) => (
                    <tr className="border-b border-[#e7edf0]" key={row.id}>
                      <td className="px-3 py-2">{row.sl}</td>
                      <td className="px-3 py-2">{row.code}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.unit || "—"}</td>
                      <td className="px-3 py-2 text-right">{row.stock_quantity}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${
                            row.status === "Out of Stock"
                              ? "bg-[#fff0f0] text-[#d94040]"
                              : row.status === "Low Stock"
                                ? "bg-[#fff8e6] text-[#b07400]"
                                : "bg-[#f0fbf4] text-[#1d7a46]"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#66737b]" colSpan={6}>
                      {isLoading ? "Loading..." : activeFilter === "By Search" ? "Search করে REPORT click করুন।" : "No data found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
