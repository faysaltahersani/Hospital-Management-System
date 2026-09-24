import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";


const taxOptions = [
  { value: "0", label: "Select Taxes" },
  { value: "5", label: "VAT 5%" },
  { value: "10", label: "VAT 10%" },
  { value: "15", label: "VAT 15%" },
];

const rowTaxOptions = [
  { value: "0", label: "Tax Rate" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "15", label: "15%" },
];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function Frame({ children, className = "", label }) {
  return (
    <div className={`relative min-w-0 rounded-[3px] border border-[#c7d0d5] bg-white pt-[4px] ${className}`}>
      {label ? (
        <span className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[10px] leading-none text-[#7f8990]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function TextInput({ className = "", onChange, placeholder = "", readOnly = false, type = "text", value = "" }) {
  return (
    <input
      className={`h-[32px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#7f8990] ${
        readOnly ? "bg-[#f5f8fa] text-[#6c777e]" : ""
      } ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function TextArea({ className = "", onChange, placeholder = "", value = "" }) {
  return (
    <textarea
      className={`min-h-[72px] w-full resize-none rounded-[3px] border-0 bg-white px-3 py-2 text-[13px] text-[#25333b] outline-none placeholder:text-[#7f8990] ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SelectInput({ onChange, options, placeholder, value = "" }) {
  return (
    <select
      className="h-[32px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#6d787f] outline-none"
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 9px center",
      }}
      value={value}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const normalized = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

function SummaryField({ label, value }) {
  return (
    <Frame label={label}>
      <TextInput readOnly value={value} />
    </Frame>
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

const createEmptyRow = () => ({
  id: Date.now() + Math.random(),
  medicine_id: "",
  return_price: "",
  quantity: "1",
  batch_no: "",
  expiry_date: "",
  tax_rate: "0",
});

const createInitialForm = () => ({
  return_code: "",
  returned_at: formatDateInput(),
  supplier_id: "",
  notes: "",
  discount_percent: "0",
  tax_rate: "0",
  selected_account: "cash",
  payment_amount: "",
});

const DEFAULT_ACCOUNTS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
  { value: "Card", label: "Card" },
  { value: "Mobile Banking", label: "Mobile Banking" },
];

export function PharmacyPurchaseReturnPage() {
  const [form, setForm] = useState(createInitialForm);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [rows, setRows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === String(form.supplier_id)),
    [form.supplier_id, suppliers]
  );

  const enrichedRows = useMemo(
    () =>
      rows.map((row) => {
        const quantity = Number(row.quantity || 0);
        const returnPrice = Number(row.return_price || 0);
        const rowTaxRate = Number(row.tax_rate || 0);
        const baseTotal = quantity * returnPrice;
        const taxAmount = (baseTotal * rowTaxRate) / 100;
        const total = baseTotal + taxAmount;
        return { ...row, tax_amount: taxAmount, total };
      }),
    [rows]
  );

  const subtotal = enrichedRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const discountAmount = (subtotal * Number(form.discount_percent || 0)) / 100;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = (afterDiscount * Number(form.tax_rate || 0)) / 100;
  const totalAmount = Math.max(afterDiscount + taxAmount, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = Math.max(totalAmount - totalPaid, 0);

  const loadPageData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [suppliersResponse, medicinesResponse, metaResponse, accountsResponse] = await Promise.all([
        apiRequest("/pharmacy/suppliers?limit=100"),
        apiRequest("/pharmacy/medicines?limit=100"),
        apiRequest("/pharmacy/purchase-returns/meta"),
        apiRequest("/billing/accounts?limit=100"),
      ]);
      const nextCode = metaResponse.data?.next_return_code || "";
      const fetchedAccounts = (accountsResponse.data || []).map((a) => ({ value: a.name, label: a.name }));
      const loadedAccounts = fetchedAccounts.length > 0 ? fetchedAccounts : DEFAULT_ACCOUNTS;
      setSuppliers(suppliersResponse.data || []);
      setMedicines((medicinesResponse.data || []).filter((medicine) => medicine.is_active !== false));
      setAccounts(loadedAccounts);
      setForm((current) => ({
        ...current,
        return_code: nextCode,
        selected_account:
          current.selected_account && loadedAccounts.some((account) => account.value === current.selected_account)
            ? current.selected_account
            : loadedAccounts[0]?.value || "Cash",
      }));
      return nextCode;
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pharmacy purchase return form data");
      return "";
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addMedicineRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
  };

  const updateRow = (rowId, field, value) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        if (field === "medicine_id") {
          const medicine = medicines.find((item) => String(item.id) === String(value));
          return {
            ...row,
            medicine_id: value,
            return_price: medicine ? String(medicine.purchase_price || "") : row.return_price,
            expiry_date: medicine?.expiry_date || row.expiry_date,
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const removeRow = (rowId) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const addPayment = () => {
    setErrorMessage("");
    setSuccessMessage("");
    const amount = Number(form.payment_amount || 0);
    if (!form.selected_account) {
      setErrorMessage("Select an account before adding payment.");
      return;
    }
    if (amount <= 0) {
      setErrorMessage("Payment amount must be greater than 0.");
      return;
    }
    if (totalPaid + amount > totalAmount) {
      setErrorMessage("Payment amount cannot exceed the purchase return total.");
      return;
    }
    setPayments((current) => [...current, { account_name: form.selected_account, amount }]);
    setForm((current) => ({ ...current, payment_amount: "" }));
  };

  const removePayment = (indexToRemove) => {
    setPayments((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const resetForm = () => {
    setForm({
      ...createInitialForm(),
      return_code: form.return_code,
    });
    setRows([]);
    setPayments([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.supplier_id) {
      setErrorMessage("Select a supplier before saving.");
      return;
    }
    if (!rows.length) {
      setErrorMessage("Add at least one medicine row before saving.");
      return;
    }

    const invalidRow = rows.find((row) => !row.medicine_id || Number(row.quantity || 0) <= 0 || Number(row.return_price || 0) < 0);
    if (invalidRow) {
      setErrorMessage("Each medicine row requires medicine, quantity, and return price.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/pharmacy/purchase-returns", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: Number(form.supplier_id),
          returned_at: form.returned_at,
          discount_percent: Number(form.discount_percent || 0),
          tax_rate: Number(form.tax_rate || 0),
          notes: form.notes.trim() || null,
          payment_details: payments,
          items: rows.map((row) => ({
            medicine_id: Number(row.medicine_id),
            quantity: Number(row.quantity),
            return_price: Number(row.return_price || 0),
            batch_no: row.batch_no.trim() || null,
            expiry_date: row.expiry_date || null,
            tax_rate: Number(row.tax_rate || 0),
          })),
        }),
      });

      const nextCode = await loadPageData();
      setRows([]);
      setPayments([]);
      setForm({ ...createInitialForm(), return_code: nextCode });
      setSuccessMessage(`Pharmacy purchase return ${response.data?.return_code || ""} saved successfully.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save pharmacy purchase return");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[5px] border border-[#d6e2e7] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="space-y-4">
          {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
          {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

          <div className="rounded-[3px] bg-[#dff3f4] px-3 py-2 text-[15px] text-[#223039]">PHARMACY PURCHASE RETURN ENTRY</div>

          <div className="grid grid-cols-[180px_180px_170px_minmax(260px,1fr)] items-start gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            <Frame label="Bill No">
              <TextInput readOnly value={form.return_code} />
            </Frame>
            <Frame label="Created Date">
              <TextInput onChange={(event) => updateForm("returned_at", event.target.value)} type="date" value={form.returned_at} />
            </Frame>
            <div className="relative">
              <Frame label="Supplier">
                <SelectInput
                  onChange={(event) => updateForm("supplier_id", event.target.value)}
                  options={suppliers.map((supplier) => ({
                    value: String(supplier.id),
                    label: supplier.name,
                  }))}
                  placeholder={isLoading ? "Loading suppliers..." : "Select Supplier"}
                  value={form.supplier_id}
                />
              </Frame>
              <button className="absolute -top-1 right-0 text-[20px] leading-none text-[#2376da]" type="button">
                +
              </button>
            </div>
            <div className="rounded-[3px] bg-[#f2f2f2] px-4 py-3 text-[13px] text-[#1f2c33]">
              <span className="mr-6">Name: {selectedSupplier?.name || "-"}</span>
              <span className="mr-6">Code: {selectedSupplier?.supplier_code || "-"}</span>
              <span className="mr-6">Contact No: {selectedSupplier?.phone || "-"}</span>
              <span>Address: {selectedSupplier?.address || "-"}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#223039]">
              <span className="h-px flex-1 bg-[#d7dfe4]" />
              <span>ADD MEDICINES</span>
              <span className="h-px flex-1 bg-[#d7dfe4]" />
            </div>

            <div className="mt-4 overflow-hidden rounded-[3px] border border-[#dbe6eb]">
              <div className="grid grid-cols-[50px_minmax(170px,1.8fr)_110px_80px_110px_120px_100px_90px_90px_70px] items-center gap-3 bg-[#e7f4f4] px-3 py-2 text-[12px] text-[#2a3940] max-lg:hidden">
                <span>SL</span>
                <span>Medicine</span>
                <span>Return Price</span>
                <span>QTY</span>
                <span>Batch No</span>
                <span>Exp Date</span>
                <span>Tax Rate</span>
                <span>Tax Amt</span>
                <span>Total</span>
                <span>Remove</span>
              </div>

              {enrichedRows.length ? (
                enrichedRows.map((row, index) => (
                  <div
                    className="grid grid-cols-[50px_minmax(170px,1.8fr)_110px_80px_110px_120px_100px_90px_90px_70px] items-center gap-3 border-t border-[#dbe6eb] px-3 py-3 max-lg:grid-cols-1"
                    key={row.id}
                  >
                    <span className="text-[13px] text-[#24333b]">{index + 1}</span>
                    <Frame>
                      <SelectInput
                        onChange={(event) => updateRow(row.id, "medicine_id", event.target.value)}
                        options={medicines.map((medicine) => ({
                          value: String(medicine.id),
                          label: `${medicine.name} (${medicine.code})`,
                        }))}
                        placeholder="Search Medicine"
                        value={row.medicine_id}
                      />
                    </Frame>
                    <Frame>
                      <TextInput onChange={(event) => updateRow(row.id, "return_price", event.target.value)} value={row.return_price} />
                    </Frame>
                    <Frame>
                      <TextInput onChange={(event) => updateRow(row.id, "quantity", event.target.value)} type="number" value={row.quantity} />
                    </Frame>
                    <Frame>
                      <TextInput onChange={(event) => updateRow(row.id, "batch_no", event.target.value)} value={row.batch_no} />
                    </Frame>
                    <Frame>
                      <TextInput onChange={(event) => updateRow(row.id, "expiry_date", event.target.value)} type="date" value={row.expiry_date} />
                    </Frame>
                    <Frame>
                      <SelectInput
                        onChange={(event) => updateRow(row.id, "tax_rate", event.target.value)}
                        options={rowTaxOptions}
                        placeholder="Tax Rate"
                        value={row.tax_rate}
                      />
                    </Frame>
                    <Frame>
                      <TextInput readOnly value={formatMoney(row.tax_amount)} />
                    </Frame>
                    <Frame>
                      <TextInput readOnly value={formatMoney(row.total)} />
                    </Frame>
                    <button className="justify-self-center text-[#ff2b2b]" onClick={() => removeRow(row.id)} type="button">
                      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 16 16">
                        <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-[13px] text-[#6f7b84]">No medicine row added yet.</div>
              )}
            </div>

            <button className="mt-3 rounded-[3px] border border-[#80b2f2] px-4 py-2 text-[12px] font-semibold text-[#1f73de]" onClick={addMedicineRow} type="button">
              ADD MORE MEDICINE
            </button>
          </div>

          <div className="grid grid-cols-[minmax(240px,1fr)_minmax(420px,2.05fr)] gap-3 max-lg:grid-cols-1">
            <div>
              <Frame>
                <TextArea onChange={(event) => updateForm("notes", event.target.value)} placeholder="Note" value={form.notes} />
              </Frame>
            </div>

            <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
              <SummaryField label="Sub Total Amount" value={formatMoney(subtotal)} />
              <Frame label="Discount %">
                <TextInput onChange={(event) => updateForm("discount_percent", event.target.value)} type="number" value={form.discount_percent} />
              </Frame>
              <SummaryField label="Discount Amount" value={formatMoney(discountAmount)} />
              <SummaryField label="After Discount" value={formatMoney(afterDiscount)} />
              <Frame>
                <SelectInput onChange={(event) => updateForm("tax_rate", event.target.value)} options={taxOptions} placeholder="Select Taxes" value={form.tax_rate} />
              </Frame>
              <SummaryField label="Tax Amount" value={formatMoney(taxAmount)} />
              <SummaryField label="Paid Amount" value={formatMoney(totalPaid)} />
              <SummaryField label="Due Amount" value={formatMoney(dueAmount)} />
              <SummaryField label="Total Amount" value={formatMoney(totalAmount)} />
            </div>
          </div>

          <div className="ml-auto max-w-[820px] rounded-[4px] border border-[#cde0e7]">
            <div className="bg-[#e7f4f4] px-3 py-2 text-[13px] font-semibold text-[#1f2c33]">Add Payment</div>
            <div className="p-3">
              <div className="grid grid-cols-[minmax(200px,1.4fr)_160px_100px] gap-3 max-md:grid-cols-1">
                <Frame>
                  <SelectInput
                    onChange={(event) => updateForm("selected_account", event.target.value)}
                    options={accounts}
                    placeholder={isLoading ? "Loading accounts..." : "Select Account"}
                    value={form.selected_account}
                  />
                </Frame>
                <Frame>
                  <TextInput onChange={(event) => updateForm("payment_amount", event.target.value)} placeholder="Amount" type="number" value={form.payment_amount} />
                </Frame>
                <button className="h-[34px] self-start rounded-[3px] bg-[#b4beb4] px-6 text-[12px] font-semibold text-[#182126]" onClick={addPayment} type="button">
                  ADD
                </button>
              </div>

              {payments.length ? (
                <div className="mt-3 space-y-2">
                  {payments.map((payment, index) => (
                    <div className="flex items-center justify-between rounded-[3px] border border-[#dbe6eb] px-3 py-2 text-[12px] text-[#25333b]" key={`${payment.account_name}-${index}`}>
                      <span>
                        {payment.account_name}: {formatMoney(payment.amount)}
                      </span>
                      <button className="text-[#ff4e4e]" onClick={() => removePayment(index)} type="button">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 text-[14px] text-[#1f2c33]">
                Total Paid: <span className="font-semibold">{formatMoney(totalPaid)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="rounded-[3px] border border-[#ff8c8c] px-4 py-2 text-[12px] font-medium text-[#ff4e4e]" onClick={resetForm} type="button">
              RESET
            </button>
            <button className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50" disabled={isSaving} onClick={handleSave} type="button">
              {isSaving ? "SAVING..." : "SAVE BILL"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
