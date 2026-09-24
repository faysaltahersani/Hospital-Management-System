import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../../lib/api";

const filterTypes = ["All", "By Date", "By Search"];

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

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

export function ReferralPersonListPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput());
  const [toDate, setToDate] = useState(formatDateInput());
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, hasNext: false, hasPrev: false });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const buildQueryString = (nextPage = page) => {
    const params = new URLSearchParams({ page: String(nextPage), limit: "10" });
    if (filterType === "By Date") {
      params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      params.set("to", new Date(`${toDate}T23:59:59`).toISOString());
    }
    if (filterType === "By Search" && searchText.trim()) {
      params.set("search", searchText.trim());
    }
    return params.toString();
  };

  const loadRows = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/referrals/persons?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      const pagination = response.meta?.pagination || {};
      setRows(items);
      setMeta({
        page: pagination.page || nextPage,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load referral persons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows(1);
  }, []);

  const tableRows = useMemo(
    () =>
      rows.map((item, index) => ({
        id: item.id,
        sl: (meta.page - 1) * meta.limit + index + 1,
        code: item.referral_person_code || "",
        name: item.name || "",
        contactNo: item.contact_no || "N/A",
        contactPerson: item.contact_person_name || "N/A",
        opd: item.opd_commission_per ?? 0,
        ipd: item.ipd_commission_per ?? 0,
        pharmacy: item.pharmacy_commission_per ?? 0,
        createdBy: item.creator?.full_name || item.created_by || "Admin",
        updatedBy: item.updater?.full_name === "System Administrator" ? "Admin" : (item.updater?.full_name || "N/A"),
      })),
    [meta.limit, meta.page, rows]
  );

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete referral person "${row.name}"?`)) return;
    setErrorMessage("");
    try {
      await apiRequest(`/referrals/persons/${row.id}`, { method: "DELETE" });
      await loadRows(page);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete referral person");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[14px] font-medium text-[#1f2c33]">Referral Person List</div>

        {errorMessage ? <div className="mb-4 rounded border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div> : null}

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
          <button className="h-[28px] min-w-[192px] rounded-[2px] bg-black px-4 text-[10px] font-semibold text-white" onClick={() => loadRows(1)} type="button">
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              {["SL", "Code", "Name", "Contact No", "Contact Person", "OPD%", "IPD%", "Pharmacy%", "Created By", "Updated By", "Actions"].map((header) => (
                <th className="border border-black px-1 py-1 font-normal" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center" colSpan={11}>
                  Loading referral persons...
                </td>
              </tr>
            ) : tableRows.length ? (
              tableRows.map((row, index) => (
                <tr key={`${row.id}-${row.code || index}`}>
                  {[row.sl, row.code, row.name, row.contactNo, row.contactPerson, row.opd, row.ipd, row.pharmacy, row.createdBy, row.updatedBy].map((cell, index) => (
                    <td className="border border-black px-1 py-0.5" key={`${row.id}-${index}`}>
                      {cell}
                    </td>
                  ))}
                  <td className="border border-black px-1 py-0.5">
                    <div className="flex items-center justify-center gap-3">
                      <button className="text-[#138d13]" onClick={() => navigate(`/referral/person-entry?id=${row.id}`)} type="button">
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
                <td className="border border-black px-1 py-4 text-center" colSpan={11}>
                  No referral persons found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-center gap-5 text-[16px] text-[#91a1aa]">
        <button className="rounded-[4px] border border-[#cfd7dc] bg-[#f3f6f8] px-4 py-2 text-[#37474f]" type="button">
          {meta.limit}
        </button>
        <button
          disabled={!meta.hasPrev}
          onClick={async () => {
            const nextPage = Math.max(page - 1, 1);
            setPage(nextPage);
            await loadRows(nextPage);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-[#1f73de] text-white" type="button">
          {meta.page}
        </button>
        <button
          disabled={!meta.hasNext}
          onClick={async () => {
            const nextPage = page + 1;
            setPage(nextPage);
            await loadRows(nextPage);
          }}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
