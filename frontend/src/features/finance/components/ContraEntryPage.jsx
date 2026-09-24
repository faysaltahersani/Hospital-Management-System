import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

function InputField({ label, onChange, readOnly = false, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-[#6d7880]">{label}</span>
      <input
        className="h-[48px] w-full border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        readOnly={readOnly}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-[#6d7880]">{label}</span>
      <select
        className="h-[48px] w-full appearance-none border-b border-[#9aa7ad] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#49555d] outline-none"
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
        value={value}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-[#6d7880]">{label}</span>
      <textarea
        className="min-h-[72px] w-full resize-none border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 py-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        value={value}
      />
    </label>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ContraEntryPage() {
  const [form, setForm] = useState({
    transaction_date: todayIso(),
    contra_code: "",
    from_account_id: "",
    to_account_id: "",
    amount: "",
    note: "",
  });
  const [accountOptions, setAccountOptions] = useState([{ value: "", label: "Loading accounts..." }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadMeta = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest("/billing/contra/meta");
        const accounts = response.data?.accounts || [];
        setForm((current) => ({
          ...current,
          contra_code: response.data?.next_code || current.contra_code,
        }));
        setAccountOptions([
          { value: "", label: "Select Account" },
          ...accounts.map((account) => ({
            value: String(account.id),
            label: account.name,
          })),
        ]);
      } catch (error) {
        setAccountOptions([{ value: "", label: "Select Account" }]);
        setErrorMessage(error.message || "Failed to load contra entry data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMeta();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = ({ clearMessages = true } = {}) => {
    setForm((current) => ({
      ...current,
      transaction_date: todayIso(),
      from_account_id: "",
      to_account_id: "",
      amount: "",
      note: "",
    }));
    if (clearMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.from_account_id) {
      setErrorMessage("From account is required.");
      return;
    }
    if (!form.to_account_id) {
      setErrorMessage("To account is required.");
      return;
    }
    if (form.from_account_id === form.to_account_id) {
      setErrorMessage("From account and To account must be different.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Amount must be greater than zero.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/billing/contra", {
        method: "POST",
        body: JSON.stringify({
          contra_code: form.contra_code,
          transaction_date: form.transaction_date,
          from_account_id: Number(form.from_account_id),
          to_account_id: Number(form.to_account_id),
          amount,
          note: form.note.trim() || null,
        }),
      });
      setSuccessMessage(`${response.data?.contra_code || form.contra_code} created successfully.`);

      const metaResponse = await apiRequest("/billing/contra/meta");
      resetForm({ clearMessages: false });
      setForm((current) => ({
        ...current,
        contra_code: metaResponse.data?.next_code || current.contra_code,
      }));
    } catch (error) {
      setErrorMessage(error.message || "Failed to save contra entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        {(errorMessage || successMessage) && (
          <div
            className={`mb-4 rounded-[4px] px-3 py-2 text-[13px] ${
              errorMessage ? "border border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]" : "border border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
            }`}
          >
            {errorMessage || successMessage}
          </div>
        )}

        <div className="mb-6 bg-[#dff3f7] px-4 py-2 text-[18px] font-medium text-[#1f2c33]">Contra Entry</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            label="Created Date"
            onChange={(event) => updateForm("transaction_date", event.target.value)}
            type="date"
            value={form.transaction_date}
          />
          <InputField label="Code" readOnly value={form.contra_code} />
          <SelectField
            label="From Account"
            onChange={(event) => updateForm("from_account_id", event.target.value)}
            options={accountOptions}
            value={form.from_account_id}
          />
          <SelectField
            label="To Account"
            onChange={(event) => updateForm("to_account_id", event.target.value)}
            options={accountOptions}
            value={form.to_account_id}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            label="Amount"
            onChange={(event) => updateForm("amount", event.target.value)}
            type="number"
            value={form.amount}
          />
        </div>

        <div className="mt-4">
          <TextareaField label="Note" onChange={(event) => updateForm("note", event.target.value)} value={form.note} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <button
            className="h-[36px] rounded-[4px] bg-[#248824] text-[15px] font-semibold text-white disabled:opacity-50"
            disabled={isSaving || isLoading}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "CREATE"}
          </button>
          <button
            className="h-[36px] rounded-[4px] border border-[#ff8b8b] bg-white text-[15px] font-semibold text-[#ff3b30]"
            onClick={() => resetForm()}
            type="button"
          >
            RESET
          </button>
        </div>
      </div>
    </section>
  );
}
