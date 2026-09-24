import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const filterTypes = ["All", "By Date", "By Search"];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

function SelectField({ label, onChange, options, value, widthClass = "w-[192px]" }) {
  return (
    <label className={`relative block h-[40px] ${widthClass} bg-[#f3f3f3]`}>
      {label ? <span className="absolute left-3 top-[4px] text-[9px] text-[#1a73e8]">{label}</span> : null}
      <select
        className="h-full w-full appearance-none border-0 border-b-2 border-[#1a73e8] bg-transparent px-2 pb-[3px] pt-[16px] text-[12px] text-[#1f2c33] outline-none"
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
          backgroundRepeat: "no-repeat",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({ label, onChange, value }) {
  return (
    <label className="relative block h-[40px] w-[194px]">
      <span className="absolute left-3 top-[4px] text-[9px] text-[#6b7780]">{label}</span>
      <input
        className="h-full w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 pb-[4px] pt-[15px] text-[12px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

export function PatientListPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput());
  const [toDate, setToDate] = useState(formatDateInput());
  const [patients, setPatients] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const buildQueryString = (nextPage = page) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: "10",
    });

    if (filterType === "By Date") {
      params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      params.set("to", new Date(`${toDate}T23:59:59`).toISOString());
    }

    if (filterType === "By Search" && searchText.trim()) {
      params.set("search", searchText.trim());
    }

    return params.toString();
  };

  const loadPatients = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/patients?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      const pagination = response.meta?.pagination || {};
      setPatients(items);
      setMetaInfo({
        page: pagination.page || nextPage,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        totalPages: pagination.total_pages || 0,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
  }, []);

  const calculateAge = (dob, age) => {
    if (age !== null && age !== undefined && age !== "" && !isNaN(Number(age))) {
      return Number(age);
    }
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return "N/A";
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return years >= 0 ? years : "N/A";
  };

  const rows = useMemo(
    () =>
      patients.map((patient, index) => ({
        id: patient.id,
        sl: (metaInfo.page - 1) * metaInfo.limit + index + 1,
        code: patient.patient_code || "",
        name: patient.full_name || "",
        email: patient.email || "N/A",
        age: calculateAge(patient.date_of_birth, patient.age),
        phone: patient.phone || "N/A",
        gender: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : "N/A",
        bloodGroup: patient.blood_group || "N/A",
        dob: formatDateLabel(patient.date_of_birth),
        createdBy: patient.user?.full_name || patient.creator?.full_name || "N/A",
        updatedBy: formatDateLabel(patient.createdAt || patient.created_at || patient.updatedAt || patient.updated_at),
      })),
    [metaInfo.limit, metaInfo.page, patients]
  );

  const handleReport = async () => {
    setPage(1);
    await loadPatients(1);
  };

  const printPage = () => {
    window.print();
  };

  const printSinglePatient = async (row) => {
    const confirmed = await confirmPrint("Print Patient Profile", `Print profile details for "${row.name}"?`);
    if (!confirmed) return;

    try {
      const response = await apiRequest(`/patients/${row.id}`);
      const patient = response.data || {};
      await printHtml(
        `
        <!-- Patient Info Box -->
        <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Patient Code :</strong> ${patient.patient_code || row.patientCode}</div>
            <div><strong>Reg. Date :</strong> ${formatDateLabel(patient.created_at)}</div>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Full Name :</strong> ${patient.full_name || row.name}</div>
            <div><strong>Phone :</strong> ${patient.phone || row.mobile || "—"}</div>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Gender :</strong> ${patient.gender || "N/A"}</div>
            <div><strong>Blood Group :</strong> ${patient.blood_group || "N/A"}</div>
            <div><strong>Date of Birth :</strong> ${formatDateLabel(patient.date_of_birth)}</div>
          </div>
          <div><strong>Address :</strong> ${patient.address || "N/A"}</div>
        </div>

        <!-- Extra Info Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
              <th style="padding: 8px 10px; text-align: left; width: 30%;">Field</th>
              <th style="padding: 8px 10px; text-align: left;">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-weight: bold;">Remarks</td>
              <td style="padding: 7px 10px;">${patient.remarks || "N/A"}</td>
            </tr>
          </tbody>
        </table>
        `,
        "PATIENT PROFILE"
      );
    } catch (error) {
      showError("Print Failed", error.message || "Failed to load patient profile");
    }
  };

  const handleEdit = async (row) => {
    const confirmed = await confirmEdit("Edit Patient", `Do you want to edit patient "${row.name}"?`);
    if (!confirmed) return;
    navigate(`/patient/entry?id=${row.id}`);
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete("Delete Patient?", `Are you sure you want to delete patient "${row.name}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    try {
      await apiRequest(`/patients/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Patient "${row.name}" has been deleted.`);
      await loadPatients(page);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete patient");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[14px] font-medium text-[#1f2c33]">PATIENT LIST</div>

        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4 max-md:gap-3">
          <SelectField
            label="Filter Type"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSearchText("");
            }}
            options={filterTypes}
            value={filterType}
          />
          {filterType === "By Date" ? (
            <>
              <DateField label="From Date" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
              <DateField label="To Date" onChange={(event) => setToDate(event.target.value)} value={toDate} />
            </>
          ) : null}
          {filterType === "By Search" ? (
            <input
              className="h-[40px] w-[192px] border-b-2 border-[#1a73e8] bg-[#f3f3f3] px-3 text-[12px] text-[#1f2c33] outline-none placeholder:text-[#596778]"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="SEARCH"
              type="text"
              value={searchText}
            />
          ) : null}
          <button
            className="h-[28px] min-w-[192px] rounded-[2px] bg-black px-4 text-[10px] font-semibold uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={handleReport}
            type="button"
          >
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <button className="text-[#2d2d2d]" onClick={printPage} type="button">
          <svg aria-hidden="true" className="h-[22px] w-[22px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 3h10v4h2a2 2 0 0 1 2 2v6h-4v6H7v-6H3V9a2 2 0 0 1 2-2h2V3Zm2 2v2h6V5H9Zm6 10H9v4h6v-4Z" />
          </svg>
        </button>
      </div>

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              {["SL", "Code", "Name", "Email", "Age", "Contact No", "Gender", "Blood Group", "DOB", "Created By", "Reg Date", "Actions"].map(
                (header) => (
                  <th className="border border-black px-1 py-1 font-normal" key={header}>
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center" colSpan={12}>
                  Loading patients...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  {[
                    row.sl,
                    row.code,
                    row.name,
                    row.email,
                    row.age,
                    row.phone,
                    row.gender,
                    row.bloodGroup,
                    row.dob,
                    row.createdBy,
                    row.updatedBy,
                  ].map((cell, index) => (
                    <td className="border border-black px-1 py-0.5" key={`${row.id}-${index}`}>
                      {cell}
                    </td>
                  ))}
                  <td className="border border-black px-1 py-0.5">
                    <div className="flex items-center justify-center gap-3">
                      <button className="text-[#1b75d1]" onClick={() => printSinglePatient(row)} type="button">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M4 1.5h7l3 3V16.5H4v-15Zm7 1.8V5h1.7L11 3.3ZM6 7h6v1.2H6V7Zm0 2.5h6v1.2H6V9.5Zm0 2.5h4.5v1.2H6V12Z" />
                        </svg>
                      </button>
                      {/* Straight into this patient's diagnostic history. */}
                      <button
                        className="text-[#327b84]"
                        onClick={() => navigate(`/diagnostics/history?patientId=${row.id}`)}
                        title="Diagnostic history"
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M9 1.5a7.5 7.5 0 1 0 7.5 7.5h-1.5A6 6 0 1 1 9 3V1.5Zm.75 3v4.31l3.2 1.85.75-1.3-2.45-1.41V4.5h-1.5Z" />
                        </svg>
                      </button>
                      <button className="text-[#138d13]" onClick={() => handleEdit(row)} type="button">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5Zm10.6-8.85 2.25 2.25 1.06-1.06a.75.75 0 0 0 0-1.06L14.72 3.6a.75.75 0 0 0-1.06 0L12.6 4.65ZM2 3h8v1.5H2V3Zm0 4h5.5v1.5H2V7Zm0 4H6v1.5H2V11Z" />
                        </svg>
                      </button>
                      <button className="text-[#ff8a00]" onClick={() => handleDelete(row)} type="button">
                        <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                          <path d="M5.25 3h7.5l.5 1.5H16V6H2V4.5h2.75L5.25 3ZM4.5 7.5h9l-.7 6.42a1.5 1.5 0 0 1-1.49 1.33H6.69A1.5 1.5 0 0 1 5.2 13.92L4.5 7.5Zm2.25 1.75v4.25h1.5V9.25h-1.5Zm3 0v4.25h1.5V9.25h-1.5Z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1 py-4 text-center" colSpan={12}>
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[16px] text-[#91a1aa]">
        <button className="rounded-[4px] border border-[#cfd7dc] bg-[#f3f6f8] px-4 py-2 text-[#37474f]" type="button">
          {metaInfo.limit}
        </button>
        <button
          disabled={!metaInfo.hasPrev}
          onClick={async () => {
            const nextPage = Math.max(page - 1, 1);
            setPage(nextPage);
            await loadPatients(nextPage);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-[#1f73de] text-white" type="button">
          {metaInfo.page}
        </button>
        <button
          disabled={!metaInfo.hasNext}
          onClick={async () => {
            const nextPage = page + 1;
            setPage(nextPage);
            await loadPatients(nextPage);
          }}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
