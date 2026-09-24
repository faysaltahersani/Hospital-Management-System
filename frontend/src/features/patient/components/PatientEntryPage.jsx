import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { apiRequest } from "../../../lib/api";

const genderOptions = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bloodGroupOptions = [
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

const maritalStatusOptions = [
  { value: "", label: "Marital Status" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "widowed", label: "Widowed" },
  { value: "divorced", label: "Divorced" },
  { value: "other", label: "Other" },
];

const idTypeOptions = [
  { value: "", label: "ID Type" },
  { value: "nid", label: "NID" },
  { value: "passport", label: "Passport" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other" },
];

const initialForm = {
  full_name: "",
  phone: "",
  age: "",
  gender: "",
  email: "",
  blood_group: "",
  marital_status: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  id_type: "",
  id_number: "",
  date_of_birth: "",
  address: "",
  remarks: "",
};

function TextInput({ field, form, onChange, placeholder, type = "text", readOnly = false }) {
  return (
    <input
      className="h-[44px] w-full border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 text-[15px] text-[#55606a] outline-none"
      onChange={(event) => onChange(field, event.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={form[field]}
    />
  );
}

function SelectInput({ field, form, onChange, options }) {
  return (
    <select
      className="h-[44px] w-full appearance-none border-0 border-b border-[#959da3] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#55606a] outline-none"
      onChange={(event) => onChange(field, event.target.value)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 14px center",
      }}
      value={form[field]}
    >
      {options.map((option) => (
        <option key={`${field}-${option.value}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({ field, form, onChange }) {
  return (
    <input
      className="h-[44px] w-full border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 text-[15px] text-[#55606a] outline-none"
      onChange={(event) => onChange(field, event.target.value)}
      type="date"
      value={form[field]}
    />
  );
}

export function PatientEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");

  const [nextCode, setNextCode] = useState("");
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const loadPage = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const metaResponse = await apiRequest("/patients/meta");
      setNextCode(metaResponse.data?.next_patient_code || "");

      if (editingId) {
        const patientResponse = await apiRequest(`/patients/${editingId}`);
        const patient = patientResponse.data || {};
        setForm({
          full_name: patient.full_name || "",
          phone: patient.phone || "",
          age: patient.age ?? "",
          gender: patient.gender || "",
          email: patient.email || "",
          blood_group: patient.blood_group || "",
          marital_status: patient.marital_status || "",
          emergency_contact_name: patient.emergency_contact_name || "",
          emergency_contact_phone: patient.emergency_contact_phone || "",
          id_type: patient.id_type || "",
          id_number: patient.id_number || "",
          date_of_birth: patient.date_of_birth || "",
          address: patient.address || "",
          remarks: patient.remarks || "",
        });
      } else {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to load patient entry data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [editingId]);

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.full_name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setErrorMessage("Contact number is required.");
      return;
    }
    if (!form.gender) {
      setErrorMessage("Gender is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        age: form.age === "" ? null : Number(form.age),
        gender: form.gender,
        email: form.email.trim() || null,
        blood_group: form.blood_group || "unknown",
        marital_status: form.marital_status || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        id_type: form.id_type || null,
        id_number: form.id_number.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
        remarks: form.remarks.trim() || null,
      };

      if (editingId) {
        await apiRequest(`/patients/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Patient ${payload.full_name} updated successfully.`);
      } else {
        const response = await apiRequest("/patients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Patient ${response.data?.patient_code || payload.full_name} created successfully.`);
        resetForm();
        const metaResponse = await apiRequest("/patients/meta");
        setNextCode(metaResponse.data?.next_patient_code || "");
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to save patient");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">Patient Entry</div>

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

      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        <TextInput field="patient_code" form={{ patient_code: nextCode }} onChange={() => {}} placeholder="Code" readOnly />
        <TextInput field="full_name" form={form} onChange={updateField} placeholder="Name *" />
        <TextInput field="phone" form={form} onChange={updateField} placeholder="Contact No *" />
        <TextInput field="age" form={form} onChange={updateField} placeholder="Age" type="number" />

        <SelectInput field="gender" form={form} onChange={updateField} options={genderOptions} />
        <TextInput field="email" form={form} onChange={updateField} placeholder="Email" type="email" />
        <SelectInput field="blood_group" form={form} onChange={updateField} options={bloodGroupOptions} />
        <SelectInput field="marital_status" form={form} onChange={updateField} options={maritalStatusOptions} />

        <TextInput field="emergency_contact_name" form={form} onChange={updateField} placeholder="Guardian Name" />
        <TextInput field="emergency_contact_phone" form={form} onChange={updateField} placeholder="Guardian Contact No" />
        <SelectInput field="id_type" form={form} onChange={updateField} options={idTypeOptions} />
        <TextInput field="id_number" form={form} onChange={updateField} placeholder="ID Number" />

        <DateInput field="date_of_birth" form={form} onChange={updateField} />
        <div className="col-span-2 max-md:col-span-1">
          <TextInput field="address" form={form} onChange={updateField} placeholder="Address" />
        </div>
      </div>

      <div className="mt-4 max-w-[600px]">
        <textarea
          className="w-full resize-none border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 py-3 text-[15px] text-[#55606a] outline-none"
          onChange={(event) => updateField("remarks", event.target.value)}
          placeholder="Remarks"
          rows={3}
          value={form.remarks}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <button
          className="h-[34px] rounded-[3px] bg-[#2f8533] text-[12px] font-semibold uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "Saving..." : editingId ? "Update" : "Add"}
        </button>
        <button
          className="h-[34px] rounded-[3px] border border-[#ff6767] text-[12px] font-medium uppercase text-[#ff3b30]"
          onClick={() => {
            setErrorMessage("");
            setSuccessMessage("");
            if (editingId) {
              navigate("/patient/entry");
              return;
            }
            resetForm();
          }}
          type="button"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
