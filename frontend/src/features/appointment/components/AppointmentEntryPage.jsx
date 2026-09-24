import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../../lib/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

function FieldShell({ children, className = "", label }) {
  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1 block text-[11px] text-[#8b959b]">{label}</span> : null}
      {children}
    </label>
  );
}

const todayDate = new Date().toISOString().split("T")[0];
const todayTime = new Date().toTimeString().slice(0, 5);

const paymentMethodMap = {
  Cash: "cash",
  "Bank Account": "bank_transfer",
  "Mobile Banking": "mobile_banking",
  Card: "card",
};

const emptyPatient = {
  full_name: "", phone: "", age: "", gender: "male",
  date_of_birth: "", blood_group: "unknown", email: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  marital_status: "", id_type: "", id_number: "", remarks: "", address: "",
};

export function AppointmentEntryPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctorFee, setDoctorFee] = useState("0");
  const [shiftId, setShiftId] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(todayDate);
  const [appointmentTime, setAppointmentTime] = useState(todayTime);
  const [serialNumber, setSerialNumber] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0.00");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [payments, setPayments] = useState([]);
  const [reasonForVisit, setReasonForVisit] = useState("");

  const [newPatient, setNewPatient] = useState(emptyPatient);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const slotFetchRef = useRef(0);

  const fee = parseFloat(doctorFee) || 0;
  const discountAmt = parseFloat(((fee * (parseFloat(discount) || 0)) / 100).toFixed(2));
  const netTotal = parseFloat((fee - discountAmt).toFixed(2));
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const due = parseFloat((netTotal - totalPaid).toFixed(2));

  const loadDropdowns = useCallback(async () => {
    try {
      const [pRes, dRes, sRes] = await Promise.all([
        apiRequest("/patients?limit=100"),
        apiRequest("/doctors?limit=100"),
        apiRequest("/settings/master-options?type=appointment_shift&limit=100"),
      ]);
      setPatients(pRes.data || []);
      setDoctors(dRes.data || []);
      setShifts(sRes.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    if (!doctorId || !shiftId || !appointmentDate) {
      setAvailableSlots([]);
      return;
    }
    const fetchId = ++slotFetchRef.current;
    setLoadingSlots(true);
    setSlotTime("");
    setAppointmentTime(todayTime);
    apiRequest(
      `/appointments/available-slots?doctor_id=${doctorId}&shift_id=${shiftId}&date=${appointmentDate}`
    )
      .then((res) => {
        if (fetchId !== slotFetchRef.current) return;
        setAvailableSlots(res.data?.slots || []);
      })
      .catch(() => {
        if (fetchId !== slotFetchRef.current) return;
        setAvailableSlots([]);
      })
      .finally(() => {
        if (fetchId === slotFetchRef.current) setLoadingSlots(false);
      });
  }, [doctorId, shiftId, appointmentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoctorChange = (e) => {
    const id = e.target.value;
    setDoctorId(id);
    setSlotTime("");
    const doc = doctors.find((d) => String(d.id) === id);
    if (doc) setDoctorFee(parseFloat(doc.consultation_fee || 0).toFixed(2));
    else setDoctorFee("0");
  };

  const handleSlotChange = (e) => {
    const val = e.target.value;
    setSlotTime(val);
    setAppointmentTime(val);
  };

  const addPayment = () => {
    if (!paymentAccount || !paymentAmount) return;
    const amount = parseFloat(paymentAmount || 0);
    if (amount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }
    if (totalPaid + amount > netTotal) {
      setError(`Payment cannot exceed the due amount ${due.toFixed(2)}`);
      return;
    }
    setError("");
    setPayments((prev) => [...prev, { account: paymentAccount, amount: paymentAmount }]);
    setPaidAmount(String(totalPaid + amount));
    setPaymentAccount("");
    setPaymentAmount("");
  };

  const handleReset = () => {
    setPatientId(""); setDoctorId(""); setDoctorFee("0"); setShiftId("");
    setSlotTime(""); setAppointmentDate(todayDate); setAppointmentTime(todayTime);
    setSerialNumber(""); setDiscount("0"); setPaidAmount("0.00");
    setPayments([]); setReasonForVisit("");
    setAvailableSlots([]);
    setError(""); setSuccess("");
  };

  const handleSave = async () => {
    if (!patientId) { setError("Please select a patient"); return; }
    if (!doctorId) { setError("Please select a doctor"); return; }
    if (!appointmentDate) { setError("Appointment date is required"); return; }
    if (!appointmentTime) { setError("Appointment time is required"); return; }

    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiRequest("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patient_id: parseInt(patientId, 10),
          doctor_id: parseInt(doctorId, 10),
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason: reasonForVisit || undefined,
          consultation_fee: fee,
        }),
      });
      const created = res.data;
      let invoice = null;
      if (netTotal > 0) {
        const invoiceResponse = await apiRequest("/billing/invoices", {
          method: "POST",
          body: JSON.stringify({
            patient_id: parseInt(patientId, 10),
            appointment_id: created.id,
            discount: discountAmt,
            tax: 0,
            notes: `Appointment booking ${created.appointment_code}`,
            items: [
              {
                item_type: "consultation",
                reference_id: created.id,
                description: `Doctor consultation ${created.appointment_code}`,
                quantity: 1,
                unit_price: fee,
              },
            ],
          }),
        });
        invoice = invoiceResponse.data;

        for (const payment of payments) {
          await apiRequest("/billing/payments", {
            method: "POST",
            body: JSON.stringify({
              invoice_id: invoice.id,
              amount: parseFloat(payment.amount),
              method: paymentMethodMap[payment.account] || "cash",
              notes: `Appointment payment ${created.appointment_code}`,
            }),
          });
        }
      }
      setSerialNumber(created?.appointment_code || "");
      setSuccess(
        `Appointment saved! Code: ${created?.appointment_code || ""}` +
          (invoice ? ` | Invoice: ${invoice.invoice_code} | Paid: ${totalPaid.toFixed(2)} | Due: ${due.toFixed(2)}` : "")
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNewPatientSave = async () => {
    if (!newPatient.full_name.trim()) { setError("Patient name is required"); return; }
    setSaving(true); setError("");
    try {
      const body = Object.fromEntries(
        Object.entries(newPatient).filter(([, v]) => v !== "" && v !== null)
      );
      if (body.age) body.age = parseInt(body.age, 10);
      const res = await apiRequest("/patients", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const created = res.data;
      await loadDropdowns();
      setPatientId(String(created.id));
      setIsNewPatientModalOpen(false);
      setNewPatient(emptyPatient);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const npChange = (field) => (e) =>
    setNewPatient((p) => ({ ...p, [field]: e.target.value }));

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {error ? (
        <p className="mb-2 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
      ) : null}
      {success ? (
        <p className="mb-2 rounded bg-green-50 px-3 py-2 text-[12px] text-green-700">{success}</p>
      ) : null}

      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-3 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-4 flex items-center justify-between rounded-[4px] bg-[#148889] px-4 py-3">
          <select
            className="h-[38px] w-[360px] rounded-[4px] border border-[rgba(255,255,255,0.28)] bg-white px-4 text-[15px] text-[#65727a] outline-none max-md:w-full"
            onChange={(e) => setPatientId(e.target.value)}
            value={patientId}
          >
            <option value="">Search Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.full_name} ({p.patient_code})
              </option>
            ))}
          </select>
          <button
            className="rounded-[4px] bg-white px-4 py-2 text-[12px] font-semibold text-[#138591] shadow-[0_4px_12px_rgba(8,54,56,0.12)]"
            onClick={() => { setError(""); setIsNewPatientModalOpen(true); }}
            type="button"
          >
            + NEW PATIENT
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          <FieldShell>
            <select
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
              onChange={handleDoctorChange}
              value={doctorId}
            >
              <option value="">Doctor *</option>
              {doctors.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.user?.full_name || d.doctor_code || `Doctor #${d.id}`}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label="Doctor Fee">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
              min="0"
              onChange={(e) => setDoctorFee(e.target.value)}
              type="number"
              value={doctorFee}
            />
          </FieldShell>

          <FieldShell>
            <select
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
              onChange={(e) => setShiftId(e.target.value)}
              value={shiftId}
            >
              <option value="">Shift *</option>
              {shifts.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.label}</option>
              ))}
            </select>
          </FieldShell>

          <FieldShell>
            <select
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
              disabled={loadingSlots || (!doctorId || !shiftId || !appointmentDate)}
              onChange={handleSlotChange}
              value={slotTime}
            >
              <option value="">
                {loadingSlots ? "Loading slots…" : availableSlots.length ? "Select Slot *" : "Slot *"}
              </option>
              {availableSlots.map((sl) => (
                <option key={sl.time} value={sl.time} disabled={!sl.is_available}>
                  {sl.label}{!sl.is_available ? " (booked)" : ""}
                </option>
              ))}
            </select>
          </FieldShell>

          <FieldShell label="Appointment Date">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
              onChange={(e) => setAppointmentDate(e.target.value)}
              type="date"
              value={appointmentDate}
            />
          </FieldShell>

          <FieldShell label="Appointment Time">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
              onChange={(e) => setAppointmentTime(e.target.value)}
              type="time"
              value={appointmentTime}
            />
          </FieldShell>

          <FieldShell label="Serial Number">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
              placeholder="Auto-generated"
              readOnly
              type="text"
              value={serialNumber}
            />
          </FieldShell>

          <FieldShell label="Discount %">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none"
              max="100"
              min="0"
              onChange={(e) => setDiscount(e.target.value)}
              type="number"
              value={discount}
            />
          </FieldShell>

          <FieldShell label="Paid Amount">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] outline-none"
              onChange={(e) => setPaidAmount(e.target.value)}
              readOnly
              type="number"
              value={totalPaid.toFixed(2)}
            />
          </FieldShell>

          <FieldShell label="Discount Amount">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] bg-[#f8f9fa] outline-none"
              readOnly
              type="text"
              value={discountAmt.toFixed(2)}
            />
          </FieldShell>

          <FieldShell label="Tax Amount">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] bg-[#f8f9fa] outline-none"
              readOnly
              type="text"
              value="0.00"
            />
          </FieldShell>

          <FieldShell label="Total">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] bg-[#f8f9fa] outline-none"
              readOnly
              type="text"
              value={netTotal.toFixed(2)}
            />
          </FieldShell>

          <FieldShell label="Due">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] bg-[#f8f9fa] outline-none"
              readOnly
              type="text"
              value={due.toFixed(2)}
            />
          </FieldShell>

          <FieldShell label="Status">
            <input
              className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#27353d] bg-[#f8f9fa] outline-none"
              readOnly
              type="text"
              value="Scheduled"
            />
          </FieldShell>

          <FieldShell className="col-span-2 max-lg:col-span-2 max-md:col-span-1">
            <textarea
              className="h-[70px] w-full rounded-[3px] border border-[#c8d2d7] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="Reason For Visit"
              value={reasonForVisit}
            />
          </FieldShell>
        </div>

        <div className="mt-7">
          <div className="mb-2 rounded-[3px] bg-[#bfe9ea] px-4 py-2 text-[16px] text-[#274148]">
            Add Payment
          </div>
          <div className="grid grid-cols-[1.3fr_0.85fr_0.4fr] items-end gap-4 max-md:grid-cols-1">
            <FieldShell label="Select Account">
              <select
                className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#5f6c74] outline-none"
                onChange={(e) => setPaymentAccount(e.target.value)}
                value={paymentAccount}
              >
                <option value=""></option>
                <option value="Cash">Cash</option>
                <option value="Bank Account">Bank Account</option>
                <option value="Mobile Banking">Mobile Banking</option>
                <option value="Card">Card</option>
              </select>
            </FieldShell>
            <input
              className="h-[38px] rounded-[3px] border border-[#c8d2d7] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Amount"
              type="number"
              value={paymentAmount}
            />
            <button
              className="h-[38px] rounded-[4px] bg-[#b7c2b7] px-3 text-[14px] font-semibold text-[#162024]"
              onClick={addPayment}
              type="button"
            >
              ADD
            </button>
          </div>

          {payments.length > 0 ? (
            <div className="mt-3 space-y-1">
              {payments.map((p, i) => (
                <div className="flex items-center gap-3 text-[13px] text-[#3a4a52]" key={i}>
                  <span className="w-[180px]">{p.account}</span>
                  <span>{parseFloat(p.amount).toFixed(2)}</span>
                  <button
                    className="ml-2 text-[#ff3f34] text-[11px]"
                    onClick={() => {
                      setPayments((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <p className="mt-4 text-[14px] text-[#1d2a31]">
            Total Paid:{" "}
            <span className="font-semibold">{totalPaid.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-3">
        <button
          className="rounded-[4px] border border-[#ff8f8f] px-4 py-2 text-[12px] font-medium text-[#ff3f34]"
          onClick={handleReset}
          type="button"
        >
          RESET
        </button>
        <button
          className="rounded-[4px] bg-[#2276da] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-60"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>

      {isNewPatientModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(7,34,39,0.28)] px-4 py-6">
          <div className="w-full max-w-[920px] rounded-[4px] border border-[#d8dee2] bg-white shadow-[0_24px_60px_rgba(10,40,48,0.22)]">
            <div className="border-b border-[#e4e8eb] px-6 py-4">
              <h2 className="text-[18px] font-normal text-[#26353c]">Add New Patient</h2>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Name *</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("full_name")}
                    placeholder="Full Name"
                    type="text"
                    value={newPatient.full_name}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Contact No</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("phone")}
                    placeholder="Phone"
                    type="text"
                    value={newPatient.phone}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Age</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("age")}
                    placeholder="Age"
                    type="number"
                    value={newPatient.age}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Gender *</span>
                  <select
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                    onChange={npChange("gender")}
                    value={newPatient.gender}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Date of Birth</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("date_of_birth")}
                    type="date"
                    value={newPatient.date_of_birth}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Blood Group</span>
                  <select
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                    onChange={npChange("blood_group")}
                    value={newPatient.blood_group}
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Email</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("email")}
                    placeholder="Email"
                    type="email"
                    value={newPatient.email}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Guardian Name</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("emergency_contact_name")}
                    placeholder="Guardian Name"
                    type="text"
                    value={newPatient.emergency_contact_name}
                  />
                </label>

                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Guardian Contact No</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("emergency_contact_phone")}
                    placeholder="Guardian Contact"
                    type="text"
                    value={newPatient.emergency_contact_phone}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Marital Status</span>
                  <select
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                    onChange={npChange("marital_status")}
                    value={newPatient.marital_status}
                  >
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">ID Type</span>
                  <select
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                    onChange={npChange("id_type")}
                    value={newPatient.id_type}
                  >
                    <option value="">Select</option>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">ID Number</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("id_number")}
                    placeholder="ID Number"
                    type="text"
                    value={newPatient.id_number}
                  />
                </label>
                <label className="block text-[11px] text-[#8b959b]">
                  <span className="mb-1 block">Remarks</span>
                  <input
                    className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none"
                    onChange={npChange("remarks")}
                    placeholder="Remarks"
                    type="text"
                    value={newPatient.remarks}
                  />
                </label>
              </div>

              <textarea
                className="mt-4 h-[64px] w-full rounded-[4px] border border-[#c8d2d7] px-4 py-3 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                onChange={npChange("address")}
                placeholder="Address"
                value={newPatient.address}
              />
            </div>

            <div className="flex justify-end gap-4 border-t border-[#e4e8eb] px-6 py-4">
              <button
                className="px-3 py-2 text-[14px] font-medium text-[#2b7be5]"
                onClick={() => { setIsNewPatientModalOpen(false); setNewPatient(emptyPatient); }}
                type="button"
              >
                CANCEL
              </button>
              <button
                className="rounded-[4px] bg-[#2b7be5] px-5 py-2 text-[14px] font-medium text-white disabled:opacity-60 shadow-[0_8px_18px_rgba(43,123,229,0.22)]"
                disabled={saving}
                onClick={handleNewPatientSave}
                type="button"
              >
                {saving ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
