import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function SelectField({ label, onChange, options, value, widthClass = "min-w-[240px]" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block px-3 pt-2 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className="h-[40px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#1f2c33] outline-none"
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
        className="h-[40px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

export function ReferralPersonLedgerReportPage() {
  const [personOptions, setPersonOptions] = useState([{ value: "", label: "Select Referral Person" }]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput(firstDayOfMonth));
  const [toDate, setToDate] = useState(formatDateInput(today));
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    apiRequest("/referrals/persons?limit=100&is_active=true")
      .then((res) => {
        const persons = res.data || res.items || [];
        setPersonOptions([
          { value: "", label: "Select Referral Person" },
          ...(persons.map((p) => ({
            value: String(p.id),
            label: `${p.name} (${p.referral_person_code || p.code || "REF"})`,
          }))),
        ]);
      })
      .catch(() => {});
  }, []);

  const loadReport = async () => {
    if (!selectedPerson) {
      setErrorMessage("Please select a referral person.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ person_id: selectedPerson });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await apiRequest(`/reports/referral-person-ledger?${params.toString()}`);
      setReport(res.data || null);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load referral person ledger.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">REFERRAL PERSON LEDGER</div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5">
          <SelectField
            label="SELECT REFERRAL PERSON"
            onChange={(e) => setSelectedPerson(e.target.value)}
            options={personOptions}
            value={selectedPerson}
          />
          <DateField
            label="FROM DATE"
            onChange={(e) => setFromDate(e.target.value)}
            value={fromDate}
          />
          <DateField
            label="TO DATE"
            onChange={(e) => setToDate(e.target.value)}
            value={toDate}
          />
          <div className="flex items-end">
            <button
              className="h-[40px] w-full rounded-[4px] bg-black px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={loadReport}
              type="button"
            >
              {isLoading ? "Loading..." : "Report"}
            </button>
          </div>
        </div>
      </div>

      {report ? (
        <>
          <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] text-[#1f2c33]">
                <span className="font-medium">{report.person?.name}</span>
                {report.person?.referral_person_code ? (
                  <span className="ml-2 text-[#5a6775]">({report.person.referral_person_code})</span>
                ) : null}
              </div>
              <button className="text-[#2d2d2d]" onClick={() => window.print()} type="button">
                <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
              <thead className="bg-[#eef3f6]">
                <tr>
                  <th className="border border-black px-1 py-1 font-normal">SL</th>
                  <th className="border border-black px-1 py-1 font-normal">DATE</th>
                  <th className="border border-black px-1 py-1 font-normal">BILL CODE</th>
                  <th className="border border-black px-1 py-1 font-normal">TYPE</th>
                  <th className="border border-black px-1 py-1 font-normal">BILL NO</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">BILL AMT</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">COMM%</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">COMMISSION</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">PAID</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">DUE</th>
                  <th className="border border-black px-1 py-1 font-normal text-right">BALANCE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-1 py-1" colSpan="10">
                    Opening Balance
                  </td>
                  <td className="border border-black px-1 py-1 text-right font-medium">
                    {money(report.opening_balance)}
                  </td>
                </tr>
                {report.entries?.length ? (
                  report.entries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td className="border border-black px-1 py-1">{index + 1}</td>
                      <td className="border border-black px-1 py-1">{formatDate(entry.date)}</td>
                      <td className="border border-black px-1 py-1">{entry.code}</td>
                      <td className="border border-black px-1 py-1">{entry.patient_type}</td>
                      <td className="border border-black px-1 py-1">{entry.bill_number}</td>
                      <td className="border border-black px-1 py-1 text-right">{money(entry.bill_amount)}</td>
                      <td className="border border-black px-1 py-1 text-right">{entry.commission_percent}%</td>
                      <td className="border border-black px-1 py-1 text-right">{money(entry.commission_amount)}</td>
                      <td className="border border-black px-1 py-1 text-right">{money(entry.paid_amount)}</td>
                      <td className="border border-black px-1 py-1 text-right">{money(entry.due_amount)}</td>
                      <td className="border border-black px-1 py-1 text-right">{money(entry.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-black px-1 py-6 text-center" colSpan="11">
                      No transactions found.
                    </td>
                  </tr>
                )}
                <tr className="bg-[#fafcfd] font-medium">
                  <td className="border border-black px-1 py-1" colSpan="7">TOTAL</td>
                  <td className="border border-black px-1 py-1 text-right">{money(report.totals?.commission_amount)}</td>
                  <td className="border border-black px-1 py-1 text-right">{money(report.totals?.paid_amount)}</td>
                  <td className="border border-black px-1 py-1 text-right">{money(report.totals?.due_amount)}</td>
                  <td className="border border-black px-1 py-1 text-right">{money(report.totals?.closing_balance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : !isLoading ? (
        <div className="mt-6 rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-8 text-center text-[13px] text-[#5f6b76] shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
          Select a referral person and click Report to view the ledger.
        </div>
      ) : null}
    </section>
  );
}
