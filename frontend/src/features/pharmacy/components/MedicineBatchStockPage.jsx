import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const filterOptions = ["All", "By Medicine", "By Expiry Date", "By Search"];

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function MedicineBatchStockPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMedicines = async () => {
    try {
      const response = await apiRequest("/pharmacy/medicines?limit=100");
      setMedicines(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load medicines.");
    }
  };

  const loadReport = async (overrideFilter, overrideMedId, overrideQuery) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const filterToUse = typeof overrideFilter === "string" ? overrideFilter : activeFilter;
      const targetMedId =
        typeof overrideMedId === "string" || typeof overrideMedId === "number"
          ? String(overrideMedId)
          : selectedMedicineId;
      const targetQuery = typeof overrideQuery === "string" ? overrideQuery : query;

      const params = new URLSearchParams();

      if (filterToUse === "By Medicine") {
        if (targetMedId) {
          params.set("medicine_id", targetMedId);
        } else {
          setReportRows([]);
          setIsLoading(false);
          return;
        }
      } else if (filterToUse === "By Expiry Date") {
        if (targetQuery.trim()) {
          params.set("expiry_date", targetQuery.trim());
        } else {
          setReportRows([]);
          setIsLoading(false);
          return;
        }
      } else if (filterToUse === "By Search") {
        if (targetQuery.trim()) {
          params.set("search", targetQuery.trim());
        } else {
          setReportRows([]);
          setIsLoading(false);
          return;
        }
      }

      const response = await apiRequest(`/pharmacy/medicine-batch-stock${params.toString() ? `?${params.toString()}` : ""}`);
      setReportRows(response.data || []);
    } catch (error) {
      setReportRows([]);
      setErrorMessage(error.message || "Failed to load batch stock report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
    loadReport("All", "", "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder = useMemo(() => {
    if (activeFilter === "By Expiry Date") return "Select expiry date";
    return "Search";
  }, [activeFilter]);

  const medicineOptions = useMemo(
    () => [{ value: "", label: "Select Medicine" }, ...medicines.map((medicine) => ({ value: String(medicine.id), label: medicine.name }))],
    [medicines]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">MEDICINE BATCH STOCK REPORT</h1>

        <div className="flex flex-wrap items-start gap-4">
          <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
            <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Filter Type</legend>
            <select
              className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
              onChange={(event) => {
                const nextFilter = event.target.value;
                setActiveFilter(nextFilter);
                setQuery("");
                setSelectedMedicineId("");
                if (nextFilter === "All") {
                  loadReport("All", "", "");
                } else {
                  setReportRows([]);
                }
              }}
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

          {activeFilter === "By Medicine" ? (
            <fieldset className="min-w-[220px] rounded-[3px] border border-[#c7d0d5] bg-white">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">By Medicine</legend>
              <select
                className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-white bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => {
                  const val = event.target.value;
                  setSelectedMedicineId(val);
                  loadReport("By Medicine", val, query);
                }}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
                  backgroundPosition: "right 9px center",
                }}
                value={selectedMedicineId}
              >
                {medicineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </fieldset>
          ) : null}

          {activeFilter === "By Expiry Date" || activeFilter === "By Search" ? (
            <fieldset className="min-w-[220px] rounded-[3px] border border-[#c7d0d5] bg-white">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{activeFilter}</legend>
              {activeFilter === "By Expiry Date" ? (
                <input
                  className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none"
                  onChange={(event) => {
                    const val = event.target.value;
                    setQuery(val);
                    loadReport("By Expiry Date", selectedMedicineId, val);
                  }}
                  placeholder={placeholder}
                  type="date"
                  value={query}
                />
              ) : (
                <input
                  className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none"
                  onChange={(event) => {
                    const val = event.target.value;
                    setQuery(val);
                    loadReport("By Search", selectedMedicineId, val);
                  }}
                  placeholder={placeholder}
                  type="text"
                  value={query}
                />
              )}
            </fieldset>
          ) : null}

          <button
            className="h-[32px] rounded-[2px] bg-black px-12 text-[11px] font-medium tracking-[0.02em] text-white disabled:opacity-50"
            disabled={isLoading}
            onClick={() => loadReport()}
            type="button"
          >
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px] text-[#1f2c33]">
              <thead className="border-b border-[#d9e1e5] bg-[#f8fbfc]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Batch No</th>
                  <th className="px-3 py-3 font-semibold">Medicine</th>
                  <th className="px-3 py-3 font-semibold">Expiry Date</th>
                  <th className="px-3 py-3 font-semibold">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && reportRows.length === 0 ? (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-3 py-4 text-center text-[#6d7980]" colSpan={4}>
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!isLoading && reportRows.length === 0 ? (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-3 py-4 text-center text-[#6d7980]" colSpan={4}>
                      No batch stock found.
                    </td>
                  </tr>
                ) : null}
                {reportRows.map((row) => (
                  <tr className="border-b border-[#e7edf0]" key={`${row.medicine_id}-${row.batch_no}-${row.expiry_date}`}>
                    <td className="px-3 py-2">{row.batch_no || "N/A"}</td>
                    <td className="px-3 py-2">{row.medicine_name || "N/A"}</td>
                    <td className="px-3 py-2">{formatDate(row.expiry_date)}</td>
                    <td className="px-3 py-2">{row.current_stock ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
