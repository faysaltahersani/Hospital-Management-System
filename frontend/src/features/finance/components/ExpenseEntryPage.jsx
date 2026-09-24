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

function ExpenseHeadModal({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Expense head title is required.");
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/billing/expense-categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmedTitle }),
      });
      onSaved(response.data);
    } catch (error) {
      setErrorMessage(error.message || "Failed to create expense head.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,31,0.35)] px-4">
      <div className="w-full max-w-[520px] rounded-[4px] bg-white p-8 shadow-[0_20px_50px_rgba(22,36,45,0.28)]">
        <h2 className="mb-5 text-center text-[18px] font-semibold text-[#2c3137]">Add Expense Head</h2>
        {errorMessage ? <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}
        <label className="block">
          <span className="mb-3 block text-center text-[17px] text-[#4c5965]">Expense Head Title</span>
          <input
            className="h-[42px] w-full border border-[#e1e5e8] px-3 text-[15px] text-[#1f2c33] outline-none placeholder:text-[#b6bec4]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter head title"
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

export function ExpenseEntryPage() {
  const [form, setForm] = useState({
    expense_date: todayIso(),
    expense_code: "",
    total_amount: "0",
    note: "",
    category_id: "",
    account_id: "",
    amount: "",
  });
  const [expenseHeads, setExpenseHeads] = useState([{ value: "", label: "Loading heads..." }]);
  const [accounts, setAccounts] = useState([{ value: "", label: "Loading accounts..." }]);
  const [isExpenseHeadModalOpen, setIsExpenseHeadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadMeta = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/billing/expenses/meta");
      setForm((current) => ({
        ...current,
        expense_code: response.data?.next_code || current.expense_code,
      }));
      setExpenseHeads([
        { value: "", label: "Expense Head" },
        ...((response.data?.expense_heads || []).map((item) => ({ value: String(item.id), label: item.name }))),
      ]);
      setAccounts([
        { value: "", label: "Account" },
        ...((response.data?.accounts || []).map((item) => ({ value: String(item.id), label: item.name }))),
      ]);
    } catch (error) {
      setExpenseHeads([{ value: "", label: "Expense Head" }]);
      setAccounts([{ value: "", label: "Account" }]);
      setErrorMessage(error.message || "Failed to load expense entry data.");
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
      expense_date: todayIso(),
      total_amount: "0",
      note: "",
      category_id: "",
      account_id: "",
      amount: "",
    }));
    if (clearMessages) {
      setErrorMessage("");
      setSuccessMessage("");
    }
  };

  const handleAddAmount = () => {
    if (!form.category_id) {
      setErrorMessage("Expense head is required.");
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
    setErrorMessage("");
    updateForm("total_amount", amount.toFixed(2));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!form.category_id) {
      setErrorMessage("Expense head is required.");
      return;
    }
    if (!form.account_id) {
      setErrorMessage("Account is required.");
      return;
    }
    const amount = Number(form.total_amount) || Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Total amount must be greater than zero.");
      return;
    }

    const selectedHead = expenseHeads.find((item) => item.value === form.category_id);

    setIsSaving(true);
    try {
      const response = await apiRequest("/billing/expenses", {
        method: "POST",
        body: JSON.stringify({
          expense_code: form.expense_code,
          category_id: Number(form.category_id),
          account_id: Number(form.account_id),
          title: selectedHead?.label || "Expense",
          description: form.note.trim() || null,
          amount,
          expense_date: form.expense_date,
          payment_method: "cash",
          reference: form.expense_code,
        }),
      });
      const code = response.data?.expense_code || form.expense_code;
      showSuccess("Expense Saved!", `Expense entry "${code}" created successfully.`);
      setSuccessMessage(`${code} created successfully.`);
      await loadMeta();
      resetForm({ clearMessages: false });
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save expense.");
      setErrorMessage(error.message || "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpenseHeadSaved = async (category) => {
    setIsExpenseHeadModalOpen(false);
    await loadMeta();
    if (category?.id) {
      setForm((current) => ({ ...current, category_id: String(category.id) }));
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

          <h1 className="mb-7 text-[18px] font-medium text-[#1f2c33]">Expense Entry</h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InputField
              label="Created Date"
              onChange={(event) => updateForm("expense_date", event.target.value)}
              type="date"
              value={form.expense_date}
            />
            <InputField label="Expense Code" readOnly value={form.expense_code} />
            <InputField label="Total Amount" readOnly value={form.total_amount} />
            <TextareaField label="Note" onChange={(event) => updateForm("note", event.target.value)} value={form.note} />
          </div>

          <div className="mt-8 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1.35fr)_88px_minmax(0,1.35fr)_minmax(0,0.9fr)_96px]">
            <SelectField
              label="Expense Head"
              onChange={(event) => updateForm("category_id", event.target.value)}
              options={expenseHeads}
              value={form.category_id}
            />
            <button
              className="h-[48px] w-full self-end rounded-[4px] bg-[#118a8c] text-[24px] leading-none text-white shadow-[0_6px_14px_rgba(17,138,140,0.25)]"
              disabled={isLoading}
              onClick={() => setIsExpenseHeadModalOpen(true)}
              type="button"
            >
              +
            </button>
            <SelectField
              label="Account"
              onChange={(event) => updateForm("account_id", event.target.value)}
              options={accounts}
              value={form.account_id}
            />
            <InputField
              label="Amount"
              onChange={(event) => updateForm("amount", event.target.value)}
              type="number"
              value={form.amount}
            />
            <button
              className="h-[48px] w-full self-end rounded-[4px] border border-[#8cb7ff] bg-white px-5 text-[14px] font-medium text-[#1976d2]"
              onClick={handleAddAmount}
              type="button"
            >
              ADD
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <button
              className="h-[36px] rounded-[3px] bg-[#118a8c] text-[15px] font-medium text-white shadow-[0_4px_12px_rgba(17,138,140,0.25)] disabled:opacity-50"
              disabled={isSaving || isLoading}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "SAVING..." : "SAVE EXPENSE"}
            </button>
            <button
              className="h-[36px] rounded-[3px] border border-[#ff6767] bg-white text-[15px] font-medium text-[#ff4d4f]"
              onClick={() => resetForm()}
              type="button"
            >
              RESET
            </button>
          </div>
        </div>
      </section>

      {isExpenseHeadModalOpen ? <ExpenseHeadModal onClose={() => setIsExpenseHeadModalOpen(false)} onSaved={handleExpenseHeadSaved} /> : null}
    </>
  );
}
