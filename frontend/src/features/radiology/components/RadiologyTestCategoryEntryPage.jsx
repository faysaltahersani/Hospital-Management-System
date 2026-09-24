import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const CATEGORY_TYPE = "radiology_test_category";
const initialForm = { name: "" };

const toCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function RadiologyTestCategoryEntryPage() {
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/settings/master-options?type=${CATEGORY_TYPE}&limit=100`);
      setCategories(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology test categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((item) => (item.label || "").toLowerCase().includes(query));
  }, [categories, search]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    const name = form.name.trim();
    if (!name) {
      setErrorMessage("Category name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        type: CATEGORY_TYPE,
        code: toCode(name),
        label: name,
        sort_order: 0,
        is_active: true,
      };

      if (editingId) {
        await apiRequest(`/settings/master-options/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Category ${name} updated successfully.`);
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Category ${name} created successfully.`);
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save radiology test category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingId(category.id);
    setForm({ name: category.label || "" });
  };

  const handleDelete = async (category) => {
    const confirmed = window.confirm(`Delete category "${category.label}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/settings/master-options/${category.id}`, {
        method: "DELETE",
      });
      if (editingId === category.id) resetForm();
      setSuccessMessage(`Category ${category.label} deleted successfully.`);
      await loadCategories();
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete radiology test category");
    }
  };

  const exportCsv = () => {
    const rows = [["SL", "NAME"], ...filteredCategories.map((item, index) => [index + 1, item.label || ""])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "radiology-test-categories.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="grid grid-cols-[1.05fr_1fr] gap-5 max-lg:grid-cols-1">
          <div>
            <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
              Radiology Test Category Entry
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
                {successMessage}
              </div>
            ) : null}

            <input
              className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
              onChange={(event) => setForm({ name: event.target.value })}
              placeholder="NAME"
              type="text"
              value={form.name}
            />

            <div className="flex flex-wrap gap-4">
              <button
                className="min-w-[275px] rounded-[6px] border border-[#8eb6ff] bg-white px-4 py-3 text-[15px] font-semibold text-[#159020] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? "Saving..." : editingId ? "Update" : "Entry"}
              </button>
              <button
                className="min-w-[275px] rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  resetForm();
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
              Category List
            </div>

            <div className="overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
              <div className="flex items-center justify-between gap-4 border-b border-[#e1e5e8] px-4 py-3">
                <button
                  className="rounded-[6px] border border-[#7baef7] bg-white px-4 py-2 text-[14px] font-medium text-[#2675db]"
                  onClick={exportCsv}
                  type="button"
                >
                  Export CSV
                </button>
                <div className="flex items-center gap-3">
                  <input
                    className="h-[38px] rounded-[6px] border border-[#d7dde2] px-3 text-[14px] text-[#34434a] outline-none"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search category"
                    type="text"
                    value={search}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[200px_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[14px] font-semibold text-[#2f3c43]">
                <div className="flex items-center gap-2">
                  <span>ACTIONS</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Name</span>
                  <span className="text-[#c2c7cb]">⇅</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
              </div>

              {isLoading ? (
                <div className="px-4 py-6 text-[14px] text-[#61727a]">Loading categories...</div>
              ) : filteredCategories.length ? (
                filteredCategories.map((item) => (
                  <div
                    className="grid grid-cols-[200px_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[15px] text-[#293840]"
                    key={item.id}
                  >
                    <div className="flex items-center gap-6 text-[18px]">
                      <button className="text-[#16921f]" onClick={() => handleEdit(item)} type="button">
                        ☰✎
                      </button>
                      <button className="text-[#ff1f1f]" onClick={() => handleDelete(item)} type="button">
                        🗑
                      </button>
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-[14px] text-[#61727a]">No categories found.</div>
              )}

              <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
                <span>Rows per page 100</span>
                <span>
                  {filteredCategories.length ? `1-${filteredCategories.length} of ${filteredCategories.length}` : "0 of 0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
