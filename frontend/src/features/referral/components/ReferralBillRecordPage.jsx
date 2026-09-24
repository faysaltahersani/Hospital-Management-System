import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const filterTypes = ["All", "By Date", "By Referral Person", "By Search"];
const ROWS_PER_PAGE = 10;

function SelectField({ label, name, onChange, options, value, widthClass = "w-[220px]" }) {
  return (
    <label className={`block ${widthClass}`}>
      <span className="mb-1 block px-1 text-[12px] text-[#5a6775]">{label}</span>
      <select
        className="h-[40px] w-full appearance-none rounded-[4px] border border-[#cfd6db] bg-[#f7f9fb] bg-right bg-no-repeat px-3 pr-10 text-[14px] text-[#1f2c33] outline-none"
        name={name}
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="block w-[260px]">
      <span className="mb-1 block px-1 text-[12px] text-[#5a6775]">Search</span>
      <input
        className="h-[40px] w-full rounded-[4px] border border-[#cfd6db] bg-[#f7f9fb] px-3 text-[14px] text-[#1f2c33] outline-none placeholder:text-[#5d6a72]"
        onChange={onChange}
        placeholder="Search Here"
        type="text"
        value={value}
      />
    </label>
  );
}

function DateField({ label, onChange, value }) {
  return (
    <label className="block w-[190px]">
      <span className="mb-1 block px-1 text-[12px] text-[#5a6775]">{label}</span>
      <input
        className="h-[40px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[14px] text-[#1f2c33] outline-none"
        onChange={onChange}
        type="date"
        value={value}
      />
    </label>
  );
}

const formatDateInput = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

