import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const initialForm = {
  name: "",
  ref_range_to: "",
  ref_range_from: "",
  description: "",
  unit_option_id: "",
};

export function PathologyParameterEntryPage() {
  const [form, setForm] = useState(initialForm);
  const [parameters, setParameters] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadPageData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [unitsResponse, listResponse] = await Promise.all([
        apiRequest("/settings/master-options?type=pathology_test_unit&limit=100").catch(() => ({ data: [] })),
        apiRequest("/laboratory/pathology-parameters?limit=100").catch(() => ({ data: [] })),
      ]);

      let fetchedUnits = unitsResponse.data || [];
      if (!fetchedUnits.length) {
        fetchedUnits = [
          { id: 1, label: "mg/dL", code: "mg_dl" },
          { id: 2, label: "g/dL", code: "g_dl" },
          { id: 3, label: "u/L", code: "u_l" },
          { id: 4, label: "mmol/L", code: "mmol_l" },
          { id: 5, label: "%", code: "percent" },
          { id: 6, label: "cells/mcL", code: "cells_mcl" },
          { id: 7, label: "fL", code: "fl" },
          { id: 8, label: "pg", code: "pg" },
          { id: 9, label: "mEq/L", code: "meq_l" },
          { id: 10, label: "mm/hr", code: "mm_hr" },
        ];
      }

      setUnits(fetchedUnits);
      setParameters(listResponse.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pathology parameters");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredParameters = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parameters;
    return parameters.filter((item) =>
      [item.name, item.description, item.unit_option?.label].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [parameters, search]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Parameter name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ref_range_from: form.ref_range_from.trim() || null,
        ref_range_to: form.ref_range_to.trim() || null,
        unit_option_id: form.unit_option_id ? Number(form.unit_option_id) : null,
        description: form.description.trim() || null,
      };

      if (editingId) {
        await apiRequest(`/laboratory/pathology-parameters/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Parameter ${payload.name} updated successfully.`);
      } else {
        await apiRequest("/laboratory/pathology-parameters", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Parameter ${payload.name} created successfully.`);
      }

      resetForm();
      await loadPageData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save pathology parameter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (parameter) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingId(parameter.id);
    setForm({
      name: parameter.name || "",
      ref_range_to: parameter.ref_range_to || "",
      ref_range_from: parameter.ref_range_from || "",
      description: parameter.description || "",
      unit_option_id: parameter.unit_option_id ? String(parameter.unit_option_id) : "",
    });
  };

  const handleDelete = async (parameter) => {
    const confirmed = window.confirm(`Delete parameter "${parameter.name}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/laboratory/pathology-parameters/${parameter.id}`, {
        method: "DELETE",
      });
      if (editingId === parameter.id) resetForm();
      setSuccessMessage(`Parameter ${parameter.name} deleted successfully.`);
      await loadPageData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete pathology parameter");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["SL", "NAME", "REF RANGE FROM", "REF RANGE TO", "UNIT", "DESCRIPTION"],
      ...filteredParameters.map((item, index) => [
        index + 1,
        item.name || "",
        item.ref_range_from || "",
        item.ref_range_to || "",
        item.unit_option?.label || "",
        item.description || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pathology-parameters.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
          Pathology Parameter Entry
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

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Name"
            type="text"
            value={form.name}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("ref_range_to", event.target.value)}
            placeholder="Ref Range To"
            type="text"
            value={form.ref_range_to}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("ref_range_from", event.target.value)}
            placeholder="Ref Range From"
            type="text"
            value={form.ref_range_from}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Description"
            type="text"
            value={form.description}
          />
        </div>

        <select
          className="mt-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#5f6b74] outline-none"
          onChange={(event) => updateField("unit_option_id", event.target.value)}
          value={form.unit_option_id}
        >
          <option value="">Unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label}
            </option>
          ))}
        </select>

        <div className="mt-4 flex flex-wrap gap-4">
          <button
            className="min-w-[603px] flex-1 rounded-[6px] border border-[#8ae08b] bg-white px-4 py-3 text-[15px] font-semibold text-[#1f8e26] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : editingId ? "Update" : "Entry"}
          </button>
          <button
            className="min-w-[603px] flex-1 rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
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

        <div className="mt-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
          Parameter List
        </div>

        <div className="mt-4 overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#e1e5e8] px-4 py-3">
            <button
              className="rounded-[6px] border border-[#7baef7] bg-white px-4 py-2 text-[14px] font-medium text-[#2675db]"
              onClick={exportCsv}
              type="button"
            >
              Export CSV
            </button>
            <input
              className="h-[38px] rounded-[6px] border border-[#d7dde2] px-3 text-[14px] text-[#34434a] outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search parameter"
              type="text"
              value={search}
            />
          </div>

          <div className="grid grid-cols-[120px_1.1fr_1fr_1fr_1fr_1.2fr] border-b border-[#e1e5e8] px-4 py-3 text-[12px] font-semibold text-[#2f3c43] max-lg:hidden">
            <div className="flex items-center gap-1">
              <span>Actions</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Name</span>
              <span className="text-[#c2c7cb]">⇅</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Ref Range From</span>
              <span className="text-[#c2c7cb]">⇅</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Ref Range To</span>
              <span className="text-[#c2c7cb]">⇅</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Unit</span>
              <span className="text-[#c2c7cb]">⇅</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Description</span>
              <span className="text-[#c2c7cb]">⇅</span>
              <span className="text-[#c2c7cb]">⋮</span>
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-[14px] text-[#61727a]">Loading parameters...</div>
          ) : filteredParameters.length ? (
            filteredParameters.map((row) => (
              <div
                className="grid grid-cols-[120px_1.1fr_1fr_1fr_1fr_1.2fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[12px] text-[#293840] max-lg:grid-cols-1 max-lg:gap-2"
                key={row.id}
              >
                <div className="flex items-center gap-6 text-[16px]">
                  <button className="text-[#16921f]" onClick={() => handleEdit(row)} type="button">
                    ☰✎
                  </button>
                  <button className="text-[#ff1f1f]" onClick={() => handleDelete(row)} type="button">
                    🗑
                  </button>
                </div>
                <span>{row.name}</span>
                <span>{row.ref_range_from || ""}</span>
                <span>{row.ref_range_to || ""}</span>
                <span>{row.unit_option?.label || ""}</span>
                <span>{row.description || ""}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-[14px] text-[#61727a]">No parameters found.</div>
          )}

          <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
            <span>Rows per page 100</span>
            <span>{filteredParameters.length ? `1-${filteredParameters.length} of ${filteredParameters.length}` : "0 of 0"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
