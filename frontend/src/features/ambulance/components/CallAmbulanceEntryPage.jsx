import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printAmbulanceReceipt } from "../lib/ambulanceReceipt";
import { SymptomsHeadModal } from "../../../shared/components/SymptomsHeadModal";
import { SymptomsTypeModal } from "../../../shared/components/SymptomsTypeModal";

const emptyMeta = {
  next_bill_no: "",
  next_patient_code: "",
  accounts: [],
  patients: [],
  doctors: [],
  ambulances: [],
  symptom_types: [],
  symptom_heads: [],
  charge_categories: [],
  charges: [],
  tax_rates: [],
};

const genderOptions = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bloodGroupOptions = ["unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);
const getDefaultChargeCategory = (payload) => payload?.charge_categories?.[0]?.value || "ambulance";
const getAccountNames = (payload) => (payload?.accounts || []).map((account) => account.name).filter(Boolean);

function FieldShell({ children, className = "", label }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-[11px] text-[#8b959b]">{label}</span> : null}
      {children}
    </label>
  );
}

export function CallAmbulanceEntryPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isSymptomsHeadModalOpen, setIsSymptomsHeadModalOpen] = useState(false);
  const [isSymptomsTypeModalOpen, setIsSymptomsTypeModalOpen] = useState(false);
  const [meta, setMeta] = useState(emptyMeta);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [patientId, setPatientId] = useState("");
  const [symptomsTypeId, setSymptomsTypeId] = useState("");
  const [symptomsHeadId, setSymptomsHeadId] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [previousIssue, setPreviousIssue] = useState("");
  const [createdDate, setCreatedDate] = useState(formatDateInput());
  const [billNo, setBillNo] = useState("");
  const [caseText, setCaseText] = useState("");
  const [reference, setReference] = useState("");
  const [isCasualty, setIsCasualty] = useState(false);
  const [isOldPatient, setIsOldPatient] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [chargeCategory, setChargeCategory] = useState("");
  const [ambulanceId, setAmbulanceId] = useState("");
  const [chargeRate, setChargeRate] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [newPatient, setNewPatient] = useState({
    full_name: "",
    phone: "",
    age: "",
    gender: "",
    date_of_birth: "",
    blood_group: "unknown",
    email: "",
    address: "",
    remarks: "",
  });

  const selectedPatient = useMemo(
    () => (meta.patients || []).find((patient) => String(patient.id) === String(patientId)),
    [meta.patients, patientId]
  );

  const selectedAmbulance = useMemo(
    () => (meta.ambulances || []).find((ambulance) => String(ambulance.id) === String(ambulanceId)),
    [meta.ambulances, ambulanceId]
  );

  const filteredSymptomHeads = useMemo(() => {
    if (!symptomsTypeId) return meta.symptom_heads;
    return meta.symptom_heads.filter((head) => String(head.sort_order || "") === String(symptomsTypeId));
  }, [meta.symptom_heads, symptomsTypeId]);

  const selectedSymptomsType = useMemo(
    () => meta.symptom_types.find((type) => String(type.id) === String(symptomsTypeId)) || null,
    [meta.symptom_types, symptomsTypeId]
  );

  const selectedSymptomsHead = useMemo(
    () => filteredSymptomHeads.find((head) => String(head.id) === String(symptomsHeadId)) || null,
    [filteredSymptomHeads, symptomsHeadId]
  );

  const subtotal = Number(chargeRate || 0);
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = (afterDiscount * Number(taxRate || 0)) / 100;
  const total = Math.max(afterDiscount + taxAmount, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = Math.max(total - totalPaid, 0);

  const resetNewPatientForm = () => {
    setNewPatient({
      full_name: "",
      phone: "",
      age: "",
      gender: "",
      date_of_birth: "",
      blood_group: "unknown",
      email: "",
      address: "",
      remarks: "",
    });
  };

  const resetForm = (
    nextBillNo = meta.next_bill_no,
    nextChargeCategory = getDefaultChargeCategory(meta),
    nextMeta = meta
  ) => {
    const accountNames = getAccountNames(nextMeta);
    setPatientId("");
    setSymptomsTypeId("");
    setSymptomsHeadId("");
    setSymptomsDescription("");
    setNotes("");
    setAllergies("");
    setPreviousIssue("");
    setCreatedDate(formatDateInput());
    setBillNo(nextBillNo || "");
    setCaseText("");
    setReference("");
    setIsCasualty(false);
    setIsOldPatient(false);
    setDoctorId("");
    setChargeCategory(nextChargeCategory);
    setAmbulanceId("");
    setChargeRate("0");
    setDiscountPercent("0");
    setTaxRate("0");
    setSelectedAccount(accountNames[0] || "");
    setPaymentAmount("");
    setPayments([]);
    setSymptoms([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/ambulance/call-entry/meta");
      const payload = response.data || emptyMeta;
      const accountNames = getAccountNames(payload);
      setMeta(payload);
      setBillNo(payload.next_bill_no || "");
      setChargeCategory(getDefaultChargeCategory(payload));
      setSelectedAccount((current) => current || accountNames[0] || "");
    } catch (error) {
      setErrorMessage(error.message || "Failed to load ambulance form data");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (!selectedAmbulance) {
      setChargeRate("0");
      return;
    }
    setChargeRate(formatMoney(selectedAmbulance.base_fare));
  }, [selectedAmbulance]);

  useEffect(() => {
    if (filteredSymptomHeads.some((head) => String(head.id) === String(symptomsHeadId))) return;
    setSymptomsHeadId("");
  }, [filteredSymptomHeads, symptomsHeadId]);

  useEffect(() => {
    const accountNames = getAccountNames(meta);
    if (!accountNames.length || accountNames.includes(selectedAccount)) {
      return;
    }
    setSelectedAccount(accountNames[0] || "");
  }, [meta, selectedAccount]);

  const updateNewPatientField = (field, value) => {
    setNewPatient((current) => ({ ...current, [field]: value }));
  };

  const addPayment = () => {
    setErrorMessage("");
    setSuccessMessage("");

    const amount = Number(paymentAmount || 0);
    if (!selectedAccount) {
      setErrorMessage("Select an account before adding a payment.");
      return;
    }
    if (amount <= 0) {
      setErrorMessage("Payment amount must be greater than 0.");
      return;
    }
    if (total > 0 && totalPaid + amount > total) {
      setErrorMessage("Payment amount cannot exceed the ambulance bill total.");
      return;
    }

    setPayments((current) => [
      ...current,
      { account_name: selectedAccount, amount },
    ]);
    setPaymentAmount("");
  };

  const addSymptom = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!symptomsTypeId) {
      setErrorMessage("Select a symptoms type before adding.");
      return;
    }
    if (!symptomsHeadId) {
      setErrorMessage("Select a symptoms title before adding.");
      return;
    }

    setSymptoms((current) => [
      ...current,
      {
        id: `${symptomsTypeId}-${symptomsHeadId}-${Date.now()}`,
        symptoms_type_id: Number(symptomsTypeId),
        symptoms_head_id: Number(symptomsHeadId),
        type_label: selectedSymptomsType?.label || "",
        head_label: selectedSymptomsHead?.label || "",
        description: symptomsDescription.trim(),
      },
    ]);
    setSymptomsHeadId("");
    setSymptomsDescription("");
  };

  const removeSymptom = (symptomId) => {
    setSymptoms((current) => current.filter((item) => item.id !== symptomId));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!patientId) {
      showError("Patient Required", "Please select a patient before saving the bill.");
      setErrorMessage("Select a patient before saving the bill.");
      return;
    }
    if (!ambulanceId) {
      showError("Ambulance Required", "Please select an ambulance before saving the bill.");
      setErrorMessage("Select an ambulance charge before saving the bill.");
      return;
    }

    setIsSaving(true);
    try {
      const primarySymptom = symptoms[0] || null;
      const combinedSymptomsDescription = symptoms.length
        ? symptoms
            .map((symptom, index) =>
              [
                `Symptom ${index + 1}`,
                symptom.type_label ? `Type: ${symptom.type_label}` : "",
                symptom.head_label ? `Title: ${symptom.head_label}` : "",
                symptom.description ? `Description: ${symptom.description}` : "",
              ]
                .filter(Boolean)
                .join(" | ")
            )
            .join("\n")
        : symptomsDescription.trim() || null;

      const response = await apiRequest("/ambulance/calls", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(patientId),
          ambulance_id: Number(ambulanceId),
          doctor_id: doctorId ? Number(doctorId) : null,
          symptoms_type_id: primarySymptom?.symptoms_type_id || (symptomsTypeId ? Number(symptomsTypeId) : null),
          symptoms_head_id: primarySymptom?.symptoms_head_id || (symptomsHeadId ? Number(symptomsHeadId) : null),
          symptoms_description: combinedSymptomsDescription,
          note: notes.trim() || null,
          known_allergies: allergies.trim() || null,
          previous_medical_issue: previousIssue.trim() || null,
          call_date: new Date(createdDate).toISOString(),
          case_text: caseText.trim() || null,
          reference: reference.trim() || null,
          is_casualty: isCasualty,
          is_old_patient: isOldPatient,
          charge_category: chargeCategory,
          charge_name: selectedAmbulance?.vehicle_number || null,
          charge_rate: Number(chargeRate || 0),
          discount_percent: Number(discountPercent || 0),
          discount_amount: Number(discountAmount || 0),
          tax_rate: Number(taxRate || 0),
          tax_amount: Number(taxAmount || 0),
          total_amount: Number(total || 0),
          charge_description: selectedAmbulance
            ? `Ambulance service - ${selectedAmbulance.vehicle_number}`
            : "Ambulance service",
          payments: payments.map((payment) => ({
            account_name: payment.account_name,
            amount: Number(payment.amount || 0),
          })),
        }),
      });

      const bill = response.data;
      const billCode = bill.call_code || billNo;

      const shouldPrint = await confirmPrint(
        "Bill Saved Successfully!",
        `Ambulance bill (${billCode}) has been created successfully. Do you want to print the receipt?`
      );
      if (shouldPrint) {
        // `window.print()` used to be called here, which printed the application
        // window — navbar, module menu and the still-populated form — rather than a
        // receipt. The saved call is re-read first because POST /ambulance/calls
        // returns the bare trip row: it carries no patient/ambulance details, no
        // invoice code and no rent/paid/due breakdown, so printing it directly
        // produced a receipt of empty fields.
        try {
          const saved = await apiRequest(`/ambulance/calls/list?limit=20`);
          const record = (saved.data || []).find((item) => Number(item.id) === Number(bill.id));
          if (record) {
            await printAmbulanceReceipt(record);
          } else {
            showError(
              "Receipt not printed",
              "The bill was saved, but its details could not be loaded for printing. Open Call Ambulance Record and print it from there."
            );
          }
        } catch (printError) {
          showError(
            "Receipt not printed",
            printError.message ||
              "The bill was saved, but the receipt could not be prepared. Print it from Call Ambulance Record."
          );
        }
      }

      setSuccessMessage(`Ambulance bill ${billCode} saved successfully.`);
      const metaResponse = await apiRequest("/ambulance/call-entry/meta");
      const nextMeta = metaResponse.data || emptyMeta;
      setMeta(nextMeta);
      setChargeCategory(getDefaultChargeCategory(nextMeta));
      resetForm(nextMeta.next_bill_no, getDefaultChargeCategory(nextMeta), nextMeta);
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save ambulance bill");
      setErrorMessage(error.message || "Failed to save ambulance bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePatient = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPatient.full_name.trim()) {
      setErrorMessage("Patient name is required.");
      return;
    }
    if (!newPatient.gender) {
      setErrorMessage("Gender is required.");
      return;
    }

    setIsSavingPatient(true);
    try {
      const response = await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify({
          full_name: newPatient.full_name.trim(),
          phone: newPatient.phone.trim() || null,
          age: newPatient.age ? Number(newPatient.age) : null,
          gender: newPatient.gender,
          date_of_birth: newPatient.date_of_birth || null,
          blood_group: newPatient.blood_group || "unknown",
          email: newPatient.email.trim() || null,
          address: newPatient.address.trim() || null,
          remarks: newPatient.remarks.trim() || null,
        }),
      });

      const createdPatient = response.data;
      setMeta((current) => ({ ...current, patients: [createdPatient, ...current.patients] }));
      setPatientId(String(createdPatient.id));
      setIsNewPatientModalOpen(false);
      resetNewPatientForm();
      setSuccessMessage(`Patient ${createdPatient.full_name} created successfully.`);
      await loadMeta();
      setPatientId(String(createdPatient.id));
    } catch (error) {
      setErrorMessage(error.message || "Failed to create patient");
    } finally {
      setIsSavingPatient(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-3 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 flex items-center justify-between rounded-[4px] bg-[#148889] px-4 py-3">
          <select
            className="h-[38px] w-[200px] rounded-[4px] border border-[rgba(255,255,255,0.28)] bg-white px-4 text-[15px] text-[#65727a] outline-none max-md:w-full"
            disabled={isLoadingMeta}
            onChange={(event) => setPatientId(event.target.value)}
            value={patientId}
          >
            <option value="">Search Patient</option>
            {meta.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.patient_code} - {patient.full_name}
              </option>
            ))}
          </select>
          <button
            className="rounded-[4px] bg-white px-4 py-2 text-[12px] font-semibold text-[#138591] shadow-[0_4px_12px_rgba(8,54,56,0.12)]"
            onClick={() => setIsNewPatientModalOpen(true)}
            type="button"
          >
            New Patient
          </button>
        </div>

        {selectedPatient ? (
          <div className="mb-4 rounded-[4px] bg-[#eef8f8] px-3 py-2 text-[13px] text-[#24434a]">
            Selected: {selectedPatient.full_name} ({selectedPatient.patient_code})
          </div>
        ) : null}
        {selectedAmbulance ? (
          <div className="mb-4 rounded-[4px] bg-[#f2f8ff] px-3 py-2 text-[13px] text-[#23425a]">
            Ambulance: {selectedAmbulance.vehicle_number}
            {selectedAmbulance.driver_name ? ` | Driver: ${selectedAmbulance.driver_name}` : ""}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
            {successMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-[2fr_1fr] gap-3 max-lg:grid-cols-1">
          <div>
            <div className="grid grid-cols-[1fr_34px_1fr_34px_72px] gap-3 max-md:grid-cols-1">
              <select
                className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                onChange={(event) => setSymptomsTypeId(event.target.value)}
                value={symptomsTypeId}
              >
                <option value="">Symptoms Type</option>
                {meta.symptom_types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <button
                className="h-[38px] rounded-[4px] bg-[#2276da] text-[18px] font-semibold text-white"
                onClick={() => setIsSymptomsTypeModalOpen(true)}
                type="button"
              >
                +
              </button>
              <select
                className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                onChange={(event) => setSymptomsHeadId(event.target.value)}
                value={symptomsHeadId}
              >
                <option value="">Symptoms Title</option>
                {filteredSymptomHeads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.label}
                  </option>
                ))}
              </select>
              <button
                className="h-[38px] rounded-[4px] bg-[#2276da] text-[18px] font-semibold text-white"
                onClick={() => setIsSymptomsHeadModalOpen(true)}
                type="button"
              >
                +
              </button>
              <button
                className="h-[38px] rounded-[4px] bg-[#17a34a] px-3 text-[12px] font-semibold uppercase text-white"
                onClick={addSymptom}
                type="button"
              >
                Add
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <textarea
                className="h-[80px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setSymptomsDescription(event.target.value)}
                placeholder="Symptoms Description"
                value={symptomsDescription}
              />
              <div />
            </div>

            {symptoms.length ? (
              <div className="mt-3 rounded-[4px] border border-[#d8e1e6] bg-white p-3">
                <div className="mb-3 text-[13px] font-semibold text-[#22353d]">Added Symptoms</div>
                <div className="space-y-3">
                  {symptoms.map((symptom, index) => (
                    <div
                      className="rounded-[4px] border border-[#dde6ea] bg-[#fbfdfe] p-3"
                      key={symptom.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-[#22353d]">Symptom {index + 1}</div>
                        <button
                          className="rounded-[4px] border border-[#ff9d9d] px-2 py-1 text-[11px] font-semibold text-[#d64545]"
                          onClick={() => removeSymptom(symptom.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div className="rounded-[4px] bg-[#f4f8fa] px-3 py-2">
                          <div className="text-[11px] uppercase text-[#6e7d86]">Symptoms Type</div>
                          <div className="mt-1 text-[13px] text-[#22353d]">{symptom.type_label}</div>
                        </div>
                        <div className="rounded-[4px] bg-[#f4f8fa] px-3 py-2">
                          <div className="text-[11px] uppercase text-[#6e7d86]">Symptoms Title</div>
                          <div className="mt-1 text-[13px] text-[#22353d]">{symptom.head_label}</div>
                        </div>
                        <div className="rounded-[4px] bg-[#f4f8fa] px-3 py-2 md:col-span-1">
                          <div className="text-[11px] uppercase text-[#6e7d86]">Description</div>
                          <div className="mt-1 text-[13px] text-[#22353d]">{symptom.description || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <textarea
                className="h-[80px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setAllergies(event.target.value)}
                placeholder="Any Known Allergies"
                value={allergies}
              />
              <textarea
                className="h-[80px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setPreviousIssue(event.target.value)}
                placeholder="Previous Medical Issue"
                value={previousIssue}
              />
              <textarea
                className="h-[80px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72] max-md:col-span-1 md:col-span-2"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Note"
                value={notes}
              />
            </div>

            <div className="mt-6 max-w-[560px]">
              <div className="mb-2 rounded-[3px] bg-[#bfe9ea] px-4 py-2 text-[16px] text-[#274148]">
                Add Payment
              </div>
              <div className="grid grid-cols-[1.3fr_0.85fr_0.4fr] gap-3 max-md:grid-cols-1">
                <select
                  className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  value={selectedAccount}
                >
                  <option value="">Select Account</option>
                  {(meta.accounts || []).map((account, index) => {
                    const val = typeof account === "object" ? (account.name || account.label || account.id) : account;
                    return (
                      <option key={`${val}-${index}`} value={val}>
                        {val}
                      </option>
                    );
                  })}
                </select>
                <input
                  className="h-[38px] rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Amount"
                  type="number"
                  value={paymentAmount}
                />
                <button
                  className="h-[38px] rounded-[4px] bg-[#b7c2b7] px-3 text-[14px] font-semibold text-[#162024]"
                  onClick={addPayment}
                  type="button"
                >
                  Add
                </button>
              </div>
              <p className="mt-4 text-[14px] text-[#1d2a31]">
                Total Paid: <span className="font-semibold">{formatMoney(totalPaid)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="Created Date">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setCreatedDate(event.target.value)}
                  type="date"
                  value={createdDate}
                />
              </FieldShell>
              <FieldShell label="Bill No">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={billNo}
                />
              </FieldShell>
              <FieldShell label="Case">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none placeholder:text-[#8b959b]"
                  onChange={(event) => setCaseText(event.target.value)}
                  placeholder="Case"
                  type="text"
                  value={caseText}
                />
              </FieldShell>
              <FieldShell label="Reference">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none placeholder:text-[#8b959b]"
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Reference"
                  type="text"
                  value={reference}
                />
              </FieldShell>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1 text-[14px] text-[#27353d]">
              <label className="flex items-center gap-2">
                <input checked={isCasualty} onChange={(event) => setIsCasualty(event.target.checked)} type="checkbox" />
                <span>Casualty</span>
              </label>
              <label className="flex items-center gap-2">
                <input checked={isOldPatient} onChange={(event) => setIsOldPatient(event.target.checked)} type="checkbox" />
                <span>Old Patient</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="Doctor">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                  disabled={isLoadingMeta}
                  onChange={(event) => setDoctorId(event.target.value)}
                  value={doctorId}
                >
                  <option value="" className="bg-white text-[#27353d]">Search Doctor</option>
                  {(meta.doctors || []).map((doctor) => (
                    <option key={doctor.id} value={doctor.id} className="bg-white text-[#27353d]">
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Ambulance">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                  disabled={isLoadingMeta}
                  onChange={(event) => setAmbulanceId(event.target.value)}
                  value={ambulanceId}
                >
                  <option value="" className="bg-white text-[#27353d]">Ambulance</option>
                  {((meta.ambulances?.length ? meta.ambulances : meta.charges) || []).map((amb) => (
                    <option key={amb.id || amb.value} value={amb.id || amb.value} className="bg-white text-[#27353d]">
                      {amb.vehicle_number ? `${amb.vehicle_number}${amb.model ? ` (${amb.model})` : ''}` : (amb.label || amb.name)}
                    </option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Charge Rate">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setChargeRate(event.target.value)}
                  type="number"
                  value={chargeRate}
                />
              </FieldShell>
              <FieldShell label="Discount (%)">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  type="number"
                  value={discountPercent}
                />
              </FieldShell>
              <FieldShell label="Discount Amount">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(discountAmount)}
                />
              </FieldShell>
              <FieldShell label="Tax (%)">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setTaxRate(event.target.value)}
                  value={taxRate}
                >
                  {(meta.tax_rates || [0, 5, 10, 15]).map((rate, index) => {
                    const val = typeof rate === 'object' ? (rate.value ?? rate.id ?? rate.rate) : rate;
                    const label = typeof rate === 'object' ? (rate.label || rate.name || `${val}%`) : `${val}%`;
                    return (
                      <option key={`${val}-${index}`} value={val} className="bg-white text-[#27353d]">
                        {label}
                      </option>
                    );
                  })}
                </select>
              </FieldShell>
              <FieldShell label="Tax Amount">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(taxAmount)}
                />
              </FieldShell>
              <FieldShell label="Total Bill Amount">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(total)}
                />
              </FieldShell>
              <FieldShell label="Paid Amount">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(totalPaid)}
                />
              </FieldShell>
              <FieldShell label="Due Amount">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(dueAmount)}
                />
              </FieldShell>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-3">
        <button
          className="rounded-[4px] border border-[#ff8f8f] px-4 py-2 text-[12px] font-medium text-[#ff3f34]"
          onClick={() => resetForm()}
          type="button"
        >
          Reset
        </button>
        <button
          className="rounded-[4px] bg-[#2276da] px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || isLoadingMeta}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Save Bill"}
        </button>
      </div>

      {isNewPatientModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(7,34,39,0.28)] px-4 py-6">
          <div className="w-full max-w-[780px] rounded-[4px] border border-[#d8dee2] bg-white shadow-[0_24px_60px_rgba(10,40,48,0.22)]">
            <div className="border-b border-[#e4e8eb] px-6 py-4">
              <h2 className="text-[18px] font-normal text-[#26353c]">Add New Patient</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 px-6 py-6 max-md:grid-cols-1">
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("full_name", event.target.value)}
                placeholder="Name *"
                type="text"
                value={newPatient.full_name}
              />
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("phone", event.target.value)}
                placeholder="Contact No"
                type="text"
                value={newPatient.phone}
              />
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("age", event.target.value)}
                placeholder="Age"
                type="number"
                value={newPatient.age}
              />
              <select
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                onChange={(event) => updateNewPatientField("gender", event.target.value)}
                value={newPatient.gender}
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("date_of_birth", event.target.value)}
                type="date"
                value={newPatient.date_of_birth}
              />
              <select
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                onChange={(event) => updateNewPatientField("blood_group", event.target.value)}
                value={newPatient.blood_group}
              >
                {bloodGroupOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "unknown" ? "Blood Group" : option}
                  </option>
                ))}
              </select>
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("email", event.target.value)}
                placeholder="Email"
                type="email"
                value={newPatient.email}
              />
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("address", event.target.value)}
                placeholder="Address"
                type="text"
                value={newPatient.address}
              />
              <input
                className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] outline-none"
                onChange={(event) => updateNewPatientField("remarks", event.target.value)}
                placeholder="Remarks"
                type="text"
                value={newPatient.remarks}
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-[#e4e8eb] px-6 py-4">
              <button
                className="rounded-[4px] border border-[#ff8f8f] px-4 py-2 text-[12px] font-medium text-[#ff3f34]"
                onClick={() => setIsNewPatientModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-[4px] bg-[#2276da] px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingPatient}
                onClick={handleSavePatient}
                type="button"
              >
                {isSavingPatient ? "Saving..." : "Save Patient"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SymptomsTypeModal isOpen={isSymptomsTypeModalOpen} onClose={() => setIsSymptomsTypeModalOpen(false)} />
      <SymptomsHeadModal isOpen={isSymptomsHeadModalOpen} onClose={() => setIsSymptomsHeadModalOpen(false)} />
    </section>
  );
}
