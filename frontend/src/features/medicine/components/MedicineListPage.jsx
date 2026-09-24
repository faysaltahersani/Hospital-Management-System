import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const filterTypes = ["All", "By Unit", "By Group", "By Company", "By Search"];

function formatDisplay(value) {
  const normalized = String(value || "").trim();
  return normalized || "N/A";
}

function SelectField({ label, onChange = () => {}, options, value }) {
  return (
    <fieldset className="min-w-[182px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{label}</legend>
      <select
        className="h-[30px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 9px center",
        }}
        value={value}
      >
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={`${label}-${normalized.value}`} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
    </fieldset>
  );
}

function SearchField({ onChange, value }) {
  return (
    <fieldset className="min-w-[284px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Search</legend>
      <input
        autoFocus
        className="h-[30px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Here"
        type="text"
        value={value}
      />
    </fieldset>
  );
}

export function MedicineListPage() {
  const [filterType, setFilterType] = useState("All");
  const [selectedValue, setSelectedValue] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [masterOptions, setMasterOptions] = useState({
    units: [],
    groups: [],
    companies: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const loadFilters = async () => {
    try {
      const [unitsResponse, groupsResponse, companiesResponse, medicinesResponse] = await Promise.all([
        apiRequest("/settings/master-options?type=medicine_unit&limit=100"),
        apiRequest("/settings/master-options?type=medicine_group&limit=100"),
        apiRequest("/settings/master-options?type=medicine_company&limit=100"),
        apiRequest("/pharmacy/medicines?limit=1000"),
      ]);
      const medicines = medicinesResponse.data || [];
      const mergeOptions = (...values) =>
        [...new Set(values.flat().map((value) => String(value || "").trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b))
          .map((label) => ({ label }));
      setMasterOptions({
        units: mergeOptions((unitsResponse.data || []).map((item) => item.label), medicines.map((item) => item.unit)),
        groups: mergeOptions(
          (groupsResponse.data || []).map((item) => item.label),
          medicines.map((item) => item.group_name || item.generic_name)
        ),
        companies: mergeOptions(
          (companiesResponse.data || []).map((item) => item.label),
          medicines.map((item) => item.company || item.manufacturer)
        ),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load medicine filters.");
    }
  };

  const fetchMedicines = async (targetPage = 1) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      });
      if (filterType === "By Unit" && selectedValue) params.set("unit", selectedValue);
      if (filterType === "By Group" && selectedValue) params.set("group_name", selectedValue);
      if (filterType === "By Company" && selectedValue) params.set("company", selectedValue);
      if (filterType === "By Search" && search.trim()) params.set("search", search.trim());
      const response = await apiRequest(`/pharmacy/medicines?${params.toString()}`);
      setRows(response.data || []);
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setRows([]);
      setErrorMessage(error.message || "Failed to load medicines.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
    fetchMedicines(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const companionOptions = useMemo(() => {
    if (filterType === "By Unit") {
      return [{ value: "", label: "Select Unit" }, ...masterOptions.units.map((item) => ({ value: item.label, label: item.label }))];
    }
    if (filterType === "By Group") {
      return [{ value: "", label: "Select Group" }, ...masterOptions.groups.map((item) => ({ value: item.label, label: item.label }))];
    }
    if (filterType === "By Company") {
      return [{ value: "", label: "Select Company" }, ...masterOptions.companies.map((item) => ({ value: item.label, label: item.label }))];
    }
    return null;
  }, [filterType, masterOptions]);

  const showSearchInput = filterType === "By Search";

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">MEDICINE LIST</h1>

        <div className="flex flex-wrap items-end gap-6">
          <SelectField
            label="Filter Type"
            onChange={(value) => {
              setFilterType(value);
              setSelectedValue("");
              setSearch("");
            }}
            options={filterTypes}
            value={filterType}
          />
          {companionOptions ? <SelectField label="" onChange={setSelectedValue} options={companionOptions} value={selectedValue} /> : null}
          {showSearchInput ? <SearchField onChange={setSearch} value={search} /> : null}
          <button
            className="h-[32px] min-w-[180px] rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white disabled:opacity-50"
            disabled={isLoading}
            onClick={() => fetchMedicines(1)}
            type="button"
          >
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="mt-1 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-2 shadow-[0_3px_8px_rgba(22,36,45,0.05)]">
        <button
          aria-label="Print medicine list"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-[#2e2e2e]"
          onClick={() => window.print()}
          type="button"
        >
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="M4 2.5h8v3H4zM4 10.5h8V14H4zM2 6.5h12a1 1 0 0 1 1 1v3h-2v-2H3v2H1v-3a1 1 0 0 1 1-1zm3 5h6v1H5z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="mt-9 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Code</th>
              <th className="border border-black px-1.5 py-1 font-normal">Name</th>
              <th className="border border-black px-1.5 py-1 font-normal">Unit</th>
              <th className="border border-black px-1.5 py-1 font-normal">Group</th>
              <th className="border border-black px-1.5 py-1 font-normal">Company</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={8}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={8}>
                  No medicines found.
                </td>
              </tr>
            ) : null}
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className="border border-black px-1.5 py-1">{(page - 1) * limit + index + 1}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.code)}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.name)}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.unit)}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.group_name || row.group)}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.company || row.manufacturer)}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.created_by || row.creator?.full_name || "Admin")}</td>
                <td className="border border-black px-1.5 py-1">{formatDisplay(row.updated_by || row.updater?.full_name || "N/A")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#75828d]">
        <button
          className="flex h-8 min-w-[56px] items-center justify-between rounded-[4px] border border-[#c7d0d5] bg-white px-3 text-[#3f4d57]"
          type="button"
        >
          <span>{limit}</span>
          <span className="text-[10px]">▼</span>
        </button>
        <button className="text-[18px] leading-none disabled:opacity-40" disabled={page <= 1 || isLoading} onClick={() => fetchMedicines(page - 1)} type="button">
          ‹
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1976d2] text-white" type="button">
          {page}
        </button>
        <button className="text-[18px] leading-none disabled:opacity-40" disabled={page >= totalPages || isLoading} onClick={() => fetchMedicines(page + 1)} type="button">
          ›
        </button>
      </div>
    </section>
  );
}
