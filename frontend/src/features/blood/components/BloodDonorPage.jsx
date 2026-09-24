import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

const GENDER_OPTIONS = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const emptyForm = {
  id: null,
  full_name: "",
  age: "",
  gender: "",
  blood_group: "",
  date_of_birth: "",
  phone: "",
  guardian_contact_no: "",
  address: "",
};

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(value) {
  const formatted = formatDateInput(value);
  return formatted || "-";
}

function calculateAge(value) {
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
}

function approximateDobFromAge(ageValue) {
  const age = Number(ageValue);
  if (!Number.isFinite(age) || age <= 0) return "";
  const today = new Date();
  const dob = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
  return dob.toISOString().slice(0, 10);
}

function mapDonorToForm(donor) {
  return {
    id: donor.id,
    full_name: donor.full_name || "",
    age: calculateAge(donor.date_of_birth),
    gender: donor.gender || "",
    blood_group: donor.blood_group || "",
    date_of_birth: formatDateInput(donor.date_of_birth),
    phone: donor.phone || "",
    guardian_contact_no: donor.guardian_contact_no || "",
    address: donor.address || "",
  };
}

function DialogField({ children, className = "" }) {
  return <div className={`min-w-0 rounded-[2px] border-b border-[#8d8d8d] bg-[#f1f1f1] ${className}`}>{children}</div>;
}

