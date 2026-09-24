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
const GENDER_OPTIONS = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];
const MARITAL_STATUS_OPTIONS = [
  { value: "", label: "Marital Status" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "divorced", label: "Divorced" },
  { value: "other", label: "Other" },
];
const ID_TYPE_OPTIONS = [
  { value: "", label: "ID Type" },
  { value: "nid", label: "NID" },
  { value: "passport", label: "Passport" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other" },
];
const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Blood Group" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "unknown", label: "Unknown" },
];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function FieldFrame({ children, className = "", label }) {
  return (
    <div className={`relative min-w-0 rounded-[3px] border border-[#c6cfd4] bg-white pt-[4px] ${className}`}>
      {label ? (
        <span className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[10px] leading-none text-[#7f8a90]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function TextInput({
  className = "",
  hasError = false,
  list,
  onChange,
  placeholder = "",
  readOnly = false,
  type = "text",
  value = "",
}) {
  return (
    <input
      className={`h-[28px] w-full rounded-[3px] bg-white px-3 text-[14px] text-[#25333b] outline-none placeholder:text-[#7f8a90] ${
        hasError ? "border border-[#ff5f5f]" : "border-0"
      } ${readOnly ? "bg-[#f6f8f9] text-[#6c777e]" : ""} ${className}`}
      list={list}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function TextAreaInput({ className = "", onChange, placeholder = "", value = "" }) {
  return (
    <textarea
      className={`min-h-[62px] w-full resize-none rounded-[3px] bg-white px-3 py-2 text-[14px] text-[#25333b] outline-none placeholder:text-[#7f8a90] ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SelectInput({ className = "", hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[28px] w-full appearance-none rounded-[3px] bg-right bg-no-repeat px-3 pr-8 text-[14px] outline-none ${
        hasError ? "border border-[#ff5f5f] text-[#ff5f5f]" : "border-0 text-[#6d787f]"
      } ${className}`}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23717d84' d='M5 6 .67.75h8.66z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 11px center",
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

function RequiredText() {
  return <p className="pt-1 pl-2 text-[11px] text-[#ff5f5f]">Required</p>;
}

function GroupBox({ children, className = "" }) {
  return (
    <div className={`rounded-[6px] border border-[#d9e2e7] bg-[#fafcfd] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${className}`}>
      {children}
    </div>
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

function ModalField({ children, className = "", label }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-[12px] font-medium text-[#5f6d76]">{label}</span> : null}
      {children}
    </label>
  );
}

function PatientModal({ errorMessage, form, isSaving, onChange, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4">
      <div className="w-full max-w-[920px] rounded-[6px] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        <div className="border-b border-[#e8edf0] px-5 py-4 text-[15px] font-semibold text-[#1f2c33]">Add New Patient</div>

        <div className="px-5 py-4">
          {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}

          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
            <ModalField label="Patient Code">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput readOnly value={form.patient_code} />
              </div>
            </ModalField>
            <ModalField label="Name *">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("full_name", event.target.value)} placeholder="Enter patient name" value={form.full_name} />
              </div>
            </ModalField>
            <ModalField label="Contact No *">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("phone", event.target.value)} placeholder="Enter contact number" value={form.phone} />
              </div>
            </ModalField>
            <ModalField label="Age">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("age", event.target.value)} placeholder="Enter age" type="number" value={form.age} />
              </div>
            </ModalField>
            <ModalField label="Gender">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <SelectInput
                  onChange={(event) => onChange("gender", event.target.value)}
                  options={GENDER_OPTIONS.filter((option) => option.value)}
                  placeholder="Select gender"
                  value={form.gender}
                />
              </div>
            </ModalField>
            <ModalField label="Date of Birth">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("date_of_birth", event.target.value)} type="date" value={form.date_of_birth} />
              </div>
            </ModalField>
            <ModalField label="Blood Group">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <SelectInput
                  onChange={(event) => onChange("blood_group", event.target.value)}
                  options={BLOOD_GROUP_OPTIONS.filter((option) => option.value)}
                  placeholder="Select blood group"
                  value={form.blood_group}
                />
              </div>
            </ModalField>
            <ModalField label="Email">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("email", event.target.value)} placeholder="Enter email" type="email" value={form.email} />
              </div>
            </ModalField>
            <ModalField label="Guardian Name">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("emergency_contact_name", event.target.value)} placeholder="Enter guardian name" value={form.emergency_contact_name} />
              </div>
            </ModalField>
            <ModalField label="Guardian Contact No">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("emergency_contact_phone", event.target.value)} placeholder="Enter guardian contact number" value={form.emergency_contact_phone} />
              </div>
            </ModalField>
            <ModalField label="Marital Status">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <SelectInput onChange={(event) => onChange("marital_status", event.target.value)} options={MARITAL_STATUS_OPTIONS.filter((option) => option.value)} placeholder="Marital Status" value={form.marital_status} />
              </div>
            </ModalField>
            <ModalField label="ID Type">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <SelectInput onChange={(event) => onChange("id_type", event.target.value)} options={ID_TYPE_OPTIONS.filter((option) => option.value)} placeholder="ID Type" value={form.id_type} />
              </div>
            </ModalField>
            <ModalField label="ID Number">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("id_number", event.target.value)} placeholder="Enter ID number" value={form.id_number} />
              </div>
            </ModalField>
            <ModalField label="Remarks">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextInput onChange={(event) => onChange("remarks", event.target.value)} placeholder="Enter remarks" value={form.remarks} />
              </div>
            </ModalField>
            <ModalField className="col-span-4 max-lg:col-span-2 max-sm:col-span-1" label="Address">
              <div className="rounded-[4px] border border-[#cfd8de] bg-[#f9fbfc]">
                <TextAreaInput onChange={(event) => onChange("address", event.target.value)} placeholder="Enter address" value={form.address} />
              </div>
            </ModalField>
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
            {isSaving ? "SAVING..." : "SAVE PATIENT"}
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyPatientForm = {
  patient_code: "",
  full_name: "",
  gender: "",
  blood_group: "",
  date_of_birth: "",
  age: "",
  phone: "",
  email: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  marital_status: "",
  id_type: "",
  id_number: "",
  remarks: "",
  address: "",
};

const createInitialForm = () => ({
  date: formatDateInput(),
  patient_id: "",
  blood_group: "",
  bag_id: "",
  bag_code: "",
  charge: "",
  discount_percent: "0",
  tax_rate: "0",
  note: "",
  selected_account: "",
  payment_amount: "",
});

export function BloodIssuePage() {
  const [form, setForm] = useState(createInitialForm);
  const [patients, setPatients] = useState([]);
  const [bags, setBags] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [nextPatientCode, setNextPatientCode] = useState("");
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyPatientForm);
  const [patientErrorMessage, setPatientErrorMessage] = useState("");
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [isResolvingBag, setIsResolvingBag] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === String(form.patient_id)),
    [patients, form.patient_id]
  );

  const selectedBag = useMemo(() => {
    const normalizedBagCode = form.bag_code.trim().toLowerCase();

    if (form.bag_id) {
      return bags.find((bag) => String(bag.id) === String(form.bag_id)) || null;
    }

    if (!normalizedBagCode) return null;

    return bags.find((bag) => String(bag.bag_code || "").trim().toLowerCase() === normalizedBagCode) || null;
  }, [bags, form.bag_code, form.bag_id]);

  const chargeAmount = Number(form.charge || 0);
  const discountPercent = Number(form.discount_percent || 0);
  const taxRate = Number(form.tax_rate || 0);
  const discountAmount = (chargeAmount * discountPercent) / 100;
  const taxableAmount = Math.max(chargeAmount - discountAmount, 0);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = Math.max(taxableAmount + taxAmount, 0);
  const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);
  const filteredBagOptions = useMemo(
    () =>
      bags.filter((bag) => {
        if (!form.blood_group) return true;
        return bag.blood_group === form.blood_group;
      }),
    [bags, form.blood_group]
  );

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      setIsLoadingMeta(true);
      setErrorMessage("");

      try {
        const [patientsResponse, bagsResponse, patientsMetaResponse, accountsResponse] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/blood-bank/bags?limit=100&status=available"),
          apiRequest("/patients/meta"),
          apiRequest("/billing/accounts?limit=100"),
        ]);

        if (!isMounted) return;
        setPatients(patientsResponse.data || []);
        setBags(bagsResponse.data || []);
        const fetchedAccounts = (accountsResponse.data || []).map((a) => ({ value: a.name, label: a.name }));
        const accountOptions = fetchedAccounts.length > 0 ? fetchedAccounts : DEFAULT_ACCOUNTS;
        setAccounts(accountOptions);
        setForm((current) => ({
          ...current,
          selected_account:
            current.selected_account && accountOptions.some((account) => account.value === current.selected_account)
              ? current.selected_account
              : accountOptions[0]?.value || "Cash",
        }));
        setNextPatientCode(patientsMetaResponse.data?.next_patient_code || "");
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood issue form data");
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
      bag_id: String(selectedBag.id),
      bag_code: selectedBag.bag_code || current.bag_code,
      blood_group: selectedBag.blood_group || current.blood_group,
      charge:
        !currentHasChargeValue(current.charge) && selectedBag.price !== undefined && selectedBag.price !== null
          ? String(selectedBag.price || "")
          : current.charge,
    }));
  }, [selectedBag]);

  useEffect(() => {
    const normalizedBagCode = form.bag_code.trim();

    if (!normalizedBagCode) {
      setIsResolvingBag(false);
      return;
    }

    const localBag = bags.find(
      (bag) => String(bag.bag_code || "").trim().toLowerCase() === normalizedBagCode.toLowerCase()
    );

    if (localBag) {
      setIsResolvingBag(false);
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsResolvingBag(true);

      try {
        const response = await apiRequest(
          `/blood-bank/bags?limit=20&status=available${form.blood_group ? `&blood_group=${encodeURIComponent(form.blood_group)}` : ""}&search=${encodeURIComponent(normalizedBagCode)}`
        );

        if (!isActive) return;

        const matchedBag = (response.data || []).find(
          (bag) => String(bag.bag_code || "").trim().toLowerCase() === normalizedBagCode.toLowerCase()
        );

        setForm((current) => {
          if (current.bag_code.trim().toLowerCase() !== normalizedBagCode.toLowerCase()) {
            return current;
          }

          return {
            ...current,
            bag_id: matchedBag ? String(matchedBag.id) : "",
            blood_group: matchedBag?.blood_group || current.blood_group,
          };
        });

        if (matchedBag) {
          setBags((current) => {
            if (current.some((bag) => String(bag.id) === String(matchedBag.id))) {
              return current;
            }
            return [matchedBag, ...current];
          });
        }
      } catch {
        if (!isActive) return;
      } finally {
        if (isActive) {
          setIsResolvingBag(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [bags, form.bag_code]);

  function currentHasChargeValue(value) {
    return String(value || "").trim() !== "";
  }

  const updateForm = (field, value) => {
    setForm((current) => {
      if (field === "blood_group") {
        const matchedBag = bags.find(
          (bag) => String(bag.bag_code || "").trim().toLowerCase() === current.bag_code.trim().toLowerCase()
        );

        if (matchedBag && matchedBag.blood_group !== value) {
          return { ...current, blood_group: value, bag_id: "", bag_code: "" };
        }
      }

      if (field === "bag_code") {
        const matchedBag = bags.find(
          (bag) => String(bag.bag_code || "").trim().toLowerCase() === String(value).trim().toLowerCase()
        );

        return {
          ...current,
          bag_code: value,
          bag_id: matchedBag ? String(matchedBag.id) : "",
          blood_group: matchedBag?.blood_group || current.blood_group,
        };
      }

      if (field === "patient_id") {
        return { ...current, patient_id: value };
      }

      return { ...current, [field]: value };
    });
  };

  const resetForm = () => {
    setForm(createInitialForm());
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

    if (isResolvingBag || !selectedBag) {
      setErrorMessage("Valid donate bag is required.");
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
          bag_id: Number(selectedBag.id),
          patient_id: form.patient_id ? Number(form.patient_id) : null,
          issued_to: selectedPatient?.full_name || null,
          issued_at: new Date(`${form.date}T12:00:00`).toISOString(),
          price: Number(totalAmount.toFixed(2)),
          payment_details: payments,
          notes: form.note.trim() || null,
        }),
      });

      const savedIssue = response.data || {};
      const msg = `Blood issue ${savedIssue.issue_code || ""} saved successfully.`;
      setSuccessMessage(msg);
      showSuccess("Success!", msg);
      setBags((current) => current.filter((bag) => String(bag.id) !== String(selectedBag.id)));
      resetForm();
    } catch (error) {
      const errMsg = error.message || "Failed to save blood issue";
      setErrorMessage(errMsg);
      showError("Error!", errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePatient = async () => {
    setPatientErrorMessage("");

    if (!newPatient.full_name.trim()) {
      setPatientErrorMessage("Patient name is required.");
      return;
    }
    if (!newPatient.phone.trim()) {
      setPatientErrorMessage("Contact number is required.");
      return;
    }
    if (!newPatient.gender) {
      setPatientErrorMessage("Gender is required.");
      return;
    }

    setIsSavingPatient(true);
    try {
      const response = await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify({
          full_name: newPatient.full_name.trim(),
          gender: newPatient.gender,
          blood_group: newPatient.blood_group || "unknown",
          date_of_birth: newPatient.date_of_birth || null,
          age: newPatient.age ? Number(newPatient.age) : null,
          phone: newPatient.phone.trim() || null,
          email: newPatient.email.trim() || null,
          emergency_contact_name: newPatient.emergency_contact_name.trim() || null,
          emergency_contact_phone: newPatient.emergency_contact_phone.trim() || null,
          marital_status: newPatient.marital_status || null,
          id_type: newPatient.id_type || null,
          id_number: newPatient.id_number.trim() || null,
          remarks: newPatient.remarks.trim() || null,
          address: newPatient.address.trim() || null,
        }),
      });

      const createdPatient = response.data;
      const metaResponse = await apiRequest("/patients/meta");
      setPatients((current) => [createdPatient, ...current]);
      setNextPatientCode(metaResponse.data?.next_patient_code || createdPatient.patient_code || "");
      setForm((current) => ({
        ...current,
        patient_id: String(createdPatient.id),
      }));
      setIsPatientModalOpen(false);
      setNewPatient({ ...emptyPatientForm, patient_code: metaResponse.data?.next_patient_code || createdPatient.patient_code || "" });
      setPatientErrorMessage("");
      setSuccessMessage(`Patient ${createdPatient.full_name} created successfully.`);
    } catch (error) {
      setPatientErrorMessage(error.message || "Failed to create patient");
    } finally {
      setIsSavingPatient(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="overflow-hidden rounded-[8px] border border-[#c8d4d9] bg-white shadow-[0_6px_18px_rgba(27,47,58,0.22)]">
        <div className="bg-[#198f90] px-4 py-3 text-[15px] font-semibold text-white">Blood Issue Entry</div>

        <div className="space-y-5 bg-white p-3">
          {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
          {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

          <GroupBox className="p-3">
            <div className="grid grid-cols-[240px_minmax(0,1.45fr)_44px_200px_minmax(0,1.45fr)] items-start gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
              <div>
                <FieldFrame label="Date">
                  <div className="relative">
                    <TextInput onChange={(event) => updateForm("date", event.target.value)} type="date" value={form.date} />
                  </div>
                </FieldFrame>
              </div>

              <FieldFrame label="Patient">
                <SelectInput
                  className={selectedPatient ? "text-[#25333b]" : ""}
                  onChange={(event) => updateForm("patient_id", event.target.value)}
                  options={patients.map((patient) => ({
                    value: String(patient.id),
                    label: `${patient.patient_code || `#${patient.id}`} - ${patient.full_name}`,
                  }))}
                  placeholder={isLoadingMeta ? "Loading patients..." : "Search Patient"}
                  value={form.patient_id}
                />
              </FieldFrame>

              <button
                className="mt-[4px] h-[30px] self-start rounded-[3px] bg-[#1f78dd] text-[20px] leading-none font-medium text-white shadow-[0_2px_6px_rgba(31,120,221,0.35)]"
                onClick={() => {
                  setPatientErrorMessage("");
                  setNewPatient({ ...emptyPatientForm, patient_code: nextPatientCode });
                  setIsPatientModalOpen(true);
                }}
                type="button"
              >
                +
              </button>

              <FieldFrame label="Blood Group">
                <SelectInput
                  className={form.blood_group ? "text-[#25333b]" : ""}
                  onChange={(event) => updateForm("blood_group", event.target.value)}
                  options={BLOOD_GROUP_OPTIONS.filter((option) => option.value)}
                  placeholder="Blood Group"
                  value={form.blood_group}
                />
              </FieldFrame>

              <div>
                <FieldFrame label="Blood Bag">
                  <TextInput
                    hasError={hasAttemptedSave && (isResolvingBag || !selectedBag)}
                    list="blood-issue-bag-options"
                    onChange={(event) => updateForm("bag_code", event.target.value)}
                    placeholder={isLoadingMeta ? "Loading bags..." : isResolvingBag ? "Checking bag..." : "Donate Bag"}
                    type="text"
                    value={form.bag_code}
                  />
                  <datalist id="blood-issue-bag-options">
                    {filteredBagOptions.map((bag) => (
                      <option key={bag.id} value={bag.bag_code}>
                        {`${bag.bag_code} - ${bag.blood_group}`}
                      </option>
                    ))}
                  </datalist>
                </FieldFrame>
                {hasAttemptedSave && (isResolvingBag || !selectedBag) ? <RequiredText /> : null}
              </div>
            </div>
          </GroupBox>

          <GroupBox className="p-3">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] items-start gap-3 max-xl:grid-cols-3 max-md:grid-cols-1">
              <div>
                <FieldFrame label="Charge">
                  <TextInput
                    hasError={hasAttemptedSave && (!form.charge || Number(form.charge) <= 0)}
                    onChange={(event) => updateForm("charge", event.target.value)}
                    placeholder="Charge"
                    type="number"
                    value={form.charge}
                  />
                </FieldFrame>
                {hasAttemptedSave && (!form.charge || Number(form.charge) <= 0) ? <RequiredText /> : null}
              </div>

              <FieldFrame label="Discount %">
                <TextInput
                  onChange={(event) => updateForm("discount_percent", event.target.value)}
                  placeholder="Discount %"
                  type="number"
                  value={form.discount_percent}
                />
              </FieldFrame>

              <FieldFrame label="Discount Amount">
                <TextInput readOnly value={formatMoney(discountAmount)} />
              </FieldFrame>

              <FieldFrame label="Tax Rate">
                <SelectInput
                  onChange={(event) => updateForm("tax_rate", event.target.value)}
                  options={TAX_OPTIONS.slice(1)}
                  placeholder="Tax Rate"
                  value={form.tax_rate}
                />
              </FieldFrame>

              <FieldFrame label="Tax Amount">
                <TextInput readOnly value={formatMoney(taxAmount)} />
              </FieldFrame>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_1.85fr] items-start gap-3 max-xl:grid-cols-2 max-md:grid-cols-1">
              <FieldFrame label="Total">
                <TextInput readOnly value={formatMoney(totalAmount)} />
              </FieldFrame>

              <FieldFrame label="Paid">
                <TextInput readOnly value={formatMoney(paidAmount)} />
              </FieldFrame>

              <FieldFrame label="Due">
                <TextInput className="font-semibold text-[#1565c0]" readOnly value={formatMoney(dueAmount)} />
              </FieldFrame>

              <FieldFrame label="Note">
                <TextInput onChange={(event) => updateForm("note", event.target.value)} placeholder="Note" value={form.note} />
              </FieldFrame>
            </div>
          </GroupBox>

          <GroupBox className="p-3">
            <div className="rounded-[3px] bg-[#e4f2f4] px-4 py-2 text-[14px] text-[#2d3c44]">Add Payment</div>

            <div className="mt-3 grid grid-cols-[1.2fr_0.95fr_0.72fr] items-start gap-3 max-md:grid-cols-1">
              <FieldFrame label="Account">
                <SelectInput
                  onChange={(event) => updateForm("selected_account", event.target.value)}
                  options={accounts}
                  placeholder={isLoadingMeta ? "Loading accounts..." : "Select Account"}
                  value={form.selected_account}
                />
              </FieldFrame>

              <FieldFrame label="Amount">
                <TextInput
                  onChange={(event) => updateForm("payment_amount", event.target.value)}
                  placeholder={dueAmount > 0 ? String(dueAmount) : "Amount"}
                  type="number"
                  value={form.payment_amount}
                />
              </FieldFrame>

              <button
                className="mt-[4px] h-[30px] rounded-[3px] bg-[#b9c3ba] text-[13px] font-semibold tracking-[0.02em] text-[#10181d] shadow-[0_2px_4px_rgba(20,20,20,0.12)]"
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
          </GroupBox>
        </div>
      </div>

      <div className="mt-28 flex justify-end gap-3">
        <button
          className="rounded-[3px] border border-[#ff8c8c] px-4 py-2 text-[12px] font-medium text-[#ff4e4e]"
          onClick={resetForm}
          type="button"
        >
          RESET
        </button>
        <button
          className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[12px] font-medium text-white shadow-[0_3px_8px_rgba(35,118,218,0.25)] disabled:opacity-50"
          disabled={isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "SAVING..." : "SAVE ISSUE"}
        </button>
      </div>

      {isPatientModalOpen ? (
        <PatientModal
          errorMessage={patientErrorMessage}
          form={newPatient}
          isSaving={isSavingPatient}
          onChange={(field, value) => setNewPatient((current) => ({ ...current, [field]: value }))}
          onClose={() => setIsPatientModalOpen(false)}
          onSave={handleSavePatient}
        />
      ) : null}
    </section>
  );
}
