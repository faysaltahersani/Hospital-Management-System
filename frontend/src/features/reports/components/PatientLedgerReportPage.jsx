import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block min-w-[260px]">
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className="h-[44px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-4 pr-10 text-[15px] text-[#1f2c33] outline-none"
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

export function PatientLedgerReportPage() {
  const [patients, setPatients] = useState([{ value: "", label: "SELECT PATIENT" }]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState({
    patient: null,
    opening_balance: 0,
    totals: { debit: 0, credit: 0, closing_balance: 0 },
    entries: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPatients = async () => {
    const response = await apiRequest("/patients?limit=100");
    const items = response.data || [];
    setPatients([
      { value: "", label: "SELECT PATIENT" },
      ...items.map((patient) => ({
        value: String(patient.id),
        label: `${patient.full_name} (${patient.patient_code})`,
      })),
    ]);
    if (!selectedPatient && items[0]?.id) {
      setSelectedPatient(String(items[0].id));
    }
  };

  const loadReport = async (patientId = selectedPatient, from = fromDate, to = toDate) => {
    if (!patientId) {
      setErrorMessage("Please select a patient.");
      return;
    }
    if (!from || !to) {
      setErrorMessage("Please select both from and to dates.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ patient_id: patientId, from, to });
      const response = await apiRequest(`/reports/patient-ledger?${params.toString()}`);
      setReport(
        response.data || {
          patient: null,
          opening_balance: 0,
          totals: { debit: 0, credit: 0, closing_balance: 0 },
          entries: [],
        }
      );
    } catch (error) {
      setReport({
        patient: null,
        opening_balance: 0,
        totals: { debit: 0, credit: 0, closing_balance: 0 },
        entries: [],
      });
      setErrorMessage(error.message || "Failed to load patient ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients().catch((error) => {
      setErrorMessage(error.message || "Failed to load patients.");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedPatient) {
      loadReport(selectedPatient, fromDate, toDate);
    }
  }, [selectedPatient]); // eslint-disable-line react-hooks/exhaustive-deps

  const csvRows = useMemo(
    () => [
      ["SL", "Date", "Particular", "Code", "Type", "Debit", "Credit", "Balance"],
      ...(report?.entries || []).map((entry, index) => [
        index + 1,
        formatDate(entry.date),
        entry.particular,
        entry.code,
        entry.type,
        money(entry.debit),
        money(entry.credit),
        money(entry.balance),
      ]),
    ],
    [report?.entries]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">PATIENT LEDGER</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="SELECT PATIENT"
            onChange={(event) => setSelectedPatient(event.target.value)}
            options={patients}
            value={selectedPatient}
          />
          <DateField label="FROM DATE" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="TO DATE" onChange={(event) => setToDate(event.target.value)} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[44px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => loadReport()}
              type="button"
            >
              {isLoading ? "Loading..." : "Report"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="flex items-center gap-5 text-[#2d2d2d]">
          <button onClick={() => window.print()} type="button">
            <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
            </svg>
          </button>
          <button
            disabled={!report.patient}
            onClick={() => downloadCsv(`patient-ledger-${report.patient?.patient_code || "report"}.csv`, csvRows)}
            type="button"
          >
            <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 3h2v10h3l-4 4-4-4h3V3Zm-6 16h14v2H5v-2Z" />
            </svg>
          </button>
        </div>
      </div>

      {report.patient ? (
        <div className="mt-4 rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-3 text-[13px] text-[#21343e] shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
          <div><strong>Patient:</strong> {report.patient.full_name || report.patient.name}</div>
          <div><strong>Code:</strong> {report.patient.patient_code || "-"}</div>
          <div><strong>Opening Balance:</strong> {money(report.opening_balance)}</div>
        </div>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">SL</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">DATE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">PARTICULAR</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">CODE</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">TYPE</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">DEBIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">CREDIT</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Opening Balance:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(report.opening_balance)}</td>
            </tr>

            {isLoading ? (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="8">
                  Loading patient ledger...
                </td>
              </tr>
            ) : (report?.entries || []).length ? (
              (report?.entries || []).map((entry, index) => (
                <tr key={entry.id}>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{index + 1}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{formatDate(entry.date)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{entry.particular}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{entry.code}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5">{entry.type}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(entry.debit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(entry.credit)}</td>
                  <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(entry.balance)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-[#1f2c33] px-2 py-8 text-center text-[#5f6b76]" colSpan="8">
                  No ledger entries found for the selected patient and date range.
                </td>
              </tr>
            )}

            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="4">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Total:</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(report.totals.debit)}</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(report.totals.credit)}</td>
            </tr>
            <tr className="bg-[#fafcfd]">
              <td className="border border-[#1f2c33] px-2 py-1.5">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5" colSpan="6">&nbsp;</td>
              <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">Closing Balance: {money(report.totals.closing_balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