function DialogInput({ className = "", hasError = false, onChange, placeholder = "", readOnly = false, type = "text", value = "" }) {
  return (
    <input
      className={`h-[36px] w-full bg-[#f1f1f1] px-2 text-[14px] text-[#343434] outline-none placeholder:text-[#666] ${
        hasError ? "border-b border-[#ff4b4b] text-[#ff4b4b]" : "border-0"
      } ${readOnly ? "cursor-not-allowed text-[#7a7a7a]" : ""} ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function DialogSelect({ hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[36px] w-full appearance-none bg-right bg-no-repeat px-2 pr-8 text-[14px] outline-none ${
        hasError ? "border-b border-[#ff4b4b] text-[#ff4b4b]" : "border-0 text-[#666]"
      }`}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 10px center",
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

function AddDonorModal({
  bloodGroupOptions = BLOOD_GROUP_OPTIONS,
  errorMessage,
  form,
  hasAttemptedSave,
  isSaving,
  onChange,
  onClose,
  onSave,
}) {
  const title = form.id ? "Edit Donor" : "Add Donor";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 overflow-y-auto">
      <div className="w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <div className="border-b border-[#e5e5e5] px-5 py-3 text-[15px] font-semibold text-[#202020]">{title}</div>

        {errorMessage ? (
          <div className="mx-5 mt-3 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5 max-sm:grid-cols-1">
          <DialogField>
            <DialogInput
              hasError={hasAttemptedSave && !form.full_name.trim()}
              onChange={(event) => onChange("full_name", event.target.value)}
              placeholder="Name *"
              value={form.full_name}
            />
          </DialogField>

          <DialogField>
            <DialogInput
              onChange={(event) => onChange("age", event.target.value)}
              placeholder="Age"
              type="number"
              value={form.age}
            />
          </DialogField>

          <DialogField>
            <DialogSelect
              hasError={hasAttemptedSave && !form.gender}
              onChange={(event) => onChange("gender", event.target.value)}
              options={GENDER_OPTIONS.filter((option) => option.value)}
              placeholder="Gender *"
              value={form.gender}
            />
          </DialogField>

          <DialogField>
            <DialogSelect
              hasError={hasAttemptedSave && !form.blood_group}
              onChange={(event) => onChange("blood_group", event.target.value)}
              options={bloodGroupOptions}
              placeholder="Blood Group *"
              value={form.blood_group}
            />
          </DialogField>

          <DialogField>
            <div className="relative">
              <DialogInput
                onChange={(event) => onChange("date_of_birth", event.target.value)}
                placeholder="DOB"
                type="date"
                value={form.date_of_birth}
              />
            </div>
          </DialogField>

          <DialogField>
            <DialogInput
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="Contact No"
              value={form.phone}
            />
          </DialogField>

          <DialogField className="col-span-2 max-sm:col-span-1">
            <DialogInput
              onChange={(event) => onChange("guardian_contact_no", event.target.value)}
              placeholder="Guardian Contact No"
              value={form.guardian_contact_no}
            />
          </DialogField>

          <DialogField className="col-span-2 max-sm:col-span-1">
            <DialogInput
              onChange={(event) => onChange("address", event.target.value)}
              placeholder="Address"
              value={form.address}
            />
          </DialogField>
        </div>

        <div className="mt-auto flex justify-end gap-6 border-t border-[#f0f0f0] bg-[#fafafa] px-5 py-3 text-[13px] font-medium">
          <button className="rounded px-3 py-1 text-[#ff4e4e] hover:bg-[#fff0f0]" onClick={onClose} type="button">
            CANCEL
          </button>
          <button
            className="rounded bg-[#2376da] px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-[#1b65c2] disabled:opacity-50"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarIcon({ children, onClick }) {
  return (
    <button className="grid h-6 w-6 place-items-center text-[#707780]" onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function BloodDonorPage() {
  const [donors, setDonors] = useState([]);
  const [bloodGroupOptions, setBloodGroupOptions] = useState(BLOOD_GROUP_OPTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogForm, setDialogForm] = useState(emptyForm);
  const [dialogErrorMessage, setDialogErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await apiRequest("/blood-bank/groups?limit=100");
        const list = response.data || [];
        const configuredGroups = list.map((g) => g.name || g.label || g.code).filter(Boolean);
        setBloodGroupOptions([...new Set([...BLOOD_GROUP_OPTIONS, ...configuredGroups])]);
      } catch (err) {
        // Fall back to standard BLOOD_GROUP_OPTIONS
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDonors = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({ limit: "100" });
        if (search.trim()) {
          params.set("search", search.trim());
        }
        const response = await apiRequest(`/blood-bank/donors?${params.toString()}`);
        if (!isMounted) return;
        setDonors(response.data || []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load donors");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDonors();
    return () => {
      isMounted = false;
    };
  }, [search]);

  const pagedDonors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return donors.slice(start, start + pageSize);
  }, [donors, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(donors.length / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openCreateDialog = () => {
    setDialogForm(emptyForm);
    setDialogErrorMessage("");
    setHasAttemptedSave(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (donor) => {
    setDialogForm(mapDonorToForm(donor));
    setDialogErrorMessage("");
    setHasAttemptedSave(false);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setDialogForm(emptyForm);
    setDialogErrorMessage("");
    setHasAttemptedSave(false);
  };

  const updateDialogForm = (field, value) => {
    setDialogForm((current) => {
      if (field === "date_of_birth") {
        return {
          ...current,
          date_of_birth: value,
          age: calculateAge(value),
        };
      }

      if (field === "age") {
        return {
          ...current,
          age: value,
          date_of_birth: current.date_of_birth || approximateDobFromAge(value),
        };
      }

      return { ...current, [field]: value };
    });
  };

  const handleSave = async () => {
    setHasAttemptedSave(true);
    setDialogErrorMessage("");

    if (!dialogForm.full_name.trim()) {
      setDialogErrorMessage("Donor name is required.");
      return;
    }
    if (!dialogForm.gender) {
      setDialogErrorMessage("Gender is required.");
      return;
    }
    if (!dialogForm.blood_group) {
      setDialogErrorMessage("Blood group is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        full_name: dialogForm.full_name.trim(),
        gender: dialogForm.gender,
        blood_group: dialogForm.blood_group,
        date_of_birth: dialogForm.date_of_birth || null,
        phone: dialogForm.phone.trim() || null,
        guardian_contact_no: dialogForm.guardian_contact_no.trim() || null,
        address: dialogForm.address.trim() || null,
        is_active: true,
      };

      const response = dialogForm.id
        ? await apiRequest(`/blood-bank/donors/${dialogForm.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/blood-bank/donors", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const savedDonor = response.data;

      setDonors((current) => {
        if (dialogForm.id) {
          return current.map((donor) => (donor.id === savedDonor.id ? savedDonor : donor));
        }
        return [savedDonor, ...current];
      });

      setSuccessMessage(dialogForm.id ? "Donor updated successfully." : "Donor created successfully.");
      closeDialog();
    } catch (error) {
      setDialogErrorMessage(error.message || "Failed to save donor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (donor) => {
    const confirmed = window.confirm(`Delete donor ${donor.full_name}?`);
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/blood-bank/donors/${donor.id}`, {
        method: "DELETE",
      });
      setDonors((current) => current.filter((item) => item.id !== donor.id));
      setSuccessMessage("Donor deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete donor");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-3 text-[15px] text-[#202020]">Donor List</h1>

        {errorMessage ? (
          <div className="mb-3 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-3 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
            {successMessage}
          </div>
        ) : null}

        <button
          className="mb-3 rounded-[3px] bg-[#2376da] px-4 py-2 text-[12px] font-medium text-white shadow-[0_2px_6px_rgba(35,118,218,0.3)]"
          onClick={openCreateDialog}
          type="button"
        >
          ADD DONOR
        </button>

        <div className="overflow-hidden rounded-[4px] border border-[#e1e6ea] shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#edf1f4] px-4 py-3">
            <input
              className="h-[32px] w-full max-w-[280px] rounded-[4px] border border-[#d5dde2] px-3 text-[13px] outline-none placeholder:text-[#7b858c]"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search donors"
              type="text"
              value={search}
            />
            <div className="flex items-center gap-2">
              <ToolbarIcon onClick={() => {}}>
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </ToolbarIcon>
              <ToolbarIcon onClick={() => setSearch("")}>
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                  <path d="M2 4h12M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </ToolbarIcon>
              <ToolbarIcon onClick={() => {}}>
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2 3h3v10H2zM6.5 3h3v10h-3zM11 3h3v10h-3z" />
                </svg>
              </ToolbarIcon>
              <ToolbarIcon onClick={() => {}}>
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                  <path d="M2 4h10M2 8h10M2 12h10" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </ToolbarIcon>
              <ToolbarIcon onClick={() => {}}>
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                  <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </ToolbarIcon>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px] text-[#1f2c33]">
              <thead className="border-b border-[#d9e1e5] bg-white">
                <tr>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Age</th>
                  <th className="px-3 py-3 font-semibold">Blood Group</th>
                  <th className="px-3 py-3 font-semibold">Gender</th>
                  <th className="px-3 py-3 font-semibold">DOB</th>
                  <th className="px-3 py-3 font-semibold">Contact No</th>
                  <th className="px-3 py-3 font-semibold">Guardian Contact No</th>
                  <th className="px-3 py-3 font-semibold">Address</th>
                </tr>
              </thead>
              <tbody>
                {pagedDonors.length ? (
                  pagedDonors.map((donor) => (
                    <tr className="border-b border-[#e7edf0]" key={donor.id}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <button className="text-[#1c9d24]" onClick={() => openEditDialog(donor)} type="button">
                            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                              <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                            </svg>
                          </button>
                          <button className="text-[#ff2b2b]" onClick={() => handleDelete(donor)} type="button">
                            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                              <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">{donor.full_name}</td>
                      <td className="px-3 py-3">{calculateAge(donor.date_of_birth) || "-"}</td>
                      <td className="px-3 py-3">{donor.blood_group || "-"}</td>
                      <td className="px-3 py-3">
                        {donor.gender ? donor.gender.charAt(0).toUpperCase() + donor.gender.slice(1) : "-"}
                      </td>
                      <td className="px-3 py-3">{formatDateDisplay(donor.date_of_birth)}</td>
                      <td className="px-3 py-3">{donor.phone || "-"}</td>
                      <td className="px-3 py-3">{donor.guardian_contact_no || "-"}</td>
                      <td className="px-3 py-3">{donor.address || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#66737b]" colSpan={9}>
                      {isLoading ? "Loading donors..." : "No donors found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 px-4 py-3 text-[13px] text-[#5e6870]">
            <span>Rows per page</span>
            <span className="flex items-center gap-1">
              {pageSize}
              <svg aria-hidden="true" className="h-3 w-3" fill="currentColor" viewBox="0 0 10 6">
                <path d="M5 6 0 .5h10z" />
              </svg>
            </span>
            <span>
              {donors.length ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, donors.length)} of ${donors.length}` : "0-0 of 0"}
            </span>
            <button className="text-[#9aa2a9] disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              className="text-[#9aa2a9] disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isDialogOpen ? (
        <AddDonorModal
          bloodGroupOptions={bloodGroupOptions}
          errorMessage={dialogErrorMessage}
          form={dialogForm}
          hasAttemptedSave={hasAttemptedSave}
          isSaving={isSaving}
          onChange={updateDialogForm}
          onClose={closeDialog}
          onSave={handleSave}
        />
      ) : null}
    </section>
  );
}
