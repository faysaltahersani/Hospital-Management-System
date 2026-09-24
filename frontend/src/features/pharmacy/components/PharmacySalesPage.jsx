import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const genderOptions = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const maritalStatusOptions = ["Single", "Married", "Widowed", "Divorced"];
const idTypeOptions = ["National ID", "Passport", "Birth Certificate", "Driving License", "Other"];
const PAYMENT_METHOD_BY_TYPE = {
  Cash: "cash",
  "Bank Account": "bank_transfer",
};
const defaultPaymentMethod = "cash";

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const calculateAge = (value) => {
  if (!value) return "";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
};

const approximateDobFromAge = (ageValue) => {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age <= 0) return "";
  const today = new Date();
  const dob = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  return dob.toISOString().slice(0, 10);
};

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

function TextInput({
  className = "",
  hasError = false,
  max,
  min,
  onChange,
  onKeyDown,
  placeholder = "",
  readOnly = false,
  step,
  type = "text",
  value = "",
}) {
  return (
    <input
      className={`h-[32px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#7f8990] ${
        hasError ? "border border-[#ff5a5a]" : ""
      } ${readOnly ? "bg-[#f5f8fa] text-[#6b757b]" : ""} ${className}`}
      max={max}
      min={min}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      readOnly={readOnly}
      step={step}
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

function SelectInput({ hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[32px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] outline-none ${
        hasError ? "border border-[#ff5a5a] text-[#ff5a5a]" : "text-[#6d787f]"
      }`}
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

function SectionTitle({ children }) {
  return <div className="mb-3 border-l-2 border-[#0d7267] pl-2 text-[13px] font-semibold text-[#1f2c33]">{children}</div>;
}

function AddPatientModal({
  errorMessage,
  form,
  isSaving,
  onChange,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
      <div className="w-full max-w-[900px] overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="border-b border-[#e5e5e5] px-5 py-4 text-[14px] text-[#202020]">Add New Patient</div>

        {errorMessage ? (
          <div className="mx-5 mt-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-4 gap-3 px-5 py-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Frame label="Patient Code">
            <TextInput readOnly value={form.patient_code} />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("full_name", event.target.value)} placeholder="Name *" value={form.full_name} />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("phone", event.target.value)} placeholder="Contact No *" value={form.phone} />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("age", event.target.value)} placeholder="Age" type="number" value={form.age} />
          </Frame>

          <Frame>
            <SelectInput
              onChange={(event) => onChange("gender", event.target.value)}
              options={genderOptions.filter((option) => option.value)}
              placeholder="Gender"
              value={form.gender}
            />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("date_of_birth", event.target.value)} type="date" value={form.date_of_birth} />
          </Frame>
          <Frame>
            <SelectInput
              onChange={(event) => onChange("blood_group", event.target.value)}
              options={bloodGroupOptions}
              placeholder="Blood Group"
              value={form.blood_group}
            />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("email", event.target.value)} placeholder="Email" value={form.email} />
          </Frame>

          <Frame>
            <TextInput
              onChange={(event) => onChange("emergency_contact_name", event.target.value)}
              placeholder="Guardian Name"
              value={form.emergency_contact_name}
            />
          </Frame>
          <Frame>
            <TextInput
              onChange={(event) => onChange("emergency_contact_phone", event.target.value)}
              placeholder="Guardian Contact"
              value={form.emergency_contact_phone}
            />
          </Frame>
          <Frame>
            <SelectInput
              onChange={(event) => onChange("marital_status", event.target.value)}
              options={maritalStatusOptions}
              placeholder="Marital Status"
              value={form.marital_status}
            />
          </Frame>
          <Frame>
            <SelectInput onChange={(event) => onChange("id_type", event.target.value)} options={idTypeOptions} placeholder="ID Type" value={form.id_type} />
          </Frame>

          <Frame>
            <TextInput onChange={(event) => onChange("id_number", event.target.value)} placeholder="ID Number" value={form.id_number} />
          </Frame>
          <Frame>
            <TextInput onChange={(event) => onChange("remarks", event.target.value)} placeholder="Remarks" value={form.remarks} />
          </Frame>

          <Frame className="col-span-4 max-lg:col-span-2 max-sm:col-span-1">
            <TextArea onChange={(event) => onChange("address", event.target.value)} placeholder="Address" value={form.address} />
          </Frame>
        </div>

        <div className="flex justify-end gap-6 border-t border-[#f0f0f0] px-5 py-3 text-[13px]">
          <button className="text-[#ff4e4e]" onClick={onClose} type="button">
            CANCEL
          </button>
          <button className="rounded-[3px] bg-[#2376da] px-4 py-2 text-white disabled:opacity-50" disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

const createInitialPatientForm = (patientCode = "") => ({
  patient_code: patientCode,
  full_name: "",
  phone: "",
  age: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  email: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  marital_status: "",
  id_type: "",
  id_number: "",
  remarks: "",
  address: "",
});

const createInitialForm = () => ({
  sold_at: formatDateInput(),
  patient_id: "",
  doctor_id: "",
  note: "",
  discount_percent: "0",
  selected_medicine_id: "",
  quantity: "1",
  selected_account: "",
  payment_amount: "",
});

const DEFAULT_ACCOUNTS = [
  { value: "Cash", label: "Cash" },
  { value: "Bank", label: "Bank" },
  { value: "Card", label: "Card" },
  { value: "Mobile Banking", label: "Mobile Banking" },
];

export function PharmacySalesPage() {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [newPatient, setNewPatient] = useState(createInitialPatientForm());
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [nextPatientCode, setNextPatientCode] = useState("");
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentErrorMessage, setPaymentErrorMessage] = useState("");
  const [patientErrorMessage, setPatientErrorMessage] = useState("");

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient.id) === String(form.patient_id)),
    [patients, form.patient_id]
  );

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === String(form.doctor_id)),
    [doctors, form.doctor_id]
  );

  const selectedMedicine = useMemo(
    () => medicines.find((medicine) => String(medicine.id) === String(form.selected_medicine_id)),
    [form.selected_medicine_id, medicines]
  );

  const subtotal = Number(items.reduce((sum, item) => sum + Number(item.total_price || 0), 0).toFixed(2));
  const discountAmount = Number(((subtotal * Number(form.discount_percent || 0)) / 100).toFixed(2));
  const totalAmount = Number(Math.max(subtotal - discountAmount, 0).toFixed(2));
  const totalPaid = Number(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2));
  const dueAmount = Number(Math.max(totalAmount - totalPaid, 0).toFixed(2));

  const draftSalePrice = selectedMedicine ? formatMoney(selectedMedicine.sale_price) : "";
  const draftPurchasePrice = selectedMedicine ? formatMoney(selectedMedicine.purchase_price) : "";
  const draftExpiryDate = selectedMedicine?.expiry_date || "";
  const draftQuantity = Math.max(Number(form.quantity || 1), 1);
  const draftTotal = selectedMedicine ? Number(selectedMedicine.sale_price || 0) * draftQuantity : 0;

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      setIsLoadingMeta(true);
      setErrorMessage("");

      try {
        const [medicinesResponse, patientsResponse, doctorsResponse, patientMetaResponse, accountsResponse] = await Promise.all([
          apiRequest("/pharmacy/medicines?limit=100&is_active=true"),
          apiRequest("/patients?limit=100"),
          apiRequest("/doctors?limit=100"),
          apiRequest("/patients/meta"),
          apiRequest("/billing/accounts?limit=100"),
        ]);

        if (!isMounted) return;
        const fetchedAccounts = (accountsResponse.data || []).map((a) => ({ value: a.name, label: a.name, type: a.type }));
        const loadedAccounts = fetchedAccounts.length > 0 ? fetchedAccounts : DEFAULT_ACCOUNTS;
        setMedicines((medicinesResponse.data || []).filter((medicine) => Number(medicine.stock_quantity || 0) > 0));
        setPatients(patientsResponse.data || []);
        setDoctors(doctorsResponse.data || []);
        setAccounts(loadedAccounts);
        setNextPatientCode(patientMetaResponse.data?.next_patient_code || "");
        setNewPatient(createInitialPatientForm(patientMetaResponse.data?.next_patient_code || ""));
        setForm((current) => ({
          ...current,
          selected_account:
            current.selected_account && loadedAccounts.some((account) => account.value === current.selected_account)
              ? current.selected_account
              : loadedAccounts[0]?.value || "Cash",
        }));
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load pharmacy sales form data");
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

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateNewPatientField = (field, value) => {
    setNewPatient((current) => ({ ...current, [field]: value }));
  };

  const resetSaleForm = () => {
    setForm({
      ...createInitialForm(),
      selected_account: accounts[0]?.value || "",
    });
    setItems([]);
    setPayments([]);
    setErrorMessage("");
    setSuccessMessage("");
    setPaymentErrorMessage("");
  };

  const refreshPatients = async () => {
    const [patientsResponse, patientMetaResponse] = await Promise.all([
      apiRequest("/patients?limit=100"),
      apiRequest("/patients/meta"),
    ]);
    setPatients(patientsResponse.data || []);
    setNextPatientCode(patientMetaResponse.data?.next_patient_code || "");
    setNewPatient(createInitialPatientForm(patientMetaResponse.data?.next_patient_code || ""));
    return patientsResponse.data || [];
  };

  const refreshMedicines = async () => {
    const medicinesResponse = await apiRequest("/pharmacy/medicines?limit=100&is_active=true");
    setMedicines((medicinesResponse.data || []).filter((medicine) => Number(medicine.stock_quantity || 0) > 0));
  };

  const addMedicine = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedMedicine) {
      setErrorMessage("Select a medicine before adding it.");
      return;
    }

    const quantity = Math.max(Number(form.quantity || 0), 1);
    const availableStock = Number(selectedMedicine.stock_quantity || 0);
    if (quantity > availableStock) {
      setErrorMessage(`Only ${availableStock} unit(s) available for ${selectedMedicine.name}.`);
      return;
    }

    const unitPrice = Number(selectedMedicine.sale_price || 0);
    setItems((current) => [
      ...current,
      {
        medicine_id: selectedMedicine.id,
        code: selectedMedicine.code,
        name: selectedMedicine.name,
        quantity,
        unit_price: unitPrice,
        purchase_price: Number(selectedMedicine.purchase_price || 0),
        expiry_date: selectedMedicine.expiry_date || "",
        stock_quantity: availableStock,
        total_price: unitPrice * quantity,
      },
    ]);
    setForm((current) => ({
      ...current,
      selected_medicine_id: "",
      quantity: "1",
    }));
  };

  const removeMedicine = (indexToRemove) => {
    setItems((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const addPayment = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setPaymentErrorMessage("");

    const amount = Number(Number(form.payment_amount || 0).toFixed(2));
    if (totalAmount <= 0) {
      setPaymentErrorMessage("Add at least one medicine before adding a payment.");
      return;
    }
    if (!form.selected_account) {
      setPaymentErrorMessage("Select an account before adding a payment.");
      return;
    }
    if (amount <= 0) {
      setPaymentErrorMessage("Payment amount must be greater than 0.");
      return;
    }
    if (amount > dueAmount) {
      setPaymentErrorMessage(`Payment cannot exceed the remaining due amount (${formatMoney(dueAmount)}).`);
      return;
    }

    setPayments((current) => [
      ...current,
      {
        account_name: form.selected_account,
        amount,
      },
    ]);
    setForm((current) => ({ ...current, payment_amount: "" }));
  };

  const removePayment = (indexToRemove) => {
    setPayments((current) => current.filter((_, index) => index !== indexToRemove));
    setPaymentErrorMessage("");
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

    setIsSavingPatient(true);
    try {
      const payload = {
        patient_code: newPatient.patient_code || undefined,
        full_name: newPatient.full_name.trim(),
        phone: newPatient.phone.trim(),
        date_of_birth:
          newPatient.date_of_birth ||
          (newPatient.age ? approximateDobFromAge(newPatient.age) : null),
        gender: newPatient.gender || null,
        blood_group: newPatient.blood_group || null,
        email: newPatient.email.trim() || null,
        emergency_contact_name: newPatient.emergency_contact_name.trim() || null,
        emergency_contact_phone: newPatient.emergency_contact_phone.trim() || null,
        marital_status: newPatient.marital_status || null,
        id_type: newPatient.id_type || null,
        id_number: newPatient.id_number.trim() || null,
        remarks: newPatient.remarks.trim() || null,
        address: newPatient.address.trim() || null,
      };

      const response = await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const patient = response.data;
      const loadedPatients = await refreshPatients();
      const matchingPatient = loadedPatients.find((row) => Number(row.id) === Number(patient.id)) || patient;
      setForm((current) => ({ ...current, patient_id: String(matchingPatient.id) }));
      setIsPatientModalOpen(false);
      setSuccessMessage(`Patient ${matchingPatient.full_name} created successfully.`);
    } catch (error) {
      setPatientErrorMessage(error.message || "Failed to create patient");
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleSaveBill = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.patient_id) {
      setErrorMessage("Select a patient before saving the bill.");
      return;
    }
    if (!items.length) {
      setErrorMessage("Add at least one medicine before saving.");
      return;
    }
    if (!payments.length && totalAmount > 0) {
      setErrorMessage("Add one payment entry before saving.");
      return;
    }
    if (payments.length > 1) {
      setErrorMessage("Current pharmacy sales backend supports one payment method per sale.");
      return;
    }
    if (Math.abs(totalPaid - totalAmount) > 0.009) {
      setErrorMessage("Current pharmacy sales backend requires the paid amount to match the total amount.");
      return;
    }

    setIsSaving(true);
    try {
      const doctorLabel = selectedDoctor ? selectedDoctor.user?.full_name || selectedDoctor.doctor_code : "";
      const noteParts = [
        doctorLabel ? `Doctor: ${doctorLabel}` : "",
        form.note.trim(),
      ].filter(Boolean);

      const selectedAccountName = payments[0]?.account_name || form.selected_account || "";
      const selectedAccountObj = accounts.find((a) => a.value === selectedAccountName);
      const paymentMethodEnum = PAYMENT_METHOD_BY_TYPE[selectedAccountObj?.type] || defaultPaymentMethod;

      const response = await apiRequest("/pharmacy/sales", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(form.patient_id),
          sold_at: form.sold_at,
          discount: discountAmount,
          payment_method: paymentMethodEnum,
          account_name: selectedAccountName || null,
          notes: noteParts.join(" | ") || null,
          items: items.map((item) => ({
            medicine_id: Number(item.medicine_id),
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
          })),
        }),
      });

      await refreshMedicines();
      resetSaleForm();
      setSuccessMessage(`Pharmacy bill ${response.data?.sale_code || ""} saved successfully.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save pharmacy bill");
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

          <div className="flex items-center justify-between rounded-[4px] bg-[#0d7267] px-4 py-2 text-white">
            <span className="text-[14px] font-semibold">
              {selectedPatient ? `${selectedPatient.full_name} (${selectedPatient.patient_code || selectedPatient.phone || "Patient"})` : "No patient selected"}
            </span>
            <button
              className="rounded-[3px] bg-[#258b7f] px-3 py-1.5 text-[12px] font-medium"
              onClick={() => {
                setPatientErrorMessage("");
                setNewPatient(createInitialPatientForm(nextPatientCode));
                setIsPatientModalOpen(true);
              }}
              type="button"
            >
              + New Patient
            </button>
          </div>

          <div className="grid grid-cols-[220px_210px_minmax(280px,1fr)_36px] items-start gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            <Frame label="Bill No">
              <TextInput placeholder="Generated on save" readOnly value="" />
            </Frame>
            <Frame label="Created Date">
              <TextInput onChange={(event) => updateForm("sold_at", event.target.value)} type="date" value={form.sold_at} />
            </Frame>
            <Frame label="Patient">
              <SelectInput
                hasError={!form.patient_id && !isLoadingMeta && !!errorMessage}
                onChange={(event) => updateForm("patient_id", event.target.value)}
                options={patients.map((patient) => ({
                  value: String(patient.id),
                  label: `${patient.full_name} (${patient.patient_code || patient.phone || "Patient"})`,
                }))}
                placeholder={isLoadingMeta ? "Loading patients..." : "Search Patient"}
                value={form.patient_id}
              />
            </Frame>
            <button
              className="mt-[6px] h-[32px] rounded-[3px] text-[24px] leading-none text-[#2376da]"
              onClick={() => {
                setPatientErrorMessage("");
                setNewPatient(createInitialPatientForm(nextPatientCode));
                setIsPatientModalOpen(true);
              }}
              type="button"
            >
              +
            </button>
          </div>

          <div className="rounded-[4px] border border-[#cde0e7] p-3">
            <SectionTitle>Add Medicines</SectionTitle>

            <div className="grid grid-cols-[minmax(220px,1.5fr)_110px_80px_120px_130px_110px_100px_90px_90px_84px] items-start gap-3 max-[1350px]:grid-cols-5 max-md:grid-cols-2">
              <Frame>
                <SelectInput
                  onChange={(event) => updateForm("selected_medicine_id", event.target.value)}
                  options={medicines.map((medicine) => ({
                    value: String(medicine.id),
                    label: `${medicine.name} (${medicine.code})`,
                  }))}
                  placeholder={isLoadingMeta ? "Loading medicines..." : "Search Medicine"}
                  value={form.selected_medicine_id}
                />
              </Frame>
              <Frame>
                <TextInput placeholder="Sale Price" readOnly value={draftSalePrice} />
              </Frame>
              <Frame>
                <TextInput onChange={(event) => updateForm("quantity", event.target.value)} placeholder="Qty" type="number" value={form.quantity} />
              </Frame>
              <Frame>
                <TextInput placeholder="Batch No" readOnly value="N/A" />
              </Frame>
              <Frame>
                <TextInput placeholder="Exp Date" readOnly value={draftExpiryDate} />
              </Frame>
              <Frame>
                <TextInput placeholder="Pur. Price" readOnly value={draftPurchasePrice} />
              </Frame>
              <Frame>
                <TextInput placeholder="Tax Rate" readOnly value="0%" />
              </Frame>
              <Frame label="Tax Amt">
                <TextInput readOnly value="0.00" />
              </Frame>
              <Frame label="Total">
                <TextInput readOnly value={formatMoney(draftTotal)} />
              </Frame>
              <button
                className="h-[32px] self-start rounded-[3px] border border-[#80b2f2] text-[12px] font-medium text-[#2376da]"
                onClick={addMedicine}
                type="button"
              >
                ADD
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[3px] border border-[#dbe6eb]">
              <div className="grid grid-cols-[50px_minmax(180px,2fr)_100px_80px_120px_130px_110px_90px_90px_90px_70px] items-center gap-3 bg-[#e7f4f4] px-3 py-2 text-[12px] text-[#2a3940] max-lg:hidden">
                <span>SL</span>
                <span>Medicine</span>
                <span>Sale Price</span>
                <span>QTY</span>
                <span>Batch No</span>
                <span>Exp Date</span>
                <span>Pur. Price</span>
                <span>Tax Rate</span>
                <span>Tax Amt</span>
                <span>Total</span>
                <span>Action</span>
              </div>

              {items.length ? (
                items.map((item, index) => (
                  <div
                    className="grid grid-cols-[50px_minmax(180px,2fr)_100px_80px_120px_130px_110px_90px_90px_90px_70px] items-center gap-3 border-t border-[#dbe6eb] px-3 py-2 text-[12px] text-[#25333b] max-lg:grid-cols-1"
                    key={`${item.medicine_id}-${index}`}
                  >
                    <span>{index + 1}</span>
                    <span>{item.name}</span>
                    <span>{formatMoney(item.unit_price)}</span>
                    <span>{item.quantity}</span>
                    <span>N/A</span>
                    <span>{item.expiry_date || "-"}</span>
                    <span>{formatMoney(item.purchase_price)}</span>
                    <span>0%</span>
                    <span>0.00</span>
                    <span>{formatMoney(item.total_price)}</span>
                    <button className="text-[#ff4e4e]" onClick={() => removeMedicine(index)} type="button">
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-[13px] text-[#6f7b84]">No medicine added yet.</div>
              )}
            </div>

            <button className="mt-3 rounded-[3px] border border-[#80b2f2] px-4 py-2 text-[12px] font-semibold text-[#1f73de]" type="button">
              ADD MORE MEDICINE
            </button>
          </div>

          <div className="grid grid-cols-[minmax(260px,1fr)_minmax(420px,2fr)] gap-3 max-lg:grid-cols-1">
            <div className="rounded-[4px] border border-[#cde0e7] p-3">
              <SectionTitle>Doctor & Note</SectionTitle>
              <div className="space-y-3">
                <Frame>
                  <SelectInput
                    onChange={(event) => updateForm("doctor_id", event.target.value)}
                    options={doctors.map((doctor) => ({
                      value: String(doctor.id),
                      label: `${doctor.user?.full_name || doctor.doctor_code} (${doctor.doctor_code})`,
                    }))}
                    placeholder={isLoadingMeta ? "Loading doctors..." : "Select Doctor"}
                    value={form.doctor_id}
                  />
                </Frame>
                <Frame>
                  <TextArea onChange={(event) => updateForm("note", event.target.value)} placeholder="Note" value={form.note} />
                </Frame>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[4px] border border-[#cde0e7] p-3">
                <SectionTitle>Billing Summary</SectionTitle>
                <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
                  <Frame label="Sub Total Amount">
                    <TextInput readOnly value={formatMoney(subtotal)} />
                  </Frame>
                  <Frame label="Discount %">
                    <TextInput onChange={(event) => updateForm("discount_percent", event.target.value)} type="number" value={form.discount_percent} />
                  </Frame>
                  <Frame label="Discount Amount">
                    <TextInput readOnly value={formatMoney(discountAmount)} />
                  </Frame>
                  <Frame label="After Discount">
                    <TextInput readOnly value={formatMoney(totalAmount)} />
                  </Frame>
                  <Frame>
                    <TextInput placeholder="Select Taxes" readOnly value="Tax not stored" />
                  </Frame>
                  <Frame label="Tax Amount">
                    <TextInput readOnly value="0.00" />
                  </Frame>
                  <Frame label="Paid Amount">
                    <TextInput readOnly value={formatMoney(totalPaid)} />
                  </Frame>
                  <Frame label="Due Amount">
                    <TextInput readOnly value={formatMoney(dueAmount)} />
                  </Frame>
                  <Frame label="Total Amount">
                    <TextInput readOnly value={formatMoney(totalAmount)} />
                  </Frame>
                </div>
              </div>

              <div className="rounded-[4px] border border-[#cde0e7]">
                <div className="bg-[#e7f4f4] px-3 py-2 text-[13px] font-semibold text-[#1f2c33]">Add Payment</div>
                <div className="p-3">
                  <div className="grid grid-cols-[minmax(220px,1.4fr)_160px_84px] gap-3 max-md:grid-cols-1">
                    <Frame>
                      <SelectInput
                        onChange={(event) => {
                          setPaymentErrorMessage("");
                          updateForm("selected_account", event.target.value);
                        }}
                        options={accounts}
                        placeholder={isLoadingMeta ? "Loading accounts..." : "Select Account"}
                        value={form.selected_account}
                      />
                    </Frame>
                    <Frame>
                      <TextInput
                        max={dueAmount || undefined}
                        min="0.01"
                        onChange={(event) => {
                          setPaymentErrorMessage("");
                          updateForm("payment_amount", event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addPayment();
                          }
                        }}
                        placeholder="Amount"
                        step="0.01"
                        type="number"
                        value={form.payment_amount}
                      />
                    </Frame>
                    <button
                      className="h-[32px] self-start rounded-[3px] bg-[#b4beb4] text-[12px] font-semibold text-[#182126]"
                      onClick={addPayment}
                      type="button"
                    >
                      ADD
                    </button>
                  </div>

                  {paymentErrorMessage ? (
                    <div
                      aria-live="polite"
                      className="mt-2 rounded-[3px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[12px] text-[#b94a48]"
                      role="alert"
                    >
                      {paymentErrorMessage}
                    </div>
                  ) : null}

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
                    <span className="ml-4 text-[12px] text-[#6f7b84]">Remaining Due: {formatMoney(dueAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              className="rounded-[3px] border border-[#ff8c8c] px-4 py-2 text-[12px] font-medium text-[#ff4e4e]"
              onClick={resetSaleForm}
              type="button"
            >
              RESET
            </button>
            <button
              className="rounded-[3px] bg-[#2376da] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
              disabled={isSaving}
              onClick={handleSaveBill}
              type="button"
            >
              {isSaving ? "SAVING..." : "SAVE BILL"}
            </button>
          </div>
        </div>
      </div>

      {isPatientModalOpen ? (
        <AddPatientModal
          errorMessage={patientErrorMessage}
          form={newPatient}
          isSaving={isSavingPatient}
          onChange={updateNewPatientField}
          onClose={() => setIsPatientModalOpen(false)}
          onSave={handleSavePatient}
        />
      ) : null}
    </section>
  );
}
