import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

const WEEK_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const emptyMeta = {
  doctors: [],
  shifts: [],
  charge_categories: [],
  weekdays: WEEK_DAYS,
};

const emptyDays = () =>
  WEEK_DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});

const getDoctorChargeConfigs = (doctor) => {
  const values = doctor?.appointment_charge_categories;
  if (Array.isArray(values)) {
    return values
      .map((item) => {
        if (typeof item === "string") {
          return { category: item.trim(), fee: "" };
        }
        if (!item || typeof item !== "object") return null;
        const category = String(item.category || "").trim();
        if (!category) return null;
        return {
          category,
          fee: item.fee === null || item.fee === undefined ? "" : String(item.fee),
        };
      })
      .filter((item) => item?.category);
  }
  if (!values) return [];
  try {
    const parsed = JSON.parse(values);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => {
            if (typeof item === "string") {
              return { category: item.trim(), fee: "" };
            }
            if (!item || typeof item !== "object") return null;
            const category = String(item.category || "").trim();
            if (!category) return null;
            return {
              category,
              fee: item.fee === null || item.fee === undefined ? "" : String(item.fee),
            };
          })
          .filter((item) => item?.category)
      : [];
  } catch (_error) {
    return [];
  }
};

const getDoctorCategoryFee = (doctor, categoryId, chargeCategories) => {
  if (!doctor || !categoryId) return "";
  const option = chargeCategories.find((item) => String(item.id) === String(categoryId));
  if (!option) return "";
  const optionKeys = [option.code, option.label]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const match = getDoctorChargeConfigs(doctor).find((item) =>
    optionKeys.includes(String(item.category || "").trim().toLowerCase())
  );
  return match?.fee || "";
};

function DayBadge({ active, count, day, onClick }) {
  return (
    <button
      className={`rounded-[999px] border px-3 py-2 text-[12px] font-medium transition ${
        active
          ? "border-[#0f766e] bg-[#0f766e] text-white"
          : "border-[#d4dde1] bg-white text-[#50606a] hover:border-[#9fb4ba]"
      }`}
      onClick={onClick}
      type="button"
    >
      {day}
      {count ? <span className="ml-2 rounded-full bg-black/15 px-1.5 py-[1px] text-[10px]">{count}</span> : null}
    </button>
  );
}

function Field({ children, label, wide = false }) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] text-[#7b8a92]">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[8px] border border-[#d9e2e6] bg-[#f8fbfc] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.05em] text-[#7b8a92]">{label}</div>
      <div className="mt-1 text-[18px] font-semibold text-[#1f2c33]">{value}</div>
    </div>
  );
}

