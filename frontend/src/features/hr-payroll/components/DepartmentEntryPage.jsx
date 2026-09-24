import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const initialForm = {
  name: "",
  description: "",
};

function TextInput({ label, name, onChange, placeholder, value }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.02em] text-[#627381]">{label}</span>
      <input
        className="h-11 w-full rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function EmptyState({ message }) {
  return <div className="grid min-h-[160px] place-items-center px-4 text-[16px] italic text-[#67758a]">{message}</div>;
}

export function DepartmentEntryPage() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadDepartments = async (nextSearch = search) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      const response = await apiRequest(`/departments?${params.toString()}`);
      setDepartments(response.data || []);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to load departments." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFeedback({ type: "error", message: "Department name is required." });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };

      if (editingId) {
        await apiRequest(`/departments/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Department updated successfully." });
      } else {
        await apiRequest("/departments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Department created successfully." });
      }

      resetForm();
      await loadDepartments();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to save department." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setForm({
      name: department.name || "",
      description: department.description || "",
    });
    setFeedback({ type: "", message: "" });
  };

  const handleDelete = async (departmentId) => {
    const isConfirmed = await confirmDelete(
      "Delete Department?",
      "Are you sure you want to delete this department?"
    );
    if (!isConfirmed) return;

    try {
      await apiRequest(`/departments/${departmentId}`, { method: "DELETE" });
      showSuccess("Deleted!", "Department deleted successfully.");
      setFeedback({ type: "success", message: "Department deleted successfully." });
      if (editingId === departmentId) resetForm();
      await loadDepartments();
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete department.");
      setFeedback({ type: "error", message: error.message || "Failed to delete department." });
    }
  };

  const summary = useMemo(() => `${departments.length} department${departments.length === 1 ? "" : "s"}`, [departments]);

  return (
    <section className="mx-auto max-w-[1280px] rounded-[8px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.92fr)_minmax(420px,1.08fr)]">
        <div className="rounded-[8px] border border-[#e2e8ee] bg-[#fbfdff] p-5">
          <div className="mb-5 rounded-[6px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">
            {editingId ? "UPDATE DEPARTMENT" : "DEPARTMENT ENTRY"}
          </div>

          {feedback.message ? (
            <div
              className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
                feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="space-y-4">
            <TextInput label="Name" name="name" onChange={handleChange} placeholder="Department name" value={form.name} />
            <TextInput
              label="Description"
              name="description"
              onChange={handleChange}
              placeholder="Optional description"
              value={form.description}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="h-11 rounded-[4px] border border-[#7fb1ff] bg-white text-[13px] font-semibold text-[#119b1c] transition hover:bg-[#f5fbff] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSubmit}
              type="button"
            >
              {isSaving ? "SAVING…" : editingId ? "UPDATE" : "ENTRY"}
            </button>
            <button
              className="h-11 rounded-[4px] border border-[#ff6767] bg-white text-[13px] font-semibold text-[#ff2f2f] transition hover:bg-[#fff7f7]"
              onClick={resetForm}
              type="button"
            >
              RESET
            </button>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#e2e8ee] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.05)]">
          <div className="rounded-t-[8px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">DEPARTMENT LIST</div>

          <div className="flex flex-col gap-3 border-b border-[#e5ebef] px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-[13px] text-[#5b6872]">{summary}</div>
            <div className="flex gap-3">
              <input
                className="h-10 min-w-[220px] rounded-[4px] border border-[#d5dde3] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none transition focus:border-[#86a9ff] focus:bg-white"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search departments"
                type="text"
                value={search}
              />
              <button
                className="h-10 rounded-[4px] bg-black px-4 text-[12px] font-semibold text-white"
                onClick={() => loadDepartments(search)}
                type="button"
              >
                SEARCH
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[13px] text-[#1f2c33]">
              <thead>
                <tr className="border-b border-[#e5ebef] bg-[#fbfdff]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#67758a]" colSpan="4">
                      Loading…
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      <EmptyState message="No departments found." />
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <tr className="border-b border-[#eef2f5]" key={department.id}>
                      <td className="px-4 py-3">{department.name}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#4d5c68]">{department.code || "Auto"}</td>
                      <td className="px-4 py-3 text-[#55646f]">{department.description || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-[4px] border border-[#8ec5ff] px-3 py-1 text-[12px] font-medium text-[#1f73de]"
                            onClick={() => handleEdit(department)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-[4px] border border-[#ff9d9d] px-3 py-1 text-[12px] font-medium text-[#d64545]"
                            onClick={() => handleDelete(department.id)}
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
      </div>
    </section>
  );
}
