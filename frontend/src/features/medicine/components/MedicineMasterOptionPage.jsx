import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

function ToolbarButton({ children, onClick }) {
  return (
    <button className="grid h-6 w-6 place-items-center text-[#707780]" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function ActionIcon({ color, children, disabled = false, label, onClick }) {
  return (
    <button aria-label={label} className={`${color} disabled:opacity-50`} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function slugify(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `item_${Date.now()}`;
}

export function MedicineMasterOptionPage({
  emptyMessage = "No records to display",
  entryTitle,
  listTitle,
  optionType,
}) {
  const [name, setName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadItems = async (targetPage = page, searchValue = search) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        type: optionType,
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
      setErrorMessage(error.message || "Failed to load records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(1, "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const csvRows = useMemo(
    () => [
      ["SL", "NAME"],
      ...items.map((item, index) => [(page - 1) * limit + index + 1, item.label || ""]),
    ],
    [items, page, limit]
  );

  const exportCsv = () => {
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${optionType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setName("");
    setEditingItem(null);
    setErrorMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const code = slugify(trimmedName);
      if (editingItem) {
        await apiRequest(`/settings/master-options/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            code,
            label: trimmedName,
          }),
        });
        setSuccessMessage(`${trimmedName} updated successfully.`);
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify({
            type: optionType,
            code,
            label: trimmedName,
          }),
        });
        setSuccessMessage(`${trimmedName} created successfully.`);
      }
      setName("");
      setEditingItem(null);
      await loadItems(editingItem ? page : 1, search);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setName(item.label || "");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.label}"?`)) return;
    setDeletingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/settings/master-options/${item.id}`, { method: "DELETE" });
      if (editingItem?.id === item.id) {
        setName("");
        setEditingItem(null);
      }
      setSuccessMessage(`${item.label} deleted successfully.`);
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadItems(nextPage, search);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, totalItems);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        {(errorMessage || successMessage) && (
          <div
            className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
              errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr] gap-5 max-lg:grid-cols-1">
          <div>
            <div className="mb-4 rounded-[4px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">{entryTitle}</div>

            <div className="rounded-[2px] border border-[#d9e1e5] bg-white p-0">
              <div className="border-b border-[#d9e1e5] bg-[#f3f3f3] px-3 py-4 text-[14px] text-[#5d666d]">Name{editingItem ? "" : " *"}</div>
              <div className="px-4 pt-4">
                <input
                  className="h-[36px] w-full rounded-[2px] border border-[#d6dde2] bg-white px-3 text-[14px] text-[#25333b] outline-none"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter name"
                  type="text"
                  value={name}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 p-4">
                <button
                  className="h-[36px] rounded-[4px] border border-[#8cb7ff] bg-white text-[13px] font-semibold text-[#08a10f] disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? "SAVING..." : editingItem ? "UPDATE" : "ENTRY"}
                </button>
                <button
                  className="h-[36px] rounded-[4px] border border-[#ff4a4a] bg-white text-[13px] font-semibold text-[#ff1616]"
                  onClick={resetForm}
                  type="button"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.05)]">
            <div className="bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">{listTitle}</div>

            <div className="flex items-center justify-between px-4 py-3">
              <button
                className="rounded-[8px] border border-[#8cb7ff] bg-white px-5 py-2 text-[13px] font-semibold text-[#1976d2]"
                onClick={exportCsv}
                type="button"
              >
                Export CSV
              </button>
              <div className="flex items-center gap-3">
                <input
                  className="h-[32px] rounded-[4px] border border-[#d6dde2] px-3 text-[12px] text-[#34434a] outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadItems(1, search);
                  }}
                  placeholder="Search"
                  type="text"
                  value={search}
                />
                <div className="flex items-center gap-5 text-[#777]">
                  <ToolbarButton onClick={() => loadItems(1, search)}>
                    <span className="text-[18px]">⌕</span>
                  </ToolbarButton>
                  <ToolbarButton>
                    <span className="text-[18px]">≡</span>
                  </ToolbarButton>
                  <ToolbarButton>
                    <span className="text-[18px]">▮▮▮</span>
                  </ToolbarButton>
                  <ToolbarButton>
                    <span className="text-[18px]">☰</span>
                  </ToolbarButton>
                  <ToolbarButton>
                    <span className="text-[18px]">⤢</span>
                  </ToolbarButton>
                </div>
              </div>
            </div>

            <table className="min-w-full text-left text-[14px] text-[#1f2c33]">
              <thead className="border-b border-[#d9e1e5]">
                <tr>
                  <th className="px-4 py-3 font-semibold">ACTIONS</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-4 py-8 text-center text-[16px] text-[#5b6f88]" colSpan={2}>
                      Loading...
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item) => (
                    <tr className="border-b border-[#e7edf0]" key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-8">
                          <ActionIcon color="text-[#0b9d16]" label={`Edit ${item.label}`} onClick={() => handleEdit(item)}>
                            <svg aria-hidden="true" height="18" viewBox="0 0 16 16" width="18">
                              <path
                                d="M2 12.5V14h1.5l7.8-7.8-1.5-1.5zM12.2 5.3l1-1a1.1 1.1 0 0 0-1.5-1.5l-1 1M6 4h-3M6 8H3M6 12H4"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.4"
                              />
                            </svg>
                          </ActionIcon>
                          <ActionIcon
                            color="text-[#ff1616]"
                            disabled={deletingId === item.id}
                            label={`Delete ${item.label}`}
                            onClick={() => handleDelete(item)}
                          >
                            <svg aria-hidden="true" height="18" viewBox="0 0 16 16" width="18">
                              <path
                                d="M5 3.5h6M6 3.5V2.7h4v.8M4.5 5h7l-.6 8h-5.8zM6.8 7v4.5M9.2 7v4.5"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.4"
                              />
                            </svg>
                          </ActionIcon>
                        </div>
                      </td>
                      <td className="px-4 py-3">{item.label}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-4 py-8 text-center text-[16px] italic text-[#5b6f88]" colSpan={2}>
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-8 px-4 py-4 text-[16px] text-[#5d666d]">
              <div className="flex items-center gap-2">
                <span>Rows per page</span>
                <span className="font-medium text-[#1f2c33]">{limit}</span>
                <span className="text-[12px]">▼</span>
              </div>
              <span>{`${rangeStart}-${rangeEnd} of ${totalItems}`}</span>
              <button className="text-[26px] text-[#b2b9bf] disabled:opacity-40" disabled={page <= 1 || isLoading} onClick={() => loadItems(page - 1, search)} type="button">
                ‹
              </button>
              <button
                className="text-[26px] text-[#b2b9bf] disabled:opacity-40"
                disabled={page >= totalPages || isLoading}
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
