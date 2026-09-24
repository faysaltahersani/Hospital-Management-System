import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../lib/alerts";

const SYMPTOM_TYPE = "symptom_type";
const SYMPTOM_HEAD = "symptom_head";
const pageSizeOptions = ["10", "25", "50", "100"];

const emptyTypeForm = { label: "" };
const emptyHeadForm = { title: "", description: "", typeId: "" };

const toCode = (value, prefix = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
  return `${prefix}${normalized || Date.now()}`.slice(0, 100);
};

function Toolbar({ filename, rows, searchValue, onSearchChange, pageSize, onPageSizeChange }) {
  const exportCsv = () => {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between border-b border-[#e1e5e8] px-4 py-3">
      <button
        className="rounded-[6px] border border-[#7baef7] bg-white px-4 py-2 text-[14px] font-medium text-[#2675db]"
        onClick={exportCsv}
        type="button"
      >
        Export CSV
      </button>
      <div className="flex items-center gap-3 text-[#767676] max-md:flex-wrap max-md:justify-end">
        <input
          className="h-[36px] w-[180px] rounded-[4px] border border-[#d6dde2] px-3 text-[14px] text-[#34434a] outline-none"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search"
          type="text"
          value={searchValue}
        />
        <select
          className="h-[36px] rounded-[4px] border border-[#d6dde2] bg-white px-3 text-[14px] text-[#34434a] outline-none"
          onChange={(event) => onPageSizeChange(event.target.value)}
          value={pageSize}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              View {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StatusMessage({ errorMessage, successMessage }) {
  if (errorMessage) {
    return (
      <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
        {errorMessage}
      </div>
    );
  }
  if (successMessage) {
    return (
      <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
        {successMessage}
      </div>
    );
  }
  return null;
}

export function SymptomsManagePage() {
  const [activeTab, setActiveTab] = useState("type");
  const [types, setTypes] = useState([]);
  const [heads, setHeads] = useState([]);
  const [typeMeta, setTypeMeta] = useState({ total: 0, limit: 100 });
  const [headMeta, setHeadMeta] = useState({ total: 0, limit: 100 });
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [headForm, setHeadForm] = useState(emptyHeadForm);
  const [typeSearch, setTypeSearch] = useState("");
  const [headSearch, setHeadSearch] = useState("");
  const [typeLimit, setTypeLimit] = useState("100");
  const [headLimit, setHeadLimit] = useState("100");
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingHeadId, setEditingHeadId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const typeById = useMemo(() => {
    const map = new Map();
    types.forEach((type) => map.set(Number(type.id), type));
    return map;
  }, [types]);

  const loadSymptoms = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const typeParams = new URLSearchParams({
        type: SYMPTOM_TYPE,
        limit: typeLimit,
      });
      const headParams = new URLSearchParams({
        type: SYMPTOM_HEAD,
        limit: headLimit,
      });
      if (typeSearch.trim()) typeParams.set("search", typeSearch.trim());
      if (headSearch.trim()) headParams.set("search", headSearch.trim());

      const [typeResponse, headResponse] = await Promise.all([
        apiRequest(`/settings/master-options?${typeParams.toString()}`),
        apiRequest(`/settings/master-options?${headParams.toString()}`),
      ]);
      const typeItems = typeResponse.data || [];
      const headItems = headResponse.data || [];
      const typePagination = typeResponse.meta?.pagination || {};
      const headPagination = headResponse.meta?.pagination || {};

      setTypes(typeItems);
      setHeads(headItems);
      setTypeMeta({
        total: typePagination.total || typeItems.length,
        limit: typePagination.limit || Number(typeLimit),
      });
      setHeadMeta({
        total: headPagination.total || headItems.length,
        limit: headPagination.limit || Number(headLimit),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load symptoms data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSymptoms();
  }, [typeSearch, headSearch, typeLimit, headLimit]);

  const resetTypeForm = () => {
    setTypeForm(emptyTypeForm);
    setEditingTypeId(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetHeadForm = () => {
    setHeadForm(emptyHeadForm);
    setEditingHeadId(null);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const saveType = async () => {
    const label = typeForm.label.trim();
    setErrorMessage("");
    setSuccessMessage("");
    if (!label) {
      setErrorMessage("Symptoms type is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        type: SYMPTOM_TYPE,
        code: toCode(label),
        label,
        sort_order: 0,
        is_active: true,
      };
      if (editingTypeId) {
        await apiRequest(`/settings/master-options/${editingTypeId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const msg = `Symptoms type "${label}" updated successfully.`;
        setSuccessMessage(msg);
        showSuccess("Updated!", msg);
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const msg = `Symptoms type "${label}" created successfully.`;
        setSuccessMessage(msg);
        showSuccess("Created!", msg);
      }
      resetTypeForm();
      await loadSymptoms();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save symptoms type");
      showError("Save Failed", error.message || "Failed to save symptoms type");
    } finally {
      setIsSaving(false);
    }
  };

  const saveHead = async () => {
    const title = headForm.title.trim();
    const description = headForm.description.trim();
    const typeId = Number(headForm.typeId);
    setErrorMessage("");
    setSuccessMessage("");
    if (!title) {
      setErrorMessage("Symptoms head title is required.");
      return;
    }
    if (!typeId) {
      setErrorMessage("Select a symptoms type.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        type: SYMPTOM_HEAD,
        code: toCode(title, `${typeId}_`),
        label: title,
        description: description || null,
        sort_order: typeId,
        is_active: true,
      };
      if (editingHeadId) {
        await apiRequest(`/settings/master-options/${editingHeadId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const msg = `Symptoms head "${title}" updated successfully.`;
        setSuccessMessage(msg);
        showSuccess("Updated!", msg);
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const msg = `Symptoms head "${title}" created successfully.`;
        setSuccessMessage(msg);
        showSuccess("Created!", msg);
      }
      resetHeadForm();
      await loadSymptoms();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save symptoms head");
      showError("Save Failed", error.message || "Failed to save symptoms head");
    } finally {
      setIsSaving(false);
    }
  };

  const editType = (type) => {
    setEditingTypeId(type.id);
    setTypeForm({ label: type.label || "" });
    setActiveTab("type");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const editHead = (head) => {
    setEditingHeadId(head.id);
    setHeadForm({
      title: head.label || "",
      description: head.description || "",
      typeId: String(head.sort_order || ""),
    });
    setActiveTab("head");
    setErrorMessage("");
    setSuccessMessage("");
  };

  const deleteOption = async (option, label) => {
    const confirmed = await confirmDelete(`Delete "${label}"?`, `Are you sure you want to delete "${label}"?`);
    if (!confirmed) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);
    try {
      await apiRequest(`/settings/master-options/${option.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `"${label}" deleted successfully.`);
      if (editingTypeId === option.id) resetTypeForm();
      if (editingHeadId === option.id) resetHeadForm();
      await loadSymptoms();
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete symptoms record");
      setErrorMessage(error.message || "Failed to delete symptoms record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-6 flex justify-center gap-8 border-b border-[#dfe5e9]">
          <button
            className={`border-b-2 px-2 py-3 text-[12px] uppercase ${
              activeTab === "type" ? "border-[#2c6de0] text-[#2c6de0]" : "border-transparent text-[#737f87]"
            }`}
            onClick={() => setActiveTab("type")}
            type="button"
          >
            Symptoms Type
          </button>
          <button
            className={`border-b-2 px-2 py-3 text-[12px] uppercase ${
              activeTab === "head" ? "border-[#2c6de0] text-[#2c6de0]" : "border-transparent text-[#737f87]"
            }`}
            onClick={() => setActiveTab("head")}
            type="button"
          >
            Symptoms Head
          </button>
        </div>

        <StatusMessage errorMessage={errorMessage} successMessage={successMessage} />

        {activeTab === "type" ? (
          <div className="grid grid-cols-[1.05fr_1fr] gap-5 max-lg:grid-cols-1">
            <div>
              <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
                Symptoms Type Entry
              </div>
              <input
                className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
                onChange={(event) => setTypeForm({ label: event.target.value })}
                placeholder="Type"
                type="text"
                value={typeForm.label}
              />
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <button
                  className="w-full rounded-[6px] border border-[#8eb6ff] bg-white px-4 py-3 text-[15px] font-semibold text-[#159020] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  onClick={saveType}
                  type="button"
                >
                  {editingTypeId ? "Update" : "Entry"}
                </button>
                <button
                  className="w-full rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
                  onClick={resetTypeForm}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            <div>
              <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
                Type List
              </div>
              <div className="overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
                <Toolbar
                  filename="symptoms-types.csv"
                  onPageSizeChange={setTypeLimit}
                  onSearchChange={setTypeSearch}
                  pageSize={typeLimit}
                  rows={[["Type"], ...types.map((type) => [type.label])]}
                  searchValue={typeSearch}
                />
                <div className="grid grid-cols-[160px_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[14px] font-semibold text-[#2f3c43]">
                  <span>ACTIONS</span>
                  <span>Type</span>
                </div>
                {isLoading ? (
                  <div className="px-4 py-4 text-[13px] text-[#6d7980]">Loading...</div>
                ) : types.length ? (
                  types.map((item) => (
                    <div
                      className="grid grid-cols-[160px_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[15px] text-[#293840]"
                      key={item.id}
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-[#16921f]" onClick={() => editType(item)} type="button">
                          Edit
                        </button>
                        <button className="text-[#ff3f34]" onClick={() => deleteOption(item, item.label)} type="button">
                          Delete
                        </button>
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-[13px] text-[#6d7980]">No symptoms types found.</div>
                )}
                <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
                  <span>Rows per page {typeMeta.limit}</span>
                  <span>{types.length ? `1-${types.length} of ${typeMeta.total}` : "0-0 of 0"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1.05fr_1fr] gap-5 max-lg:grid-cols-1">
            <div>
              <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
                Symptoms Head Entry
              </div>
              <input
                className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
                onChange={(event) => setHeadForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Title"
                type="text"
                value={headForm.title}
              />
              <textarea
                className="mb-4 h-[64px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 py-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
                onChange={(event) => setHeadForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
                value={headForm.description}
              />
              <select
                className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#5f6c74] outline-none"
                onChange={(event) => setHeadForm((current) => ({ ...current, typeId: event.target.value }))}
                value={headForm.typeId}
              >
                <option value="">Select Type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <button
                  className="w-full rounded-[6px] border border-[#8eb6ff] bg-white px-4 py-3 text-[15px] font-semibold text-[#159020] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  onClick={saveHead}
                  type="button"
                >
                  {editingHeadId ? "Update" : "Entry"}
                </button>
                <button
                  className="w-full rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
                  onClick={resetHeadForm}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>

            <div>
              <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
                Head List
              </div>
              <div className="overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
                <Toolbar
                  filename="symptoms-heads.csv"
                  onPageSizeChange={setHeadLimit}
                  onSearchChange={setHeadSearch}
                  pageSize={headLimit}
                  rows={[
                    ["Title", "Description", "Type"],
                    ...heads.map((head) => [head.label, head.description, typeById.get(Number(head.sort_order))?.label || "N/A"]),
                  ]}
                  searchValue={headSearch}
                />
                <div className="grid grid-cols-[120px_120px_1.6fr_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[13px] font-semibold text-[#2f3c43]">
                  <span>ACTIONS</span>
                  <span>Title</span>
                  <span>Description</span>
                  <span>Type</span>
                </div>
                {isLoading ? (
                  <div className="px-4 py-4 text-[13px] text-[#6d7980]">Loading...</div>
                ) : heads.length ? (
                  heads.map((row) => (
                    <div
                      className="grid grid-cols-[120px_120px_1.6fr_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[12px] text-[#293840]"
                      key={row.id}
                    >
                      <div className="flex items-center gap-3">
                        <button className="text-[#16921f]" onClick={() => editHead(row)} type="button">
                          Edit
                        </button>
                        <button className="text-[#ff3f34]" onClick={() => deleteOption(row, row.label)} type="button">
                          Delete
                        </button>
                      </div>
                      <span>{row.label}</span>
                      <span>{row.description || ""}</span>
                      <span>{typeById.get(Number(row.sort_order))?.label || "N/A"}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-4 text-[13px] text-[#6d7980]">No symptoms heads found.</div>
                )}
                <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
                  <span>Rows per page {headMeta.limit}</span>
                  <span>{heads.length ? `1-${heads.length} of ${headMeta.total}` : "0-0 of 0"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
