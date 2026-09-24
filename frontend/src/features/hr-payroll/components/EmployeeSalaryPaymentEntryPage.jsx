import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiRequest } from "../../../lib/api";

const today = new Date().toISOString().split("T")[0];
const currentYear = new Date().getFullYear();

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

const initialForm = {
  paid_at: today,
  employee_id: "",
  period_month: String(new Date().getMonth() + 1),
  period_year: String(currentYear),
  amount: "0",
  draft_amount: "",
  allowances: "0",
  deductions: "0",
  tax: "0",
  notes: "",
  account_id: "",
};

function Field({ children, label }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#627381]">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "h-[48px] w-full border-0 border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none";
}

function InlineField({ children, label }) {
  return (
    <label className="block">
      <div className="rounded-t-[4px] bg-[#f3f3f3] px-3 pt-1.5 text-[12px] text-[#627381]">{label}</div>
      {children}
    </label>
  );
}

export function EmployeeSalaryPaymentEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");

  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSavedCode, setLastSavedCode] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      try {
        const [employeeResponse, accountResponse] = await Promise.all([
          apiRequest("/hr/employees?limit=100"),
          apiRequest("/billing/accounts?limit=100"),
        ]);
        const rows = employeeResponse.data || [];
        const accountRows = accountResponse.data || [];
        setEmployees(rows);
        setAccounts(accountRows);

        if (editingId) {
          const payrollRes = await apiRequest(`/hr/payrolls/${editingId}`);
          const payroll = payrollRes.data || {};
          setForm({
            paid_at: payroll.paid_at ? payroll.paid_at.split("T")[0] : today,
            employee_id: String(payroll.employee_id || ""),
            period_month: String(payroll.period_month || new Date().getMonth() + 1),
            period_year: String(payroll.period_year || currentYear),
            amount: String(payroll.basic_salary || "0"),
            draft_amount: String(payroll.basic_salary || "0"),
            allowances: String(payroll.allowances || "0"),
            deductions: String(payroll.deductions || "0"),
            tax: String(payroll.tax || "0"),
            notes: payroll.notes || "",
            account_id: payroll.account_id ? String(payroll.account_id) : (accountRows[0] ? String(accountRows[0].id) : ""),
          });
          setLastSavedCode(payroll.payroll_code || payroll.transaction_code || `PAY-${payroll.id}`);
        } else if (rows.length > 0 || accountRows.length > 0) {
          setForm((current) => ({
            ...current,
            employee_id: current.employee_id || (rows[0] ? String(rows[0].id) : ""),
            draft_amount:
              current.draft_amount || (rows[0] ? String(Number(rows[0].basic_salary || 0)) : ""),
            account_id: current.account_id || (accountRows[0] ? String(accountRows[0].id) : ""),
          }));
        }
      } catch (error) {
        setFeedback({ type: "error", message: error.message || "Failed to load employees." });
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [editingId]);

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, index) => String(currentYear - index)).map((value) => ({ value, label: value })),
    []
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === form.employee_id) || null,
    [employees, form.employee_id]
  );

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: String(account.id),
      label: account.name,
    }));
  }, [accounts]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleEmployeeChange = (event) => {
    const nextEmployeeId = event.target.value;
    const employee = employees.find((item) => String(item.id) === nextEmployeeId);
    setForm((current) => ({
      ...current,
      employee_id: nextEmployeeId,
      draft_amount: employee ? String(Number(employee.basic_salary || 0)) : current.draft_amount,
    }));
  };

  const resetForm = () => {
    setForm((current) => ({
      ...initialForm,
      employee_id: current.employee_id,
      draft_amount: selectedEmployee ? String(Number(selectedEmployee.basic_salary || 0)) : "",
      account_id: current.account_id,
      allowances: "0",
      deductions: "0",
      tax: "0",
    }));
    setLastSavedCode("");
  };

  const handleAddAmount = () => {
    setForm((current) => ({
      ...current,
      amount: String(Number(current.draft_amount || 0)),
    }));
  };

  const handleSave = async () => {
    if (!form.employee_id) {
      setFeedback({ type: "error", message: "Employee is required." });
      return;
    }
    if (!form.account_id) {
      setFeedback({ type: "error", message: "Account is required." });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    const basicSalary = Number(form.amount) || Number(form.draft_amount) || 0;
    const payload = {
      employee_id: Number(form.employee_id),
      account_id: Number(form.account_id),
      period_year: Number(form.period_year),
      period_month: Number(form.period_month),
      basic_salary: basicSalary,
      allowances: Number(form.allowances) || 0,
      deductions: Number(form.deductions) || 0,
      tax: Number(form.tax) || 0,
      status: "paid",
      paid_at: `${form.paid_at}T00:00:00.000Z`,
      notes: form.notes.trim() || null,
    };

    try {
      let response;
      if (editingId) {
        response = await apiRequest(`/hr/payrolls/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            account_id: payload.account_id,
            basic_salary: payload.basic_salary,
            allowances: payload.allowances,
            deductions: payload.deductions,
            tax: payload.tax,
            status: payload.status,
            paid_at: payload.paid_at,
            notes: payload.notes,
          }),
        });
      } else {
        const existingResponse = await apiRequest(
          `/hr/payrolls?employee_id=${payload.employee_id}&period_year=${payload.period_year}&period_month=${payload.period_month}&limit=1`
        );
        const existing = existingResponse.data?.[0] || null;

        response = existing
          ? await apiRequest(`/hr/payrolls/${existing.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                account_id: payload.account_id,
                basic_salary: payload.basic_salary,
                allowances: payload.allowances,
                deductions: payload.deductions,
                tax: payload.tax,
                status: payload.status,
                paid_at: payload.paid_at,
                notes: payload.notes,
              }),
            })
          : await apiRequest("/hr/payrolls", {
              method: "POST",
              body: JSON.stringify(payload),
            });
      }

      setLastSavedCode(response.data?.payroll_code || response.data?.transaction_code || `PAY-${response.data?.id || ""}`);
      setFeedback({ type: "success", message: editingId ? "Salary payment updated successfully." : "Salary payment saved successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to save salary payment." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[8px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">Employee Salary Payment Entry</div>

      {feedback.message ? (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        <InlineField label="Created Date">
          <input className={inputClass()} name="paid_at" onChange={handleChange} type="date" value={form.paid_at} />
        </InlineField>
        <InlineField label="Transaction Code">
          <div className={`${inputClass()} grid items-center text-[#1f2c33]`}>
            {lastSavedCode || "Auto-generated after save"}
          </div>
        </InlineField>
        <InlineField label="Pay Amount">
          <input className={inputClass()} name="amount" onChange={handleChange} type="number" value={form.amount} />
        </InlineField>
        <InlineField label="Note">
          <input className={inputClass()} name="notes" onChange={handleChange} type="text" value={form.notes} />
        </InlineField>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3 sm:grid-cols-2">
        <InlineField label="Allowances">
          <input className={inputClass()} name="allowances" onChange={handleChange} type="number" value={form.allowances} />
        </InlineField>
        <InlineField label="Deductions">
          <input className={inputClass()} name="deductions" onChange={handleChange} type="number" value={form.deductions} />
        </InlineField>
        <InlineField label="Tax">
          <input className={inputClass()} name="tax" onChange={handleChange} type="number" value={form.tax} />
        </InlineField>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.45fr_0.95fr_0.95fr_0.95fr_0.95fr_88px] md:grid-cols-2">
        <InlineField label="Employee">
          <select className={inputClass()} name="employee_id" onChange={handleEmployeeChange} value={form.employee_id}>
            <option value="">Select Employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={String(employee.id)}>
                {employee.full_name} ({employee.employee_code})
              </option>
            ))}
          </select>
        </InlineField>
        <InlineField label="Account">
          <select className={inputClass()} name="account_id" onChange={handleChange} value={form.account_id}>
            <option value="">Select Account</option>
            {accountOptions.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
        </InlineField>
        <InlineField label="Month">
          <select className={inputClass()} name="period_month" onChange={handleChange} value={form.period_month}>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </InlineField>
        <InlineField label="Year">
          <select className={inputClass()} name="period_year" onChange={handleChange} value={form.period_year}>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </InlineField>
        <InlineField label="Amount">
          <input className={inputClass()} name="draft_amount" onChange={handleChange} type="number" value={form.draft_amount} />
        </InlineField>
        <div className="grid items-end">
          <button
            className="h-[36px] rounded-[4px] border border-[#7faeff] text-[12px] font-semibold uppercase text-[#2b6fe8] transition hover:bg-[#f5f9ff]"
            onClick={handleAddAmount}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          className="h-[36px] rounded-[3px] border border-[#8fd08f] text-[12px] font-semibold uppercase text-[#2f8533] transition hover:bg-[#f5fff5] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || isLoading}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving…" : "Save Salary"}
        </button>
        <button
          className="h-[36px] rounded-[3px] border border-[#ff6767] text-[12px] font-medium uppercase text-[#ff3b30] transition hover:bg-[#fff7f7]"
          onClick={resetForm}
          type="button"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
