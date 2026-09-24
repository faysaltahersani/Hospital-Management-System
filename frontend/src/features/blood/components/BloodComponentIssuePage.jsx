import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";
const DEFAULT_ACCOUNTS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
  { value: "bKash", label: "bKash" },
  { value: "Nagad", label: "Nagad" },
  { value: "Card", label: "Card" },
];
const TAX_OPTIONS = [
  { value: "0", label: "Tax Rate" },
  { value: "5", label: "5%" },
  { value: "10", label: "10%" },
  { value: "15", label: "15%" },
];

const COMPONENT_LABELS = {
  whole_blood: "Whole Blood",
  rbc: "RBC",
  plasma: "FFP (Plasma)",
  platelets: "Platelets",
  cryo: "Cryo",
};

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

function TextField({ className = "", hasError = false, onChange, placeholder = "", readOnly = false, type = "text", value = "" }) {
  return (
    <input
      className={`h-[28px] w-full rounded-[2px] border-0 bg-white px-3 text-[13px] text-[#26343b] outline-none placeholder:text-[#7f8990] ${
        hasError ? "border border-[#ff5f5f]" : ""
      } ${readOnly ? "bg-[#f6f8f9] text-[#6c777e]" : ""} ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function SelectField({ className = "", hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[28px] w-full appearance-none rounded-[2px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] outline-none ${
        hasError ? "border border-[#ff5f5f] text-[#ff5f5f]" : "text-[#6d787f]"
      } ${className}`}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23717d84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
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

function SectionCard({ children, title }) {
  return (
    <section className="rounded-[4px] border border-[#d8e0e5] bg-white p-6 shadow-[0_3px_8px_rgba(22,36,45,0.08)]">
      <h2 className="border-b border-[#dde5e8] pb-2 text-[14px] font-semibold text-[#1f2c33]">{title}</h2>
      <div className="pt-3">{children}</div>
    </section>
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

const createInitialForm = () => ({
  date: formatDateInput(),
  patient_id: "",
  blood_group: "",
  bag_id: "",
  doctor_id: "",
  charge: "",
  discount_percent: "0",
  tax_rate: "0",
  note: "",
  selected_account: "",
  payment_amount: "",
});

export function BloodComponentIssuePage() {
  const [form, setForm] = useState(createInitialForm);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bags, setBags] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === String(form.patient_id)),
    [patients, form.patient_id]
  );

  const selectedBag = useMemo(
    () => bags.find((bag) => String(bag.id) === String(form.bag_id)),
    [bags, form.bag_id]
  );

  const componentOptions = useMemo(
    () =>
      bags.map((bag) => ({
        value: String(bag.id),
        label: `${bag.bag_code || `#${bag.id}`} (${bag.blood_group || ""}) - ${COMPONENT_LABELS[bag.component] || bag.component || "Component"}`,
      })),
    [bags]
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

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      setIsLoadingMeta(true);
      setErrorMessage("");

      try {
        const [patientsResponse, doctorsResponse, bagsResponse, accountsResponse] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/doctors?limit=100"),
          apiRequest("/blood-bank/bags?limit=100&status=available"),
          apiRequest("/billing/accounts?limit=100"),
        ]);

        if (!isMounted) return;
        setPatients(patientsResponse.data || []);
        setDoctors(doctorsResponse.data || []);
        setBags(bagsResponse.data || []);
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
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load component issue form data");
      } finally {
        if (isMounted) {
          setIsLoadingMeta(false);
        }
      }
    };

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBag) return;
    setForm((current) => ({
      ...current,
      blood_group: selectedBag.blood_group || current.blood_group,
      charge:
        String(current.charge || "").trim() === "" && selectedBag.price !== undefined && selectedBag.price !== null
          ? String(selectedBag.price || "")
          : current.charge,
    }));
  }, [selectedBag]);

  useEffect(() => {
    if (selectedPatient?.blood_group && !selectedBag) {
      setForm((current) => ({ ...current, blood_group: selectedPatient.blood_group || current.blood_group }));
    }
  }, [selectedPatient, selectedBag]);

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

    setPayments((current) => [...current, { account_name: form.selected_account, amount: Number(amount.toFixed(2)) }]);
    updateForm("payment_amount", "");
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.patient_id) {
      setErrorMessage("Patient is required.");
      return;
    }
    if (!form.bag_id) {
      setErrorMessage("Blood component is required.");
      return;
    }
    if (!form.doctor_id) {
      setErrorMessage("Doctor is required.");
      return;
    }
    if (!form.charge || Number(form.charge) <= 0) {
      setErrorMessage("Charge must be greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/blood-bank/issues", {
        method: "POST",
        body: JSON.stringify({
          bag_id: Number(form.bag_id),
          patient_id: Number(form.patient_id),
          doctor_id: Number(form.doctor_id),
          issued_to: selectedPatient?.full_name || null,
          issued_at: new Date(`${form.date}T12:00:00`).toISOString(),
          price: Number(totalAmount.toFixed(2)),
          payment_details: payments,
          notes: form.note.trim() || null,
        }),
      });

      const savedIssue = response.data || {};
      const msg = `Component issue ${savedIssue.issue_code || ""} saved successfully.`;
      setSuccessMessage(msg);
      showSuccess("Success!", msg);
      setBags((current) => current.filter((bag) => String(bag.id) !== String(form.bag_id)));
      resetForm();
    } catch (error) {
      const errMsg = error.message || "Failed to save component issue";
      setErrorMessage(errMsg);
      showError("Error!", errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] space-y-4 pt-[2px]">
      {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
      {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

      <SectionCard title="Patient Information">
        <div className="grid grid-cols-[200px_minmax(0,1fr)_130px] items-start gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <Frame label="Date">
            <TextField onChange={(event) => updateForm("date", event.target.value)} type="date" value={form.date} />
          </Frame>

          <Frame label="Patient">
            <SelectField
              className={selectedPatient ? "text-[#26343b]" : ""}
              onChange={(event) => updateForm("patient_id", event.target.value)}
              options={patients.map((patient) => ({
                value: String(patient.id),
                label: `${patient.patient_code || `#${patient.id}`} - ${patient.full_name}`,
              }))}
              placeholder={isLoadingMeta ? "Loading patients..." : "Search Patient"}
              value={form.patient_id}
            />
          </Frame>

          <Frame label="Blood Group">
            <TextField readOnly value={form.blood_group} />
          </Frame>
        </div>
      </SectionCard>

      <SectionCard title="Component Information">
        <div className="grid grid-cols-[minmax(0,1fr)_200px] items-start gap-3 max-md:grid-cols-1">
          <Frame label="Blood Component">
            <SelectField
              className={selectedBag ? "text-[#26343b]" : ""}
              hasError={hasAttemptedSave && !form.bag_id}
              onChange={(event) => updateForm("bag_id", event.target.value)}
              options={componentOptions}
              placeholder={isLoadingMeta ? "Loading components..." : "Blood Component"}
              value={form.bag_id}
            />
          </Frame>

          <Frame label="Doctor">
            <SelectField
              className={form.doctor_id ? "text-[#26343b]" : ""}
              hasError={hasAttemptedSave && !form.doctor_id}
              onChange={(event) => updateForm("doctor_id", event.target.value)}
              options={doctors.map((doctor) => ({
                value: String(doctor.id),
                label: doctor.user?.full_name || doctor.doctor_code || `Doctor #${doctor.id}`,
              }))}
              placeholder={isLoadingMeta ? "Loading doctors..." : "Doctor"}
              value={form.doctor_id}
            />
          </Frame>
        </div>
      </SectionCard>

      <SectionCard title="Billing Details">
        <div className="grid grid-cols-4 items-start gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <Frame label="Charge">
            <TextField
              hasError={hasAttemptedSave && (!form.charge || Number(form.charge) <= 0)}
              onChange={(event) => updateForm("charge", event.target.value)}
              type="number"
              value={form.charge}
            />
          </Frame>

          <Frame label="Discount %">
            <TextField onChange={(event) => updateForm("discount_percent", event.target.value)} type="number" value={form.discount_percent} />
          </Frame>

          <Frame label="Discount Amount">
            <TextField readOnly value={formatMoney(discountAmount)} />
          </Frame>

          <Frame label="Tax Rate">
            <SelectField
              onChange={(event) => updateForm("tax_rate", event.target.value)}
              options={TAX_OPTIONS.slice(1)}
              placeholder="Tax Rate"
              value={form.tax_rate}
            />
          </Frame>

          <Frame label="Tax Amount">
            <TextField readOnly value={formatMoney(taxAmount)} />
          </Frame>

          <Frame label="Total">
            <TextField readOnly value={formatMoney(totalAmount)} />
          </Frame>

          <Frame label="Paid">
            <TextField readOnly value={formatMoney(paidAmount)} />
          </Frame>

          <Frame label="Due">
            <TextField className="font-semibold text-[#1565c0]" readOnly value={formatMoney(dueAmount)} />
          </Frame>
        </div>

        <div className="mt-3">
          <Frame label="Note">
            <TextField className="h-[40px]" onChange={(event) => updateForm("note", event.target.value)} value={form.note} />
          </Frame>
        </div>
      </SectionCard>

      <SectionCard title="Payments">
        <div className="grid grid-cols-[1fr_200px_140px] items-start gap-3 max-md:grid-cols-1">
          <Frame label="Account">
            <SelectField
              onChange={(event) => updateForm("selected_account", event.target.value)}
              options={accounts}
              placeholder={isLoadingMeta ? "Loading accounts..." : "Select Account"}
              value={form.selected_account}
            />
          </Frame>

          <Frame label="Amount">
            <TextField
              onChange={(event) => updateForm("payment_amount", event.target.value)}
              placeholder={dueAmount > 0 ? String(dueAmount) : "Amount"}
              type="number"
              value={form.payment_amount}
            />
          </Frame>

          <button
            className="mt-[4px] h-[28px] self-start rounded-[3px] bg-[#2578cf] text-[11px] font-semibold tracking-[0.04em] text-white shadow-[0_2px_5px_rgba(37,120,207,0.3)]"
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
                <button className="text-[#ff4e4e]" onClick={() => setPayments((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <div className="flex justify-end">
        <button
          className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[11px] font-medium text-white shadow-[0_2px_6px_rgba(35,118,218,0.28)] disabled:opacity-50"
          disabled={isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
      </div>
    </section>
  );
}