export function ReferralBillRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [referralPersonId, setReferralPersonId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [referralPersons, setReferralPersons] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: ROWS_PER_PAGE, total: 0, hasNext: false, hasPrev: false });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const referralPersonOptions = useMemo(
    () => [
      { value: "", label: "Select Referral Person" },
      ...referralPersons.map((item) => ({
        value: String(item.id),
        label: item.name || item.external_doctor_name || item.label || `Referral #${item.id}`,
      })),
    ],
    [referralPersons]
  );

  const buildQueryString = (nextPage = page) => {
    const params = new URLSearchParams({ page: String(nextPage), limit: String(ROWS_PER_PAGE) });
    if (fromDate && toDate) {
      params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      params.set("to", new Date(`${toDate}T23:59:59`).toISOString());
    }
    if (filterType === "By Referral Person" && referralPersonId) {
      params.set("referral_person_id", referralPersonId);
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
      const response = await apiRequest(`/referrals/bills?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      const pagination = response.meta?.pagination || {};
      setRows(items);
      setMeta({
        page: pagination.page || nextPage,
        limit: pagination.limit || ROWS_PER_PAGE,
        total: pagination.total || items.length,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load referral bills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadReferralPersons = async () => {
      try {
        const response = await apiRequest("/referrals/persons?limit=100");
        setReferralPersons(response.data || []);
      } catch (error) {
        setErrorMessage(error.message || "Failed to load referral persons");
      }
    };

    loadReferralPersons();
    loadRows(1);
  }, []);

  const handleReport = async () => {
    setPage(1);
    await loadRows(1);
  };

  const handlePrintReceipt = async (row) => {
    await printHtml(
      `
      <!-- Referral Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill No :</strong> ${row.referral_bill_code || row.id}</div>
          <div><strong>Date :</strong> ${row.bill_date || ""}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Patient :</strong> ${row.patient?.full_name || row.patient?.patient_code || "N/A"}</div>
          <div><strong>Referral Person :</strong> ${row.referral_person?.name || "N/A"}</div>
        </div>
      </div>

      <!-- Amount Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">Description</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">Bill Amount</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.bill_amount)} TK</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px; font-weight: bold;">Commission</td>
            <td style="padding: 7px 10px; text-align: right; font-weight: bold;">${formatMoney(row.commission_amount)} TK</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td style="padding: 6px 10px; color: #388e3c;">Paid Amount</td>
            <td style="padding: 6px 10px; text-align: right; color: #388e3c;">${formatMoney(row.paid_amount)} TK</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #d32f2f; font-weight: bold;">Due Amount</td>
            <td style="padding: 6px 10px; text-align: right; color: #d32f2f; font-weight: bold;">${formatMoney(row.due_amount)} TK</td>
          </tr>
        </tfoot>
      </table>
      `,
      "REFERRAL BILL STATEMENT"
    );
  };

  const handleDelete = async (row) => {
    const billCode = row.referral_bill_code || `Bill #${row.id}`;
    const confirmed = await confirmDelete("Delete Referral Bill?", `Are you sure you want to delete "${billCode}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`/referrals/bills/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Referral bill "${billCode}" has been deleted.`);
      await loadRows(page);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete referral bill");
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const bDate = formatDateInput(row.bill_date || row.created_at || row.createdAt);
      if (fromDate && bDate < fromDate) return false;
      if (toDate && bDate > toDate) return false;

      if (filterType === "By Referral Person" && referralPersonId) {
        const selectedObj = referralPersonOptions.find((p) => String(p.value) === String(referralPersonId));
        const targetId = String(referralPersonId).toLowerCase();
        const targetLabel = (selectedObj?.label || "").toLowerCase();

        const rowRefId = String(row.referral_person_id || "").toLowerCase();
        const rowRefName = String(row.referral_person?.name || "").toLowerCase();

        const matchesRef =
          (targetId && rowRefId === targetId) ||
          (targetLabel && targetLabel !== "select referral person" && rowRefName.includes(targetLabel)) ||
          (targetId && rowRefName.includes(targetId));

        if (!matchesRef) return false;
      }

      if (filterType === "By Search" && searchText.trim()) {
        const term = searchText.trim().toLowerCase();
        const code = String(row.referral_bill_code || "").toLowerCase();
        const patient = String(row.patient?.full_name || row.patient?.patient_code || "").toLowerCase();
        const refPerson = String(row.referral_person?.name || "").toLowerCase();
        const billNum = String(row.bill_number || "").toLowerCase();

        const matches = [code, patient, refPerson, billNum].some((str) => str && str.includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, referralPersonId, searchText]);

  const tableRows = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        id: row.id,
        rawRow: row,
        sl: (meta.page - 1) * meta.limit + index + 1,
        createdDate: formatDateLabel(row.bill_date || row.created_at || row.createdAt),
        billNo: row.referral_bill_code || "",
        patient: row.patient?.full_name || row.patient?.patient_code || "N/A",
        referralPerson: row.referral_person?.name || "N/A",
        billNumber: row.bill_number || "N/A",
        bill: formatMoney(row.bill_amount),
        commission: formatMoney(row.commission_amount),
        due: formatMoney(row.due_amount),
        paid: formatMoney(row.paid_amount),
        createdBy: row.creator?.full_name || "N/A",
        updatedBy: row.updater?.full_name || "N/A",
      })),
    [meta.limit, meta.page, filteredRows]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-6 text-[18px] font-medium text-[#1f2c33]">REFERRAL BILL RECORD</div>

        {errorMessage ? <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div> : null}
        {successMessage ? <div className="mb-4 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{successMessage}</div> : null}

        <div className="flex flex-wrap items-end gap-5">
          <SelectField
            label="Filter Type"
            name="filter_type"
            onChange={(event) => {
              setFilterType(event.target.value);
              setSearchText("");
              setReferralPersonId("");
            }}
            options={filterTypes.map((item) => ({ value: item, label: item }))}
            value={filterType}
          />

          {filterType === "By Referral Person" ? (
            <SelectField
              label="Referral Person"
              name="referral_person_id"
              onChange={(event) => setReferralPersonId(event.target.value)}
              options={referralPersonOptions}
              value={referralPersonId}
              widthClass="w-[260px]"
            />
          ) : null}

          {filterType === "By Search" ? <SearchField onChange={(event) => setSearchText(event.target.value)} value={searchText} /> : null}

          <DateField label="From Date" onChange={(event) => setFromDate(event.target.value)} value={fromDate} />
          <DateField label="To Date" onChange={(event) => setToDate(event.target.value)} value={toDate} />

          <button className="h-[40px] px-8 rounded-[3px] bg-black text-[14px] font-medium text-white" onClick={handleReport} type="button">
            {isLoading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      <div className="mt-7 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.05)]">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#f7fafc]">
              {["SL", "Created Date", "Bill No", "Patient", "Referral Person", "Bill Number", "Bill", "Commission", "Due", "Paid", "Created By", "Updated By", "Actions"].map((header) => (
                <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold whitespace-nowrap" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-5 text-center text-[#55606a]" colSpan={13}>
                  Loading referral bills...
                </td>
              </tr>
            ) : tableRows.length ? (
              tableRows.map((row) => (
                <tr key={row.id}>
                  {[row.sl, row.createdDate, row.billNo, row.patient, row.referralPerson, row.billNumber, row.bill, row.commission, row.due, row.paid, row.createdBy, row.updatedBy].map(
                    (cell, index) => (
                      <td className="border-b border-[#eef2f4] px-3 py-3 whitespace-nowrap" key={`${row.id}-${index}`}>
                        {cell}
                      </td>
                    )
                  )}
                  <td className="border-b border-[#eef2f4] px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button className="text-[#1976d2] font-medium" onClick={() => handlePrintReceipt(row.rawRow)} type="button">
                        Print
                      </button>
                      <button className="text-[#d43c30] font-medium" onClick={() => handleDelete(row.rawRow)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-5 text-center text-[#55606a]" colSpan={13}>
                  No referral bills found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 px-2 text-[12px] text-[#65727d]">
        <span>Rows per page {ROWS_PER_PAGE}</span>
        <span>
          {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}-{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
        </span>
        <button disabled={!meta.hasPrev} onClick={() => {
          const nextPage = Math.max(1, page - 1);
          setPage(nextPage);
          loadRows(nextPage);
        }} type="button">
          ‹
        </button>
        <button disabled={!meta.hasNext} onClick={() => {
          const nextPage = page + 1;
          setPage(nextPage);
          loadRows(nextPage);
        }} type="button">
          ›
        </button>
      </div>
    </section>
  );
}
