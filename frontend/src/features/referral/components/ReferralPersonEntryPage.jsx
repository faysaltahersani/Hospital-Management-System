import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiRequest } from "../../../lib/api";

const emptyForm = {
  referral_person_code: "",
  name: "",
  contact_no: "",
  contact_person_name: "",
  contact_person_mobile_no: "",
  opening_balance: "0",
  address: "",
  opd_commission_per: "",
  ipd_commission_per: "",
  pharmacy_commission_per: "",
  pathology_commission_per: "",
  radiology_commission_per: "",
  blood_bank_commission_per: "",
  ambulance_commission_per: "",
};

function InputField({ label, name, onChange, placeholder, readOnly = false, suffix, tall = false, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-1 block px-3 text-[12px] text-[#5f6a74]">{label}</span>
      <div className="relative flex items-center">
        <input
          className={`w-full border border-[#d9e1e5] bg-[#f7f9fb] px-3 text-[14px] text-[#55606a] outline-none ${
            tall ? "h-[74px] pb-8 pt-3 align-top" : "h-[46px]"
          } ${suffix ? "pr-8" : ""} ${readOnly ? "bg-[#eef2f5]" : ""}`}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          type={type}
          value={value}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 text-[14px] font-semibold text-[#88949e]">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

const formFromPerson = (person) => ({
  referral_person_code: person.referral_person_code || "",
  name: person.name || "",
  contact_no: person.contact_no || "",
  contact_person_name: person.contact_person_name || "",
  contact_person_mobile_no: person.contact_person_mobile_no || "",
  opening_balance: person.opening_balance ?? "0",
  address: person.address || "",
  opd_commission_per: person.opd_commission_per ?? "",
  ipd_commission_per: person.ipd_commission_per ?? "",
  pharmacy_commission_per: person.pharmacy_commission_per ?? "",
  pathology_commission_per: person.pathology_commission_per ?? "",
  radiology_commission_per: person.radiology_commission_per ?? "",
  blood_bank_commission_per: person.blood_bank_commission_per ?? "",
  ambulance_commission_per: person.ambulance_commission_per ?? "",
});

export function ReferralPersonEntryPage() {
  const [searchParams] = useSearchParams();
  const editingId = searchParams.get("id");
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(editingId));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadPerson = async () => {
      if (!editingId) return;
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiRequest(`/referrals/persons/${editingId}`);
        setForm(formFromPerson(response.data || {}));
      } catch (error) {
        setErrorMessage(error.message || "Failed to load referral person");
      } finally {
        setIsLoading(false);
      }
    };

    loadPerson();
  }, [editingId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    return "";
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    contact_no: form.contact_no.trim() || null,
    contact_person_name: form.contact_person_name.trim() || null,
    contact_person_mobile_no: form.contact_person_mobile_no.trim() || null,
    opening_balance: Number(form.opening_balance || 0),
    address: form.address.trim() || null,
    opd_commission_per: Number(form.opd_commission_per || 0),
    ipd_commission_per: Number(form.ipd_commission_per || 0),
    pharmacy_commission_per: Number(form.pharmacy_commission_per || 0),
    pathology_commission_per: Number(form.pathology_commission_per || 0),
    radiology_commission_per: Number(form.radiology_commission_per || 0),
    blood_bank_commission_per: Number(form.blood_bank_commission_per || 0),
    ambulance_commission_per: Number(form.ambulance_commission_per || 0),
  });

  const handleSave = async () => {
    const validationError = validate();
    setErrorMessage("");
    setSuccessMessage("");
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest(editingId ? `/referrals/persons/${editingId}` : "/referrals/persons", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(buildPayload()),
      });
      setSuccessMessage(editingId ? "Referral person updated successfully." : "Referral person saved successfully.");
      if (!editingId) setForm(emptyForm);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save referral person");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setErrorMessage("");
    setSuccessMessage("");
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[8px] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">Referral Person Entry</div>

      {errorMessage ? <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div> : null}
      {successMessage ? <div className="mb-4 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{successMessage}</div> : null}

      {isLoading ? <div className="py-8 text-[14px] text-[#55606a]">Loading referral person...</div> : null}

      {!isLoading ? (
        <>
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            <InputField label="Code" name="referral_person_code" readOnly value={form.referral_person_code || "Auto generated"} />
            <InputField label="Name *" name="name" onChange={handleChange} value={form.name} />
            <InputField label="Contact No" name="contact_no" onChange={handleChange} value={form.contact_no} />
            <InputField label="Contact Person Name" name="contact_person_name" onChange={handleChange} value={form.contact_person_name} />

            <InputField label="Contact Person Mobile No" name="contact_person_mobile_no" onChange={handleChange} value={form.contact_person_mobile_no} />
            <InputField label="Opening Balance" name="opening_balance" onChange={handleChange} type="number" value={form.opening_balance} />
            <div className="col-span-2 max-md:col-span-1">
              <InputField label="Address" name="address" onChange={handleChange} tall value={form.address} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            <InputField label="OPD Commission (%)" name="opd_commission_per" onChange={handleChange} suffix="%" type="number" value={form.opd_commission_per} />
            <InputField label="IPD Commission (%)" name="ipd_commission_per" onChange={handleChange} suffix="%" type="number" value={form.ipd_commission_per} />
            <InputField label="Pharmacy Commission (%)" name="pharmacy_commission_per" onChange={handleChange} suffix="%" type="number" value={form.pharmacy_commission_per} />
            <InputField label="Pathology Commission (%)" name="pathology_commission_per" onChange={handleChange} suffix="%" type="number" value={form.pathology_commission_per} />
            <InputField label="Radiology Commission (%)" name="radiology_commission_per" onChange={handleChange} suffix="%" type="number" value={form.radiology_commission_per} />
            <InputField label="Blood Bank Commission (%)" name="blood_bank_commission_per" onChange={handleChange} suffix="%" type="number" value={form.blood_bank_commission_per} />
            <InputField label="Ambulance Commission (%)" name="ambulance_commission_per" onChange={handleChange} suffix="%" type="number" value={form.ambulance_commission_per} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <button
              className="h-[36px] rounded-[3px] bg-[#2f8533] text-[12px] font-semibold uppercase text-white disabled:opacity-50"
              disabled={isSaving}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button className="h-[36px] rounded-[3px] border border-[#ff6767] text-[12px] font-medium uppercase text-[#ff3b30]" onClick={handleReset} type="button">
              Reset
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
