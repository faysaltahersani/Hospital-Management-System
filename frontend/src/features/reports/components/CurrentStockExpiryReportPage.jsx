import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Medicine", "By Expiry Date", "By Search"];

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

function SelectField({ label, onChange, options, value, widthClass = "w-[220px]" }) {
  return (
    <label className={`relative block h-[48px] ${widthClass} bg-[#f3f3f3]`}>
      {label ? <span className="absolute left-3 top-[5px] text-[11px] text-[#1a73e8]">{label}</span> : null}
      <select
        className="h-full w-full appearance-none border-0 border-b-2 border-[#1a73e8] bg-transparent px-3 pb-[4px] pt-[18px] text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
          backgroundRepeat: "no-repeat",
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

function SearchField({ onChange, placeholder, type = "text", value }) {
  return (
    <input
      className="h-[48px] w-[182px] border-b-2 border-[#1a73e8] bg-[#f3f3f3] px-3 text-[15px] text-[#596778] outline-none placeholder:text-[#596778]"
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

export function CurrentStockExpiryReportPage() {
  const [filterType, setFilterType] = useState("All");
  const [medicineOptions, setMedicineOptions] = useState([{ value: "", label: "Select Medicine" }]);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    apiRequest("/pharmacy/medicines?limit=200&is_active=true")
      .then((res) => {
        const items = res?.data?.items ?? res?.data ?? [];
        setMedicineOptions([
          { value: "", label: "Select Medicine" },
          ...(items.map((m) => ({ value: String(m.id), label: `${m.code} - ${m.name}`, code: m.code }))),
        ]);
      })
      .catch(() => {});
    loadReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (filterType === "By Medicine" && selectedMedicine) params.set("medicine_id", selectedMedicine);
      if (filterType === "By Expiry Date" && expiryDate) params.set("expiry_date", expiryDate);
      if (filterType === "By Search" && search.trim()) params.set("search", search.trim());
      const res = await apiRequest(`/pharmacy/medicine-batch-stock?${params.toString()}`);
      setRows(res.data || []);
    } catch {
      setErrorMessage("Failed to load stock expiry report.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = () => {
    loadReport();
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">CURRENT STOCK EXPIRY</div>

        <div className="flex flex-wrap items-end gap-6 max-md:gap-4">
          <SelectField
            label="Filter Type"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSelectedMedicine("");
              setExpiryDate("");
              setSearch("");
            }}
            options={FILTER_TYPES.map((f) => ({ value: f, label: f }))}
            value={filterType}
          />
          {filterType === "By Medicine" ? (
            <SelectField
              label="Medicine"
              onChange={(e) => setSelectedMedicine(e.target.value)}
              options={medicineOptions}
              value={selectedMedicine}
              widthClass="w-[280px]"
            />
          ) : null}
          {filterType === "By Expiry Date" ? (
            <SearchField
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              type="date"
              value={expiryDate}
            />
          ) : null}
          {filterType === "By Search" ? (
            <SearchField
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH"
              value={search}
            />
          ) : null}
          <button
            className="h-[42px] min-w-[180px] rounded-[2px] bg-black px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            disabled={isLoading}
            onClick={handleReport}
            type="button"
          >
            {isLoading ? "Loading..." : "REPORT"}
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Medicine Code</th>
              <th className="border border-black px-1 py-1 font-normal">Medicine Name</th>
              <th className="border border-black px-1 py-1 font-normal">Batch No</th>
              <th className="border border-black px-1 py-1 font-normal">Expiry Date</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Cost</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Stock Qty</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1 py-8 text-center" colSpan="7">Loading...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr key={`${row.medicine_id}-${row.batch_no}-${row.expiry_date}`}>
                  <td className="border border-black px-1 py-1">{index + 1}</td>
                  <td className="border border-black px-1 py-1">{row.medicine_code ?? medicineOptions.find(m => String(m.value) === String(row.medicine_id))?.code ?? "—"}</td>
                  <td className="border border-black px-1 py-1">{row.medicine_name}</td>
                  <td className="border border-black px-1 py-1">{row.batch_no || "—"}</td>
                  <td className="border border-black px-1 py-1">{formatDate(row.expiry_date)}</td>
                  <td className="border border-black px-1 py-1 text-right">{money(row.cost)}</td>
                  <td className="border border-black px-1 py-1 text-right">{row.current_stock}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1 py-8 text-center" colSpan="7">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
