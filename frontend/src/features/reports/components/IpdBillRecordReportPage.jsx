import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const FILTER_TYPES = ["All", "By Patient", "By Doctor", "By Date", "By Search"];
function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

function TextField({ label, onChange, value }) {
  return (
    <label className="block min-w-[180px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <input
        className="h-[44px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none placeholder:text-[#596778]"
        onChange={onChange}
        placeholder="SEARCH"
        type="text"
        value={value}
      />
    </label>
  );
}

export function IpdBillRecordReportPage() {
  const [filterType, setFilterType] = useState("All");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLists = async () => {
    const [patientResponse, doctorResponse] = await Promise.all([
      apiRequest("/patients?limit=100"),
      apiRequest("/doctors?limit=100"),
    ]);
    setPatients(patientResponse.data || []);
    setDoctors(doctorResponse.data || []);
  };

  const loadRows = async (targetPage = 1) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (filterType === "By Patient" && selectedPatientId) params.set("patient_id", selectedPatientId);
      if (filterType === "By Doctor" && selectedDoctorId) params.set("doctor_id", selectedDoctorId);
      if (filterType === "By Search" && search.trim()) params.set("search", search.trim());
      const response = await apiRequest(`/ipd?${params.toString()}`);
      setRows(response.data || []);
      setMeta(response.meta?.pagination || { page: targetPage, limit: 10, total_pages: 1 });
      setPage(targetPage);
    } catch (error) {
      setRows([]);
      setErrorMessage(error.message || "Failed to load IPD bill record.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadLists(), loadRows(1)]).catch((error) => {
      setErrorMessage(error.message || "Failed to load IPD bill report.");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patientOptions = useMemo(
    () => [{ value: "", label: "Select Patient" }, ...patients.map((patient) => ({ value: String(patient.id), label: `${patient.full_name} (${patient.patient_code})` }))],
    [patients]
  );

  const doctorOptions = useMemo(
    () => [{ value: "", label: "Select Doctor" }, ...doctors.map((doctor) => ({ value: String(doctor.id), label: doctor.user?.full_name || doctor.full_name || doctor.doctor_code }))],
    [doctors]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => {
          const amount = Number(row.total_charges ?? 0);
          return {
            amount: sum.amount + amount,
            paid: sum.paid,
            due: sum.due + amount,
          };
        },
        { amount: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">IPD BILL RECORD</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="FILTER TYPE"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSelectedPatientId("");
              setSelectedDoctorId("");
              setSearch("");
            }}
            options={FILTER_TYPES.map((item) => ({ value: item, label: item }))}
            value={filterType}
          />
          {filterType === "By Patient" ? (
            <SelectField label="PATIENT" onChange={(event) => setSelectedPatientId(event.target.value)} options={patientOptions} value={selectedPatientId} />
          ) : null}
          {filterType === "By Doctor" ? (
            <SelectField label="DOCTOR" onChange={(event) => setSelectedDoctorId(event.target.value)} options={doctorOptions} value={selectedDoctorId} />
          ) : null}
          {filterType === "By Search" ? <TextField label="SEARCH" onChange={(event) => setSearch(event.target.value)} value={search} /> : null}
          <DateField label="FROM DATE" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="TO DATE" onChange={(event) => setToDate(event.target.value)} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[44px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => loadRows(1)}
              type="button"
            >
              {isLoading ? "Loading..." : "Generate Report"}
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
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">BILL NO</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">PATIENT</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">ADMIT STATUS</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DOCTOR</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">AMOUNT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">PAID</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">DUE</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="9">
                  Loading IPD bills...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => {
                const amount = Number(row.total_charges ?? 0);
                return (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{(page - 1) * 10 + index + 1}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.admission_code || row.id}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.patient?.full_name || "-"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.status || "-"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(row.admitted_at)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.doctor?.user?.full_name || "N/A"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(amount)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(0)}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(amount)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="9">
                  No IPD bills found for the selected filters.
                </td>
              </tr>
            )}
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="6">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">{money(totals.amount)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">{money(totals.paid)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">{money(totals.due)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-8 text-[#9aa7ad]">
        <button className="text-[18px] text-[#33424f] disabled:opacity-40" disabled={page <= 1} onClick={() => loadRows(page - 1)} type="button">‹</button>
        <div className="grid h-8 min-w-8 place-items-center rounded-full bg-[#2b79d0] px-3 text-[15px] text-white">{page}</div>
        <button className="text-[18px] text-[#33424f] disabled:opacity-40" disabled={page >= (meta.total_pages || 1)} onClick={() => loadRows(page + 1)} type="button">›</button>
      </div>
    </section>
  );
}