export function AppointmentSlotsPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [doctorId, setDoctorId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [chargeCategoryId, setChargeCategoryId] = useState("");
  const [charge, setCharge] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [note, setNote] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
  const [selectedDay, setSelectedDay] = useState("MONDAY");
  const [daySlots, setDaySlots] = useState(emptyDays());
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedDoctor = useMemo(
    () => meta.doctors.find((doctor) => String(doctor.id) === String(doctorId)),
    [doctorId, meta.doctors]
  );

  const selectedShift = useMemo(
    () => meta.shifts.find((shift) => String(shift.id) === String(shiftId)),
    [meta.shifts, shiftId]
  );

  const slotCount = useMemo(
    () => Object.values(daySlots).reduce((sum, slots) => sum + slots.length, 0),
    [daySlots]
  );

  const activeDaysCount = useMemo(
    () => Object.values(daySlots).filter((slots) => slots.length > 0).length,
    [daySlots]
  );

  const currentDaySlots = daySlots[selectedDay] || [];
  const derivedConsultationFee = useMemo(() => {
    if (consultationFee !== "") return Number(consultationFee || 0);
    if (charge !== "") return Number(charge || 0);
    return Number(selectedDoctor?.consultation_fee || 0);
  }, [charge, consultationFee, selectedDoctor]);

  useEffect(() => {
    const loadMeta = async () => {
      setLoading(true);
      try {
        const response = await apiRequest("/appointments/slot-config/meta");
        setMeta(response.data || emptyMeta);
      } catch (err) {
        setError(err.message || "Failed to load appointment slot data");
      } finally {
        setLoading(false);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    if (!selectedDoctor) return;
    setConsultationFee(String(Number(selectedDoctor.consultation_fee || 0)));
    if (chargeCategoryId) {
      const nextFee = getDoctorCategoryFee(selectedDoctor, chargeCategoryId, meta.charge_categories);
      if (nextFee !== "") {
        setCharge(nextFee);
      }
    }
  }, [selectedDoctor, chargeCategoryId, meta.charge_categories]);

  const handleChargeCategoryChange = (value) => {
    setChargeCategoryId(value);
    const nextFee = getDoctorCategoryFee(selectedDoctor, value, meta.charge_categories);
    setCharge(nextFee !== "" ? nextFee : "");
  };

  const toggleWeekday = (day) => {
    setSelectedWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  };

  const resetForm = () => {
    setDurationMinutes("30");
    setChargeCategoryId("");
    setCharge("");
    setConsultationFee(selectedDoctor ? String(Number(selectedDoctor.consultation_fee || 0)) : "");
    setNote("");
    setSelectedWeekdays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
    setSelectedDay("MONDAY");
    setDaySlots(emptyDays());
    setConfigId(null);
  };

  const handleSearch = async () => {
    if (!doctorId || !shiftId) {
      setError("Please select both doctor and shift.");
      return;
    }
    setSearching(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest(`/appointments/slot-config?doctor_id=${doctorId}&shift_id=${shiftId}`);
      const config = response.data;
      setConfigId(config.id || null);
      setDurationMinutes(String(config.duration_minutes || 30));
      setChargeCategoryId(config.charge_category_option_id ? String(config.charge_category_option_id) : "");
      setCharge(String(config.charge || ""));
      setConsultationFee(String(config.consultation_fee || selectedDoctor?.consultation_fee || ""));
      setNote(config.note || "");
      setDaySlots({ ...emptyDays(), ...(config.weekdays || {}) });
      const activeDays = WEEK_DAYS.filter((day) => (config.weekdays?.[day] || []).length > 0);
      setSelectedWeekdays(activeDays.length ? activeDays : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]);
      setSelectedDay(activeDays[0] || "MONDAY");
      setSuccess(config.id ? "Existing slot schedule loaded." : "No saved schedule found. You can generate a new one.");
    } catch (err) {
      setError(err.message || "Failed to load appointment slot config");
    } finally {
      setSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!shiftId) {
      const errMsg = "Please select a shift before generating slots.";
      setError(errMsg);
      showError("Selection Required", errMsg);
      return;
    }
    if (!selectedWeekdays.length) {
      const errMsg = "Please select at least one weekday.";
      setError(errMsg);
      showError("Selection Required", errMsg);
      return;
    }
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest("/appointments/slot-config/generate", {
        method: "POST",
        body: JSON.stringify({
          shift_id: Number(shiftId),
          duration_minutes: Number(durationMinutes || 0),
          weekdays: selectedWeekdays,
        }),
      });
      setDaySlots({ ...emptyDays(), ...(response.data?.weekdays || {}) });
      setSelectedDay(selectedWeekdays[0] || "MONDAY");
      const msg = "Slots generated. You can still edit them before saving.";
      setSuccess(msg);
      showSuccess("Slots Generated!", msg);
    } catch (err) {
      const errMsg = err.message || "Failed to generate slots";
      setError(errMsg);
      showError("Generation Failed!", errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const addSlot = () => {
    setDaySlots((current) => ({
      ...current,
      [selectedDay]: [...(current[selectedDay] || []), { from: "", to: "" }],
    }));
  };

  const updateSlot = (day, index, field, value) => {
    setDaySlots((current) => {
      const next = [...(current[day] || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...current, [day]: next };
    });
  };

  const removeSlot = (day, index) => {
    setDaySlots((current) => ({
      ...current,
      [day]: (current[day] || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!doctorId || !shiftId) {
      const errMsg = "Please select doctor and shift before saving.";
      setError(errMsg);
      showError("Selection Required", errMsg);
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiRequest("/appointments/slot-config", {
        method: "PUT",
        body: JSON.stringify({
          doctor_id: Number(doctorId),
          shift_id: Number(shiftId),
          duration_minutes: Number(durationMinutes || 30),
          charge_category_option_id: chargeCategoryId ? Number(chargeCategoryId) : null,
          charge: Number(charge || 0),
          consultation_fee: derivedConsultationFee,
          note: note || null,
          weekdays: daySlots,
        }),
      });
      setConfigId(response.data?.id || configId);
      const msg = "Appointment slot schedule saved successfully!";
      setSuccess(msg);
      showSuccess("Successfully Saved!", msg);
    } catch (err) {
      const errMsg = err.message || "Failed to save appointment slot config";
      setError(errMsg);
      showError("Save Failed!", errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[20px] font-medium text-[#202f37]">Appointment Slots</div>

        {error ? <div className="mb-3 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</div> : null}
        {success ? <div className="mb-3 rounded bg-green-50 px-3 py-2 text-[12px] text-green-700">{success}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Doctor">
            <select
              className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#55606a] outline-none"
              disabled={loading}
              onChange={(event) => setDoctorId(event.target.value)}
              value={doctorId}
            >
              <option value="">Select Doctor</option>
              {meta.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user?.full_name || doctor.doctor_code}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Shift">
            <select
              className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#55606a] outline-none"
              disabled={loading}
              onChange={(event) => setShiftId(event.target.value)}
              value={shiftId}
            >
              <option value="">Select Shift</option>
              {meta.shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Slot Duration (Minutes)">
            <input
              className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-3 text-[14px] text-[#55606a] outline-none"
              min="5"
              onChange={(event) => setDurationMinutes(event.target.value)}
              type="number"
              value={durationMinutes}
            />
          </Field>

          <div className="flex items-end gap-3">
            <button
              className="h-[40px] flex-1 rounded-[4px] border border-[#cfd7dc] bg-[#eef3f6] px-4 text-[14px] font-medium text-[#46545e] disabled:opacity-60"
              disabled={searching}
              onClick={handleSearch}
              type="button"
            >
              {searching ? "Loading..." : "Load Existing"}
            </button>
            <button
              className="h-[40px] flex-1 rounded-[4px] bg-[#0d746c] px-4 text-[14px] font-medium text-white disabled:opacity-60"
              disabled={generating}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? "Generating..." : "Generate Slots"}
            </button>
          </div>

          <Field label="Charge Category">
            <select
              className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#55606a] outline-none"
              onChange={(event) => handleChargeCategoryChange(event.target.value)}
              value={chargeCategoryId}
            >
              <option value="">Select Charge Category</option>
              {meta.charge_categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Charge">
            <input
              className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-3 text-[14px] text-[#55606a] outline-none"
              onChange={(event) => setCharge(event.target.value)}
              type="number"
              value={charge}
            />
          </Field>

          <Field label="Active Weekdays" wide>
            <div className="flex flex-nowrap items-center gap-2 rounded-[8px] border border-[#c8d2d7] bg-[#fbfdff] p-3">
              {WEEK_DAYS.map((day) => (
                <label
                  className="flex h-[36px] shrink-0 items-center gap-2 rounded-[6px] border border-[#d8e1e6] bg-white px-3 text-[12px] font-medium text-[#44525c]"
                  key={day}
                >
                  <input
                    className="h-4 w-4 accent-[#0d746c]"
                    checked={selectedWeekdays.includes(day)}
                    onChange={() => toggleWeekday(day)}
                    type="checkbox"
                  />
                  <span className="tracking-[0.04em]">{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Note">
          <textarea
            className="mt-4 h-[72px] w-full rounded-[4px] border border-[#c8d2d7] px-3 py-2 text-[14px] text-[#55606a] outline-none"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional notes for this weekly schedule"
            value={note}
          />
        </Field>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SummaryCard label="Selected Shift" value={selectedShift ? `${selectedShift.label}` : "Not selected"} />
          <SummaryCard label="Active Days" value={String(activeDaysCount)} />
          <SummaryCard label="Total Weekly Slots" value={String(slotCount)} />
        </div>

        <div className="mt-6 rounded-[8px] border border-[#d9e2e6] bg-[#fbfdfe] p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => (
              <DayBadge
                active={selectedDay === day}
                count={(daySlots[day] || []).length}
                day={day}
                key={day}
                onClick={() => setSelectedDay(day)}
              />
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[16px] font-medium text-[#1f2c33]">{selectedDay}</div>
              <div className="text-[12px] text-[#6d7983]">Edit the generated slots for this day.</div>
            </div>
            <button
              className="h-[38px] rounded-[4px] bg-[#68707c] px-4 text-[13px] font-semibold text-white"
              onClick={addSlot}
              type="button"
            >
              + Add Manual Slot
            </button>
          </div>

          <div className="space-y-3">
            {currentDaySlots.length ? (
              currentDaySlots.map((slot, index) => (
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" key={`${selectedDay}-${index}`}>
                  <Field label="Time From">
                    <input
                      className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-3 text-[14px] text-[#55606a] outline-none"
                      onChange={(event) => updateSlot(selectedDay, index, "from", event.target.value)}
                      type="time"
                      value={slot.from}
                    />
                  </Field>
                  <Field label="Time To">
                    <input
                      className="h-[40px] w-full rounded-[4px] border border-[#c8d2d7] px-3 text-[14px] text-[#55606a] outline-none"
                      onChange={(event) => updateSlot(selectedDay, index, "to", event.target.value)}
                      type="time"
                      value={slot.to}
                    />
                  </Field>
                  <div className="flex items-end">
                    <button
                      className="h-[40px] rounded-[4px] border border-[#f0bcbc] px-4 text-[13px] font-medium text-[#d34747]"
                      onClick={() => removeSlot(selectedDay, index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[6px] border border-dashed border-[#cdd7dc] bg-white px-4 py-6 text-center text-[13px] text-[#75828b]">
                No slots for {selectedDay}. Generate them or add one manually.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            className="rounded-[4px] border border-[#f0bcbc] px-4 py-2 text-[13px] font-medium text-[#d34747]"
            onClick={resetForm}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded-[4px] bg-[#2276da] px-6 py-2 text-[13px] font-medium text-white disabled:opacity-60"
            disabled={saving}
            onClick={handleSave}
            type="button"
          >
            {saving ? "Saving..." : configId ? "Update Schedule" : "Save Schedule"}
          </button>
        </div>
      </div>
    </section>
  );
}
