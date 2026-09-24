import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";
import { DataTablePagination } from "../../../shared/components/DataTablePagination";
import { DataTableToolbar } from "../../../shared/components/DataTableToolbar";

const ACCOUNT_TYPES = [
  "Cash",
  "Bank Account",
  "Card",
  "Mobile Banking",
  "Capital",
  "Loan",
  "Fixed Asset",
];

function sanitizeMoney(value) {
  if (value === "" || value === null || value === undefined) return "0";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : "0";
}

export function AccountEntryPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "",
    opening_balance: "0",
  });
  const [items, setItems] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [density, setDensity] = useState("normal");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    actions: true,
    name: true,
    description: true,
    type: true,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchValue.toLowerCase().trim();
      const matchesSearch = !q || (item.name || "").toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q) || (item.type || "").toLowerCase().includes(q);
      const matchesFilter = !filterValue || (item.type || "").toLowerCase() === filterValue.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [items, searchValue, filterValue]);

  const loadItems = async (targetPage = page, targetLimit = limit) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(targetLimit),
      });
      const response = await apiRequest(`/billing/accounts?${params.toString()}`);
      setItems(response.data || []);
      const pagination = response.meta?.pagination;
      setPage(pagination?.page ?? targetPage);
      setTotalItems(pagination?.total ?? response.data?.length ?? 0);
      setTotalPages(Math.max(pagination?.total_pages ?? 1, 1));
    } catch (error) {
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setErrorMessage(error.message || "Failed to load accounts.");
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
      ["SL", "NAME", "DESCRIPTION", "TYPE", "OPENING BALANCE", "CREATED BY", "UPDATED BY"],
      ...items.map((item, index) => [
        (page - 1) * limit + index + 1,
        item.name || "",
        item.description || "",
        item.type || "",
        Number(item.opening_balance || 0).toFixed(2),
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
    link.download = "accounts.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = ({ clearMessages = true } = {}) => {
    setForm({
      name: "",
      description: "",
      type: "",
      opening_balance: "0",
    });
    setEditingItem(null);
    if (clearMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      opening_balance: Number(form.opening_balance || 0),
    };

    if (!payload.name) {
      setErrorMessage("Name is required.");
      return;
    }
    if (!payload.type) {
      setErrorMessage("Type is required.");
      return;
    }
    if (!Number.isFinite(payload.opening_balance)) {
      setErrorMessage("Opening balance must be a valid number.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await apiRequest(`/billing/accounts/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`${payload.name} updated successfully.`);
        showSuccess("Account Updated!", `Account "${payload.name}" updated successfully.`);
      } else {
        await apiRequest("/billing/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`${payload.name} created successfully.`);
        showSuccess("Account Created!", `Account "${payload.name}" created successfully.`);
      }

      resetForm({ clearMessages: false });
      await loadItems(editingItem ? page : 1);
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save account.");
      setErrorMessage(error.message || "Failed to save account.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      type: item.type || "",
      opening_balance: sanitizeMoney(item.opening_balance),
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeletingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/billing/accounts/${item.id}`, { method: "DELETE" });
      if (editingItem?.id === item.id) {
        resetForm();
      }
      setSuccessMessage(`${item.name} deleted successfully.`);
      showSuccess("Account Deleted!", `Account "${item.name}" deleted successfully.`);
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadItems(nextPage);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete account.");
      setErrorMessage(error.message || "Failed to delete account.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-10 shadow-[0_8px_22px_rgba(22,36,45,0.08)] max-md:p-4">
        {(errorMessage || successMessage) && (
          <div
            className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
              errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr] gap-14 max-lg:grid-cols-1 max-lg:gap-8">
          <div>
            <div className="mb-4 bg-[#dff3f7] px-3 py-3 text-[18px] font-medium text-[#1f2c33]">
              ACCOUNT ENTRY
            </div>

            <label className="block">
              <span className="mb-1 block px-3 pt-3 text-[12px] text-[#5a6775]">Name *</span>
              <input
                className="h-[40px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
                onChange={(event) => handleChange("name", event.target.value)}
                type="text"
                value={form.name}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block px-3 pt-3 text-[12px] text-[#5a6775]">Description</span>
              <textarea
                className="h-[84px] w-full resize-none border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 py-3 text-[15px] text-[#1f2c33] outline-none"
                onChange={(event) => handleChange("description", event.target.value)}
                value={form.description}
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block px-3 pt-3 text-[12px] text-[#5a6775]">Type *</span>
              <select
                className="h-[40px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#49555d] outline-none"
                onChange={(event) => handleChange("type", event.target.value)}
                value={form.type}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
                  backgroundPosition: "right 14px center",
                }}
              >
                <option value="">Type *</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block px-3 pt-3 text-[12px] text-[#5a6775]">Opening Balance</span>
              <input
                className="h-[40px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
                onChange={(event) => handleChange("opening_balance", event.target.value)}
                type="number"
                value={form.opening_balance}
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <button
                className="h-[36px] rounded-[4px] border border-[#8ebcff] bg-white text-[15px] font-semibold text-[#158a15] disabled:opacity-50"
                disabled={isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? "SAVING..." : editingItem ? "UPDATE" : "ENTRY"}
              </button>
              <button
                className="h-[36px] rounded-[4px] border border-[#ff3b30] bg-white text-[15px] font-semibold text-[#ff1e1e]"
                onClick={resetForm}
                type="button"
              >
                RESET
              </button>
            </div>
          </div>

          <div>
            <div className="mb-4 bg-[#dff3f7] px-3 py-3 text-[18px] font-medium text-[#1f2c33]">
              ACCOUNT LIST
            </div>

            <div className={`overflow-hidden rounded-[4px] border border-[#e2e8ec] bg-white shadow-[0_3px_10px_rgba(22,36,45,0.08)] ${isFullscreen ? "fixed inset-0 z-50 p-6 overflow-auto" : ""}`}>
              <DataTableToolbar
                columns={[
                  { key: "actions", label: "Actions" },
                  { key: "name", label: "Name" },
                  { key: "description", label: "Description" },
                  { key: "type", label: "Type" },
                ]}
                density={density}
                filterOptions={ACCOUNT_TYPES}
                filterValue={filterValue}
                isFullscreen={isFullscreen}
                onDensityChange={setDensity}
                onExportCsv={exportCsv}
                onFilterChange={setFilterValue}
                onSearchChange={setSearchValue}
                onToggleColumn={toggleColumn}
                onToggleFullscreen={() => setIsFullscreen((current) => !current)}
                searchValue={searchValue}
                visibleColumns={visibleColumns}
              />

              <table className="w-full border-collapse text-left text-[15px] text-[#1f2c33]">
                <thead>
                  <tr className="border-b border-[#d9dde1] text-[#2e3135]">
                    {visibleColumns.actions !== false ? <th className="w-[110px] px-2 py-3 font-semibold">ACTIONS</th> : null}
                    {visibleColumns.name !== false ? <th className="px-2 py-3 font-semibold">Name</th> : null}
                    {visibleColumns.description !== false ? <th className="px-2 py-3 font-semibold">Description</th> : null}
                    {visibleColumns.type !== false ? <th className="px-2 py-3 font-semibold">Type</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr className="border-b border-[#e1e6ea]">
                      <td className="px-4 py-6 text-center text-[#5b6f88]" colSpan={4}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredItems.length ? (
                    filteredItems.map((row) => {
                      const pyClass = density === "compact" ? "py-1.5" : density === "comfortable" ? "py-4" : "py-2.5";
                      return (
                        <tr className="border-b border-[#e1e6ea]" key={row.id}>
                          {visibleColumns.actions !== false ? (
                            <td className={`px-3 ${pyClass}`}>
                              <div className="flex items-center gap-8">
                                <button className="text-[#138d13]" onClick={() => handleEdit(row)} type="button">
                                  <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                                    <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
                                  </svg>
                                </button>
                                <button
                                  className="text-[#ff1e1e] disabled:opacity-50"
                                  disabled={deletingId === row.id}
                                  onClick={() => handleDelete(row)}
                                  type="button"
                                >
                                  <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                                    <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          ) : null}
                          {visibleColumns.name !== false ? <td className={`px-2 ${pyClass}`}>{row.name}</td> : null}
                          {visibleColumns.description !== false ? <td className={`px-2 ${pyClass}`}>{row.description || ""}</td> : null}
                          {visibleColumns.type !== false ? <td className={`px-2 ${pyClass}`}>{row.type}</td> : null}
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-b border-[#e1e6ea]">
                      <td className="px-4 py-6 text-center text-[#5b6f88]" colSpan={4}>
                        {searchValue || filterValue ? "No accounts match your criteria." : "No records found."}
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
