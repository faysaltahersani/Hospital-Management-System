import { Fragment, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printOpdReceipt } from "../lib/opdReceipt";

const filterTypes = ["All", "By Patient", "By Doctor", "By All Doctor", "By User", "By All User", "By Search"];

const emptyMeta = {
  patients: [],
  doctors: [],
  users: [],
};

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

const formatMoney = (value) => Number(value || 0).toFixed(2);

function TableHeaderCell({ children, className = "" }) {
  return <th className={`border border-black px-1.5 py-1 font-normal ${className}`}>{children}</th>;
}

function TableCell({ children, className = "", colSpan }) {
  return (
    <td className={`border border-black px-1.5 py-1 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

function IconButton({ children, color = "", onClick, title }) {
  return (
    <button className={`grid h-5 w-5 place-items-center ${color}`} onClick={onClick} title={title} type="button">
      {children}
    </button>
  );
}

export function OpdBillRecordPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [visits, setVisits] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [filterType, setFilterType] = useState("All");
  const [filterValue, setFilterValue] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput());
  const [toDate, setToDate] = useState(formatDateInput());
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    try {
      const response = await apiRequest("/opd/bill-entry/meta");
      setMeta(response.data || emptyMeta);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load OPD bill record filters");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const buildQueryString = (nextPage = page) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: "10",
      from: new Date(`${fromDate}T00:00:00`).toISOString(),
      to: new Date(`${toDate}T23:59:59`).toISOString(),
    });

    if (filterType === "By Patient" && filterValue) params.set("patient_id", filterValue);
    if ((filterType === "By Doctor" || filterType === "By All Doctor") && filterValue) params.set("doctor_id", filterValue);
    if ((filterType === "By User" || filterType === "By All User") && filterValue) params.set("created_by", filterValue);
    if (filterType === "By Search" && searchText.trim()) params.set("search", searchText.trim());

    return params.toString();
  };

  const loadVisits = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/opd?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      setVisits(items);
      const pagination = response.meta?.pagination || {};
      setMetaInfo({
        page: pagination.page || nextPage,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        totalPages: pagination.total_pages || 0,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load OPD bill records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadVisits(1);
    setPage(1);
  }, []);

  const searchOptions = useMemo(() => {
    switch (filterType) {
      case "By Patient":
        return meta.patients.map((patient) => ({
          value: String(patient.id),
          label: `${patient.patient_code} - ${patient.full_name}`,
        }));
      case "By Doctor":
      case "By All Doctor":
        return meta.doctors.map((doctor) => ({
          value: String(doctor.id),
          label: `${doctor.doctor_code} - ${doctor.full_name}`,
        }));
      case "By User":
      case "By All User":
        return meta.users.map((user) => ({
          value: String(user.id),
          label: user.full_name || user.email || `User ${user.id}`,
        }));
      default:
        return [];
    }
  }, [filterType, meta.doctors, meta.patients, meta.users]);

  const rows = useMemo(
    () =>
      visits.map((visit, index) => {
        // BUG-004 — the API is now authoritative for money: it returns
        // total_amount / paid_amount / due_amount derived from the linked
        // invoice, and `is_billed: false` for a visit that was never billed.
        // Previously the fee was shown as fully paid with zero due.
        const payments = visit.payments || [];
        const isBilled = visit.is_billed !== false;
        const amount = Number(visit.total_amount ?? visit.consultation_fee ?? 0);
        const paid = Number(visit.paid_amount ?? 0);
        const due = Number(visit.due_amount ?? Math.max(amount - paid, 0));

        const parsedMethod = visit.payment_method || [...new Set(payments.map((p) => p.account_name || p.method).filter(Boolean))].join(", ");

        return {
          id: visit.id,
          sl: (metaInfo.page - 1) * metaInfo.limit + index + 1,
          billNo: visit.visit_code,
          patient: visit.patient ? `${visit.patient.patient_code} - ${visit.patient.full_name}` : "N/A",
          date: formatDateLabel(visit.visit_date),
          doctor: visit.doctor?.user?.full_name || visit.doctor?.doctor_code || "N/A",
          createdBy: visit.creator?.full_name || visit.creator?.email || "N/A",
          updatedBy: visit.updated_at ? formatDateLabel(visit.updated_at) : "N/A",
          amount,
          paid,
          due,
          isBilled,
          invoiceCode: visit.invoice_code || null,
          // An unbilled visit has no payment method to show — do not imply Cash.
          payMethod: isBilled ? parsedMethod || "Cash" : "—",
          notes: (visit.advice || visit.chief_complaint || "N/A").replace(/\[PayMethod:\s*[^\]]+\]\s*/, ''),
          status: visit.status || "N/A",
          raw: visit,
        };
      }),
    [metaInfo.limit, metaInfo.page, visits]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          amount: sum.amount + row.amount,
          paid: sum.paid + row.paid,
          due: sum.due + row.due,
        }),
        { amount: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  const handleFilterTypeChange = (value) => {
    setFilterType(value);
    setFilterValue("");
    setSearchText("");
  };

  const handleReport = async () => {
    setPage(1);
    await loadVisits(1);
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const printPage = () => {
    window.print();
  };

  // Shared with OPD Bill Entry, so both screens print the same document.
  const printBill = async (row) => {
    const confirmed = await confirmPrint("Print OPD Bill", `Are you sure you want to print Bill No: ${row.billNo}?`);
    if (!confirmed) return;
    await printOpdReceipt(row);
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete("Delete OPD Bill?", `Are you sure you want to delete Bill No "${row.billNo}"?`);
    if (!confirmed) return;
    setErrorMessage("");
    try {
      await apiRequest(`/opd/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `OPD bill "${row.billNo}" has been deleted.`);
      await loadVisits(page);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete OPD bill");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">OPD Bill Record</div>

        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">Filter Type</span>
            <select
              className="h-[40px] w-[180px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => handleFilterTypeChange(event.target.value)}
              value={filterType}
            >
              {filterTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          {filterType === "By Search" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Search</span>
              <input
                className="h-[40px] w-[220px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search bill / patient / doctor"
                type="text"
                value={searchText}
              />
            </label>
          ) : searchOptions.length ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Search</span>
              <select
                className="h-[40px] w-[220px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setFilterValue(event.target.value)}
                value={filterValue}
              >
                <option value="">{`Search ${filterType.replace(/^By\s*/, "")}`}</option>
                {searchOptions.map((option) => (
                  <option key={`${option.value}-${option.label}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">From Date</span>
            <input
              className="h-[40px] w-[190px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
          </label>

          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">To Date</span>
            <input
              className="h-[40px] w-[190px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setToDate(event.target.value)}
              type="date"
              value={toDate}
            />
          </label>

          <div className="flex items-end">
            <button
              className="h-[36px] min-w-[190px] rounded-[3px] bg-black px-4 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={handleReport}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d7dfe4] bg-white px-4 py-2 shadow-[0_1px_3px_rgba(22,36,45,0.06)]">
        <button className="text-[#333]" onClick={printPage} title="Print current report" type="button">
          <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 1h8v3H4zm8 9v4H4v-4zm1-5H3a2 2 0 0 0-2 2v3h3V8h8v2h3V7a2 2 0 0 0-2-2" />
          </svg>
        </button>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <TableHeaderCell>SL</TableHeaderCell>
              <TableHeaderCell>Bill No</TableHeaderCell>
              <TableHeaderCell>Patient</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Doctor</TableHeaderCell>
              <TableHeaderCell>Created By</TableHeaderCell>
              <TableHeaderCell>Updated By</TableHeaderCell>
              <TableHeaderCell className="text-right">Amount</TableHeaderCell>
              <TableHeaderCell className="text-right">Paid</TableHeaderCell>
              <TableHeaderCell className="text-right">Due</TableHeaderCell>
              <TableHeaderCell className="text-center">Actions</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <TableCell className="py-4 text-center" colSpan={11}>
                  Loading OPD bill records...
                </TableCell>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <TableCell>{row.sl}</TableCell>
                    <TableCell>
                      {row.billNo}
                      {/* BUG-004 — an unbilled visit is labelled explicitly instead
                          of silently appearing as a fully paid bill. */}
                      {row.isBilled ? null : (
                        <span
                          className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                          title="No invoice exists for this visit; the fee is outstanding."
                        >
                          UNBILLED
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{row.patient}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.doctor}</TableCell>
                    <TableCell>{row.createdBy}</TableCell>
                    <TableCell>{row.updatedBy}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.amount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.paid)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.due)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <IconButton color="text-[#ff6a00]" onClick={() => toggleExpandedRow(row.id)} title="View details">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#1d62d1]" onClick={() => printBill(row)} title="Print bill">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1h6l3 3v11H4zm5 1.5V5h2.5zM6 8h5v1H6zm0 2h5v1H6zm0 2h5v1H6z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#138a1b]" onClick={() => toggleExpandedRow(row.id)} title="Toggle details">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#f57c00]" onClick={() => handleDelete(row)} title="Delete bill">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                        </IconButton>
                      </div>
                    </TableCell>
                  </tr>
                  {expandedRows.includes(row.id) ? (
                    <tr>
                      <TableCell className="bg-[#fafcfd] px-3 py-2" colSpan={11}>
                        <div className="grid gap-1 text-[12px] text-[#33444c]">
                          <div>
                            <strong>Status:</strong> {row.status}
                          </div>
                          <div>
                            <strong>Pay Method:</strong> {row.payMethod}
                          </div>
                          <div>
                            <strong>Chief Complaint / Notes:</strong> {row.notes}
                          </div>
                          <div>
                            <strong>Invoice Code:</strong> {row.raw.invoice?.invoice_code || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <TableCell className="py-4 text-center" colSpan={11}>
                  No OPD bill records found.
                </TableCell>
              </tr>
            )}
            <tr>
              <TableCell className="text-right" colSpan={7}>
                Grand Total:
              </TableCell>
              <TableCell className="text-right">{formatMoney(totals.amount)}</TableCell>
              <TableCell className="text-right">{formatMoney(totals.paid)}</TableCell>
              <TableCell className="text-right">{formatMoney(totals.due)}</TableCell>
              <TableCell />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-6 text-[12px] text-[#63727b]">
        <button className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2" type="button">
          {metaInfo.limit}
        </button>
        <button
          disabled={!metaInfo.hasPrev || isLoading}
          onClick={async () => {
            const nextPage = Math.max(page - 1, 1);
            setPage(nextPage);
            await loadVisits(nextPage);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="grid h-7 w-7 place-items-center rounded-full bg-[#1f73de] text-white" type="button">
          {metaInfo.page}
        </button>
        <button
          disabled={!metaInfo.hasNext || isLoading}
          onClick={async () => {
            const nextPage = Math.min(page + 1, metaInfo.totalPages || page + 1);
            setPage(nextPage);
            await loadVisits(nextPage);
          }}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
