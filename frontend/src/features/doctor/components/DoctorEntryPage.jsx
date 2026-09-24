import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const ROWS_PER_PAGE = 10;
const SPECIALIZATION_TYPE = "doctor_specialization";
const APPOINTMENT_SHIFT_TYPE = "appointment_shift";
const APPOINTMENT_CHARGE_TYPE = "appointment_charge";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  qualifications: "",
  license_number: "",
  consultation_fee: "",
  department_id: "",
  gender: "",
  blood_group: "",
  specialization: "",
  appointment_shifts: [],
  appointment_charge_categories: [],
};

function ActionIcon({ children, label, onClick, tone, disabled = false }) {
  return (
    <button
      aria-label={label}
      className={`${tone} disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-[16px] w-[16px]" fill="currentColor" viewBox="0 0 18 18">
      <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-[16px] w-[16px]" fill="currentColor" viewBox="0 0 18 18">
      <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
    </svg>
  );
}

function InputField({ label, name, onChange, readOnly = false, type = "text", value }) {
  return (
    <input
      className="h-[44px] w-full rounded-[2px] border border-[#cfd6db] bg-white px-3 text-[14px] text-[#55606a] outline-none read-only:bg-[#f4f7f9]"
      name={name}
      onChange={onChange}
      placeholder={label}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function SelectField({ label, name, onChange, options, value }) {
  return (
    <select
      className="h-[44px] w-full appearance-none rounded-[2px] border border-[#cfd6db] bg-white px-3 pr-10 text-[14px] text-[#55606a] outline-none"
      name={name}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 14px center",
        backgroundRepeat: "no-repeat",
      }}
      value={value}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const getPagination = (meta) =>
  meta?.pagination || {
    total: 0,
    page: 1,
    limit: ROWS_PER_PAGE,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };

const asOptions = (items, labelKey = "name") =>
  items.map((item) => ({ value: String(item.id), label: item[labelKey] || item.label || item.code }));

const getDoctorShifts = (doctor) => {
  const shifts = doctor.appointment_shifts;
  if (Array.isArray(shifts)) return shifts;
  if (!shifts) return [];
  try {
    const parsed = JSON.parse(shifts);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const getDoctorChargeCategories = (doctor) => {
  const values = doctor.appointment_charge_categories;
  if (Array.isArray(values)) {
    return values
      .map((item) => {
        if (typeof item === "string") {
          return { category: item, fee: "" };
        }
        if (!item || typeof item !== "object") return null;
        return {
          category: String(item.category || "").trim(),
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
              return { category: item, fee: "" };
            }
            if (!item || typeof item !== "object") return null;
            return {
              category: String(item.category || "").trim(),
              fee: item.fee === null || item.fee === undefined ? "" : String(item.fee),
            };
          })
          .filter((item) => item?.category)
      : [];
  } catch (_error) {
    return [];
  }
};

const formatDoctorChargeCategories = (doctor, options) => {
  const labelsByValue = new Map(options.map((option) => [option.value, option.label]));
  return getDoctorChargeCategories(doctor)
    .map((item) => {
      const label = labelsByValue.get(item.category) || item.category;
      const fee = item.fee === "" ? "" : Number(item.fee).toFixed(2);
      return fee ? `${label} (${fee})` : label;
    })
    .join(", ");
};

const formFromDoctor = (doctor) => ({
  full_name: doctor.user?.full_name || "",
  email: doctor.user?.email || "",
  phone: doctor.user?.phone || "",
  qualifications: doctor.qualifications || "",
  license_number: doctor.license_number || "",
  consultation_fee: doctor.consultation_fee ?? "",
  department_id: doctor.department_id ? String(doctor.department_id) : "",
  gender: doctor.gender || "",
  blood_group: doctor.blood_group || "",
  specialization: doctor.specialization || "",
  appointment_shifts: getDoctorShifts(doctor),
  appointment_charge_categories: getDoctorChargeCategories(doctor),
});

const hasValidConsultationFee = (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0;

const normalizeChargeCategoryFee = (fee, consultationFee) => {
  if (fee === "" || fee === null || fee === undefined) return Number(consultationFee);
  return Number(fee);
};

const formatTimeToMeridiem = (value) => {
  const [hourText = "", minuteText = "00"] = String(value || "").split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const formatShiftOptionLabel = (shift) => {
  try {
    const parsed = JSON.parse(shift.description || "{}");
    const timeFrom = parsed.time_from || "";
    const timeTo = parsed.time_to || "";
    return timeFrom && timeTo
      ? `${shift.label} (${formatTimeToMeridiem(timeFrom)} - ${formatTimeToMeridiem(timeTo)})`
      : shift.label;
  } catch (_error) {
    return shift.label;
  }
};

function AddDoctorModal({
  departments,
  editingDoctor,
  errorMessage,
  form,
  isSaving,
  onChange,
  onClose,
  onSave,
  onShiftChange,
  onChargeCategoryChange,
  onChargeCategoryFeeChange,
  specializations,
  appointmentShifts,
  appointmentChargeCategories,
}) {
  const departmentOptions = asOptions(departments);
  const specializationOptions = specializations.map((item) => ({ value: item.label, label: item.label }));

  return (
    <div className="fixed inset-0 z-30 bg-black/25 px-4 py-6">
      <div className="mx-auto flex max-h-[calc(100vh-48px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[8px] bg-white shadow-[0_18px_40px_rgba(22,36,45,0.24)]">
        <div className="border-b border-[#e6ecef] px-5 py-4">
          <div className="text-[16px] font-medium text-[#1f2c33]">{editingDoctor ? "Edit Doctor" : "Add Doctor"}</div>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {errorMessage ? (
            <div className="mb-4 rounded-[4px] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <InputField label="Name *" name="full_name" onChange={onChange} value={form.full_name} />
            <InputField label="Code" readOnly value={editingDoctor?.doctor_code || "Auto generated"} />
            <InputField label="Qualification" name="qualifications" onChange={onChange} value={form.qualifications} />
            <InputField label="Contact Number" name="phone" onChange={onChange} value={form.phone} />
            <InputField label="Email" name="email" onChange={onChange} value={form.email} />
            <InputField label="License Number" name="license_number" onChange={onChange} value={form.license_number} />
            <InputField
              label="Consultation Fee *"
              name="consultation_fee"
              onChange={onChange}
              type="number"
              value={form.consultation_fee}
            />
            <SelectField
              label="Department *"
              name="department_id"
              onChange={onChange}
              options={departmentOptions}
              value={form.department_id}
            />
            <SelectField
              label="Gender"
              name="gender"
              onChange={onChange}
              options={GENDERS.map((gender) => ({ value: gender, label: gender }))}
              value={form.gender}
            />
            <SelectField
              label="Blood Group"
              name="blood_group"
              onChange={onChange}
              options={BLOOD_GROUPS.map((group) => ({ value: group, label: group }))}
              value={form.blood_group}
            />
            <div className="col-span-2 max-md:col-span-1">
              <SelectField
                label="Specializations"
                name="specialization"
                onChange={onChange}
                options={specializationOptions}
                value={form.specialization}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[6px] border border-[#e6ecef] bg-[#fbfdfe] p-4">
            <div className="text-[14px] font-medium text-[#2f3941]">Appointment Shifts</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {appointmentShifts.map((shift) => (
                <label className="flex items-center gap-2 rounded-[4px] border border-[#e3eaee] bg-white px-3 py-3" key={shift.value}>
                  <input
                    checked={form.appointment_shifts.includes(shift.value)}
                    onChange={(event) => onShiftChange(shift.value, event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-[14px] text-[#2f3941]">{shift.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[6px] border border-[#e6ecef] bg-[#fbfdfe] p-4">
            <div className="text-[14px] font-medium text-[#2f3941]">Appointment Charge Categories</div>
            <div className="mt-3 space-y-3">
              {appointmentChargeCategories.length ? (
                appointmentChargeCategories.map((category) => (
                  <div className="rounded-[4px] border border-[#e3eaee] bg-white px-3 py-3" key={category.value}>
                    <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <label className="flex items-center gap-2">
                        <input
                          checked={form.appointment_charge_categories.some((item) => item.category === category.value)}
                          onChange={(event) => onChargeCategoryChange(category.value, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="text-[14px] text-[#2f3941]">{category.label}</span>
                      </label>
                      {form.appointment_charge_categories.some((item) => item.category === category.value) ? (
                        <InputField
                          label={`${category.label} Fee`}
                          name={`appointment-charge-fee-${category.value}`}
                          onChange={(event) => onChargeCategoryFeeChange(category.value, event.target.value)}
                          type="number"
                          value={
                            form.appointment_charge_categories.find((item) => item.category === category.value)?.fee || ""
                          }
                        />
                      ) : (
                        <div className="text-[12px] text-[#7b8790]">Select this category to set a fee.</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-[#7b8790]">No appointment charge categories found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-[#e6ecef] px-5 py-4 text-[14px]">
          <button className="rounded-[4px] border border-[#d9e1e5] px-4 py-2 text-[#6d7983]" disabled={isSaving} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="rounded-[4px] bg-[#2b6fe8] px-5 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoctorEntryPage() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [appointmentShifts, setAppointmentShifts] = useState([]);
  const [appointmentChargeCategories, setAppointmentChargeCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const pagination = useMemo(() => getPagination(meta), [meta]);
  const startRow = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRow = Math.min(pagination.page * pagination.limit, pagination.total);

  const loadDoctors = async (nextPage = page, nextSearch = search) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: String(ROWS_PER_PAGE) });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      const response = await apiRequest(`/doctors?${params.toString()}`);
      setDoctors(response.data || []);
      setMeta(response.meta || null);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load doctors");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [departmentResponse, specializationResponse, appointmentShiftResponse, appointmentChargeResponse] = await Promise.all([
        apiRequest("/departments?limit=100&is_active=true"),
        apiRequest(`/settings/master-options?limit=100&type=${SPECIALIZATION_TYPE}&is_active=true`),
        apiRequest(`/settings/master-options?limit=100&type=${APPOINTMENT_SHIFT_TYPE}&is_active=true`),
        apiRequest(`/settings/master-options?limit=100&type=${APPOINTMENT_CHARGE_TYPE}&is_active=true`),
      ]);
      setDepartments(departmentResponse.data || []);
      setSpecializations(specializationResponse.data || []);
      setAppointmentShifts(
        (appointmentShiftResponse.data || []).map((item) => ({
          value: item.label,
          label: formatShiftOptionLabel(item),
        }))
      );
      setAppointmentChargeCategories(
        (appointmentChargeResponse.data || []).map((item) => ({
          value: item.code || item.label,
          label: item.label,
        }))
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load doctor lookups");
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadDoctors(page, search);
  }, [page]);

  const openAddModal = () => {
    setEditingDoctor(null);
    setForm(emptyForm);
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor);
    setForm(formFromDoctor(doctor));
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoctor(null);
    setForm(emptyForm);
    setModalError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleShiftChange = (shift, checked) => {
    setForm((current) => ({
      ...current,
      appointment_shifts: checked
        ? [...new Set([...current.appointment_shifts, shift])]
        : current.appointment_shifts.filter((item) => item !== shift),
    }));
  };

  const handleChargeCategoryChange = (category, checked) => {
    setForm((current) => ({
      ...current,
      appointment_charge_categories: checked
        ? current.appointment_charge_categories.some((item) => item.category === category)
          ? current.appointment_charge_categories
          : [...current.appointment_charge_categories, { category, fee: "" }]
        : current.appointment_charge_categories.filter((item) => item.category !== category),
    }));
  };

  const handleChargeCategoryFeeChange = (category, fee) => {
    setForm((current) => ({
      ...current,
      appointment_charge_categories: current.appointment_charge_categories.map((item) =>
        item.category === category ? { ...item, fee } : item
      ),
    }));
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return "Name is required.";
    if (!form.department_id) return "Department is required.";
    if (!hasValidConsultationFee(form.consultation_fee)) return "Consultation fee is required.";
    if (
      form.appointment_charge_categories.some(
        (item) =>
          item.fee !== "" && item.fee !== null && item.fee !== undefined && (Number.isNaN(Number(item.fee)) || Number(item.fee) < 0)
      )
    ) {
      return "Please enter a valid fee for each selected appointment charge category.";
    }
    return "";
  };

  const buildPayload = () => ({
    full_name: form.full_name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    qualifications: form.qualifications.trim() || null,
    license_number: form.license_number.trim() || null,
    consultation_fee: Number(form.consultation_fee),
    department_id: Number(form.department_id),
    gender: form.gender || null,
    blood_group: form.blood_group || null,
    specialization: form.specialization || null,
    appointment_shifts: form.appointment_shifts,
    appointment_charge_categories: form.appointment_charge_categories.map((item) => ({
      category: item.category,
      fee: normalizeChargeCategoryFee(item.fee, form.consultation_fee),
    })),
  });

  const handleSave = async () => {
    const validationMessage = validateForm();
    setModalError("");
    setSuccessMessage("");
    if (validationMessage) {
      setModalError(validationMessage);
      return;
    }

    setIsSaving(true);
    try {
      if (editingDoctor) {
        await apiRequest(`/doctors/${editingDoctor.id}`, {
          method: "PATCH",
          body: JSON.stringify(buildPayload()),
        });
        setSuccessMessage("Doctor updated successfully.");
      } else {
        await apiRequest("/doctors", {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });
        setSuccessMessage("Doctor saved successfully.");
      }
      closeModal();
      await loadDoctors(page, search);
    } catch (error) {
      setModalError(error.message || "Failed to save doctor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (doctor) => {
    const name = doctor.user?.full_name || doctor.doctor_code;
    if (!window.confirm(`Delete "${name}"?`)) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/doctors/${doctor.id}`, { method: "DELETE" });
      setSuccessMessage("Doctor deleted successfully.");
      await loadDoctors(page, search);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete doctor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadDoctors(1, search);
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-3 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-4 text-[18px] font-medium text-[#1f2c33]">Doctor List</div>
      {errorMessage ? <div className="mb-3 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div> : null}
      {successMessage ? <div className="mb-3 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{successMessage}</div> : null}

      <div className="rounded-[2px] border border-[#eef2f4] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.05)]">
        <div className="flex items-center justify-between gap-3 px-2 py-3">
          <button
            className="rounded border border-[#9ec5ff] px-4 py-2 text-[12px] text-[#2574d9]"
            onClick={openAddModal}
            type="button"
          >
            ADD DOCTOR
          </button>
          <div className="flex items-center gap-2">
            <input
              className="h-[34px] w-[220px] rounded-[2px] border border-[#d9e1e5] px-3 text-[12px] outline-none max-sm:w-[150px]"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSearch();
              }}
              placeholder="Search doctors"
              value={search}
            />
            <button className="rounded border border-[#d9e1e5] px-3 py-2 text-[12px] text-[#2574d9]" onClick={handleSearch} type="button">
              SEARCH
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
            <thead>
              <tr>
                {["Actions", "Name", "Code", "Shifts", "Charge Categories", "Consultation Fee", "Qualification", "License Number", "Gender"].map((header) => (
                  <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="border-b border-[#e6ecef] px-3 py-5 text-center" colSpan={9}>
                    Loading doctors...
                  </td>
                </tr>
              ) : doctors.length ? (
                doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td className="border-b border-[#e6ecef] px-3 py-4">
                      <div className="flex items-center gap-6">
                        <ActionIcon label="Edit doctor" onClick={() => openEditModal(doctor)} tone="text-[#1a9a28]">
                          <EditIcon />
                        </ActionIcon>
                        <ActionIcon disabled={isSaving} label="Delete doctor" onClick={() => handleDelete(doctor)} tone="text-[#e43d30]">
                          <DeleteIcon />
                        </ActionIcon>
                      </div>
                    </td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.user?.full_name || ""}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.doctor_code}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{getDoctorShifts(doctor).join(", ")}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">
                      {formatDoctorChargeCategories(doctor, appointmentChargeCategories)}
                    </td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.consultation_fee}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.qualifications || ""}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.license_number || ""}</td>
                    <td className="border-b border-[#e6ecef] px-3 py-4">{doctor.gender || ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border-b border-[#e6ecef] px-3 py-5 text-center" colSpan={9}>
                    No doctors found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-4 text-[12px] text-[#65727d]">
          <span>Rows per page {ROWS_PER_PAGE}</span>
          <span>
            {startRow}-{endRow} of {pagination.total}
          </span>
          <button disabled={!pagination.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
            ‹
          </button>
          <button disabled={!pagination.has_next} onClick={() => setPage((value) => value + 1)} type="button">
            ›
          </button>
        </div>
      </div>

      {isModalOpen ? (
        <AddDoctorModal
          departments={departments}
          editingDoctor={editingDoctor}
          errorMessage={modalError}
          form={form}
          isSaving={isSaving}
          onChange={handleFormChange}
          onClose={closeModal}
          onSave={handleSave}
          onChargeCategoryChange={handleChargeCategoryChange}
          onChargeCategoryFeeChange={handleChargeCategoryFeeChange}
          onShiftChange={handleShiftChange}
          appointmentShifts={appointmentShifts}
          appointmentChargeCategories={appointmentChargeCategories}
          specializations={specializations}
        />
      ) : null}
    </section>
  );
}
