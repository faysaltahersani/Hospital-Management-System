import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  joining_date: new Date().toISOString().split("T")[0],
  address: "",
  gender: "",
  department_id: "",
  designation: "",
  basic_salary: "",
  bank_account: "",
};

function FieldLabel({ children, required = false }) {
  return (
    <span className={`mb-1.5 block text-[12px] font-medium ${required ? "text-[#ff5a5a]" : "text-[#627381]"}`}>
      {children}
      {required ? " *" : ""}
    </span>
  );
}

function TextInput({ label, name, onChange, required = false, type = "text", value }) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        className="h-11 w-full rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
        name={name}
        onChange={onChange}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectInput({ label, name, onChange, options, value }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        className="h-11 w-full appearance-none rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
        name={name}
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

export function EmployeeEntryPage() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadLookups = async () => {
    const [employeeResponse, departmentResponse] = await Promise.all([
      apiRequest("/hr/employees?limit=100"),
      apiRequest("/departments?limit=100"),
    ]);
    setEmployees(employeeResponse.data || []);
    setDepartments(departmentResponse.data || []);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await loadLookups();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to load employees." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((employee) =>
      [
        employee.employee_code,
        employee.full_name,
        employee.email,
        employee.phone,
        employee.department?.name,
        employee.designation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [employees, search]);

  const departmentOptions = useMemo(
    () => [{ value: "", label: "Select Department" }, ...departments.map((item) => ({ value: String(item.id), label: item.name }))],
    [departments]
  );

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const buildPayload = () => ({
    full_name: form.full_name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    joining_date: form.joining_date,
    address: form.address.trim() || null,
    gender: form.gender || null,
    department_id: form.department_id ? Number(form.department_id) : null,
    designation: form.designation.trim() || null,
    basic_salary: Number(form.basic_salary || 0),
    bank_account: form.bank_account.trim() || null,
  });

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      setFeedback({ type: "error", message: "Employee name is required." });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = buildPayload();
      if (editingId) {
        await apiRequest(`/hr/employees/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Employee updated successfully." });
      } else {
        await apiRequest("/hr/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Employee created successfully." });
      }
      resetForm();
      await loadLookups();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to save employee." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingId(employee.id);
    setForm({
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      joining_date: employee.joining_date ? String(employee.joining_date).slice(0, 10) : initialForm.joining_date,
      address: employee.address || "",
      gender: employee.gender || "",
      department_id: employee.department_id ? String(employee.department_id) : "",
      designation: employee.designation || "",
      basic_salary: employee.basic_salary ? String(employee.basic_salary) : "",
      bank_account: employee.bank_account || "",
    });
    setFeedback({ type: "", message: "" });
  };

  const handleDelete = async (employeeId) => {
    const isConfirmed = await confirmDelete(
      "Delete Employee?",
      "Are you sure you want to delete this employee record?"
    );
    if (!isConfirmed) return;

    try {
      await apiRequest(`/hr/employees/${employeeId}`, { method: "DELETE" });
      showSuccess("Deleted!", "Employee deleted successfully.");
      setFeedback({ type: "success", message: "Employee deleted successfully." });
      if (editingId === employeeId) resetForm();
      await loadLookups();
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete employee.");
      setFeedback({ type: "error", message: error.message || "Failed to delete employee." });
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[8px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {feedback.message ? (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mb-5 rounded-[6px] bg-[#dff3f7] px-4 py-3 text-[16px] font-medium text-[#1f2c33]">
        {editingId ? "UPDATE EMPLOYEE" : "EMPLOYEE ENTRY"}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel required>Code</FieldLabel>
          <div className="grid h-11 items-center rounded-[4px] border border-[#d5dde3] bg-[#f0f4f7] px-3 text-[14px] text-[#51606b]">
            {editingId ? employees.find((item) => item.id === editingId)?.employee_code || "Saved employee" : "Auto-generated on save"}
          </div>
        </div>
        <TextInput label="Name" name="full_name" onChange={handleChange} required value={form.full_name} />
        <TextInput label="Email" name="email" onChange={handleChange} type="email" value={form.email} />
        <TextInput label="Phone" name="phone" onChange={handleChange} value={form.phone} />
        <TextInput label="Joining Date" name="joining_date" onChange={handleChange} type="date" value={form.joining_date} />
        <SelectInput
          label="Gender"
          name="gender"
          onChange={handleChange}
          options={[
            { value: "", label: "Select Gender" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
            { value: "other", label: "Other" },
          ]}
          value={form.gender}
        />
        <TextInput label="Designation" name="designation" onChange={handleChange} value={form.designation} />
        <TextInput label="Basic Salary" name="basic_salary" onChange={handleChange} type="number" value={form.basic_salary} />
        <SelectInput label="Select Department" name="department_id" onChange={handleChange} options={departmentOptions} value={form.department_id} />
        <TextInput label="Bank / ID Reference" name="bank_account" onChange={handleChange} value={form.bank_account} />
        <div className="md:col-span-2">
          <label className="block">
            <FieldLabel>Address</FieldLabel>
            <textarea
              className="min-h-[96px] w-full rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 py-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
              name="address"
              onChange={handleChange}
              value={form.address}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="h-11 rounded-[4px] border border-[#8fd08f] text-[13px] font-semibold text-[#2f8533] transition hover:bg-[#f5fff5] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={handleSubmit}
          type="button"
        >
          {isSaving ? "SAVING…" : editingId ? "UPDATE" : "ENTRY"}
        </button>
        <button
          className="h-11 rounded-[4px] border border-[#ff8f8f] text-[13px] font-semibold text-[#ff4d4f] transition hover:bg-[#fff7f7]"
          onClick={resetForm}
          type="button"
        >
          RESET
        </button>
      </div>

      <div className="mt-8 rounded-[6px] bg-[#dff3f7] px-4 py-3 text-[16px] font-medium text-[#1f2c33]">EMPLOYEE LIST</div>

      <div className="mt-4 rounded-[8px] border border-[#e2e8ee] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.05)]">
        <div className="flex flex-col gap-3 border-b border-[#e5ebef] px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-[13px] text-[#5b6872]">{filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}</div>
          <input
            className="h-10 min-w-[240px] rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees"
            type="text"
            value={search}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[13px] text-[#1f2c33]">
            <thead>
              <tr className="border-b border-[#e5ebef] bg-[#fbfdff]">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Salary</th>
                <th className="px-4 py-3 font-semibold">Joining Date</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#67758a]" colSpan="7">
                    Loading…
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[#67758a]" colSpan="7">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr className="border-b border-[#eef2f5]" key={employee.id}>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#4d5c68]">{employee.employee_code}</td>
                    <td className="px-4 py-3">{employee.full_name}</td>
                    <td className="px-4 py-3">{employee.department?.name || "—"}</td>
                    <td className="px-4 py-3">{employee.phone || "—"}</td>
                    <td className="px-4 py-3">{Number(employee.basic_salary || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{employee.joining_date ? String(employee.joining_date).slice(0, 10) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-[4px] border border-[#8ec5ff] px-3 py-1 text-[12px] font-medium text-[#1f73de]"
                          onClick={() => handleEdit(employee)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-[4px] border border-[#ff9d9d] px-3 py-1 text-[12px] font-medium text-[#d64545]"
                          onClick={() => handleDelete(employee.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
