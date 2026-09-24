import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentDate = new Date();
const currentMonth = String(currentDate.getMonth() + 1);
const currentYear = String(currentDate.getFullYear());

function SelectField({ label, onChange, options, value, widthClass = "w-full" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block text-[12px] text-[#6d7880]">{label}</span>
      <select
        className="h-[46px] w-full appearance-none rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[15px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
        onChange={onChange}
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

export function SalarySheetPage() {
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [periodMonth, setPeriodMonth] = useState(currentMonth);
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await apiRequest("/hr/employees?limit=100");
        const rows = response.data || [];
        setEmployees(rows);
        if (rows.length > 0) {
          setEmployeeId(String(rows[0].id));
        }
      } catch (err) {
        setError(err.message || "Failed to load employees.");
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const loadPayrolls = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "100",
        period_month: periodMonth,
        period_year: periodYear,
      });
      if (employeeId) params.set("employee_id", employeeId);
      const response = await apiRequest(`/hr/payrolls?${params.toString()}`);
      setPayrolls(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load salary sheet.");
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadPayrolls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, periodMonth, periodYear]);

  const yearOptions = useMemo(() => {
    const baseYear = Number(currentYear);
    return Array.from({ length: 5 }, (_, index) => {
      const value = String(baseYear - index);
      return { value, label: value };
    });
  }, []);

  const employeeOptions = useMemo(
    () => [
      { value: "", label: "Select Employee" },
      ...employees.map((employee) => ({
        value: String(employee.id),
        label: `${employee.full_name} (${employee.employee_code})`,
      })),
    ],
    [employees]
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === employeeId) || null,
    [employees, employeeId]
  );

  const rows = useMemo(() => {
    if (payrolls.length > 0) {
      return payrolls.map((payroll, index) => {
        const paidAmount = payroll.status === "paid" ? Number(payroll.net_pay || 0) : 0;
        return {
          id: payroll.id,
          sl: index + 1,
          code: payroll.employee?.employee_code || "—",
          name: payroll.employee?.full_name || "N/A",
          payableMonthly: Number(payroll.net_pay || 0),
          paymentAmount: paidAmount,
          balance: Number(payroll.net_pay || 0) - paidAmount,
          payrollCode: payroll.payroll_code || `PAY-${payroll.id}`,
        };
      });
    }

    if (selectedEmployee) {
      const salary = Number(selectedEmployee.basic_salary || 0);
      return [
        {
          id: `draft-${selectedEmployee.id}`,
          sl: 1,
          code: selectedEmployee.employee_code,
          name: selectedEmployee.full_name,
          payableMonthly: salary,
          paymentAmount: 0,
          balance: salary,
          payrollCode: "Not generated yet",
        },
      ];
    }

    return [];
  }, [payrolls, selectedEmployee]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (accumulator, row) => ({
          payableMonthly: accumulator.payableMonthly + row.payableMonthly,
          paymentAmount: accumulator.paymentAmount + row.paymentAmount,
          balance: accumulator.balance + row.balance,
        }),
        { payableMonthly: 0, paymentAmount: 0, balance: 0 }
      ),
    [rows]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-7 text-[18px] font-medium text-[#1f2c33]">SALARY SHEET</h1>

        {error ? <div className="mb-4 rounded-[4px] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#d64545]">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-[minmax(220px,1.4fr)_180px_180px_180px]">
          <SelectField label="Select Employee" onChange={(event) => setEmployeeId(event.target.value)} options={employeeOptions} value={employeeId} />
          <SelectField label="Month" onChange={(event) => setPeriodMonth(event.target.value)} options={monthOptions} value={periodMonth} />
          <SelectField label="Year" onChange={(event) => setPeriodYear(event.target.value)} options={yearOptions} value={periodYear} />
          <div className="flex items-end">
            <button
              className="h-[46px] w-full rounded-[4px] bg-black px-6 text-[13px] font-semibold uppercase text-white"
              onClick={loadPayrolls}
              type="button"
            >
              Report
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <button className="text-[#2d2d2d]" onClick={() => window.print()} type="button">
          <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
          </svg>
        </button>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              {["SL", "Employee Code", "Name", "Payable Monthly", "Payment Amount", "Balance", "Payroll Code"].map((header) => (
                <th className="border border-black px-1 py-1 font-normal" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="border border-black px-1 py-6 text-center text-[#67758a]" colSpan="7">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="border border-black px-1 py-6 text-center text-[#67758a]" colSpan="7">
                  No salary rows found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-1 py-0.5">{row.sl}</td>
                  <td className="border border-black px-1 py-0.5">{row.code}</td>
                  <td className="border border-black px-1 py-0.5">{row.name}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{row.payableMonthly.toFixed(2)}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{row.paymentAmount.toFixed(2)}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{row.balance.toFixed(2)}</td>
                  <td className="border border-black px-1 py-0.5">{row.payrollCode}</td>
                </tr>
              ))
            )}
            {rows.length > 0 ? (
              <tr>
                <td className="border border-black px-1 py-0.5" />
                <td className="border border-black px-1 py-0.5 text-right" colSpan="2">
                  Grand Total
                </td>
                <td className="border border-black px-1 py-0.5 text-right">{totals.payableMonthly.toFixed(2)}</td>
                <td className="border border-black px-1 py-0.5 text-right">{totals.paymentAmount.toFixed(2)}</td>
                <td className="border border-black px-1 py-0.5 text-right">{totals.balance.toFixed(2)}</td>
                <td className="border border-black px-1 py-0.5" />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
