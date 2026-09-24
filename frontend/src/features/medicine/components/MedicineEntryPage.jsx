import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, showError, showSuccess } from "../../../lib/alerts";

const taxOptions = ["", "VAT", "GST", "No Tax"];
const taxTypeOptions = ["", "Inclusive", "Exclusive", "None"];

const createInitialForm = (code = "") => ({
  name: "",
  code,
  unit: "",
  category: "",
  group_name: "",
  company: "",
  tax: "",
  tax_type: "",
  sale_price: "",
  wholesale_price: "",
  purchase_price: "0",
  stock_quantity: "",
  opening_purchase_price: "",
  rack_number: "",
  reorder_level: "",
  generic_name: "",
  description: "",
});

function ActionButton({ children, className = "", disabled = false, onClick, type = "button" }) {
  return (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function SectionCard({ children, description, title }) {
  return (
    <div className="rounded-[10px] border border-[#d8e3e7] bg-[#fbfdfe] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold text-[#1f2c33]">{title}</h2>
        {description ? <p className="mt-1 text-[11px] text-[#71808a]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function TextInput({ label, onChange, placeholder = "", readOnly = false, required = false, type = "text", value = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#5f707b]">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        className={`h-[38px] w-full rounded-[8px] border border-[#cfd9de] px-3 text-[13px] text-[#25333b] outline-none transition focus:border-[#5ca7c6] focus:bg-white ${readOnly ? "bg-[#f5f8fa] text-[#60707b]" : "bg-white"}`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextAreaInput({ label, onChange, placeholder = "", value = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#5f707b]">{label}</span>
      <textarea
        className="min-h-[88px] w-full rounded-[8px] border border-[#cfd9de] bg-white px-3 py-2 text-[13px] text-[#25333b] outline-none transition focus:border-[#5ca7c6]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SelectInput({ label, onChange, options = [], placeholder = "Select", value = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#5f707b]">{label}</span>
      <select
        className="h-[38px] w-full appearance-none rounded-[8px] border border-[#cfd9de] bg-white bg-right bg-no-repeat px-3 pr-9 text-[13px] text-[#25333b] outline-none transition focus:border-[#5ca7c6]"
        onChange={(event) => onChange(event.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 .67.75h8.66z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 12px center",
        }}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option || "" } : option;
          return (
            <option key={`${label}-${normalized.value}`} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function MedicineActionCell({ item, isDeleting, onDelete, onEdit }) {
  return (
    <div className="flex items-center gap-1">
      <button className="text-[#2e7d32]" onClick={() => onEdit(item)} type="button">
        ↹
      </button>
      <button className="text-[#ef5350] disabled:opacity-50" disabled={isDeleting} onClick={() => onDelete(item)} type="button">
        ⌫
      </button>
    </div>
  );
}

function buildCsv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function MedicineEntryPage() {
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadPageData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [medicinesResponse, metaResponse, unitResponse, groupResponse, categoryResponse, companyResponse] = await Promise.all([
        apiRequest("/pharmacy/medicines?limit=100"),
        apiRequest("/pharmacy/medicines/meta"),
        apiRequest("/settings/master-options?type=medicine_unit&limit=100"),
        apiRequest("/settings/master-options?type=medicine_group&limit=100"),
        apiRequest("/settings/master-options?type=medicine_category&limit=100"),
        apiRequest("/settings/master-options?type=medicine_company&limit=100"),
      ]);

      const nextCode = metaResponse.data?.next_medicine_code || "";
      setMedicines(medicinesResponse.data || []);
      setUnitOptions(unitResponse.data || []);
      setGroupOptions(groupResponse.data || []);
      setCategoryOptions(categoryResponse.data || []);
      setCompanyOptions(companyResponse.data || []);
      setForm((current) => ({ ...current, code: editingId ? current.code : nextCode }));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load medicine page data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = async () => {
    setEditingId(null);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const metaResponse = await apiRequest("/pharmacy/medicines/meta");
      setForm(createInitialForm(metaResponse.data?.next_medicine_code || ""));
    } catch {
      setForm(createInitialForm());
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!form.name.trim()) {
      setErrorMessage("Medicine name is required.");
      return;
    }
    if (!form.code.trim()) {
      setErrorMessage("Medicine code is required.");
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      unit: form.unit || null,
      category: form.category || null,
      group_name: form.group_name || null,
      company: form.company || null,
      manufacturer: form.company || null,
      tax: form.tax || null,
      tax_type: form.tax_type || null,
      sale_price: Number(form.sale_price || 0),
      wholesale_price: Number(form.wholesale_price || 0),
      purchase_price: Number(form.purchase_price || 0),
      stock_quantity: Number(form.stock_quantity || 0),
      opening_purchase_price: Number(form.opening_purchase_price || 0),
      rack_number: form.rack_number.trim() || null,
      reorder_level: Number(form.reorder_level || 0),
      generic_name: form.generic_name.trim() || null,
      description: form.description.trim() || null,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await apiRequest(`/pharmacy/medicines/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showSuccess("Updated Successfully!", `Medicine "${payload.name}" updated successfully.`);
      } else {
        await apiRequest("/pharmacy/medicines", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showSuccess("Saved Successfully!", `Medicine "${payload.name}" created successfully.`);
      }
      await loadPageData();
      await resetForm();
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save medicine.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (item) => {
    const confirmed = await confirmEdit("Edit Medicine", `Do you want to edit medicine "${item.name}"?`);
    if (!confirmed) return;

    setEditingId(item.id);
    setForm({
      name: item.name || "",
      code: item.code || "",
      unit: item.unit || "",
      category: item.category || "",
      group_name: item.group_name || "",
      company: item.company || item.manufacturer || "",
      tax: item.tax || "",
      tax_type: item.tax_type || "",
      sale_price: String(item.sale_price ?? ""),
      wholesale_price: String(item.wholesale_price ?? ""),
      purchase_price: String(item.purchase_price ?? ""),
      stock_quantity: String(item.stock_quantity ?? ""),
      opening_purchase_price: String(item.opening_purchase_price ?? ""),
      rack_number: item.rack_number || "",
      reorder_level: String(item.reorder_level ?? ""),
      generic_name: item.generic_name || "",
      description: item.description || "",
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (item) => {
    const confirmed = await confirmDelete("Delete Medicine?", `Are you sure you want to delete medicine "${item.name}"?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/pharmacy/medicines/${item.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Medicine "${item.name}" has been deleted.`);
      if (editingId === item.id) {
        await resetForm();
      }
      await loadPageData();
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete medicine.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = () => {
    const csv = buildCsv([
      ["NAME", "CODE", "UNIT", "CATEGORY", "GROUP", "COMPANY", "TAX", "TAX TYPE", "RETAIL RATE", "WHOLESALE RATE", "PURCHASE RATE", "OPENING QTY", "OPENING PURCHASE RATE", "REORDER LEVEL", "RACK NUMBER", "COMPOSITION", "DESCRIPTION"],
      ...medicines.map((item) => [
        item.name,
        item.code,
        item.unit,
        item.category,
        item.group_name,
        item.company || item.manufacturer,
        item.tax,
        item.tax_type,
        item.sale_price,
        item.wholesale_price,
        item.purchase_price,
        item.stock_quantity,
        item.opening_purchase_price,
        item.reorder_level,
        item.rack_number,
        item.generic_name,
        item.description,
      ]),
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medicines.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const unitSelectOptions = useMemo(() => unitOptions.map((item) => ({ value: item.label, label: item.label })), [unitOptions]);
  const groupSelectOptions = useMemo(() => groupOptions.map((item) => ({ value: item.label, label: item.label })), [groupOptions]);
  const categorySelectOptions = useMemo(() => categoryOptions.map((item) => ({ value: item.label, label: item.label })), [categoryOptions]);
  const companySelectOptions = useMemo(() => companyOptions.map((item) => ({ value: item.label, label: item.label })), [companyOptions]);
  const filteredMedicines = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) return medicines;
    return medicines.filter((item) =>
      [
        item.name,
        item.code,
        item.unit,
        item.category,
        item.group_name,
        item.company,
        item.manufacturer,
        item.generic_name,
        item.rack_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [medicines, searchValue]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {(errorMessage || successMessage) && (
        <div
          className={`mb-3 rounded-[4px] px-3 py-2 text-[13px] ${
            errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
          }`}
        >
          {errorMessage || successMessage}
        </div>
      )}

      <div className="border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-[10px] bg-[linear-gradient(135deg,#e9f7f8,#f9fcff)] px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-[#22404d]">Medicine Entry</div>
            <p className="mt-1 text-[12px] text-[#6b7d86]">Add medicines faster with grouped fields for identity, pricing, and stock control.</p>
          </div>
          <div className="rounded-[8px] border border-[#cfe2e8] bg-white px-3 py-2 text-[12px] text-[#4f616b]">
            <div className="font-medium text-[#294753]">{editingId ? "Editing medicine" : "New medicine"}</div>
            <div className="mt-1">Code: <span className="font-semibold text-[#1e657f]">{form.code || "Pending"}</span></div>
          </div>
        </div>

        <div className="grid gap-4">
          <SectionCard description="Core details used to identify the medicine." title="Basic Details">
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <TextInput label="Medicine Name" onChange={(value) => updateForm("name", value)} placeholder="Enter medicine name" required value={form.name} />
              <TextInput label="Code" onChange={(value) => updateForm("code", value)} placeholder="Auto or custom code" value={form.code} />
              <SelectInput label="Unit" onChange={(value) => updateForm("unit", value)} options={unitSelectOptions} placeholder="Select unit" value={form.unit} />
              <SelectInput label="Category" onChange={(value) => updateForm("category", value)} options={categorySelectOptions} placeholder="Select category" value={form.category} />
              <SelectInput label="Group" onChange={(value) => updateForm("group_name", value)} options={groupSelectOptions} placeholder="Select group" value={form.group_name} />
              <SelectInput label="Company" onChange={(value) => updateForm("company", value)} options={companySelectOptions} placeholder="Select company" value={form.company} />
              <div className="col-span-2 max-md:col-span-1">
                <TextInput label="Medicine Composition" onChange={(value) => updateForm("generic_name", value)} placeholder="Example: Paracetamol 500mg" value={form.generic_name} />
              </div>
            </div>
          </SectionCard>

          <SectionCard description="Selling, purchasing, and tax settings." title="Pricing & Tax">
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <SelectInput label="Tax" onChange={(value) => updateForm("tax", value)} options={taxOptions.filter(Boolean)} placeholder="Select tax" value={form.tax} />
              <SelectInput label="Tax Type" onChange={(value) => updateForm("tax_type", value)} options={taxTypeOptions.filter(Boolean)} placeholder="Select tax type" value={form.tax_type} />
              <TextInput label="Retail Rate" onChange={(value) => updateForm("sale_price", value)} placeholder="0.00" type="number" value={form.sale_price} />
              <TextInput label="Wholesale Rate" onChange={(value) => updateForm("wholesale_price", value)} placeholder="0.00" type="number" value={form.wholesale_price} />
              <TextInput label="Purchase Rate" onChange={(value) => updateForm("purchase_price", value)} placeholder="0.00" type="number" value={form.purchase_price} />
              <TextInput label="Opening Purchase Rate" onChange={(value) => updateForm("opening_purchase_price", value)} placeholder="0.00" type="number" value={form.opening_purchase_price} />
            </div>
          </SectionCard>

          <SectionCard description="Opening stock and storage information." title="Inventory Setup">
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <TextInput label="Opening Qty" onChange={(value) => updateForm("stock_quantity", value)} placeholder="0" type="number" value={form.stock_quantity} />
              <TextInput label="Reorder Level" onChange={(value) => updateForm("reorder_level", value)} placeholder="0" type="number" value={form.reorder_level} />
              <TextInput label="Rack Number" onChange={(value) => updateForm("rack_number", value)} placeholder="Rack / shelf reference" value={form.rack_number} />
              <TextInput label="Picture" onChange={() => {}} placeholder="Image upload not connected yet" readOnly value="Upload Picture" />
            </div>
          </SectionCard>

          <SectionCard description="Optional notes for staff reference." title="Notes">
            <TextAreaInput label="Description" onChange={(value) => updateForm("description", value)} placeholder="Add notes, usage guidance, or internal remarks" value={form.description} />
          </SectionCard>

          <div className="flex flex-wrap justify-end gap-3">
            <ActionButton className="h-[42px] min-w-[140px] rounded-[8px] border border-[#f1a1a1] bg-white px-5 text-[12px] font-semibold text-[#e55656]" onClick={resetForm}>
              Reset Form
            </ActionButton>
            <ActionButton
              className="h-[42px] min-w-[160px] rounded-[8px] bg-[#1e8b57] px-5 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(30,139,87,0.24)] disabled:opacity-50"
              disabled={isSaving || isLoading}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : editingId ? "Update Medicine" : "Save Medicine"}
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="mt-5 border border-[#d9e1e5] bg-white p-3 shadow-[0_8px_22px_rgba(22,36,45,0.06)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[linear-gradient(135deg,#eef8fb,#f9fcff)] px-4 py-3">
          <div>
            <div className="text-[14px] font-semibold text-[#294753]">Medicine List</div>
            <p className="mt-1 text-[11px] text-[#6b7d86]">Search by name, code, category, company, or composition.</p>
          </div>
          <div className="w-full max-w-[320px]">
            <input
              className="h-[38px] w-full rounded-[8px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none transition focus:border-[#5ca7c6]"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search medicines..."
              type="text"
              value={searchValue}
            />
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <button className="rounded-[6px] border border-[#90caf9] bg-white px-3 py-1.5 text-[11px] text-[#1976d2]" onClick={exportCsv} type="button">
            Export CSV
          </button>
          <div className="text-[11px] text-[#6a7883]">
            Showing {filteredMedicines.length} of {medicines.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[11px] text-[#1f2c33]">
            <thead className="border-b border-[#e1e7ea] bg-[#f8fbfc] text-[#586773]">
              <tr>
                <th className="px-2 py-2 font-semibold">ACTIONS</th>
                <th className="px-2 py-2 font-semibold">NAME</th>
                <th className="px-2 py-1 font-normal">Code</th>
                <th className="px-2 py-1 font-normal">Unit</th>
                <th className="px-2 py-1 font-normal">Category</th>
                <th className="px-2 py-1 font-normal">Group</th>
                <th className="px-2 py-1 font-normal">Company</th>
                <th className="px-2 py-1 font-normal">Tax</th>
                <th className="px-2 py-1 font-normal">Tax Type</th>
                <th className="px-2 py-1 font-normal">Retail Rate</th>
                <th className="px-2 py-1 font-normal">Wholesale Rate</th>
                <th className="px-2 py-1 font-normal">Purchase Rate</th>
                <th className="px-2 py-1 font-normal">Opening Quantity</th>
                <th className="px-2 py-1 font-normal">Opening Purchase Rate</th>
                <th className="px-2 py-1 font-normal">Reorder Level</th>
                <th className="px-2 py-1 font-normal">Rack Number</th>
                <th className="px-2 py-1 font-normal">Composition</th>
                <th className="px-2 py-1 font-normal">Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-2 py-4 text-center text-[11px] text-[#6a7883]" colSpan={18}>
                    Loading...
                  </td>
                </tr>
              ) : filteredMedicines.length ? (
                filteredMedicines.map((row, index) => (
                  <tr className={`${index % 2 === 0 ? "bg-white" : "bg-[#f8fafb]"} hover:bg-[#f1f8fb]`} key={row.id}>
                    <td className="px-2 py-2">
                      <MedicineActionCell item={row} isDeleting={deletingId === row.id} onDelete={handleDelete} onEdit={handleEdit} />
                    </td>
                    <td className="px-2 py-2 font-medium">{row.name}</td>
                    <td className="px-2 py-2">{row.code}</td>
                    <td className="px-2 py-2">{row.unit || "-"}</td>
                    <td className="px-2 py-2">{row.category || "-"}</td>
                    <td className="px-2 py-2">{row.group_name || "-"}</td>
                    <td className="px-2 py-2">{row.company || row.manufacturer || "-"}</td>
                    <td className="px-2 py-2">{row.tax || "-"}</td>
                    <td className="px-2 py-2">{row.tax_type || "-"}</td>
                    <td className="px-2 py-2">{row.sale_price ?? 0}</td>
                    <td className="px-2 py-2">{row.wholesale_price ?? 0}</td>
                    <td className="px-2 py-2">{row.purchase_price ?? 0}</td>
                    <td className="px-2 py-2">{row.stock_quantity ?? 0}</td>
                    <td className="px-2 py-2">{row.opening_purchase_price ?? 0}</td>
                    <td className="px-2 py-2">{row.reorder_level ?? 0}</td>
                    <td className="px-2 py-2">{row.rack_number || "-"}</td>
                    <td className="px-2 py-2">{row.generic_name || "-"}</td>
                    <td className="px-2 py-2">{row.description || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-2 py-4 text-center text-[11px] text-[#6a7883]" colSpan={18}>
                    {searchValue ? "No medicines match your search." : "No medicines found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-[#6a7883]">
          <span>Rows per page 100</span>
          <span>{filteredMedicines.length ? `1-${filteredMedicines.length} of ${filteredMedicines.length}` : "0-0 of 0"}</span>
          <span>‹</span>
          <span>›</span>
        </div>
      </div>
    </section>
  );
}
