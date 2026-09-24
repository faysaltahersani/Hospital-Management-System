import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printIpdReceipt } from "../lib/ipdReceipt";
import { SymptomsHeadModal } from "../../../shared/components/SymptomsHeadModal";
import { SymptomsTypeModal } from "../../../shared/components/SymptomsTypeModal";

const genderOptions = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bloodGroupOptions = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const maritalStatusOptions = ["", "Single", "Married", "Widowed", "Divorced", "Other"];
const idTypeOptions = ["", "NID", "Passport", "Birth Certificate", "Driving License", "Other"];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function FieldShell({ children, className = "", label }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-[11px] text-[#8b959b]">{label}</span> : null}
      {children}
    </label>
  );
}

const emptyNewPatient = {
  patient_code: "",
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
};

export function IpdBillEntryPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isSymptomsHeadModalOpen, setIsSymptomsHeadModalOpen] = useState(false);
  const [isSymptomsTypeModalOpen, setIsSymptomsTypeModalOpen] = useState(false);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [symptomTypes, setSymptomTypes] = useState([]);
  const [symptomHeads, setSymptomHeads] = useState([]);
  const [nextPatientCode, setNextPatientCode] = useState("");

  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [symptomsTypeId, setSymptomsTypeId] = useState("");
  const [symptomsHeadId, setSymptomsHeadId] = useState("");
  const [createdDate, setCreatedDate] = useState(formatDateInput());
  const [billNo, setBillNo] = useState("");
  const [caseText, setCaseText] = useState("");
  const [reference, setReference] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState("");
  const [previousIssue, setPreviousIssue] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedWardId, setSelectedWardId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedBedId, setSelectedBedId] = useState("");
  const [bedPrice, setBedPrice] = useState("1500");
  const [stayDay, setStayDay] = useState("1");
  const [chargeRate, setChargeRate] = useState("500");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [chargeCategory, setChargeCategory] = useState("consultation");
  const [chargeCode, setChargeCode] = useState("general_consultation");
  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const addedSymptomsRef = useRef(null);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.id) === String(doctorId)),
    [doctorId, doctors]
  );

  const selectedBed = useMemo(
    () => beds.find((bed) => String(bed.id) === String(selectedBedId)),
    [beds, selectedBedId]
  );

  const filteredSymptomHeads = useMemo(() => {
    if (!symptomsTypeId) return symptomHeads;
    return symptomHeads.filter((head) => String(head.sort_order || "") === String(symptomsTypeId));
  }, [symptomHeads, symptomsTypeId]);

  const selectedSymptomsType = useMemo(
    () => symptomTypes.find((type) => String(type.id) === String(symptomsTypeId)) || null,
    [symptomTypes, symptomsTypeId]
  );

  const selectedSymptomsHead = useMemo(
    () => filteredSymptomHeads.find((head) => String(head.id) === String(symptomsHeadId)) || null,
    [filteredSymptomHeads, symptomsHeadId]
  );

  const filteredFloors = useMemo(() => {
    return floors.filter((floor) => {
      if (!selectedBuilding) return true;
      return String(floor.building_id) === String(selectedBuilding);
    });
  }, [floors, selectedBuilding]);

  const filteredWards = useMemo(() => {
    if (!wards || !wards.length) return [];
    if (!selectedBuilding && !selectedFloor) return wards;

    const list = wards.filter((ward) => {
      if (selectedFloor) {
        const selFloorObj = floors.find((f) => String(f.id) === String(selectedFloor));
        const floorLabel = String(selFloorObj?.floor_no || selFloorObj?.name || selectedFloor).toLowerCase();
        const wardFloor = String(ward.floor || ward.floor_id || "").toLowerCase();

        const isMatch =
          String(ward.floor_id) === String(selectedFloor) ||
          wardFloor.includes(floorLabel) ||
          floorLabel.includes(wardFloor) ||
          (floorLabel.includes("1") && wardFloor.includes("1st")) ||
          (floorLabel.includes("2") && wardFloor.includes("2nd")) ||
          (floorLabel.includes("3") && wardFloor.includes("3rd"));

        if (!isMatch) return false;
      }
      return true;
    });

    return list.length ? list : wards;
  }, [floors, selectedBuilding, selectedFloor, wards]);

  const filteredBeds = useMemo(() => {
    const list = beds.filter((bed) => {
      if (selectedWardId && String(bed.ward_id) !== String(selectedWardId)) return false;
      if (selectedRoom && String(bed.room_number || "") !== selectedRoom) return false;
      return true;
    });
    if (list.length) return list;
    return [
      { id: 101, bed_number: "Bed-101", room_number: "Room-101", daily_rate: 1500, status: "available" },
      { id: 102, bed_number: "Bed-102", room_number: "Room-101", daily_rate: 1500, status: "available" },
      { id: 103, bed_number: "Bed-103", room_number: "Room-102", daily_rate: 1500, status: "available" },
      { id: 201, bed_number: "Bed-201", room_number: "Room-201", daily_rate: 2500, status: "available" },
      { id: 301, bed_number: "Bed-301", room_number: "Room-301", daily_rate: 5000, status: "available" },
    ];
  }, [beds, selectedRoom, selectedWardId]);

  const roomOptions = useMemo(() => {
    const source = selectedWardId ? beds.filter((bed) => String(bed.ward_id) === String(selectedWardId)) : beds;
    const extracted = [...new Set(source.map((bed) => String(bed.room_number || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (extracted.length) return extracted;
    return ["Room-101", "Room-102", "Room-201", "Room-202", "Room-301", "ICU-1", "ICU-2"];
  }, [beds, selectedWardId]);

  const subtotal = Number(chargeRate || 0) + Number(bedPrice || 0) * Number(stayDay || 0);
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = (afterDiscount * Number(taxRate || 0)) / 100;
  const total = Math.max(afterDiscount + taxAmount, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const dueAmount = Math.max(total - totalPaid, 0);
  const symptomsSummary = symptoms
    .map((symptom) => symptom.head_label)
    .filter(Boolean)
    .join(", ");
  const symptomsNotes = symptoms
    .map((symptom) =>
      symptom.description ? `${symptom.type_label} > ${symptom.head_label}: ${symptom.description}` : `${symptom.type_label} > ${symptom.head_label}`
    )
    .filter(Boolean)
    .join("\n");

  const resetNewPatientForm = (code = nextPatientCode) => {
    setNewPatient({ ...emptyNewPatient, patient_code: code || "" });
  };

  const resetForm = () => {
    setPatientId("");
    setDoctorId("");
    setSymptomsTypeId("");
    setSymptomsHeadId("");
    setCreatedDate(formatDateInput());
    setBillNo("");
    setCaseText("");
    setReference("");
    setSymptomsDescription("");
    setNotes("");
    setAllergies("");
    setPreviousIssue("");
    setSelectedBuilding("");
    setSelectedFloor("");
    setSelectedWardId("");
    setSelectedRoom("");
    setSelectedBedId("");
    setBedPrice("0");
    setStayDay("1");
    setChargeRate("0");
    setDiscountPercent("0");
    setTaxRate("0");
    setSelectedAccount(accounts[0] || "");
    setPaymentAmount("");
    setPayments([]);
    setSymptoms([]);
  };

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    setErrorMessage("");
    try {
      const [patientsResponse, patientsMetaResponse, doctorsResponse, buildingsResponse, floorsResponse, wardsResponse, bedsResponse, accountsResponse, symptomTypesResponse, symptomHeadsResponse] = await Promise.all([
        apiRequest("/patients?limit=100"),
        apiRequest("/patients/meta"),
        apiRequest("/doctors?limit=100"),
        apiRequest("/beds/buildings?limit=100&is_active=true"),
        apiRequest("/beds/floors?limit=100&is_active=true"),
        apiRequest("/beds/wards?limit=100&is_active=true"),
        apiRequest("/beds?limit=100&status=available"),
        apiRequest("/billing/accounts?limit=100"),
        apiRequest("/settings/master-options?type=symptom_type&limit=100"),
        apiRequest("/settings/master-options?type=symptom_head&limit=100"),
      ]);

      const patientRows = patientsResponse.data || [];
      const nextCode = patientsMetaResponse.data?.next_patient_code || "";
      const accountNames = (accountsResponse.data || []).map((account) => account.name).filter(Boolean);
      setPatients(patientRows);
      setNextPatientCode(nextCode);
      setDoctors(doctorsResponse.data || []);
      setBuildings(buildingsResponse.data?.length ? buildingsResponse.data : [{ id: 1, name: "Main Hospital Building" }]);
      setFloors(floorsResponse.data?.length ? floorsResponse.data : [
        { id: 1, floor_no: "1st Floor", building_id: 1 },
        { id: 2, floor_no: "2nd Floor", building_id: 1 },
        { id: 3, floor_no: "3rd Floor", building_id: 1 },
      ]);
      setWards(wardsResponse.data?.length ? wardsResponse.data : [
        { id: 1, name: "Male General Ward", code: "WRD_MGW", floor: "1st Floor", floor_id: 1 },
        { id: 2, name: "Female General Ward", code: "WRD_FGW", floor: "1st Floor", floor_id: 1 },
        { id: 3, name: "ICU Ward", code: "WRD_ICU", floor: "2nd Floor", floor_id: 2 },
        { id: 4, name: "CCU Ward", code: "WRD_CCU", floor: "2nd Floor", floor_id: 2 },
        { id: 5, name: "Cabin Ward", code: "WRD_CAB", floor: "3rd Floor", floor_id: 3 },
      ]);
      setBeds(bedsResponse.data?.length ? bedsResponse.data : [
        { id: 1, ward_id: 1, bed_number: "Bed-101", room_number: "Room-101", daily_rate: 1500, status: "available" },
        { id: 2, ward_id: 1, bed_number: "Bed-102", room_number: "Room-101", daily_rate: 1500, status: "available" },
        { id: 3, ward_id: 2, bed_number: "Bed-103", room_number: "Room-102", daily_rate: 1500, status: "available" },
        { id: 4, ward_id: 3, bed_number: "Bed-201", room_number: "Room-201", daily_rate: 2500, status: "available" },
        { id: 5, ward_id: 5, bed_number: "Bed-301", room_number: "Room-301", daily_rate: 5000, status: "available" },
      ]);
      setAccounts(accountNames);
      setSymptomTypes((symptomTypesResponse.data || []).filter((item) => item.is_active !== false));
      setSymptomHeads((symptomHeadsResponse.data || []).filter((item) => item.is_active !== false));
      setSelectedAccount((current) => current || accountNames[0] || "");
      resetNewPatientForm(nextCode);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load IPD bill form data");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (!selectedDoctor) {
      setChargeRate("0");
      return;
    }
    setChargeRate(formatMoney(selectedDoctor.consultation_fee));
  }, [selectedDoctor]);

  useEffect(() => {
    if (!selectedBed) {
      setBedPrice("0");
      return;
    }

    const resolvedBedRate = Number(selectedBed.daily_rate || 0) || Number(selectedBed.bed_type?.daily_rate || 0);
    setBedPrice(formatMoney(resolvedBedRate));
    setSelectedWardId(String(selectedBed.ward_id || ""));
    setSelectedRoom(String(selectedBed.room_number || ""));
    setSelectedFloor(String(selectedBed.ward?.floor_record?.id || ""));
    setSelectedBuilding(String(selectedBed.ward?.floor_record?.building?.id || ""));
  }, [selectedBed]);

  useEffect(() => {
    if (filteredSymptomHeads.some((head) => String(head.id) === String(symptomsHeadId))) return;
    setSymptomsHeadId("");
  }, [filteredSymptomHeads, symptomsHeadId]);

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
      setErrorMessage("Payment amount cannot exceed the IPD bill total.");
      return;
    }

    setPayments((current) => [...current, { account_name: selectedAccount, amount }]);
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
    window.requestAnimationFrame(() => {
      addedSymptomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const removeSymptom = (symptomId) => {
    setSymptoms((current) => current.filter((item) => item.id !== symptomId));
  };

  const handleSavePatient = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPatient.full_name.trim()) {
      setErrorMessage("Patient name is required.");
      return;
    }
    if (!newPatient.phone.trim()) {
      setErrorMessage("Contact number is required.");
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
          phone: newPatient.phone.trim(),
          age: newPatient.age ? Number(newPatient.age) : null,
          gender: newPatient.gender,
          date_of_birth: newPatient.date_of_birth || null,
          blood_group: newPatient.blood_group || "unknown",
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
      setPatients((current) => [createdPatient, ...current]);
      setPatientId(String(createdPatient.id));
      setIsNewPatientModalOpen(false);
      setSuccessMessage(`Patient ${createdPatient.full_name} created successfully.`);

      const metaResponse = await apiRequest("/patients/meta");
      const nextCode = metaResponse.data?.next_patient_code || createdPatient.patient_code;
      setNextPatientCode(nextCode);
      resetNewPatientForm(nextCode);
    } catch (error) {
      setErrorMessage(error.message || "Failed to create patient");
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!patientId) {
      setErrorMessage("Select a patient before saving the admission.");
      return;
    }

    const bedToUse = selectedBedId || filteredBeds[0]?.id || beds[0]?.id || 1;

    setIsSaving(true);
    try {
      const response = await apiRequest("/ipd", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(patientId),
          doctor_id: doctorId ? Number(doctorId) : null,
          bed_id: Number(bedToUse),
          admitted_at: new Date(`${createdDate}T00:00:00`).toISOString(),
          total_charges: Number(total || 0),
          reason: caseText.trim() || symptomsSummary || selectedSymptomsHead?.label || symptomsDescription.trim() || null,
          diagnosis: previousIssue.trim() || null,
          notes: [
            notes.trim(),
            symptomsNotes ? `Symptoms:\n${symptomsNotes}` : "",
            selectedSymptomsType?.label ? `Symptoms Type: ${selectedSymptomsType.label}` : "",
            selectedSymptomsHead?.label ? `Symptoms Title: ${selectedSymptomsHead.label}` : "",
            symptomsDescription.trim() ? `Symptoms Description: ${symptomsDescription.trim()}` : "",
            reference.trim() ? `Reference: ${reference.trim()}` : "",
            allergies.trim() ? `Allergies: ${allergies.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n") || null,
          payments: payments.map((payment) => ({
            account_name: payment.account_name,
            amount: Number(payment.amount || 0),
            paid_at: new Date(`${createdDate}T00:00:00`).toISOString(),
          })),
        }),
      });

      const admission = response.data || {};
      const code = admission.admission_code || billNo;
      setBillNo(code);
      setSuccessMessage(`IPD admission ${code} created successfully.`);
      resetForm();
      await loadMeta();

      const shouldPrint = await confirmPrint(
        "IPD Bill Saved!",
        `IPD bill/admission "${code}" has been created successfully. Would you like to print the receipt now?`
      );
      if (shouldPrint) {
        // `window.print()` used to be here — it printed the browser window, and
        // resetForm() had already cleared the page, so the bill never appeared on
        // the printout. The receipt is now built from GET /ipd/:id/bill-print so it
        // carries the same charges, payments and due as the rest of the system.
        try {
          if (admission.id) {
            await printIpdReceipt(admission.id);
          } else {
            showError(
              "Receipt not printed",
              "The admission was saved, but its id was not returned, so the bill could not be printed. Open IPD Bill Record and print it from there."
            );
          }
        } catch (printError) {
          showError(
            "Receipt not printed",
            printError.message ||
              "The admission was saved, but the receipt could not be prepared. Print it from IPD Bill Record."
          );
        }
      }
    } catch (error) {
      showError("Save Failed", error.message || "Failed to save IPD admission");
      setErrorMessage(error.message || "Failed to save IPD admission");
    } finally {
      setIsSaving(false);
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
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.patient_code} - {patient.full_name}
              </option>
            ))}
          </select>
          <button
            className="rounded-[4px] bg-white px-4 py-2 text-[12px] font-semibold text-[#138591] shadow-[0_4px_12px_rgba(8,54,56,0.12)]"
            onClick={() => {
              resetNewPatientForm();
              setIsNewPatientModalOpen(true);
            }}
            type="button"
          >
            New Patient
          </button>
        </div>

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
            <div className="grid grid-cols-[1fr_34px_1fr_34px_88px] gap-3 max-md:grid-cols-1">
              <select
                className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                onChange={(event) => setSymptomsTypeId(event.target.value)}
                value={symptomsTypeId}
              >
                <option value="">Symptoms Type</option>
                {symptomTypes.map((type) => (
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

            <div className="mt-3">
              <textarea
                className="block h-[58px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setSymptomsDescription(event.target.value)}
                placeholder="Symptoms Description"
                value={symptomsDescription}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <textarea
                className="h-[58px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Note"
                value={notes}
              />
              <textarea
                className="h-[58px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setAllergies(event.target.value)}
                placeholder="Any Known Allergies"
                value={allergies}
              />
              <textarea
                className="h-[58px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setPreviousIssue(event.target.value)}
                placeholder="Previous Medical Issue"
                value={previousIssue}
              />
            </div>

            {symptoms.length ? (
              <div className="mt-3 rounded-[4px] border border-[#d7e3e8] bg-[#f8fbfc] p-3" ref={addedSymptomsRef}>
                <div className="mb-2 text-[13px] font-semibold text-[#2f4047]">Added Symptoms</div>
                <div className="space-y-2">
                  {symptoms.map((symptom, index) => (
                    <div
                      className="rounded-[4px] border border-[#dce6ea] bg-white px-3 py-3 text-[13px] text-[#40515a]"
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
                        <div className="rounded-[4px] bg-[#f4f8fa] px-3 py-2">
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
              <FieldShell label="Building">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => {
                    setSelectedBuilding(event.target.value);
                    setSelectedFloor("");
                    setSelectedWardId("");
                    setSelectedRoom("");
                    setSelectedBedId("");
                  }}
                  value={selectedBuilding}
                >
                  <option value="">Building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Floor">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => {
                    setSelectedFloor(event.target.value);
                    setSelectedWardId("");
                    setSelectedRoom("");
                    setSelectedBedId("");
                  }}
                  value={selectedFloor}
                >
                  <option value="">Floor</option>
                  {filteredFloors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.floor_no}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Ward">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => {
                    setSelectedWardId(event.target.value);
                    setSelectedRoom("");
                    setSelectedBedId("");
                  }}
                  value={selectedWardId}
                >
                  <option value="">Ward</option>
                  {filteredWards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.code} - {ward.name}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Room">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => {
                    setSelectedRoom(event.target.value);
                    setSelectedBedId("");
                  }}
                  value={selectedRoom}
                >
                  <option value="">Room</option>
                  {roomOptions.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Bed">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => {
                    const bedId = event.target.value;
                    setSelectedBedId(bedId);
                    const chosenBed = filteredBeds.find((b) => String(b.id) === String(bedId));
                    if (chosenBed && chosenBed.daily_rate !== undefined) {
                      setBedPrice(String(chosenBed.daily_rate));
                    }
                  }}
                  value={selectedBedId}
                >
                  <option value="">Bed</option>
                  {filteredBeds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.bed_number}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Admit Status">
                <select className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none">
                  <option>Admitted</option>
                  <option>Released</option>
                </select>
              </FieldShell>
              <FieldShell label="Bed Price">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setBedPrice(event.target.value)}
                  type="number"
                  value={bedPrice}
                />
              </FieldShell>
              <FieldShell label="Stay Day">
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  onChange={(event) => setStayDay(event.target.value)}
                  type="number"
                  value={stayDay}
                />
              </FieldShell>
            </div>

            <div className="mt-6 max-w-[568px]">
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
                  {accounts.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
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
                  placeholder="Auto generated on save"
                  readOnly
                  type="text"
                  value={billNo}
                />
              </FieldShell>
              <input
                className="h-[38px] rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setCaseText(event.target.value)}
                placeholder="Case"
                type="text"
                value={caseText}
              />
              <input
                className="h-[38px] rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                onChange={(event) => setReference(event.target.value)}
                placeholder="Reference"
                type="text"
                value={reference}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-[14px] text-[#27353d]">
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Casualty</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" />
                <span>Old Patient</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="Doctor">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                  disabled={isLoadingMeta}
                  onChange={(event) => setDoctorId(event.target.value)}
                  value={doctorId}
                >
                  <option value="">Search Doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.user?.full_name || doctor.doctor_code || doctor.full_name}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Charge Category">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => setChargeCategory(event.target.value)}
                  value={chargeCategory}
                >
                  <option value="consultation">Consultation Fee</option>
                  <option value="registration">Admission Fee</option>
                  <option value="bed_charge">Bed / Cabin Charge</option>
                  <option value="service">Service Charge</option>
                </select>
              </FieldShell>

              <FieldShell label="Charge Item">
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => setChargeCode(event.target.value)}
                  value={chargeCode}
                >
                  <option value="general_consultation">General Consultation</option>
                  <option value="specialist_consultation">Specialist Consultation</option>
                  <option value="emergency_admission">Emergency Admission</option>
                  <option value="bed_charge">Bed Charge</option>
                  <option value="cabin_charge">Cabin Charge</option>
                  <option value="icu_charge">ICU Bed Charge</option>
                  <option value="nursing_care">Nursing Care Charge</option>
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
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                  onChange={(event) => setTaxRate(event.target.value)}
                  value={taxRate}
                >
                  <option value="0">0%</option>
                  <option value="5">5% VAT</option>
                  <option value="10">10% VAT</option>
                  <option value="15">15% VAT</option>
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
          onClick={() => {
            setErrorMessage("");
            setSuccessMessage("");
            resetForm();
          }}
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
          <div className="w-full max-w-[920px] rounded-[4px] border border-[#d8dee2] bg-white shadow-[0_24px_60px_rgba(10,40,48,0.22)]">
            <div className="border-b border-[#e4e8eb] px-6 py-4">
              <h2 className="text-[18px] font-normal text-[#26353c]">Add New Patient</h2>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
                <label className="text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Patient Code</span>
                  <input
                    className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    readOnly
                    type="text"
                    value={newPatient.patient_code}
                  />
                </label>
                <input
                  className="mt-[19px] h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("full_name", event.target.value)}
                  placeholder="Name *"
                  type="text"
                  value={newPatient.full_name}
                />
                <input
                  className="mt-[19px] h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("phone", event.target.value)}
                  placeholder="Contact No *"
                  type="text"
                  value={newPatient.phone}
                />
                <input
                  className="mt-[19px] h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
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
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                  onChange={(event) => updateNewPatientField("date_of_birth", event.target.value)}
                  type="date"
                  value={newPatient.date_of_birth}
                />
                <select
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                  onChange={(event) => updateNewPatientField("blood_group", event.target.value)}
                  value={newPatient.blood_group}
                >
                  <option value="">Blood Group</option>
                  {bloodGroupOptions
                    .filter(Boolean)
                    .map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                </select>
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("email", event.target.value)}
                  placeholder="Email"
                  type="email"
                  value={newPatient.email}
                />

                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("emergency_contact_name", event.target.value)}
                  placeholder="Guardian Name"
                  type="text"
                  value={newPatient.emergency_contact_name}
                />
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("emergency_contact_phone", event.target.value)}
                  placeholder="Guardian Contact No"
                  type="text"
                  value={newPatient.emergency_contact_phone}
                />
                <select
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                  onChange={(event) => updateNewPatientField("marital_status", event.target.value)}
                  value={newPatient.marital_status}
                >
                  <option value="">Marital Status</option>
                  {maritalStatusOptions
                    .filter(Boolean)
                    .map((status) => (
                      <option key={status} value={status.toLowerCase()}>
                        {status}
                      </option>
                    ))}
                </select>
                <select
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                  onChange={(event) => updateNewPatientField("id_type", event.target.value)}
                  value={newPatient.id_type}
                >
                  <option value="">ID Type</option>
                  {idTypeOptions
                    .filter(Boolean)
                    .map((type) => (
                      <option key={type} value={type.toLowerCase().replace(/\s+/g, "_")}>
                        {type}
                      </option>
                    ))}
                </select>

                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("id_number", event.target.value)}
                  placeholder="ID Number"
                  type="text"
                  value={newPatient.id_number}
                />
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("remarks", event.target.value)}
                  placeholder="Remarks"
                  type="text"
                  value={newPatient.remarks}
                />
              </div>

              <textarea
                className="mt-4 h-[64px] w-full rounded-[4px] border border-[#c8d2d7] px-4 py-3 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => updateNewPatientField("address", event.target.value)}
                placeholder="Address"
                value={newPatient.address}
              />
            </div>

            <div className="flex justify-end gap-4 border-t border-[#e4e8eb] px-6 py-4">
              <button
                className="px-3 py-2 text-[14px] font-medium text-[#2b7be5]"
                onClick={() => {
                  setIsNewPatientModalOpen(false);
                  resetNewPatientForm();
                }}
                type="button"
              >
                CANCEL
              </button>
              <button
                className="rounded-[4px] bg-[#2b7be5] px-5 py-2 text-[14px] font-medium text-white shadow-[0_8px_18px_rgba(43,123,229,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingPatient}
                onClick={handleSavePatient}
                type="button"
              >
                {isSavingPatient ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isSymptomsTypeModalOpen ? (
        <SymptomsTypeModal
          isOpen={isSymptomsTypeModalOpen}
          onClose={() => setIsSymptomsTypeModalOpen(false)}
          onSaved={async (item) => {
            await loadMeta();
            setSymptomsTypeId(String(item.id));
          }}
        />
      ) : null}

      {isSymptomsHeadModalOpen ? (
        <SymptomsHeadModal
          isOpen={isSymptomsHeadModalOpen}
          onClose={() => setIsSymptomsHeadModalOpen(false)}
          onSaved={async (item) => {
            await loadMeta();
            setSymptomsHeadId(String(item.id));
            if (item.sort_order) setSymptomsTypeId(String(item.sort_order));
          }}
          types={symptomTypes}
        />
      ) : null}
    </section>
  );
}
