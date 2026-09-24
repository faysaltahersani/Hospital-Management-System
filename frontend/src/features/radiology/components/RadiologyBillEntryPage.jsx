import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const emptyMeta = {
  next_bill_no: "",
  next_patient_code: "",
  accounts: [],
  patients: [],
  doctors: [],
  tests: [],
};

const genderOptions = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bloodGroupOptions = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const maritalStatusOptions = ["", "Single", "Married", "Widowed", "Divorced"];
const idTypeOptions = ["", "National ID", "Passport", "Birth Certificate", "Driving License", "Other"];
const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

export function RadiologyBillEntryPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [meta, setMeta] = useState(emptyMeta);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [billNo, setBillNo] = useState("");
  const [createdDate, setCreatedDate] = useState(formatDateInput());
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [previousReportComment, setPreviousReportComment] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [transportAmount, setTransportAmount] = useState("0");

  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedTestQuantity, setSelectedTestQuantity] = useState("1");
  const [selectedTestPrice, setSelectedTestPrice] = useState("0.00");
  const [items, setItems] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState([]);
  const [newPatient, setNewPatient] = useState({
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
  });

  const selectedPatient = useMemo(
    () => (meta.patients || []).find((patient) => String(patient.id) === String(patientId)),
    [meta.patients, patientId]
  );

  const selectedTest = useMemo(
    () => (meta.tests || []).find((test) => String(test.id) === String(selectedTestId)),
    [meta.tests, selectedTestId]
  );
  const selectedTestTaxRate = Number(selectedTest?.tax_rate || 0);

  const subtotal = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const taxAmount = items.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const total = Math.max(afterDiscount + taxAmount + Number(transportAmount || 0), 0);
  const balance = Math.max(total - totalPaid, 0);

  const resetNewPatientForm = (nextPatientCode = meta.next_patient_code) => {
    setNewPatient({
      patient_code: nextPatientCode || "",
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
  };

  const resetForm = (nextBillNo = meta.next_bill_no) => {
    setBillNo(nextBillNo || "");
    setCreatedDate(formatDateInput());
    setPatientId("");
    setDoctorId("");
    setNotes("");
    setPreviousReportComment("");
    setDiscountPercent("0");
    setTransportAmount("0");
    setSelectedTestId("");
    setSelectedTestQuantity("1");
    setSelectedTestPrice("0.00");
    setItems([]);
    setSelectedAccount(meta.accounts?.[0] || "");
    setPaymentAmount("");
    setPayments([]);
  };

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    setErrorMessage("");
    try {
      const [metaRes, patientsRes, doctorsRes, testsRes] = await Promise.all([
        apiRequest("/radiology/bill-entry/meta").catch(() => null),
        apiRequest("/patients?limit=100").catch(() => ({ data: [] })),
        apiRequest("/doctors?limit=100").catch(() => ({ data: [] })),
        apiRequest("/radiology/tests?limit=100").catch(() => ({ data: [] })),
      ]);

      const payload = metaRes?.data || {};
      const patients = payload.patients?.length ? payload.patients : patientsRes.data || [];
      const doctors = payload.doctors?.length
        ? payload.doctors
        : (doctorsRes.data || []).map((d) => ({
            id: d.id,
            doctor_code: d.doctor_code,
            full_name: d.user?.full_name || d.doctor_code || `Doctor #${d.id}`,
          }));
      const tests = payload.tests?.length ? payload.tests : testsRes.data || [];
      const accounts = payload.accounts?.length ? payload.accounts : ["Cash", "Card", "Bkash", "Nagad", "Bank Transfer"];

      const mergedMeta = {
        next_bill_no: payload.next_bill_no || `RADBILL-${Date.now().toString().slice(-6)}`,
        next_patient_code: payload.next_patient_code || `PAT-${Date.now().toString().slice(-5)}`,
        accounts,
        patients,
        doctors,
        tests,
      };

      setMeta(mergedMeta);
      setBillNo(mergedMeta.next_bill_no);
      setSelectedAccount(accounts[0] || "");
      resetNewPatientForm(mergedMeta.next_patient_code);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology bill form data");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (!selectedTest) {
      setSelectedTestPrice("0.00");
      return;
    }
    setSelectedTestPrice(formatMoney(selectedTest.base_charge ?? selectedTest.price));
  }, [selectedTest]);

  const updateNewPatientField = (field, value) => {
    setNewPatient((current) => ({ ...current, [field]: value }));
  };

  const addTest = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedTest) {
      setErrorMessage("Select a test before adding it.");
      return;
    }

    const quantity = Math.max(Number(selectedTestQuantity || 1), 1);
    const unitPrice = Number(selectedTestPrice || selectedTest.base_charge || selectedTest.price || 0);
    const rowTaxRate = Number(selectedTest.tax_rate || 0);
    const baseTotal = quantity * unitPrice;
    const rowTaxAmount = (baseTotal * rowTaxRate) / 100;
    const totalPrice = baseTotal;

    setItems((current) => [
      ...current,
      {
        test_id: selectedTest.id,
        name: selectedTest.name,
        quantity,
        price: unitPrice,
        tax_rate: rowTaxRate,
        tax_amount: rowTaxAmount,
        total_price: totalPrice,
      },
    ]);
    setSelectedTestId("");
    setSelectedTestQuantity("1");
    setSelectedTestPrice("0.00");
  };

  const removeTest = (indexToRemove) => {
    setItems((current) => current.filter((_, index) => index !== indexToRemove));
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
      setErrorMessage("Payment amount cannot exceed the radiology bill total.");
      return;
    }

    setPayments((current) => [...current, { account_name: selectedAccount, amount }]);
    setPaymentAmount("");
  };

  const removePayment = (indexToRemove) => {
    setPayments((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!patientId) {
      setErrorMessage("Select a patient before saving the bill.");
      return;
    }
    if (!items.length) {
      setErrorMessage("Add at least one radiology test before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/radiology/bills", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(patientId),
          doctor_id: doctorId ? Number(doctorId) : null,
          ordered_at: new Date(createdDate).toISOString(),
          notes: notes || null,
          previous_report_comment: previousReportComment || null,
          discount: Number(discountAmount || 0),
          tax: Number(taxAmount || 0),
          items: items.map((item) => ({
            test_id: item.test_id,
            price: Number(item.total_price || item.price || 0),
          })),
          payments: payments.map((payment) => ({
            account_name: payment.account_name,
            amount: Number(payment.amount || 0),
          })),
        }),
      });

      const bill = response.data;
      setSuccessMessage(
        `Radiology bill saved successfully. ${bill.orders?.length || 0} test order${bill.orders?.length === 1 ? "" : "s"} created.`
      );

      await loadMeta();
      setDoctorId("");
      setNotes("");
      setPreviousReportComment("");
      setDiscountPercent("0");
      setTransportAmount("0");
      setSelectedTestId("");
      setSelectedTestQuantity("1");
      setSelectedTestPrice("0.00");
      setItems([]);
      setPaymentAmount("");
      setPayments([]);
      setPatientId("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save radiology bill");
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
      setMeta((current) => ({
        ...current,
        next_patient_code: createdPatient.patient_code,
        patients: [createdPatient, ...current.patients],
      }));
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
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-4 flex items-center justify-between rounded-[4px] bg-[#0d746c] px-4 py-2 text-white">
          <span className="text-[14px] font-semibold">
            {selectedPatient ? `${selectedPatient.full_name} (${selectedPatient.patient_code})` : "No patient selected"}
          </span>
          <button
            className="rounded-[4px] bg-[rgba(255,255,255,0.16)] px-3 py-1 text-[12px] font-medium transition-colors duration-150 hover:bg-[rgba(255,255,255,0.22)]"
            onClick={() => setIsNewPatientModalOpen(true)}
            type="button"
          >
            + New Patient
          </button>
        </div>

        <div className="mb-4 flex items-center justify-end">
          <h2 className="relative px-4 text-[13px] font-medium uppercase tracking-[0.04em] text-[#4d5a61]">
            <span className="absolute top-1/2 left-[-60px] h-px w-[52px] -translate-y-1/2 bg-[#d7dfe3]" />
            Radiology Bill Entry
          </h2>
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

        <div className="mb-4 grid grid-cols-[1fr_1fr_2fr] gap-3 max-lg:grid-cols-1">
          <label className="text-[11px] text-[#8b959b]">
            <span className="mb-1 block">Bill No</span>
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[14px] font-semibold text-[#27353d] outline-none"
              readOnly
              type="text"
              value={billNo}
            />
          </label>
          <label className="text-[11px] text-[#8b959b]">
            <span className="mb-1 block">Created Date</span>
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[14px] text-[#27353d] outline-none"
              onChange={(event) => setCreatedDate(event.target.value)}
              type="date"
              value={createdDate}
            />
          </label>
          <label className="text-[11px] text-[#8b959b]">
            <span className="mb-1 block">Patient</span>
            <select
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#5f6c74] outline-none"
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
          </label>
        </div>

        <div className="mb-4 rounded-[6px] border border-[#d2dde0] p-3">
          <h3 className="mb-3 border-l-[3px] border-[#0d746c] pl-2 text-[13px] font-semibold text-[#26353c]">
            Add Tests
          </h3>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
            <label className="text-[11px] text-[#7c8a92] xl:col-span-2">
              <span className="mb-1 block">Test</span>
              <select
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[13px] text-[#65727a] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setSelectedTestId(event.target.value)}
                value={selectedTestId}
              >
                <option value="">Select Test</option>
                {meta.tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.code} - {test.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-[#7c8a92]">
              <span className="mb-1 block">Quantity</span>
              <input
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                min="1"
                onChange={(event) => setSelectedTestQuantity(event.target.value)}
                type="number"
                value={selectedTestQuantity}
              />
            </label>
            <label className="text-[11px] text-[#7c8a92]">
              <span className="mb-1 block">Tax Rate</span>
              <input
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                readOnly
                type="text"
                value={`${selectedTestTaxRate}%`}
              />
            </label>
            <label className="text-[11px] text-[#7c8a92]">
              <span className="mb-1 block">Charge</span>
              <input
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                onChange={(event) => setSelectedTestPrice(event.target.value)}
                type="number"
                value={selectedTestPrice}
              />
            </label>
            <label className="text-[11px] text-[#7c8a92]">
              <span className="mb-1 block">Tax Amount</span>
              <input
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                readOnly
                type="text"
                value={formatMoney(
                  (Number(selectedTestQuantity || 1) * Number(selectedTestPrice || 0) * selectedTestTaxRate) / 100
                )}
              />
            </label>
            <label className="text-[11px] text-[#7c8a92]">
              <span className="mb-1 block">Amount</span>
              <input
                className="h-[34px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                readOnly
                type="text"
                value={formatMoney(
                  Number(selectedTestQuantity || 1) * Number(selectedTestPrice || 0) +
                    (Number(selectedTestQuantity || 1) * Number(selectedTestPrice || 0) * selectedTestTaxRate) / 100
                )}
              />
            </label>
            <div className="flex items-end">
              <button className="h-[34px] w-full rounded-[4px] bg-[#0d746c] px-3 text-[13px] font-medium text-white" onClick={addTest} type="button">
                Add
              </button>
            </div>
          </div>
          <div className="mb-3 grid grid-cols-[60px_1.7fr_0.6fr_0.6fr_0.6fr_0.7fr_0.7fr_0.7fr] border-t border-[#dbe4e7] bg-[#e8f5f6] px-3 py-2 text-[12px] text-[#4d5a61] max-lg:hidden">
            <span>SL</span>
            <span>Description</span>
            <span>Quantity</span>
            <span>Charge</span>
            <span>Tax Rate</span>
            <span>Tax Amount</span>
            <span>Amount</span>
            <span>Remove</span>
          </div>
          {items.length ? (
            items.map((item, index) => (
              <div
                className="grid grid-cols-[60px_1.7fr_0.6fr_0.6fr_0.6fr_0.7fr_0.7fr_0.7fr] border-t border-[#eef2f4] px-3 py-2 text-[12px] text-[#34434a] max-lg:grid-cols-1"
                key={`${item.test_id}-${index}`}
              >
                <span>{index + 1}</span>
                <span>{item.name}</span>
                <span>{item.quantity}</span>
                <span>{formatMoney(item.price)}</span>
                <span>{item.tax_rate}%</span>
                <span>{formatMoney(item.tax_amount)}</span>
                <span>{formatMoney(Number(item.total_price || 0) + Number(item.tax_amount || 0))}</span>
                <button className="text-left text-[#d95c5c]" onClick={() => removeTest(index)} type="button">
                  Remove
                </button>
              </div>
            ))
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_2.1fr] gap-4 max-lg:grid-cols-1">
          <div className="rounded-[6px] border border-[#d2dde0] p-3">
            <h3 className="mb-3 border-l-[3px] border-[#0d746c] pl-2 text-[13px] font-semibold text-[#26353c]">
              Doctor & Notes
            </h3>
            <div className="space-y-3">
              <select
                className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[13px] text-[#65727a] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setDoctorId(event.target.value)}
                value={doctorId}
              >
                <option value="">Select Doctor</option>
                {meta.doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </option>
                ))}
              </select>
              <textarea
                className="h-[88px] w-full rounded-[3px] border border-[#c8d2d7] px-3 py-2 text-[13px] outline-none"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Note"
                value={notes}
              />
              <textarea
                className="h-[56px] w-full rounded-[3px] border border-[#c8d2d7] px-3 py-2 text-[13px] outline-none"
                onChange={(event) => setPreviousReportComment(event.target.value)}
                placeholder="Previous Report Comment"
                value={previousReportComment}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[6px] border border-[#d2dde0] p-3">
              <h3 className="mb-3 border-l-[3px] border-[#0d746c] pl-2 text-[13px] font-semibold text-[#26353c]">
                Billing Summary
              </h3>
              <div className="grid grid-cols-4 gap-3 text-[13px] max-xl:grid-cols-2 max-md:grid-cols-1">
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Sub Total</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(subtotal)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Discount %</span>
                  <input
                    className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3"
                    min="0"
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    type="number"
                    value={discountPercent}
                  />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Discount Amount</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(discountAmount)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">After Discount</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(afterDiscount)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Tax Amount</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(taxAmount)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Transport Amount</span>
                  <input
                    className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3"
                    min="0"
                    onChange={(event) => setTransportAmount(event.target.value)}
                    type="number"
                    value={transportAmount}
                  />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Paid</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(totalPaid)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Due</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(balance)} />
                </label>
                <label className="text-[#5f6c74]">
                  <span className="mb-1 block">Total Amount</span>
                  <input className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] px-3" readOnly type="text" value={formatMoney(total)} />
                </label>
              </div>
            </div>

            <div className="rounded-[6px] border border-[#d2dde0] p-3">
              <div className="mb-3 rounded-[4px] bg-[#bfe9ea] px-3 py-2 text-[13px] font-semibold text-[#24353c]">
                Add Payment
              </div>
              <p className="mb-3 text-[13px] text-[#34434a]">
                Total Amount Including Tax: <span className="font-semibold">{formatMoney(total)}</span>
              </p>
              <div className="grid grid-cols-[2fr_1.3fr_0.7fr] gap-3 max-md:grid-cols-1">
                <select
                  className="h-[34px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[13px] text-[#65727a] outline-none"
                  onChange={(event) => setSelectedAccount(event.target.value)}
                  value={selectedAccount}
                >
                  <option value="">Select Account</option>
                  {(meta.accounts || []).map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
                <input
                  className="h-[34px] rounded-[3px] border border-[#c8d2d7] px-3 text-[13px]"
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Amount"
                  type="number"
                  value={paymentAmount}
                />
                <button className="rounded-[4px] bg-[#bcc9c2] px-3 text-[13px] font-medium text-[#34434a]" onClick={addPayment} type="button">
                  ADD
                </button>
              </div>
              {payments.length ? (
                <div className="mt-3 space-y-2 text-[12px] text-[#34434a]">
                  {payments.map((payment, index) => (
                    <div className="flex items-center justify-between rounded-[4px] bg-[#f6f8f9] px-3 py-2" key={`${payment.account_name}-${index}`}>
                      <span>
                        {payment.account_name} - {formatMoney(payment.amount)}
                      </span>
                      <button className="text-[#d95c5c]" onClick={() => removePayment(index)} type="button">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[13px] text-[#34434a]">
                Total Paid: <span className="font-semibold">{formatMoney(totalPaid)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-[4px] border border-[#f2b2b2] px-4 py-2 text-[12px] font-medium text-[#d95c5c]"
            onClick={() => {
              setErrorMessage("");
              setSuccessMessage("");
              resetForm();
            }}
            type="button"
          >
            RESET
          </button>
          <button
            className="rounded-[4px] bg-[#2276da] px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingMeta || isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "SAVE BILL"}
          </button>
        </div>
      </div>

      {isNewPatientModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(7,34,39,0.28)] px-4 py-6">
          <div className="w-full max-w-[920px] rounded-[4px] border border-[#d8dee2] bg-white shadow-[0_24px_60px_rgba(10,40,48,0.22)]">
            <div className="border-b border-[#e4e8eb] px-6 py-4">
              <h2 className="text-[18px] font-normal text-[#26353c]">Add New Patient</h2>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  readOnly
                  type="text"
                  value={newPatient.patient_code}
                />
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("full_name", event.target.value)}
                  placeholder="Name *"
                  type="text"
                  value={newPatient.full_name}
                />
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateNewPatientField("phone", event.target.value)}
                  placeholder="Contact No *"
                  type="text"
                  value={newPatient.phone}
                />
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
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
                    <option key={option.value || option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="h-[40px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
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
                    .filter((option) => option)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                    .filter((option) => option)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                    .filter((option) => option)
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                onClick={() => setIsNewPatientModalOpen(false)}
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
    </section>
  );
}
