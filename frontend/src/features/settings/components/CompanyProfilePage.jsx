import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

const billStatuses = ["Pending", "Approved", "Rejected"];
const deliveryStatuses = ["Delivered", "Pending", "Undelivered"];
const financeStatuses = ["Pending", "Approved", "Rejected"];
const taxCalculationTypes = ["General", "BD"];

const toggleItems = [
  { key: "barcode_generate_automatically", label: "Barcode Generate Automatically" },
  { key: "allow_minus_stock_sale", label: "Allow Minus Stock Sale" },
  { key: "enable_product_tax", label: "Enable Product Tax" },
  { key: "previous_balance_due_show_on_invoice", label: "Previous Balance Due Show On Invoice" },
  { key: "direct_serial_scan", label: "Direct Serial Scan" },
  { key: "invoice_footer_branding_mark", label: "Invoice Footer Branding Mark" },
  { key: "sales_and_challan_employee_required", label: "Sales & Challan Employee Required :" },
  { key: "project_wise_expense", label: "Project Wise Expense :" },
  { key: "is_custom_pad_print", label: "Is Custom Pad Print :" },
  { key: "is_receipt_on_vat_and_ait", label: "Is Receipt On Vat And Ait :" },
  { key: "finance_voucher_signature_default", label: "Finance Voucher Signature Default :" },
  { key: "invoice_product_on_additional_note", label: "Invoice Product On Additional Note :" },
];

const initialForm = {
  title: "",
  address: "",
  currency: "TK",
  barcode_prefix: "",
  logo_url: "",
  use_invoice_pad: true,
  barcode_generate_automatically: false,
  default_bill_status: "Pending",
  default_delivery_status: "Delivered",
  default_finance_transaction_status: "Pending",
  tax_calculation: "General",
  allow_minus_stock_sale: false,
  enable_product_tax: false,
  previous_balance_due_show_on_invoice: false,
  direct_serial_scan: false,
  invoice_footer_branding_mark: false,
  sales_and_challan_employee_required: false,
  project_wise_expense: false,
  is_custom_pad_print: true,
  is_receipt_on_vat_and_ait: false,
  finance_voucher_signature_default: false,
  invoice_product_on_additional_note: false,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
const API_ORIGIN = new URL(API_BASE_URL).origin;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];

function toAssetUrl(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  return new URL(value, API_ORIGIN).toString();
}

function FieldLabel({ children }) {
  return <span className="mb-1 block text-[12px] text-[#6d7880]">{children}</span>;
}

function TextField({ label, name, onChange, placeholder = "", value = "" }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        className="h-[36px] w-full rounded-[3px] border border-[#cfd8df] bg-white px-3 text-[15px] text-[#1f2c33] outline-none"
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

function TextAreaField({ label, name, onChange, value }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className="min-h-[96px] w-full rounded-[4px] border border-[#cfd8df] bg-white px-3 py-2 text-[15px] text-[#1f2c33] outline-none"
        name={name}
        onChange={onChange}
        value={value}
      />
    </label>
  );
}

