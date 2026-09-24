import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

function ToolbarButton({ children }) {
  return (
    <button className="grid h-6 w-6 place-items-center text-[#707780]" type="button">
      {children}
    </button>
  );
}

function ActionCell({ item, isDeleting, onDelete, onEdit }) {
  return (
    <div className="flex items-center gap-3">
      <button className="text-[#1c9d24]" onClick={() => onEdit(item)} type="button">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
          <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <button className="text-[#ff2b2b] disabled:opacity-50" disabled={isDeleting} onClick={() => onDelete(item)} type="button">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
          <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
    </div>
  );
}

export function BloodMasterEntryPage({
  createLabel = "ENTRY",
  createSuccessNoun,
  endpoint,
  entryTitle,
  listTitle,
  maxNameLength = 150,
  narrow = false,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadItems = async (searchValue = search) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchValue.trim()) params.set("search", searchValue.trim());
      const response = await apiRequest(`${endpoint}?${params.toString()}`);
      setItems(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || `Failed to load ${createSuccessNoun}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const csvRows = useMemo(
    () => [
      ["SL", "NAME", "CREATE BY", "UPDATE BY"],
      ...items.map((item, index) => [index + 1, item.name || "", item.creator?.full_name || "", item.updater?.full_name || ""]),
    ],
    [items]
  );

  const exportCsv = () => {
    const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${createSuccessNoun.replace(/\s+/g, "-").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setName("");
    setEditingId(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await apiRequest(`${endpoint}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim() }),
        });
        setSuccessMessage(`${createSuccessNoun} ${name.trim()} updated successfully.`);
      } else {
        await apiRequest(endpoint, {
          method: "POST",
          body: JSON.stringify({ name: name.trim() }),
        });
        setSuccessMessage(`${createSuccessNoun} ${name.trim()} created successfully.`);
      }
      resetForm();
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message || `Failed to save ${createSuccessNoun}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || "");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeletingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`${endpoint}/${item.id}`, { method: "DELETE" });
      setSuccessMessage(`${createSuccessNoun} ${item.name} deleted successfully.`);
      if (editingId === item.id) resetForm();
      await loadItems();
    } catch (error) {
      setErrorMessage(error.message || `Failed to delete ${createSuccessNoun}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {(errorMessage || successMessage) && (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr] gap-10 max-lg:grid-cols-1">
        <div>
          <div className="rounded-[3px] bg-[#dff3f4] px-3 py-2 text-[15px] text-[#223039]">{entryTitle}</div>
          <input
            className="mt-3 h-[40px] w-full rounded-[2px] border-b border-[#9ea4aa] bg-[#f3f3f3] px-3 py-2 text-[14px] text-[#555] outline-none"
            maxLength={maxNameLength}
            onChange={(event) => setName(event.target.value)}
            placeholder="NAME"
            type="text"
            value={name}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className="rounded-[4px] border border-[#8db8f3] py-1.5 text-[12px] font-semibold text-[#159000] disabled:opacity-50"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "SAVING..." : editingId ? "UPDATE" : createLabel}
            </button>
            <button className="rounded-[4px] border border-[#ff4e4e] py-1.5 text-[12px] font-semibold text-[#ff2b2b]" onClick={resetForm} type="button">
              RESET
            </button>
          </div>
        </div>

        <div>
          <div className="rounded-[3px] bg-[#dff3f4] px-3 py-2 text-[15px] text-[#223039]">{listTitle}</div>
          <div className="mt-3 overflow-hidden rounded-[4px] border border-[#e1e6ea] shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
            <div className="flex items-center justify-between border-b border-[#edf1f4] px-3 py-3">
              <button className="rounded-[4px] border border-[#80b2f2] px-3 py-1.5 text-[12px] font-semibold text-[#2376da]" onClick={exportCsv} type="button">
                Export CSV
              </button>
              <div className="flex items-center gap-3">
                <input
                  className="h-[30px] rounded-[4px] border border-[#d6dde2] px-3 text-[12px] text-[#34434a] outline-none"
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadItems(search);
                  }}
                  placeholder="Search"
                  type="text"
                  value={search}
                />
                <ToolbarButton>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                    <path d="M2 4h12M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton>
                  <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2 3h3v10H2zM6.5 3h3v10h-3zM11 3h3v10h-3z" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                    <path d="M2 4h10M2 8h10M2 12h10" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                    <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </ToolbarButton>
              </div>
            </div>

            <table className="min-w-full text-left text-[13px] text-[#1f2c33]">
              <thead className="border-b border-[#d9e1e5]">
                <tr>
                  <th className="px-3 py-3 font-semibold">{narrow ? "ACTIONS" : "SL"}</th>
                  {!narrow ? <th className="px-3 py-3 font-semibold">NAME</th> : null}
                  {!narrow ? <th className="px-3 py-3 font-semibold">CREATE BY</th> : null}
                  {!narrow ? <th className="px-3 py-3 font-semibold">UPDATE BY</th> : null}
                  {narrow ? <th className="px-3 py-3 font-semibold">Name</th> : <th className="px-3 py-3 font-semibold">ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-3 py-4 text-center text-[#6d7980]" colSpan={narrow ? 2 : 5}>
                      Loading...
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item, index) => (
                    <tr className="border-b border-[#e7edf0]" key={item.id}>
                      {narrow ? (
                        <>
                          <td className="px-3 py-2">
                            <ActionCell item={item} isDeleting={deletingId === item.id} onDelete={handleDelete} onEdit={handleEdit} />
                          </td>
                          <td className="px-3 py-2">{item.name}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.creator?.full_name || ""}</td>
                          <td className="px-3 py-2">{item.updater?.full_name || ""}</td>
                          <td className="px-3 py-2">
                            <ActionCell item={item} isDeleting={deletingId === item.id} onDelete={handleDelete} onEdit={handleEdit} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-[#e7edf0]">
                    <td className="px-3 py-4 text-center text-[#6d7980]" colSpan={narrow ? 2 : 5}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-4 px-4 py-3 text-[13px] text-[#5e6870]">
              <span>Rows per page</span>
              <span className="flex items-center gap-1">
                100
                <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 10 6">
                  <path d="M5 6 0 .5h10z" />
                </svg>
              </span>
              <span>{items.length ? `1-${items.length} of ${items.length}` : "0-0 of 0"}</span>
              <button className="text-[#9aa2a9]" type="button">
                ‹
              </button>
              <button className="text-[#9aa2a9]" type="button">
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
