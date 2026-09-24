import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Patient", "By Search"];

function money(value) {
  return Number(value || 0).toFixed(2);
}

function SelectField({ disabled = false, label, onChange, options, value, widthClass = "w-full" }) {
  return (
    <label className="block min-w-[180px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className={`h-[40px] ${widthClass} appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#1f2c33] outline-none`}
        disabled={disabled}
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

function CollectionTable({ isLoading, rows, title }) {
  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2),
    [rows]
  );

  return (
    <div className="mt-12">
      <div className="mb-2 text-[15px] font-semibold text-[#203446]">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Code</th>
              <th className="border border-black px-1 py-1 font-normal">Patient</th>
              <th className="border border-black px-1 py-1 font-normal">Account</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Amount</th>
              <th className="border border-black px-1 py-1 font-normal text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1 py-6 text-center" colSpan="6">
                  Loading...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${row.id}`}>
                  <td className="border border-black px-1 py-0.5">{index + 1}</td>
                  <td className="border border-black px-1 py-0.5">{row.code}</td>
                  <td className="border border-black px-1 py-0.5">
                    {row.patient?.patient_code ? `${row.patient.patient_code} - ${row.patient.full_name}` : row.patient?.full_name || "N/A"}
                  </td>
                  <td className="border border-black px-1 py-0.5">{row.account || "N/A"}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{money(row.amount)}</td>
                  <td className="border border-black px-1 py-0.5 text-center">-</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1 py-6 text-center" colSpan="6">
                  No records found.
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1 py-0.5">&nbsp;</td>
              <td className="border border-black px-1 py-0.5" colSpan="3">
                &nbsp;
              </td>
              <td className="border border-black px-1 py-0.5 text-right font-medium">Grand Total: {totalAmount}</td>
              <td className="border border-black px-1 py-0.5">&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PatientDueCollectionListPage() {
  const [filterType, setFilterType] = useState("By Patient");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patientOptions, setPatientOptions] = useState([{ value: "", label: "Search Patient" }]);
  const [collections, setCollections] = useState({ pathology: [], opd: [], appointment: [], other: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const response = await apiRequest("/billing/patient-due-collections/meta");
      setPatientOptions([
        { value: "", label: "Search Patient" },
        ...(response.data?.patients || []).map((item) => ({
          value: String(item.id),
          label: `${item.patient_code} - ${item.full_name}${item.phone ? ` - ${item.phone}` : ""}`,
        })),
      ]);
    } catch (error) {
      setPatientOptions([{ value: "", label: "No patients available" }]);
      setErrorMessage(error.message || "Failed to load patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const loadCollections = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (filterType === "By Patient" && selectedPatient) params.set("patient_id", selectedPatient);
      if ((filterType === "By Search" || search.trim()) && search.trim()) params.set("search", search.trim());
      const query = params.toString();
      const response = await apiRequest(`/billing/patient-due-collections${query ? `?${query}` : ""}`);
      setCollections({
        pathology: response.data?.pathology || [],
        opd: response.data?.opd || [],
        appointment: response.data?.appointment || [],
        other: response.data?.other || [],
      });
    } catch (error) {
      setCollections({ pathology: [], opd: [], appointment: [], other: [] });
      setErrorMessage(error.message || "Failed to load patient due collections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadPatients(), loadCollections()]).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">PATIENT DUE COLLECTION</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="Filter Type"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSelectedPatient("");
              setSearch("");
            }}
            options={FILTER_TYPES.map((item) => ({ value: item, label: item }))}
            value={filterType}
          />
          {filterType === "By Patient" ? (
            <SelectField
              disabled={isLoadingPatients}
              label={isLoadingPatients ? "Loading Patients..." : "Select Patient"}
              onChange={(event) => setSelectedPatient(event.target.value)}
              options={patientOptions}
              value={selectedPatient}
            />
          ) : null}
          {filterType === "By Search" ? <SearchField onChange={(event) => setSearch(event.target.value)} value={search} /> : null}
          <div className="flex items-end">
            <button
              className="h-[40px] w-full rounded-[3px] bg-black px-6 text-[14px] font-medium text-white"
              onClick={() => loadCollections()}
              type="button"
            >
              REPORT
            </button>
          </div>
        </div>
      </div>

      <CollectionTable isLoading={isLoading} rows={collections.pathology} title="Pathology Collection" />
      <CollectionTable isLoading={isLoading} rows={collections.opd} title="Opd Collection" />
      <CollectionTable isLoading={isLoading} rows={collections.appointment} title="Appointment Collection" />
      <CollectionTable isLoading={isLoading} rows={collections.other} title="Other Collection" />
    </section>
  );
}
