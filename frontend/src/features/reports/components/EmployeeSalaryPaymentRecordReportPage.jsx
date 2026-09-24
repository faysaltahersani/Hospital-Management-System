import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const filterTypes = ["All", "By Employee", "By Date", "By Search"];

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SelectField({ label, onChange, options, defaultValue, value, widthClass = "w-[182px]" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block text-[12px] text-[#5a6775]">{label || "\u00A0"}</span>
      <select
        className="h-[40px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-8 text-[14px] text-[#1f2c33] outline-none"
        {...(value === undefined ? { defaultValue } : { onChange, value })}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 10px center",
        }}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="block w-[182px]">
      <span className="mb-1 block text-[12px] text-[#5a6775]">Search</span>
      <input
        className="h-[40px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[14px] text-[#1f2c33] outline-none placeholder:text-[#5d6a72]"
        onChange={onChange}
        placeholder="Search Here"
        type="text"
        value={value}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block w-[182px]">
      <span className="mb-1 block text-[12px] text-[#5a6775]">{label}</span>
      <input
        className="h-[40px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[14px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

function PrintToolbar() {
  return (
    <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-5 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
      <button className="text-[#2d2d2d]" onClick={() => window.print()} type="button">
        <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
        </svg>
      </button>
    </div>
  );
}

function ActionIcon({ children, tone, title, onClick }) {
  return (
    <button className={tone} onClick={onClick} title={title} type="button">
      {children}
    </button>
  );
}

export function EmployeeSalaryPaymentRecordReportPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 1, has_next: false, has_prev: false });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLists = async () => {
      try {
        const res = await apiRequest("/hr/employees?limit=100");
        setEmployees(res.data || []);
      } catch {
        /* ignore */
      }
    };
    loadLists();
  }, []);

  const buildQuery = (p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: "10" });
    if (fromDate && toDate) {
      params.set("from", `${fromDate}T00:00:00.000Z`);
      params.set("to", `${toDate}T23:59:59.999Z`);
    }
    if (filterType === "By Employee" && employeeFilter) {
      params.set("employee_id", employeeFilter);
    }
    if (filterType === "By Search" && searchText.trim()) {
      params.set("search", searchText.trim());
    }
    return params.toString();
  };

  const load = async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/hr/payrolls?${buildQuery(p)}`);
      setRecords(res.data || []);
      const pagination = res.meta?.pagination || {};
      setMeta({
        page: pagination.page || p,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        total_pages: pagination.total_pages || 1,
        has_next: Boolean(pagination.has_next),
        has_prev: Boolean(pagination.has_prev),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () =>
      records.map((r, idx) => ({
        id: r.id,
        sl: (meta.page - 1) * meta.limit + idx + 1,
        transactionCode: r.payroll_code || r.transaction_code || `PAY-${r.id}`,
        employeeId: String(r.employee_id || r.employee?.id || ""),
        employeeCode: r.employee?.employee_code || "—",
        employeeName: r.employee?.full_name || r.employee?.user?.full_name || "N/A",
        note: r.notes || "—",
        date: formatDate(r.paid_at || r.createdAt),
        dateRaw: r.paid_at || r.createdAt,
        payAmount: parseFloat(r.net_pay ?? r.gross_pay ?? r.basic_salary ?? 0),
      })),
    [records, meta.page, meta.limit]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const pDate = formatDateInput(row.dateRaw);
      if (fromDate && pDate < fromDate) return false;
      if (toDate && pDate > toDate) return false;

      if (filterType === "By Employee" && employeeFilter) {
        if (String(row.employeeId) !== String(employeeFilter)) return false;
      }

      if (filterType === "By Search" && searchText.trim()) {
        const term = searchText.trim().toLowerCase();
        const code = String(row.transactionCode || "").toLowerCase();
        const empCode = String(row.employeeCode || "").toLowerCase();
        const empName = String(row.employeeName || "").toLowerCase();
        const note = String(row.note || "").toLowerCase();
        const amt = String(row.payAmount || "");
        const matches = [code, empCode, empName, note, amt].some((str) => str && str.includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, employeeFilter, searchText]);

  const grandTotal = useMemo(
    () => filteredRows.reduce((acc, row) => acc + row.payAmount, 0),
    [filteredRows]
  );

  const handleReport = () => {
    setPage(1);
    load(1);
  };

  const handlePrintPayslip = async (row) => {
    await printHtml(
      `
      <!-- Employee Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Transaction Code :</strong> ${row.transactionCode}</div>
          <div><strong>Payment Date :</strong> ${row.date}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Employee Code :</strong> ${row.employeeCode}</div>
          <div><strong>Employee Name :</strong> ${row.employeeName}</div>
        </div>
        ${row.note ? `<div><strong>Note :</strong> ${row.note}</div>` : ""}
      </div>

      <!-- Salary Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">Description</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">Gross Salary</td>
            <td style="padding: 7px 10px; text-align: right;">${row.grossSalary ? row.grossSalary.toFixed(2) : "—"}</td>
          </tr>
          ${row.deductions ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 7px 10px; color: #d32f2f;">Deductions</td><td style="padding: 7px 10px; text-align: right; color: #d32f2f;">- ${row.deductions.toFixed(2)}</td></tr>` : ""}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td style="padding: 8px 10px;">Net Amount Paid</td>
            <td style="padding: 8px 10px; text-align: right;">${row.payAmount.toFixed(2)} TK</td>
          </tr>
        </tfoot>
      </table>
      `,
      "EMPLOYEE SALARY PAYSLIP"
    );
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete(
      "Delete Salary Record?",
      `Salary payment record "${row.transactionCode}" will be permanently deleted.`
    );
    if (!confirmed) return;
    try {
      await apiRequest(`/hr/payrolls/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Salary record "${row.transactionCode}" deleted successfully.`);
      load(1);
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete salary record.");
    }
  };

  const colSpan = 8;

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-7 text-[18px] font-medium text-[#1f2c33]">EMPLOYEE SALARY PAYMENT RECORD</div>

        {error ? (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-end gap-5">
          <SelectField
            label="Filter Type"
            onChange={(e) => {
              setFilterType(e.target.value);
              setEmployeeFilter("");
              setSearchText("");
            }}
            options={filterTypes}
            value={filterType}
          />

          {filterType === "By Employee" ? (
            <SelectField
              label="Employee"
              onChange={(e) => setEmployeeFilter(e.target.value)}
              options={[
                { value: "", label: "Select Employee" },
                ...employees.map((emp) => ({
                  value: String(emp.id),
                  label: emp.user?.full_name || emp.employee_code || `Employee #${emp.id}`,
                })),
              ]}
              value={employeeFilter}
            />
          ) : null}

          {filterType === "By Search" ? (
            <SearchField onChange={(e) => setSearchText(e.target.value)} value={searchText} />
          ) : null}

          <DateField label="From Date" onChange={(e) => setFromDate(e.target.value)} value={fromDate} />
          <DateField label="To Date" onChange={(e) => setToDate(e.target.value)} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[40px] rounded-[3px] bg-black px-8 text-[14px] font-medium text-white disabled:opacity-60"
              disabled={loading}
              onClick={handleReport}
              type="button"
            >
              {loading ? "LOADING…" : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <PrintToolbar />

      <div className="mt-9 overflow-x-auto px-3">
        <table className="min-w-full border-collapse text-left text-[12px] text-black">
          <thead>
            <tr className="bg-[#c9c9c9]">
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Transaction Code</th>
              <th className="border border-black px-1 py-1 font-normal">Employee Code</th>
              <th className="border border-black px-1 py-1 font-normal">Employee Name</th>
              <th className="border border-black px-1 py-1 font-normal">Note</th>
              <th className="border border-black px-1 py-1 font-normal">Date</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Pay Amount</th>
              <th className="border border-black px-1 py-1 font-normal text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#6b7a83]" colSpan={colSpan}>
                  Loading…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#6b7a83]" colSpan={colSpan}>
                  No records found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-1 py-0.5">{row.sl}</td>
                  <td className="border border-black px-1 py-0.5">{row.transactionCode}</td>
                  <td className="border border-black px-1 py-0.5">{row.employeeCode}</td>
                  <td className="border border-black px-1 py-0.5">{row.employeeName}</td>
                  <td className="border border-black px-1 py-0.5">{row.note}</td>
                  <td className="border border-black px-1 py-0.5">{row.date}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{row.payAmount.toFixed(2)}</td>
                  <td className="border border-black px-1 py-0.5">
                    <div className="flex items-center justify-center gap-4">
                      <ActionIcon onClick={() => handlePrintPayslip(row)} title="Print Payslip" tone="text-[#1976d2]">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M4 1.5h7l3 3V16.5H4v-15Zm7 1.8V5h1.7L11 3.3ZM6 7h6v1.2H6V7Zm0 2.5h6v1.2H6V9.5Zm0 2.5h4.5v1.2H6V12Z" />
                        </svg>
                      </ActionIcon>
                      <ActionIcon onClick={() => navigate(`/hr-payroll/salary-payment-entry?id=${row.id}`)} title="Edit Salary" tone="text-[#188a2f]">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
                        </svg>
                      </ActionIcon>
                      <ActionIcon onClick={() => handleDelete(row)} title="Delete" tone="text-[#f57c00]">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
                        </svg>
                      </ActionIcon>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && filteredRows.length > 0 ? (
              <tr>
                <td className="border border-black px-1 py-0.5">&nbsp;</td>
                <td className="border border-black px-1 py-0.5 text-right" colSpan={5}>
                  Grand Total
                </td>
                <td className="border border-black px-1 py-0.5 text-right">{grandTotal.toFixed(2)}</td>
                <td className="border border-black px-1 py-0.5">&nbsp;</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-6 text-[12px] text-[#63727b]">
        <button className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2" type="button">
          {meta.limit}
        </button>
        <button
          disabled={!meta.has_prev}
          onClick={() => {
            const next = Math.max(page - 1, 1);
            setPage(next);
            load(next);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="grid h-7 w-7 place-items-center rounded-full bg-[#1f73de] text-white" type="button">
          {meta.page}
        </button>
        <button
          disabled={!meta.has_next}
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next);
          }}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
