import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const BRANCH_TYPE = "branch";

function slugify(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `branch_${Date.now()}`;
}

function ActionButton({ children, onClick, tone = "default" }) {
  const classes =
    tone === "danger"
      ? "border-[#ff9d9d] text-[#d64545]"
      : "border-[#8ec5ff] text-[#1f73de]";

  return (
    <button className={`rounded-[4px] border px-3 py-1 text-[12px] font-medium ${classes}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function TextField({ label, name, onChange, placeholder, value }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-[#5b6470]">{label}</span>
      <input
        className="h-[48px] w-full border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function getUpdatedBy(row) {
  if (row.updater?.full_name) return row.updater.full_name;
  if (row.updated_by) return row.updated_by;
  const created = new Date(row.createdAt || row.created_at || 0).getTime();
  const updated = new Date(row.updatedAt || row.updated_at || 0).getTime();
  if (updated && created && updated - created > 1000) {
    return "Admin";
  }
  return "N/A";
}

export function BranchManagePage() {
  const [form, setForm] = useState({ branchName: "", description: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadItems = async (targetPage = page, searchValue = search) => {
    setIsLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const params = new URLSearchParams({
        type: BRANCH_TYPE,
        page: String(targetPage),
        limit: String(limit),
      });
      if (searchValue.trim()) params.set("search", searchValue.trim());
      const response = await apiRequest(`/settings/master-options?${params.toString()}`);
      setItems(response.data || []);
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalItems(pagination?.total ?? response.data?.length ?? 0);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setFeedback({ type: "error", message: error.message || "Failed to load branches." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const csvRows = useMemo(
    () => [
      ["SL", "BRANCH NAME", "DESCRIPTION"],
      ...items.map((item, index) => [(page - 1) * limit + index + 1, item.label || "", item.description || ""]),
    ],
    [items, page, limit]
  );

  const exportCsv = () => {
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "branches.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm({ branchName: "", description: "" });
    setEditingItem(null);
  };

  const handleSave = async () => {
    const branchName = form.branchName.trim();
    if (!branchName) {
      setFeedback({ type: "error", message: "Branch name is required." });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = {
        type: BRANCH_TYPE,
        code: slugify(branchName),
        label: branchName,
        description: form.description.trim() || null,
      };

      if (editingItem) {
        await apiRequest(`/settings/master-options/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Branch updated successfully." });
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback({ type: "success", message: "Branch created successfully." });
      }

      resetForm();
      await loadItems(editingItem ? page : 1, search);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to save branch." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      branchName: item.label || "",
      description: item.description || "",
    });
    setFeedback({ type: "", message: "" });
  };

  const handleDelete = async (item) => {
    const isConfirmed = await confirmDelete(
      "Delete Branch?",
      `Are you sure you want to delete branch "${item.label}"?`
    );
    if (!isConfirmed) return;

    try {
      await apiRequest(`/settings/master-options/${item.id}`, { method: "DELETE" });
      showSuccess("Deleted!", "Branch deleted successfully.");
      if (editingItem?.id === item.id) {
        resetForm();
      }
      setFeedback({ type: "success", message: "Branch deleted successfully." });
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadItems(nextPage, search);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete branch.");
      setFeedback({ type: "error", message: error.message || "Failed to delete branch." });
    }
  };

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, totalItems);

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {feedback.message ? (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-[366px_minmax(0,1fr)] gap-11 max-lg:grid-cols-1">
        <div>
          <div className="mb-5 rounded-[4px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">
            BRANCH MANAGE
          </div>

          <TextField label="BRANCH NAME" name="branchName" onChange={handleChange} value={form.branchName} />

          <div className="mt-4">
            <label className="block">
              <textarea
                className="min-h-[84px] w-full rounded-[6px] border border-[#d7e3ec] bg-white px-3 py-2 text-[15px] text-[#55606a] outline-none placeholder:text-[#7d858d]"
                name="description"
                onChange={handleChange}
                placeholder="Description"
                value={form.description}
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <button
              className="h-[36px] rounded-[4px] border border-[#7fb1ff] bg-white text-[12px] font-semibold text-[#119b1c] disabled:opacity-50"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "SAVING..." : editingItem ? "UPDATE" : "CREATE"}
            </button>
            <button
              className="h-[36px] rounded-[4px] border border-[#ff6767] bg-white text-[12px] font-semibold text-[#ff2f2f]"
              onClick={resetForm}
              type="button"
            >
              RESET
            </button>
          </div>
        </div>

        <div>
          <div className="mb-5 rounded-[4px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">
            BRANCH LIST
          </div>

          <div className="overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
            <div className="flex items-center justify-between gap-4 px-3 py-3 max-md:flex-col max-md:items-start">
              <button
                className="rounded-[4px] border border-[#89b8ff] bg-white px-4 py-2 text-[12px] font-medium text-[#1f73de]"
                onClick={exportCsv}
                type="button"
              >
                Export Data To CSV
              </button>

              <div className="flex items-center gap-3">
                <input
                  className="h-[36px] rounded-[4px] border border-[#d6dde2] px-3 text-[12px] text-[#34434a] outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadItems(1, search);
                  }}
                  placeholder="Search branches"
                  type="text"
                  value={search}
                />
                <button className="text-[#7d7f84]" onClick={() => loadItems(1, search)} type="button">
                  <svg aria-hidden="true" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 20 20">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="m13 13 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
                <thead>
                  <tr className="border-t border-b border-[#e0e6ea]">
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">ACTIONS</th>
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">SL</th>
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">BRANCH NAME</th>
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">DESCRIPTION</th>
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">CREATE BY</th>
                    <th className="px-2 py-3 font-semibold whitespace-nowrap">UPDATE BY</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-2 py-8 text-center text-[#67758a]" colSpan="6">
                        Loading…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td className="px-2 py-8 text-center text-[#67758a]" colSpan="6">
                        No records to display
                      </td>
                    </tr>
                  ) : (
                    items.map((row, index) => (
                      <tr className="border-b border-[#e0e6ea] bg-white odd:bg-[#fafcfd]" key={row.id}>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <ActionButton onClick={() => handleEdit(row)}>Edit</ActionButton>
                            <ActionButton onClick={() => handleDelete(row)} tone="danger">
                              Delete
                            </ActionButton>
                          </div>
                        </td>
                        <td className="px-2 py-3">{(page - 1) * limit + index + 1}</td>
                        <td className="px-2 py-3 whitespace-nowrap">{row.label}</td>
                        <td className="px-2 py-3">{row.description || ""}</td>
                        <td className="px-2 py-3 whitespace-nowrap">{row.creator?.full_name || row.created_by || "Admin"}</td>
                        <td className="px-2 py-3 whitespace-nowrap">{getUpdatedBy(row)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-5 border-t border-[#d7edf3] px-4 py-3 text-[13px] text-[#51606d] max-md:flex-wrap">
              <span>
                Rows per page <strong>{limit}</strong>
              </span>
              <span>
                {rangeStart}-{rangeEnd} of {totalItems}
              </span>
              <button
                className="text-[#9ea7af] disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => loadItems(page - 1, search)}
                type="button"
              >
                ‹
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f1ee] text-[18px] text-[#37474f]"
                type="button"
              >
                {page}
              </button>
              <button
                className="text-[#9ea7af] disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => loadItems(page + 1, search)}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
