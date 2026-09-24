import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

const emptyMeta = {
  next_test_code: "",
  categories: [],
  parameters: [],
};

const initialForm = {
  name: "",
  short_name: "",
  test_type: "",
  method: "",
  report_delivery_day: "",
  base_charge: "",
  final_charge: "",
  tax_rate: "",
  category: "",
  parameter_option_ids: [],
};

export function PathologyTestEntryPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMeta = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [metaResponse, categoriesResponse, parametersResponse] = await Promise.all([
        apiRequest("/laboratory/pathology-test-entry/meta").catch(() => null),
        apiRequest("/settings/master-options?type=pathology_test_category&limit=100").catch(() => ({ data: [] })),
        apiRequest("/laboratory/pathology-parameters?limit=100").catch(() => ({ data: [] })),
      ]);

      let payload = metaResponse?.data || {};
      let catList = payload.categories || categoriesResponse.data || [];

      if (!catList.length) {
        catList = [
          { id: 1, label: "Hematology", code: "hematology" },
          { id: 2, label: "Biochemistry", code: "biochemistry" },
          { id: 3, label: "Microbiology", code: "microbiology" },
          { id: 4, label: "Serology", code: "serology" },
          { id: 5, label: "Immunology", code: "immunology" },
          { id: 6, label: "Clinical Pathology", code: "clinical_pathology" },
          { id: 7, label: "Histopathology", code: "histopathology" },
        ];
      }

      setMeta({
        next_test_code: payload.next_test_code || `PATH-${Date.now().toString().slice(-4)}`,
        categories: catList,
        parameters: payload.parameters || parametersResponse.data || [],
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pathology test entry data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
    });
  };

  const handleParameterSelect = (event) => {
    const id = Number(event.target.value);
    if (!id) return;
    if (!form.parameter_option_ids.includes(id)) {
      updateField("parameter_option_ids", [...form.parameter_option_ids, id]);
    }
    event.target.value = "";
  };

  const handleParameterRemove = (id) => {
    updateField("parameter_option_ids", form.parameter_option_ids.filter((p) => p !== id));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }
    if (!form.short_name.trim()) {
      setErrorMessage("Short name is required.");
      return;
    }
    if (!form.category) {
      setErrorMessage("Category is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/laboratory/pathology-test-entry", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          short_name: form.short_name.trim(),
          test_type: form.test_type.trim() || null,
          method: form.method.trim() || null,
          report_delivery_day: form.report_delivery_day.trim() || null,
          base_charge: Number(form.base_charge || 0),
          final_charge: Number(form.final_charge || form.base_charge || 0),
          tax_rate: form.tax_rate || null,
          category: form.category,
          parameter_option_ids: form.parameter_option_ids,
        }),
      });

      const created = response.data;
      setSuccessMessage(`Pathology test ${created.name} created successfully.`);
      resetForm();
      await loadMeta();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create pathology test");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-6 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-6 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
          Pathology Test Entry
        </div>

        {meta.next_test_code ? (
          <div className="mb-4 rounded-[4px] border border-[#d3dde0] bg-[#f6fbfc] px-4 py-3 text-[13px] text-[#42565f]">
            Next Test Code: <span className="font-semibold">{meta.next_test_code}</span>
          </div>
        ) : null}

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

        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#f15454] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#ff3f34]"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="NAME *"
            type="text"
            value={form.name}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#f15454] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#ff3f34]"
            onChange={(event) => updateField("short_name", event.target.value)}
            placeholder="SHORT NAME *"
            type="text"
            value={form.short_name}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("test_type", event.target.value)}
            placeholder="TEST TYPE"
            type="text"
            value={form.test_type}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("method", event.target.value)}
            placeholder="METHOD"
            type="text"
            value={form.method}
          />

          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("report_delivery_day", event.target.value)}
            placeholder="REPORT DELIVERY DAY"
            type="text"
            value={form.report_delivery_day}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("base_charge", event.target.value)}
            placeholder="BASE CHARGE"
            type="number"
            value={form.base_charge}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
            onChange={(event) => updateField("final_charge", event.target.value)}
            placeholder="FINAL CHARGE"
            type="number"
            value={form.final_charge}
          />
          <input
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#5f6b74] outline-none"
            onChange={(event) => updateField("tax_rate", event.target.value)}
            placeholder="TAX RATE (%)"
            type="number"
            value={form.tax_rate}
          />

          <select
            className="h-[48px] rounded-[3px] border border-x-0 border-t-0 border-b-[#f15454] bg-[#f6f6f6] px-3 text-[15px] text-[#ff3f34] outline-none"
            disabled={isLoading}
            onChange={(event) => updateField("category", event.target.value)}
            value={form.category}
          >
            <option value="">CATEGORY *</option>
            {(meta.categories || []).map((category) => (
              <option key={category.id} value={category.label}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[14px] text-[#22343d]">Selected Parameters</p>
          <select
            className="h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#5f6b74] outline-none"
            disabled={isLoading}
            onChange={handleParameterSelect}
            value=""
          >
            <option value="">— Select a parameter to add —</option>
            {(meta.parameters || [])
              .filter((p) => !form.parameter_option_ids.includes(p.id))
              .map((parameter) => (
                <option key={parameter.id} value={parameter.id}>
                  {parameter.name}
                </option>
              ))}
          </select>

          {form.parameter_option_ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.parameter_option_ids.map((id) => {
                const param = meta.parameters.find((p) => p.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#d9eef0] px-3 py-1 text-[13px] text-[#22343d]"
                  >
                    {param?.name ?? id}
                    <button
                      className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#5ba8b0] text-[11px] leading-none text-white hover:bg-[#3b7f87]"
                      onClick={() => handleParameterRemove(id)}
                      type="button"
                      aria-label={`Remove ${param?.name ?? id}`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <button
            className="min-w-[280px] rounded-[6px] border border-[#8ae08b] bg-white px-4 py-3 text-[15px] font-semibold text-[#1f8e26] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Entry"}
          </button>
          <button
            className="min-w-[280px] rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
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
    </section>
  );
}
