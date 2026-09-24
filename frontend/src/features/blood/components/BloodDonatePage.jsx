import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

const TAX_OPTIONS = [
  { value: "0", label: "Tax Rate" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "15", label: "15%" },
];
const DEFAULT_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_UNITS = ["ml", "Bag", "Unit"];
const DEFAULT_ACCOUNTS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
  { value: "bKash", label: "bKash" },
  { value: "Nagad", label: "Nagad" },
  { value: "Card", label: "Card" },
];
const GENDER_OPTIONS = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function Box({ children, className = "", label }) {
  return (
    <div className={`relative min-w-0 rounded-[2px] border border-[#c7d0d5] bg-white pt-[4px] ${className}`}>
      {label ? (
        <span className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[9px] leading-none text-[#7f8990]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function Input({
  className = "",
  disabled = false,
  hasError = false,
  onChange,
  placeholder = "",
  readOnly = false,
  type = "text",
  value = "",
}) {
  return (
    <input
      className={`h-[26px] w-full rounded-[2px] px-3 text-[13px] text-[#26343b] outline-none placeholder:text-[#7f8990] ${
        hasError ? "border border-[#ff5a5a]" : "border-0"
      } ${readOnly || disabled ? "bg-[#f5f8fa] text-[#6b757b]" : ""} ${className}`}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function Select({ disabled = false, hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[26px] w-full appearance-none rounded-[2px] bg-right bg-no-repeat px-3 pr-8 text-[13px] outline-none ${
        hasError ? "border border-[#ff5a5a] text-[#ff5a5a]" : "border-0 text-[#6d787f]"
      } ${disabled ? "bg-[#f5f8fa]" : "bg-white"}`}
      disabled={disabled}
      onChange={onChange}
      value={value}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23717d84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 9px center",
      }}
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

function SectionHeading({ children }) {
  return <h2 className="border-b border-[#dde5e8] pb-2 text-[14px] font-semibold text-[#1f2c33]">{children}</h2>;
}

function MessageBanner({ tone = "error", children }) {
  return (
    <div
      className={`mb-4 rounded-[4px] border px-3 py-2 text-[13px] ${
        tone === "error"
          ? "border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]"
          : "border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
      }`}
    >
      {children}
    </div>
  );
}

function AddDonorModal({
  bloodGroups,
  errorMessage,
  form,
  hasAttemptedSave,
  isSaving,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
      <div className="w-full max-w-[480px] rounded-[6px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        <div className="border-b border-[#e8edf0] px-5 py-4 text-[15px] font-semibold text-[#1f2c33]">Add Donor</div>

        <div className="px-5 py-4">
          {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <Box>
              <Input
                hasError={hasAttemptedSave && !form.full_name.trim()}
                onChange={(event) => onChange("full_name", event.target.value)}
                placeholder="Name *"
                value={form.full_name}
              />
            </Box>
            <Box>
              <Select
                hasError={hasAttemptedSave && !form.gender}
                onChange={(event) => onChange("gender", event.target.value)}
                options={GENDER_OPTIONS.filter((option) => option.value)}
                placeholder="Gender *"
                value={form.gender}
              />
            </Box>
            <Box>
              <Select
                hasError={hasAttemptedSave && !form.blood_group}
                onChange={(event) => onChange("blood_group", event.target.value)}
                options={bloodGroups}
                placeholder="Blood Group *"
                value={form.blood_group}
              />
            </Box>
            <Box>
              <Input onChange={(event) => onChange("date_of_birth", event.target.value)} type="date" value={form.date_of_birth} />
            </Box>
            <Box>
              <Input onChange={(event) => onChange("phone", event.target.value)} placeholder="Contact No" value={form.phone} />
            </Box>
            <Box>
              <Input onChange={(event) => onChange("email", event.target.value)} placeholder="Email" value={form.email} />
            </Box>
            <Box className="col-span-2 max-sm:col-span-1">
              <Input onChange={(event) => onChange("address", event.target.value)} placeholder="Address" value={form.address} />
            </Box>
            <Box className="col-span-2 max-sm:col-span-1">
              <Input onChange={(event) => onChange("notes", event.target.value)} placeholder="Notes" value={form.notes} />
            </Box>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#edf2f5] px-5 py-4">
          <button className="rounded-[3px] border border-[#ff8c8c] px-4 py-2 text-[11px] font-medium text-[#ff4e4e]" onClick={onClose} type="button">
            CANCEL
          </button>
          <button
            className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[11px] font-medium text-white shadow-[0_2px_6px_rgba(35,118,218,0.28)] disabled:opacity-50"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "SAVE DONOR"}
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyDonorForm = {
  full_name: "",
  gender: "",
  blood_group: "",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const createInitialForm = () => ({
  date: formatDateInput(),
  donor_id: "",
  blood_group: "",
  institution: "",
  bag_code: "",
  volume_ml: "450",
  unit_name: "ml",
  lot_no: "",
  charge: "",
  discount_percent: "0",
  tax_rate: "0",
  note: "",
  selected_account: "Cash",
  payment_amount: "",
});

export function BloodDonatePage() {
  const [form, setForm] = useState(createInitialForm);
  const [donors, setDonors] = useState([]);
  const [bloodGroups, setBloodGroups] = useState(DEFAULT_GROUPS);
  const [units, setUnits] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isAddDonorOpen, setIsAddDonorOpen] = useState(false);
  const [newDonor, setNewDonor] = useState(emptyDonorForm);
  const [donorErrorMessage, setDonorErrorMessage] = useState("");
  const [isSavingDonor, setIsSavingDonor] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [hasAttemptedDonorSave, setHasAttemptedDonorSave] = useState(false);

  const selectedDonor = useMemo(
    () => donors.find((donor) => String(donor.id) === String(form.donor_id)),
    [donors, form.donor_id]
  );

  const chargeAmount = Number(form.charge || 0);
  const discountPercent = Number(form.discount_percent || 0);
  const taxRate = Number(form.tax_rate || 0);
  const discountAmount = (chargeAmount * discountPercent) / 100;
  const taxableAmount = Math.max(chargeAmount - discountAmount, 0);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = Math.max(taxableAmount + taxAmount, 0);
  const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    setErrorMessage("");

    try {
      const [donorsResponse, groupsResponse, unitsResponse, accountsResponse] = await Promise.all([
        apiRequest("/blood-bank/donors?limit=100&is_active=true"),
        apiRequest("/blood-bank/groups?limit=100"),
        apiRequest("/blood-bank/units?limit=100"),
        apiRequest("/billing/accounts?limit=100"),
      ]);

      setDonors(donorsResponse.data || []);
      const configuredGroups = (groupsResponse.data || []).map((group) => group.name).filter(Boolean);
      setBloodGroups([...new Set([...DEFAULT_GROUPS, ...configuredGroups])]);
      setUnits((unitsResponse.data || []).map((unit) => unit.name).filter(Boolean));
      const fetchedAccounts = (accountsResponse.data || []).map((account) => ({
        value: account.name,
        label: account.name,
      }));
      const accountOptions = fetchedAccounts.length > 0 ? fetchedAccounts : DEFAULT_ACCOUNTS;
      setAccounts(accountOptions);
      setForm((current) => ({
        ...current,
        selected_account:
          current.selected_account && accountOptions.some((account) => account.value === current.selected_account)
            ? current.selected_account
            : accountOptions[0]?.value || "Cash",
      }));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load blood donate form data");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (selectedDonor?.blood_group) {
      setForm((current) => ({ ...current, blood_group: selectedDonor.blood_group }));
    }
  }, [selectedDonor]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      ...createInitialForm(),
      selected_account: accounts[0]?.value || "",
    });
    setPayments([]);
    setErrorMessage("");
    setSuccessMessage("");
    setHasAttemptedSave(false);
  };

  const addPayment = () => {
    setErrorMessage("");
    setSuccessMessage("");

    const inputVal = String(form.payment_amount || "").trim();
    const amount = inputVal !== "" ? Number(inputVal) : dueAmount;
    if (!form.selected_account) {
      setErrorMessage("Select an account before adding a payment.");
      return;
    }
    if (amount <= 0) {
      setErrorMessage("Payment amount must be greater than 0.");
      return;
    }
    if (totalAmount > 0 && paidAmount + amount > totalAmount) {
      setErrorMessage("Payment amount cannot exceed the total amount.");
      return;
    }

    setPayments((current) => [
      ...current,
      { account_name: form.selected_account, amount: Number(amount.toFixed(2)) },
    ]);
    updateForm("payment_amount", "");
  };

  const removePayment = (indexToRemove) => {
    setPayments((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.blood_group) {
      setErrorMessage("Blood group is required.");
      return;
    }
    if (!form.volume_ml || Number(form.volume_ml) <= 0) {
      setErrorMessage("Volume must be greater than 0.");
      return;
    }
    if (!form.unit_name) {
      setErrorMessage("Select a unit before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const collectedAtDate = new Date(`${form.date}T12:00:00`);
      const expiresAtDate = new Date(collectedAtDate.getTime() + 35 * 24 * 60 * 60 * 1000);

      const response = await apiRequest("/blood-bank/bags", {
        method: "POST",
        body: JSON.stringify({
          bag_code: form.bag_code.trim() || null,
          donor_id: form.donor_id ? Number(form.donor_id) : null,
          blood_group: form.blood_group,
          institution: form.institution.trim() || null,
          component: "whole_blood",
          volume_ml: Number(form.volume_ml),
          unit_name: form.unit_name,
          lot_no: form.lot_no.trim() || null,
          collected_at: collectedAtDate.toISOString(),
          expires_at: expiresAtDate.toISOString(),
          price: Number(totalAmount.toFixed(2)),
          charge: Number(chargeAmount.toFixed(2)),
          discount_percent: Number(discountPercent.toFixed(2)),
          discount_amount: Number(discountAmount.toFixed(2)),
          tax_rate: Number(taxRate.toFixed(2)),
          tax_amount: Number(taxAmount.toFixed(2)),
          total_amount: Number(totalAmount.toFixed(2)),
          paid_amount: Number(paidAmount.toFixed(2)),
          due_amount: Number(dueAmount.toFixed(2)),
          payment_details: payments,
          notes: form.note.trim() || null,
        }),
      });

      const savedBag = response.data || {};
      const msg = `Blood bag ${savedBag.bag_code || ""} saved successfully.`;
      setSuccessMessage(msg);
      showSuccess("Success!", msg);
      resetForm();
      await loadMeta();
    } catch (error) {
      const errMsg = error.message || "Failed to save blood donation";
      setErrorMessage(errMsg);
      showError("Error!", errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDonor = async () => {
    setHasAttemptedDonorSave(true);
    setDonorErrorMessage("");

    if (!newDonor.full_name.trim()) {
      setDonorErrorMessage("Donor name is required.");
      return;
    }
    if (!newDonor.gender) {
      setDonorErrorMessage("Gender is required.");
      return;
    }
    if (!newDonor.blood_group) {
      setDonorErrorMessage("Blood group is required.");
      return;
    }

    setIsSavingDonor(true);
    try {
      const response = await apiRequest("/blood-bank/donors", {
        method: "POST",
        body: JSON.stringify({
          full_name: newDonor.full_name.trim(),
          gender: newDonor.gender,
          blood_group: newDonor.blood_group,
          date_of_birth: newDonor.date_of_birth || null,
          phone: newDonor.phone.trim() || null,
          email: newDonor.email.trim() || null,
          address: newDonor.address.trim() || null,
          notes: newDonor.notes.trim() || null,
          is_active: true,
        }),
      });

      const createdDonor = response.data;
      setDonors((current) => [createdDonor, ...current]);
      setForm((current) => ({
        ...current,
        donor_id: String(createdDonor.id),
        blood_group: createdDonor.blood_group || current.blood_group,
      }));
      setIsAddDonorOpen(false);
      setNewDonor(emptyDonorForm);
      setHasAttemptedDonorSave(false);
      showSuccess("Donor Saved", `Donor ${createdDonor.full_name} saved successfully.`);
    } catch (error) {
      const errMsg = error.message || "Failed to save donor";
      setDonorErrorMessage(errMsg);
      showError("Error!", errMsg);
    } finally {
      setIsSavingDonor(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="mx-auto max-w-[870px] rounded-[8px] border border-[#d6dfe4] bg-white p-4 shadow-[0_6px_16px_rgba(22,36,45,0.1)]">
        <h1 className="mb-5 text-[15px] font-semibold text-[#1f2c33]">Blood Donate Entry</h1>

        {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
        {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

        <SectionHeading>Basic Information</SectionHeading>
        <div className="mt-3 grid grid-cols-[200px_1fr_34px_200px] gap-3 max-md:grid-cols-1">
          <Box label="Date">
            <div className="relative">
              <Input onChange={(event) => updateForm("date", event.target.value)} type="date" value={form.date} />
            </div>
          </Box>

          <Box>
            <Select
              disabled={isLoadingMeta}
              onChange={(event) => updateForm("donor_id", event.target.value)}
              options={donors.map((donor) => ({
                value: String(donor.id),
                label: `${donor.donor_code || `#${donor.id}`} - ${donor.full_name}`,
              }))}
              placeholder={isLoadingMeta ? "Loading donors..." : "Donor"}
              value={form.donor_id}
            />
          </Box>

          <button
            className="mt-[4px] h-[30px] self-start rounded-[3px] bg-[#2479dc] text-[18px] leading-none font-medium text-white shadow-[0_2px_5px_rgba(36,121,220,0.28)]"
            onClick={() => {
              setDonorErrorMessage("");
              setNewDonor(emptyDonorForm);
              setHasAttemptedDonorSave(false);
              setIsAddDonorOpen(true);
            }}
            type="button"
          >
            +
          </button>

          <Box>
            <Select
              disabled={isLoadingMeta}
              hasError={hasAttemptedSave && !form.blood_group}
              onChange={(event) => updateForm("blood_group", event.target.value)}
              options={bloodGroups}
              placeholder={isLoadingMeta ? "Loading groups..." : "Blood Group"}
              value={form.blood_group}
            />
          </Box>
        </div>

        <div className="mt-3 max-w-[200px]">
          <Box>
            <Input onChange={(event) => updateForm("institution", event.target.value)} placeholder="Institution" value={form.institution} />
          </Box>
        </div>

        <div className="mt-6">
          <SectionHeading>Blood Collection Details</SectionHeading>
          <div className="mt-3 grid grid-cols-[200px_130px_200px_130px] gap-3 max-md:grid-cols-1">
            <Box label="Bag Number">
              <Input onChange={(event) => updateForm("bag_code", event.target.value)} placeholder="Bag Number" value={form.bag_code} />
            </Box>

            <Box>
              <Input
                hasError={hasAttemptedSave && (!form.volume_ml || Number(form.volume_ml) <= 0)}
                onChange={(event) => updateForm("volume_ml", event.target.value)}
                placeholder="Volume (ml)"
                type="number"
                value={form.volume_ml}
              />
            </Box>

            <Box>
              <Select
                disabled={isLoadingMeta}
                hasError={hasAttemptedSave && !form.unit_name}
                onChange={(event) => updateForm("unit_name", event.target.value)}
                options={units}
                placeholder={isLoadingMeta ? "Loading unit..." : "Unit"}
                value={form.unit_name}
              />
            </Box>

            <Box>
              <Input onChange={(event) => updateForm("lot_no", event.target.value)} placeholder="Lot No" value={form.lot_no} />
            </Box>
          </div>
        </div>

        <div className="mt-6">
          <SectionHeading>Charge & Tax</SectionHeading>
          <div className="mt-3 grid grid-cols-[200px_130px_130px_200px_130px] gap-3 max-lg:grid-cols-3 max-md:grid-cols-1">
            <Box>
              <Input onChange={(event) => updateForm("charge", event.target.value)} placeholder="Charge" type="number" value={form.charge} />
            </Box>

            <Box>
              <Input
                onChange={(event) => updateForm("discount_percent", event.target.value)}
                placeholder="Discount %"
                type="number"
                value={form.discount_percent}
              />
            </Box>

            <Box label="Discount Amount">
              <Input readOnly value={formatMoney(discountAmount)} />
            </Box>

            <Box>
              <Select
                onChange={(event) => updateForm("tax_rate", event.target.value)}
                options={TAX_OPTIONS.slice(1)}
                placeholder="Tax Rate"
                value={form.tax_rate}
              />
            </Box>

            <Box label="Tax Amount">
              <Input readOnly value={formatMoney(taxAmount)} />
            </Box>
          </div>

          <div className="mt-3 grid grid-cols-[130px_130px_130px] gap-3 max-md:grid-cols-1">
            <Box label="Total">
              <Input readOnly value={formatMoney(totalAmount)} />
            </Box>

            <Box label="Paid">
              <Input readOnly value={formatMoney(paidAmount)} />
            </Box>

            <Box label="Due">
              <Input readOnly value={formatMoney(dueAmount)} />
            </Box>
          </div>

          <div className="mt-3">
            <Box>
              <Input className="h-[24px]" onChange={(event) => updateForm("note", event.target.value)} placeholder="Note" value={form.note} />
            </Box>
          </div>
        </div>

        <div className="mt-6">
          <SectionHeading>Payment</SectionHeading>
          <div className="mt-3 grid grid-cols-[240px_200px_140px] gap-3 max-md:grid-cols-1">
            <Box>
              <Select
                onChange={(event) => updateForm("selected_account", event.target.value)}
                options={accounts}
                placeholder={isLoadingMeta ? "Loading accounts..." : "Account"}
                value={form.selected_account}
              />
            </Box>

            <Box>
              <Input
                onChange={(event) => updateForm("payment_amount", event.target.value)}
                placeholder={dueAmount > 0 ? String(dueAmount) : "Amount"}
                type="number"
                value={form.payment_amount}
              />
            </Box>

            <button
              className="mt-[4px] h-[30px] self-start rounded-[3px] bg-[#2376da] text-[11px] font-semibold tracking-[0.04em] text-white shadow-[0_2px_6px_rgba(35,118,218,0.26)]"
              onClick={addPayment}
              type="button"
            >
              ADD
            </button>
          </div>

          {payments.length ? (
            <div className="mt-3 space-y-2">
              {payments.map((payment, index) => (
                <div className="flex items-center justify-between rounded-[4px] bg-[#f6f8f9] px-3 py-2 text-[12px] text-[#314049]" key={`${payment.account_name}-${index}`}>
                  <span>
                    {payment.account_name} - {formatMoney(payment.amount)}
                  </span>
                  <button className="text-[#ff4e4e]" onClick={() => removePayment(index)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-3">
        <button
          className="rounded-[3px] border border-[#ff8c8c] px-4 py-2 text-[11px] font-medium text-[#ff4e4e]"
          onClick={resetForm}
          type="button"
        >
          RESET
        </button>
        <button
          className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[11px] font-medium text-white shadow-[0_2px_6px_rgba(35,118,218,0.28)] disabled:opacity-50"
          disabled={isSaving || isLoadingMeta}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
      </div>

      {isAddDonorOpen ? (
        <AddDonorModal
          bloodGroups={bloodGroups}
          errorMessage={donorErrorMessage}
          form={newDonor}
          hasAttemptedSave={hasAttemptedDonorSave}
          isSaving={isSavingDonor}
          onChange={(field, value) => setNewDonor((current) => ({ ...current, [field]: value }))}
          onClose={() => setIsAddDonorOpen(false)}
          onSave={handleSaveDonor}
        />
      ) : null}
    </section>
  );
}
