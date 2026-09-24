import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";
import { DataTablePagination } from "../../../shared/components/DataTablePagination";
import { DataTableToolbar } from "../../../shared/components/DataTableToolbar";

export function IncomeHeadEntryPage() {
  const [title, setTitle] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [items, setItems] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [density, setDensity] = useState("normal");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    serial: true,
    title: true,
    created_by: true,
    updated_by: true,
    actions: true,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const toggleColumn = (key) => {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.title, item.creator?.full_name, item.updater?.full_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [items, searchValue]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const loadItems = async (targetPage = page, targetLimit = limit) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(targetLimit),
      });
      const response = await apiRequest(`/billing/income-heads?${params.toString()}`);
      setItems(response.data || []);
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalItems(pagination?.total ?? response.data?.length ?? 0);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setErrorMessage(error.message || "Failed to load income heads.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    loadItems(1, nextLimit);
  };

  const csvRows = useMemo(
    () => [
      ["SL", "TITLE", "CREATE BY", "UPDATE BY"],
      ...items.map((item, index) => [
        (page - 1) * limit + index + 1,
        item.title || "",
        item.creator?.full_name || "N/A",
        item.updater?.full_name || "N/A",
      ]),
    ],
    [items, limit, page]
  );

  const exportCsv = () => {
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "income-heads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = ({ clearMessages = true } = {}) => {
    setTitle("");
    setEditingItem(null);
    if (clearMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Title is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await apiRequest(`/billing/income-heads/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: trimmedTitle }),
        });
        setSuccessMessage(`${trimmedTitle} updated successfully.`);
        showSuccess("Income Head Updated!", `Income head "${trimmedTitle}" updated successfully.`);
      } else {
        await apiRequest("/billing/income-heads", {
          method: "POST",
          body: JSON.stringify({ title: trimmedTitle }),
        });
        setSuccessMessage(`${trimmedTitle} created successfully.`);
        showSuccess("Income Head Created!", `Income head "${trimmedTitle}" created successfully.`);
      }
      resetForm({ clearMessages: false });
      await loadItems(editingItem ? page : 1);
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save income head.");
      setErrorMessage(error.message || "Failed to save income head.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title || "");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setDeletingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/billing/income-heads/${item.id}`, { method: "DELETE" });
      if (editingItem?.id === item.id) {
        resetForm();
      }
      setSuccessMessage(`${item.title} deleted successfully.`);
      showSuccess("Income Head Deleted!", `Income head "${item.title}" deleted successfully.`);
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadItems(nextPage);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete income head.");
      setErrorMessage(error.message || "Failed to delete income head.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-9 shadow-[0_8px_22px_rgba(22,36,45,0.08)] max-md:p-4">
        {(errorMessage || successMessage) && (
          <div
            className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
              errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="grid grid-cols-[0.9fr_1.9fr] gap-12 max-lg:grid-cols-1 max-lg:gap-8">
          <div>
            <div className="mb-4 bg-[#dff3f7] px-3 py-3 text-[18px] font-medium text-[#1f2c33]">
              INCOME HEAD ENTRY
            </div>

            <label className="block">
              <span className="mb-1 block px-3 pt-3 text-[12px] text-[#6d7880]">TITLE</span>
              <input
                className="h-[48px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
                onChange={(event) => setTitle(event.target.value)}
                type="text"
                value={title}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <button
                className="h-[36px] rounded-[4px] border border-[#8ebcff] bg-white text-[15px] font-semibold text-[#158a15] disabled:opacity-50"
                disabled={isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? "SAVING..." : editingItem ? "UPDATE" : "CREATE"}
              </button>
              <button
                className="h-[36px] rounded-[4px] border border-[#ff3b30] bg-white text-[15px] font-semibold text-[#ff1e1e]"
                onClick={() => resetForm()}
                type="button"
              >
                RESET
              </button>
            </div>
          </div>

          <div>
            <div className="mb-4 bg-[#dff3f7] px-3 py-3 text-[18px] font-medium text-[#1f2c33]">
              INCOME HEAD LIST
            </div>

            <div className={`overflow-hidden rounded-[4px] border border-[#e2e8ec] bg-white shadow-[0_3px_10px_rgba(22,36,45,0.08)] ${isFullscreen ? "fixed inset-0 z-50 overflow-auto p-6" : ""}`}>
              <DataTableToolbar
                columns={[
                  { key: "serial", label: "SL" },
                  { key: "title", label: "Title" },
                  { key: "created_by", label: "Created By" },
                  { key: "updated_by", label: "Updated By" },
                  { key: "actions", label: "Actions" },
                ]}
                density={density}
                isFullscreen={isFullscreen}
                onDensityChange={setDensity}
                onExportCsv={exportCsv}
                onSearchChange={setSearchValue}
                onToggleColumn={toggleColumn}
                onToggleFullscreen={() => setIsFullscreen((current) => !current)}
                searchValue={searchValue}
                visibleColumns={visibleColumns}
              />

              <table className="w-full border-collapse text-left text-[15px] text-[#1f2c33]">
                <thead>
                  <tr className="border-b border-[#d9dde1] text-[#2e3135]">
                    {visibleColumns.serial !== false ? <th className="w-[80px] px-2 py-3 font-semibold">SL</th> : null}
                    {visibleColumns.title !== false ? <th className="px-2 py-3 font-semibold">TITLE</th> : null}
                    {visibleColumns.created_by !== false ? <th className="px-2 py-3 font-semibold">CREATE BY</th> : null}
                    {visibleColumns.updated_by !== false ? <th className="px-2 py-3 font-semibold">UPDATE BY</th> : null}
                    {visibleColumns.actions !== false ? <th className="w-[130px] px-2 py-3 font-semibold">ACTIONS</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-9 text-center text-[#667586]" colSpan={visibleColumnCount}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredItems.length ? (
                    filteredItems.map((item, index) => {
                      const pyClass = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-4" : "py-3";
                      return (
                        <tr className="border-b border-[#e1e6ea]" key={item.id}>
                          {visibleColumns.serial !== false ? <td className={`px-2 ${pyClass}`}>{(page - 1) * limit + index + 1}</td> : null}
                          {visibleColumns.title !== false ? <td className={`px-2 ${pyClass}`}>{item.title}</td> : null}
                          {visibleColumns.created_by !== false ? <td className={`px-2 ${pyClass}`}>{item.creator?.full_name || "N/A"}</td> : null}
                          {visibleColumns.updated_by !== false ? <td className={`px-2 ${pyClass}`}>{item.updater?.full_name || "N/A"}</td> : null}
                          {visibleColumns.actions !== false ? (
                            <td className={`px-2 ${pyClass}`}>
                              <div className="flex items-center gap-6">
                                <button aria-label={`Edit ${item.title}`} className="text-[#138d13]" onClick={() => handleEdit(item)} type="button">
                                  <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                                    <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
                                  </svg>
                                </button>
                                <button
                                  aria-label={`Delete ${item.title}`}
                                  className="text-[#ff1e1e] disabled:opacity-50"
                                  disabled={deletingId === item.id}
                                  onClick={() => handleDelete(item)}
                                  type="button"
                                >
                                  <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                                    <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-9 text-center italic text-[#667586]" colSpan={visibleColumnCount}>
                        {searchValue ? "No income heads match your search." : "No records to display"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <DataTablePagination
                isLoading={isLoading}
                limit={limit}
                onLimitChange={handleLimitChange}
                onPageChange={loadItems}
                page={page}
                totalItems={totalItems}
                totalPages={totalPages}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