function RadioGroup({ name, onChange, options, value }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-3">
      {options.map((option) => (
        <label className="flex items-center gap-3 text-[15px] text-[#1f2c33]" key={option}>
          <input
            checked={value === option}
            className="h-[20px] w-[20px] accent-[#2f7bd6]"
            name={name}
            onChange={() => onChange(name, option)}
            type="radio"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function Toggle({ checked = false, onChange }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input checked={checked} className="peer sr-only" onChange={onChange} type="checkbox" />
      <span className="h-[16px] w-[38px] rounded-full bg-[#b7b7b7] transition-colors peer-checked:bg-[#2f7bd6]" />
      <span className="pointer-events-none absolute left-[1px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform peer-checked:translate-x-[20px]" />
    </label>
  );
}

function ToggleRow({ checked, label, onChange }) {
  return (
    <div className="flex items-center gap-5">
      <span className="text-[15px] font-semibold text-[#1f2c33]">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingsGroup({ children, title }) {
  return (
    <div>
      <div className="mb-3 text-[15px] font-semibold text-[#1f2c33]">{title}</div>
      {children}
    </div>
  );
}

function LogoPreview({ logoUrl, title }) {
  if (logoUrl) {
    return (
      <div className="grid h-[180px] w-[180px] place-items-center overflow-hidden rounded-[8px] border border-black bg-white">
        <img alt="Company logo" className="h-full w-full object-contain" src={logoUrl} />
      </div>
    );
  }

  return (
    <div className="grid h-[180px] w-[180px] place-items-center rounded-[8px] border border-black bg-white px-4 text-center">
      <div className="text-[28px] font-bold tracking-tight text-black">{String(title || "Company").slice(0, 12).toUpperCase()}</div>
    </div>
  );
}

export function CompanyProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingLogoDataUrl, setPendingLogoDataUrl] = useState("");
  const [pendingLogoName, setPendingLogoName] = useState("");
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);
  const fileInputRef = useRef(null);

  const logoPreviewUrl = useMemo(
    () => (pendingLogoDataUrl ? pendingLogoDataUrl : toAssetUrl(form.logo_url)),
    [form.logo_url, pendingLogoDataUrl]
  );

  useEffect(() => {
    setLogoPreviewFailed(false);
  }, [logoPreviewUrl]);

  const loadProfile = async () => {
    setIsLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const response = await apiRequest("/settings/company-profile");
      setForm({ ...initialForm, ...(response.data || {}) });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to load company profile." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleTextChange = (event) => {
    const { name, value } = event.target;
    updateField(name, value);
  };

  const handleToggleChange = (name) => {
    updateField(name, !form[name]);
  };

  const handleLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setFeedback({ type: "error", message: "Please upload a PNG, JPG, GIF, WEBP, or SVG logo." });
      return;
    }
    try {
      const nextDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read selected logo file."));
        reader.readAsDataURL(file);
      });

      setPendingLogoDataUrl(nextDataUrl);
      setPendingLogoName(file.name);
      setLogoPreviewFailed(false);
      setFeedback({ type: "", message: "" });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Failed to read selected logo file." });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        ...form,
      };
      if (pendingLogoDataUrl) {
        payload.logo_data_url = pendingLogoDataUrl;
      }

      const response = await apiRequest("/settings/company-profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setForm({ ...initialForm, ...(response.data || {}) });
      setPendingLogoDataUrl("");
      setPendingLogoName("");
      setLogoPreviewFailed(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showSuccess("Saved!", "Company profile saved successfully.");
      setFeedback({ type: "success", message: "Company profile saved successfully." });
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save company profile.");
      setFeedback({ type: "error", message: error.message || "Failed to save company profile." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {feedback.message ? (
        <div
          className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
            feedback.type === "error" ? "bg-[#fff1f1] text-[#d64545]" : "bg-[#eef9ee] text-[#218739]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <h1 className="mb-6 text-[18px] font-semibold text-[#1f2c33]">COMPANY PROFILE</h1>

      <div className="grid grid-cols-[580px_minmax(0,1fr)] gap-5 max-xl:grid-cols-1">
        <div>
          <input accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml" className="hidden" onChange={handleLogoSelect} ref={fileInputRef} type="file" />
          <button
            className="mb-4 flex h-[34px] w-full items-center justify-center rounded-[4px] border border-black bg-white text-[18px] font-semibold text-[#0b9900]"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {pendingLogoName ? pendingLogoName : "Choose Profile Logo..."}
          </button>

          {logoPreviewUrl && !logoPreviewFailed ? (
            <div className="grid h-[180px] w-[180px] place-items-center overflow-hidden rounded-[8px] border border-black bg-white">
              <img
                alt="Company logo"
                className="h-full w-full object-contain"
                onError={() => {
                  setLogoPreviewFailed(true);
                  if (pendingLogoDataUrl) {
                    setFeedback({ type: "error", message: "The selected image could not be previewed. Please try PNG or JPG." });
                    return;
                  }

                  setForm((current) => ({ ...current, logo_url: "" }));
                }}
                src={logoPreviewUrl}
              />
            </div>
          ) : (
            <LogoPreview logoUrl="" title={form.title} />
          )}

          <div className="mt-4 flex items-center gap-6">
            <span className="text-[16px] font-semibold text-[#1f2c33]">Is it used as an invoice pad?</span>
            <Toggle checked={form.use_invoice_pad} onChange={() => handleToggleChange("use_invoice_pad")} />
          </div>
        </div>

        <div className="space-y-4">
          <TextField label="TITLE" name="title" onChange={handleTextChange} value={form.title} />
          <TextAreaField label="ADDRESS" name="address" onChange={handleTextChange} value={form.address} />
          <TextField label="CURRENCY" name="currency" onChange={handleTextChange} value={form.currency} />
          <TextField label="BARCODE PREFIX" name="barcode_prefix" onChange={handleTextChange} value={form.barcode_prefix} />

          <div className="pt-1">
            <ToggleRow
              checked={form.barcode_generate_automatically}
              label="Barcode Generate Automatically"
              onChange={() => handleToggleChange("barcode_generate_automatically")}
            />
          </div>

          <SettingsGroup title="Default Bill Status">
            <RadioGroup name="default_bill_status" onChange={updateField} options={billStatuses} value={form.default_bill_status} />
          </SettingsGroup>

          <SettingsGroup title="Default Delivery Status">
            <RadioGroup name="default_delivery_status" onChange={updateField} options={deliveryStatuses} value={form.default_delivery_status} />
          </SettingsGroup>

          <SettingsGroup title="Default Finance Transaction Status">
            <RadioGroup
              name="default_finance_transaction_status"
              onChange={updateField}
              options={financeStatuses}
              value={form.default_finance_transaction_status}
            />
          </SettingsGroup>

          <SettingsGroup title="Tax Calculation">
            <RadioGroup name="tax_calculation" onChange={updateField} options={taxCalculationTypes} value={form.tax_calculation} />
          </SettingsGroup>

          <div className="space-y-4 pt-2">
            {toggleItems.slice(1).map((item) => (
              <ToggleRow
                checked={form[item.key]}
                key={item.key}
                label={item.label}
                onChange={() => handleToggleChange(item.key)}
              />
            ))}
          </div>

          <button
            className="mt-2 rounded-[6px] bg-[#1f73de] px-14 py-3 text-[18px] font-medium text-white disabled:opacity-60"
            disabled={isLoading || isSaving}
            onClick={handleSave}
            type="button"
          >
            {isLoading ? "Loading..." : isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </section>
  );
}
