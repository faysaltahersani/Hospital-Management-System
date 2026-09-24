import { useState, useCallback, useEffect } from "react";
import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Search"];

function SelectField({ label, onChange, options, value, widthClass = "w-[180px]" }) {
  return (
    <label className="block">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className={`h-[40px] ${widthClass} appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#1f2c33] outline-none`}
        onChange={onChange}
        value={value}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MedicineStockReportListPage() {
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchMedicines = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (filterType === "By Search" && search.trim()) params.set("search", search.trim());

        const res = await apiRequest(`/pharmacy/medicines?${params.toString()}`);
        const items = res?.data?.items ?? res?.data ?? [];
        const paginationMeta = res?.data?.meta?.pagination ?? res?.meta?.pagination ?? { page: 1, total_pages: 1, total: 0 };
        setMedicines(items);
        setPagination(paginationMeta);
        setCurrentPage(page);
        setHasLoaded(true);
      } catch (err) {
        setError(err.message || "Failed to load medicine stock.");
      } finally {
        setLoading(false);
      }
    },
    [filterType, search]
  );

  const handleReport = () => fetchMedicines(1);

  // Page open হলে এবং filter change হলে auto-load (By Search ছাড়া)
  useEffect(() => {
    if (filterType !== "By Search") {
      fetchMedicines(1);
    }
  }, [filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    fetchMedicines(page);
  };

  const totalQty = medicines.reduce(
    (a, m) => a + Number(m.current_stock ?? m.stock_quantity ?? 0),
    0
  );

  const pageNumbers = [];
  for (let i = 1; i <= pagination.total_pages; i++) pageNumbers.push(i);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">MEDICINE STOCK REPORT</div>

        <div className="flex flex-wrap items-end gap-6 max-md:gap-4">
          <SelectField
            label="Filter Type"
            onChange={(e) => {
              setFilterType(e.target.value);
              setSearch("");
            }}
            options={FILTER_TYPES}
            value={filterType}
          />

          {filterType === "By Search" && (
            <input
              className="h-[48px] w-[182px] border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] uppercase text-[#596778] outline-none placeholder:text-[#596778]"
              placeholder="SEARCH"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          <button
            className="h-[42px] min-w-[180px] rounded-[2px] bg-black px-4 text-[14px] font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={handleReport}
            disabled={loading}
          >
            {loading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      {/* Print bar */}
      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <button className="text-[#2d2d2d]" type="button" onClick={() => window.print()}>
          <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Medicine Code</th>
              <th className="border border-black px-1 py-1 font-normal">Medicine Name</th>
              <th className="border border-black px-1 py-1 font-normal">Unit</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#596778]" colSpan="5">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && hasLoaded && medicines.length === 0 && (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#596778]" colSpan="5">
                  No records found.
                </td>
              </tr>
            )}
            {!loading &&
              medicines.map((med, idx) => {
                const stock = med.current_stock ?? med.stock_quantity ?? 0;
                const sl = (currentPage - 1) * 10 + idx + 1;
                return (
                  <tr key={med.id}>
                    <td className="border border-black px-1 py-0.5">{sl}</td>
                    <td className="border border-black px-1 py-0.5">{med.code ?? med.id}</td>
                    <td className="border border-black px-1 py-0.5">{med.name}</td>
                    <td className="border border-black px-1 py-0.5">{med.unit ?? "-"}</td>
                    <td className="border border-black px-1 py-0.5 text-right">{stock}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Total QTY */}
      {hasLoaded && (
        <div className="mt-4 text-right text-[18px] font-semibold text-[#1f2c33]">
          Total QTY: {totalQty}
        </div>
      )}

      {/* Pagination */}
      {hasLoaded && pagination.total_pages > 0 && (
        <div className="mt-6 flex items-center justify-center gap-8 text-[#9aa7ad]">
          <button
            className="flex h-[40px] min-w-[64px] items-center justify-between rounded-[4px] border border-[#bfc8cf] bg-[#f5f7f8] px-3 text-[16px] text-[#33424f] disabled:opacity-40"
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9.8 3.2 5 8l4.8 4.8 1.4-1.4L7.8 8l3.4-3.4-1.4-1.4Z" />
            </svg>
          </button>

          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`grid h-8 w-8 place-items-center rounded-full text-[15px] ${
                n === currentPage ? "bg-[#2b79d0] text-white" : "text-[#33424f] hover:bg-[#f5f7f8]"
              }`}
              type="button"
              onClick={() => handlePageChange(n)}
            >
              {n}
            </button>
          ))}

          <button
            className="flex h-[40px] min-w-[40px] items-center justify-center rounded-[4px] border border-[#bfc8cf] bg-[#f5f7f8] text-[16px] text-[#33424f] disabled:opacity-40"
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.total_pages}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
              <path d="m6.2 3.2-1.4 1.4L8.2 8l-3.4 3.4 1.4 1.4L11 8 6.2 3.2Z" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
