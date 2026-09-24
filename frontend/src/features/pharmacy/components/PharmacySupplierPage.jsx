import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

function ToolbarButton({ children }) {
  return (
    <button className="grid h-6 w-6 place-items-center text-[#707780]" type="button">
      {children}
    </button>
  );
}

function ActionButton({ children, onClick, tone = "" }) {
  return (
    <button className={tone} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function FieldShell({ children, className = "", label }) {
  return (
    <div className={`relative min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3] pt-[4px] ${className}`}>
      {label ? (
        <span className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[10px] leading-none text-[#7f8990]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function TextInput({ className = "", onChange, placeholder = "", readOnly = false, value = "" }) {
  return (
    <input
      className={`h-[40px] w-full rounded-[2px] border-0 bg-[#f3f3f3] px-3 text-[14px] text-[#24333b] outline-none placeholder:text-[#58656d] ${
        readOnly ? "text-[#5f6a72]" : ""
      } ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type="text"
      value={value}
    />
  );
}

function TextArea({ className = "", onChange, placeholder = "", value = "" }) {
  return (
    <textarea
      className={`min-h-[72px] w-full resize-none rounded-[2px] border-0 bg-[#f3f3f3] px-3 py-3 text-[14px] text-[#24333b] outline-none placeholder:text-[#58656d] ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function MessageBanner({ tone = "error", children }) {
  return (
    <div
      className={`rounded-[4px] border px-3 py-2 text-[13px] ${
        tone === "error"
          ? "border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]"
          : "border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
      }`}
    >
      {children}
    </div>
  );
}

const createInitialForm = (supplierCode = "") => ({
  id: null,
  supplier_code: supplierCode,
  name: "",
  phone: "",
  address: "",
  notes: "",
});

export function PharmacySupplierPage() {
  const [form, setForm] = useState(createInitialForm());
  const [suppliers, setSuppliers] = useState([]);
  const [nextSupplierCode, setNextSupplierCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supplierRows = useMemo(
    () =>
      suppliers.map((supplier) => ({
        id: supplier.id,
        code: supplier.supplier_code || "-",
        name: supplier.name || "-",
        phone: supplier.phone || "-",
        address: supplier.address || "-",
        note: supplier.notes || "-",
      })),
    [suppliers]
  );

  const loadSuppliers = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [suppliersResponse, metaResponse] = await Promise.all([
        apiRequest("/pharmacy/suppliers?limit=100"),
        apiRequest("/pharmacy/suppliers/meta"),
      ]);
      const nextCode = metaResponse.data?.next_supplier_code || "";
      setSuppliers(suppliersResponse.data || []);
      setNextSupplierCode(nextCode);
      setForm((current) =>
        current.id
          ? current
          : {
              ...current,
              supplier_code: nextCode,
            }
      );
      return nextCode;
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pharmacy suppliers");
      return "";
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(createInitialForm(nextSupplierCode));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("Supplier name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplier_code: form.supplier_code || undefined,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      const msg = form.id ? "Supplier updated successfully." : "Supplier created successfully.";
      if (form.id) {
        await apiRequest(`/pharmacy/suppliers/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(msg);
      } else {
        await apiRequest("/pharmacy/suppliers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(msg);
      }
      showSuccess("Success!", msg);

      const nextCode = await loadSuppliers();
      setForm(createInitialForm(nextCode));
    } catch (error) {
      const err = error.message || "Failed to save supplier";
      setErrorMessage(err);
      showError("Error!", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setErrorMessage("");
    setSuccessMessage("");
    setForm({
      id: supplier.id,
      supplier_code: supplier.supplier_code || "",
      name: supplier.name || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
  };

  const handleDelete = async (supplierId) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/pharmacy/suppliers/${supplierId}`, {
        method: "DELETE",
      });
      setSuccessMessage("Supplier deleted successfully.");
      const nextCode = await loadSuppliers();
      if (Number(form.id) === Number(supplierId)) {
        setForm(createInitialForm(nextCode));
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete supplier");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="space-y-4">
        {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
        {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

        <div className="rounded-[3px] bg-[#dff3f4] px-3 py-2 text-[15px] text-[#223039]">PHARMACY SUPPLIER ENTRY</div>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldShell label="Code">
            <TextInput onChange={(event) => updateForm("supplier_code", event.target.value)} value={form.supplier_code} />
          </FieldShell>
          <FieldShell label="Name">
            <TextInput onChange={(event) => updateForm("name", event.target.value)} placeholder="Name" value={form.name} />
          </FieldShell>
          <FieldShell label="Contact No">
            <TextInput onChange={(event) => updateForm("phone", event.target.value)} placeholder="Contact No" value={form.phone} />
          </FieldShell>
          <FieldShell label="Address">
            <TextInput onChange={(event) => updateForm("address", event.target.value)} placeholder="Address" value={form.address} />
          </FieldShell>
          <FieldShell className="col-span-2 max-md:col-span-1" label="Note">
            <TextArea onChange={(event) => updateForm("notes", event.target.value)} placeholder="Note" value={form.notes} />
          </FieldShell>
        </div>

        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <button
            className="rounded-[4px] border border-[#8db8f3] py-2 text-[12px] font-semibold text-[#159000] disabled:opacity-50"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "SAVING..." : form.id ? "UPDATE" : "ENTRY"}
          </button>
          <button
            className="rounded-[4px] border border-[#ff4e4e] py-2 text-[12px] font-semibold text-[#ff2b2b]"
            onClick={resetForm}
            type="button"
          >
            RESET
          </button>
        </div>

        <div className="rounded-[3px] bg-[#dff3f4] px-3 py-2 text-[15px] text-[#223039]">PHARMACY SUPPLIER LIST</div>

        <div className="overflow-hidden rounded-[4px] border border-[#e1e6ea] shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
          <div className="flex items-center justify-between border-b border-[#edf1f4] px-3 py-3">
            <button className="rounded-[4px] border border-[#80b2f2] px-3 py-1.5 text-[12px] font-semibold text-[#2376da]" type="button">
              Export CSV
            </button>
            <div className="flex items-center gap-2">
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
                <th className="px-3 py-3 font-semibold">ACTIONS</th>
                <th className="px-3 py-3 font-semibold">Code</th>
                <th className="px-3 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Contact No</th>
                <th className="px-3 py-3 font-semibold">Address</th>
                <th className="px-3 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {supplierRows.length ? (
                supplierRows.map((row) => (
                  <tr className="border-b border-[#e7edf0]" key={row.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <ActionButton onClick={() => handleEdit(suppliers.find((supplier) => supplier.id === row.id))} tone="text-[#1c9d24]">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </ActionButton>
                        <ActionButton onClick={() => handleDelete(row.id)} tone="text-[#ff2b2b]">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                        </ActionButton>
                      </div>
                    </td>
                    <td className="px-3 py-3">{row.code}</td>
                    <td className="px-3 py-3">{row.name}</td>
                    <td className="px-3 py-3">{row.phone}</td>
                    <td className="px-3 py-3">{row.address}</td>
                    <td className="px-3 py-3">{row.note}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-[#66737b]" colSpan={6}>
                    {isLoading ? "Loading suppliers..." : "No pharmacy supplier found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-end gap-4 px-4 py-3 text-[13px] text-[#5e6870]">
            <span>Rows per page</span>
            <span className="flex items-center gap-1">
              10
              <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 10 6">
                <path d="M5 6 0 .5h10z" />
              </svg>
            </span>
            <span>{supplierRows.length ? `1-${supplierRows.length} of ${supplierRows.length}` : "0-0 of 0"}</span>
            <button className="text-[#9aa2a9]" type="button">
              ‹
            </button>
            <button className="text-[#9aa2a9]" type="button">
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
