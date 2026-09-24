import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

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
        className="min-h-[48px] w-full resize-none border-b border-[#9aa7ad] bg-[#f3f3f3] px-3 py-3 text-[15px] text-[#1f2c33] outline-none"
        onChange={onChange}
        value={value}
      />
    </label>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function IncomeHeadModal({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Income head name is required.");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/billing/income-heads", {
        method: "POST",
        body: JSON.stringify({ title: trimmedTitle }),
      });
      onSaved(response.data);
    } catch (error) {
      setErrorMessage(error.message || "Failed to create income head.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,31,0.35)] px-4">
      <div className="w-full max-w-[520px] rounded-[4px] bg-white p-8 shadow-[0_20px_50px_rgba(22,36,45,0.28)]">
        <h2 className="mb-5 text-center text-[18px] font-semibold text-[#2c3137]">Add Income Head</h2>
        {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}
        <label className="block">
          <span className="mb-3 block text-center text-[17px] text-[#4c5965]">Income Head Name</span>
          <input
            className="h-[42px] w-full border border-[#e1e5e8] px-3 text-[15px] text-[#1f2c33] outline-none placeholder:text-[#b6bec4]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter new income head"
            type="text"
            value={title}
          />
        </label>

        <div className="mt-7 flex items-center justify-center gap-8">
          <button
            className="rounded-[4px] bg-[#118a8c] px-7 py-2 text-[15px] font-medium text-white disabled:opacity-50"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "Save"}
          </button>
          <button
            className="rounded-[4px] bg-[#eef1f4] px-5 py-2 text-[15px] font-medium text-[#37414a]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomeEntryPage() {
  const [form, setForm] = useState({
    income_date: todayIso(),
    income_code: "",
    note: "",
    income_head_id: "",
    amount: "",
    account_id: "",
  });
  const [isIncomeHeadModalOpen, setIsIncomeHeadModalOpen] = useState(false);
  const [incomeHeadOptions, setIncomeHeadOptions] = useState([{ value: "", label: "Loading heads..." }]);
  const [accountOptions, setAccountOptions] = useState([{ value: "", label: "Loading accounts..." }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMeta = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/billing/income/meta");
      const incomeHeads = response.data?.income_heads || [];
      const accounts = response.data?.accounts || [];
      setForm((current) => ({ ...current, income_code: response.data?.next_code || current.income_code }));
      setIncomeHeadOptions([
        { value: "", label: "Select Head" },
        ...incomeHeads.map((item) => ({ value: String(item.id), label: item.title })),
      ]);
      setAccountOptions([
        { value: "", label: "Select Account" },
        ...accounts.map((item) => ({ value: String(item.id), label: item.name })),
      ]);
    } catch (error) {
      setIncomeHeadOptions([{ value: "", label: "Select Head" }]);
      setAccountOptions([{ value: "", label: "Select Account" }]);
      setErrorMessage(error.message || "Failed to load income entry data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = ({ clearMessages = true } = {}) => {
    setForm((current) => ({
      ...current,
      income_date: todayIso(),
      note: "",
      income_head_id: "",
      amount: "",
      account_id: "",
    }));
    if (clearMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!form.income_head_id) {
      setErrorMessage("Income head is required.");
      return;
    }
    if (!form.account_id) {
      setErrorMessage("Account is required.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Amount must be greater than zero.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/billing/income", {
        method: "POST",
        body: JSON.stringify({
          income_code: form.income_code,
          income_date: form.income_date,
          income_head_id: Number(form.income_head_id),
          account_id: Number(form.account_id),
          amount,
          note: form.note.trim() || null,
        }),
      });
      const code = response.data?.income_code || form.income_code;
      showSuccess("Income Saved!", `Income entry "${code}" created successfully.`);
      setSuccessMessage(`${code} created successfully.`);
      await loadMeta();
      resetForm({ clearMessages: false });
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save income entry.");
      setErrorMessage(error.message || "Failed to save income entry.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIncomeHeadSaved = async (incomeHead) => {
    setIsIncomeHeadModalOpen(false);
    await loadMeta();
    if (incomeHead?.id) {
      setForm((current) => ({ ...current, income_head_id: String(incomeHead.id) }));
    }
  };

  return (
    <>
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

          <div className="mb-6 bg-[#dff3f7] px-4 py-2 text-[18px] font-medium text-[#1f2c33]">Income Entry</div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InputField
              label="Created Date"
              onChange={(event) => updateForm("income_date", event.target.value)}
              type="date"
              value={form.income_date}
            />
            <InputField label="Code" readOnly value={form.income_code} />
            <div className="xl:col-span-2">
              <TextareaField label="Note" onChange={(event) => updateForm("note", event.target.value)} value={form.note} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1.25fr)] xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1.25fr)_minmax(0,1.15fr)]">
            <SelectField
              label="Head"
              onChange={(event) => updateForm("income_head_id", event.target.value)}
              options={incomeHeadOptions}
              value={form.income_head_id}
            />
            <button
              className="h-[36px] self-center rounded-[4px] bg-[#118a8c] text-[22px] leading-none text-white disabled:opacity-50 md:mt-[21px] xl:mt-[21px]"
              disabled={isLoading}
              onClick={() => setIsIncomeHeadModalOpen(true)}
              type="button"
            >
              +
            </button>
            <InputField
              label="Amount"
              onChange={(event) => updateForm("amount", event.target.value)}
              type="number"
              value={form.amount}
            />
            <SelectField
              label="Account"
              onChange={(event) => updateForm("account_id", event.target.value)}
              options={accountOptions}
              value={form.account_id}
            />
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

      {isIncomeHeadModalOpen ? (
        <IncomeHeadModal onClose={() => setIsIncomeHeadModalOpen(false)} onSaved={handleIncomeHeadSaved} />
      ) : null}
    </>
  );
}
