import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, showError, showSuccess } from "../../../lib/alerts";

const ROWS_PER_PAGE = 10;
const SPECIALIZATION_TYPE = "doctor_specialization";

function ActionIcon({ children, label, onClick, tone, disabled = false }) {
  return (
    <button
      aria-label={label}
      className={`${tone} disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-[16px] w-[16px]" fill="currentColor" viewBox="0 0 18 18">
      <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-[16px] w-[16px]" fill="currentColor" viewBox="0 0 18 18">
      <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
    </svg>
  );
}

const createCode = (name, prefix) => {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return `${prefix}_${normalized || Date.now()}`.slice(0, 30);
};

const getPagination = (meta) =>
  meta?.pagination || {
    total: 0,
    page: 1,
    limit: ROWS_PER_PAGE,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };

const createDepartmentAdapter = () => ({
  toName: (item) => item.name,
  fetchPath: (page, search) => {
    const params = new URLSearchParams({ page: String(page), limit: String(ROWS_PER_PAGE) });
    if (search) params.set("search", search);
    return `/departments?${params.toString()}`;
  },
  createPayload: (name) => ({
    name,
    code: createCode(name, "DEPT"),
    is_active: true,
  }),
  updatePayload: (name) => ({
    name,
    code: createCode(name, "DEPT"),
  }),
  createPath: "/departments",
  updatePath: (id) => `/departments/${id}`,
  deletePath: (id) => `/departments/${id}`,
});

const createSpecializationAdapter = () => ({
  toName: (item) => item.label,
  fetchPath: (page, search) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(ROWS_PER_PAGE),
      type: SPECIALIZATION_TYPE,
    });
    if (search) params.set("search", search);
    return `/settings/master-options?${params.toString()}`;
  },
  createPayload: (name) => ({
    type: SPECIALIZATION_TYPE,
    code: createCode(name, "SPEC"),
    label: name,
    is_active: true,
  }),
  updatePayload: (name) => ({
    code: createCode(name, "SPEC"),
    label: name,
  }),
  createPath: "/settings/master-options",
  updatePath: (id) => `/settings/master-options/${id}`,
  deletePath: (id) => `/settings/master-options/${id}`,
});

const adapters = {
  department: createDepartmentAdapter(),
  specialization: createSpecializationAdapter(),
};

export function DoctorLookupManagePage({ entryTitle, listTitle, kind }) {
  const adapter = adapters[kind];
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const pagination = useMemo(() => getPagination(meta), [meta]);
  const startRow = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRow = Math.min(pagination.page * pagination.limit, pagination.total);

  const loadItems = async (nextPage = page, nextSearch = search) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(adapter.fetchPath(nextPage, nextSearch.trim()));
      setItems(response.data || []);
      setMeta(response.meta || null);
    } catch (error) {
      setErrorMessage(error.message || `Failed to load ${listTitle.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(page, search);
  }, [page]);

  const resetForm = () => {
    setName("");
    setEditingItem(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    setErrorMessage("");
    setSuccessMessage("");

    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await apiRequest(adapter.updatePath(editingItem.id), {
          method: "PATCH",
          body: JSON.stringify(adapter.updatePayload(trimmedName)),
        });
        setSuccessMessage("Record updated successfully.");
      } else {
        await apiRequest(adapter.createPath, {
          method: "POST",
          body: JSON.stringify(adapter.createPayload(trimmedName)),
        });
        setSuccessMessage("Record saved successfully.");
      }
      setName("");
      setEditingItem(null);
      await loadItems(page, search);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save record");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (item) => {
    const itemName = adapter.toName(item);
    const confirmed = await confirmEdit("Edit Record", `Do you want to edit "${itemName}"?`);
    if (!confirmed) return;
    setEditingItem(item);
    setName(adapter.toName(item));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    const itemName = adapter.toName(item);
    const confirmed = await confirmDelete("Delete Record?", `Are you sure you want to delete "${itemName}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(adapter.deletePath(item.id), { method: "DELETE" });
      showSuccess("Deleted!", `"${itemName}" has been deleted.`);
      if (editingItem?.id === item.id) resetForm();
      await loadItems(page, search);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete record");
    } finally {
      setIsSaving(false);
    }
  };


  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadItems(1, search);
  };

  const exportCsv = () => {
    const rows = [["Name"], ...items.map((item) => [adapter.toName(item)])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-list.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">
        <div>
          <div className="mb-4 rounded-[2px] bg-[#dff2f3] px-3 py-2 text-[10px] font-medium uppercase text-[#334148]">
            {entryTitle}
          </div>
          <div className="space-y-4">
            <input
              className="h-[40px] w-full border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 text-[14px] text-[#55606a] outline-none"
              onChange={(event) => setName(event.target.value)}
              placeholder="NAME"
              type="text"
              value={name}
            />
            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <button
                className="h-[30px] rounded-[3px] border border-[#7faeff] text-[11px] font-semibold uppercase text-[#24961b] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                onClick={handleSubmit}
                type="button"
              >
                {editingItem ? "Update" : "Entry"}
              </button>
              <button
                className="h-[30px] rounded-[3px] border border-[#ff6767] text-[11px] font-medium uppercase text-[#ff3b30]"
                onClick={resetForm}
                type="button"
              >
                Reset
              </button>
            </div>
            {errorMessage ? <p className="text-[12px] font-medium text-[#d93025]">{errorMessage}</p> : null}
            {successMessage ? <p className="text-[12px] font-medium text-[#188038]">{successMessage}</p> : null}
          </div>
        </div>

        <div>
          <div className="mb-4 rounded-[2px] bg-[#dff2f3] px-3 py-2 text-[10px] font-medium uppercase text-[#334148]">
            {listTitle}
          </div>

          <div className="rounded-[2px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2">
              <button
                className="rounded border border-[#9ec5ff] px-3 py-1.5 text-[11px] text-[#2574d9] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!items.length}
                onClick={exportCsv}
                type="button"
              >
                Export CSV
              </button>
              <div className="flex items-center gap-2">
                <input
                  className="h-[30px] w-[180px] border border-[#d9e1e5] px-2 text-[12px] outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="Search"
                  type="search"
                  value={search}
                />
                <button className="text-[#6f7a84]" onClick={handleSearch} title="Search" type="button">
                  ⌕
                </button>
                <button className="text-[#6f7a84]" onClick={() => loadItems(page, search)} title="Refresh" type="button">
                  ☰
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
                <thead>
                  <tr>
                    <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold">ACTIONS</th>
                    <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="border-b border-[#e6ecef] px-3 py-4 text-[#65727d]" colSpan={2}>
                        Loading...
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="border-b border-[#e6ecef] px-3 py-4">
                          <div className="flex items-center gap-5">
                            <ActionIcon disabled={isSaving} label="Edit" onClick={() => handleEdit(item)} tone="text-[#1a9a28]">
                              <EditIcon />
                            </ActionIcon>
                            <ActionIcon disabled={isSaving} label="Delete" onClick={() => handleDelete(item)} tone="text-[#e43d30]">
                              <DeleteIcon />
                            </ActionIcon>
                          </div>
                        </td>
                        <td className="border-b border-[#e6ecef] px-3 py-4">{adapter.toName(item)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="border-b border-[#e6ecef] px-3 py-4 text-[#65727d]" colSpan={2}>
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 px-4 py-4 text-[12px] text-[#65727d]">
              <span>Rows per page {ROWS_PER_PAGE}</span>
              <span>
                {startRow}-{endRow} of {pagination.total}
              </span>
              <button
                className="disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!pagination.has_prev || isLoading}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                type="button"
              >
                ‹
              </button>
              <button
                className="disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!pagination.has_next || isLoading}
                onClick={() => setPage((current) => current + 1)}
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
