import { Fragment, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const filterTypes = [
  "All",
  "By Test",
  "By Category",
  "By Patient",
  "By Doctor",
  "By All Doctor",
  "By User",
  "By All User",
  "By Search",
];

const recordTypes = ["With Detail", "Without Detail"];

const emptyMeta = {
  next_bill_no: "",
  next_patient_code: "",
  accounts: [],
  patients: [],
  doctors: [],
  tests: [],
};

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

function IconButton({ children, color = "", onClick, title }) {
  return (
    <button
      className={`grid h-6 w-6 place-items-center rounded hover:bg-gray-200 cursor-pointer transition-colors ${color}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      title={title}
      type="button"
    >
      <span className="pointer-events-none grid place-items-center">{children}</span>
    </button>
  );
}

export function RadiologyBillRecordPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [orders, setOrders] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [filterValue, setFilterValue] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInput());
  const [toDate, setToDate] = useState(formatDateInput());
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);
  const [creatorOptions, setCreatorOptions] = useState([]);

  const categoryOptions = useMemo(() => {
    const values = [...new Set((meta.tests || []).map((test) => test.category).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [meta.tests]);

  const updateCreatorOptions = (items) => {
    setCreatorOptions((current) => {
      const next = [...current];
      items.forEach((item) => {
        if (!item.creator?.id) return;
        if (next.some((user) => String(user.id) === String(item.creator.id))) return;
        next.push({ id: item.creator.id, full_name: item.creator.full_name || item.creator.email || `User ${item.creator.id}` });
      });
      return next.sort((a, b) => a.full_name.localeCompare(b.full_name));
    });
  };

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    try {
      const response = await apiRequest("/radiology/bill-entry/meta");
      setMeta(response.data || emptyMeta);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology bill record filters");
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
    if (filterType === "By Test" && filterValue) params.set("test_id", filterValue);
    if (filterType === "By Category" && filterValue) params.set("category", filterValue);
    if (filterType === "By Search" && searchText.trim()) params.set("search", searchText.trim());

    return params.toString();
  };

  const loadOrders = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/radiology/orders?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      setOrders(items);
      const pagination = response.meta?.pagination || {};
      setMetaInfo({
        page: pagination.page || nextPage,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        totalPages: pagination.total_pages || 0,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
      updateCreatorOptions(items);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology bill records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadOrders(1);
    setPage(1);
  }, []);

  const searchOptions = useMemo(() => {
    switch (filterType) {
      case "By Test":
        return meta.tests.map((test) => ({ value: String(test.id), label: `${test.code} - ${test.name}` }));
      case "By Category":
        return categoryOptions.map((category) => ({ value: category, label: category }));
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
        return creatorOptions.map((user) => ({
          value: String(user.id),
          label: user.full_name,
        }));
      default:
        return [];
    }
  }, [categoryOptions, creatorOptions, filterType, meta.doctors, meta.patients, meta.tests]);

  const rows = useMemo(
    () =>
      orders.map((order, index) => {
        const invoice = order.invoice || {};
        const payments = invoice.payments || [];
        const subtotal = Number(invoice.subtotal ?? order.price ?? 0);
        const discount = Number(invoice.discount || 0);
        const tax = Number(invoice.tax || 0);
        const amount = Number(invoice.total ?? order.total ?? subtotal - discount + tax);
        const paid = Number(invoice.paid_amount ?? payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
        const due = Math.max(amount - paid, 0);
        const payMethod = [...new Set(payments.map((payment) => payment.method || payment.account_name).filter(Boolean))].join(", ");
        return {
          id: order.id,
          sl: (metaInfo.page - 1) * metaInfo.limit + index + 1,
          billNo: order.order_code,
          date: formatDateLabel(order.ordered_at),
          patient: order.patient ? `${order.patient.patient_code} - ${order.patient.full_name}` : "",
          referralDoctor: order.doctor?.user?.full_name || order.doctor?.doctor_code || "N/A",
          createdBy: order.creator?.full_name || order.creator?.email || "N/A",
          updatedBy: formatDateLabel(order.updatedAt || order.updated_at) || "N/A",
          subTotal: subtotal,
          discountAmt: discount,
          taxAmt: tax,
          amount,
          paid,
          due,
          payMethod: payMethod || "N/A",
          items: order.test ? [order.test] : [],
          raw: order,
        };
      }),
    [metaInfo.limit, metaInfo.page, orders]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          subTotal: sum.subTotal + row.subTotal,
          discountAmt: sum.discountAmt + row.discountAmt,
          taxAmt: sum.taxAmt + row.taxAmt,
          amount: sum.amount + row.amount,
          paid: sum.paid + row.paid,
          due: sum.due + row.due,
        }),
        { subTotal: 0, discountAmt: 0, taxAmt: 0, amount: 0, paid: 0, due: 0 }
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
    await loadOrders(1);
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const printPage = () => {
    window.print();
  };

  const printBill = async (row) => {
    const itemRows = row.items
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">${index + 1}</td>
            <td style="padding: 7px 10px;">${item.code || ""} - ${item.name || ""}</td>
            <td style="padding: 7px 10px; text-align:right;">${formatMoney(item.price)}</td>
          </tr>`
      )
      .join("");

    await printHtml(
      `
      <!-- Patient Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill No :</strong> ${row.billNo}</div>
          <div><strong>Date :</strong> ${row.date}</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Patient :</strong> ${row.patient}</div>
          <div><strong>Ref. Doctor :</strong> ${row.referralDoctor || "—"}</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">SL</th>
            <th style="padding: 8px 10px; text-align: left;">Test Description</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td colspan="2" style="padding: 8px 10px;">Total</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(row.amount)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 10px; color: #388e3c;">Paid</td>
            <td style="padding: 6px 10px; text-align: right; color: #388e3c;">${formatMoney(row.paid)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 10px; color: #d32f2f; font-weight: bold;">Due</td>
            <td style="padding: 6px 10px; text-align: right; color: #d32f2f; font-weight: bold;">${formatMoney(row.due)}</td>
          </tr>
        </tfoot>
      </table>
      `,
      "RADIOLOGY BILL INVOICE"
    );
  };

  const printResultReport = async (row) => {
    try {
      const response = await apiRequest(`/radiology/orders/${row.id}/report`);
      const report = response.data || {};
      await printHtml(
        `
        <!-- Patient Info Box -->
        <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Bill No :</strong> ${row.billNo}</div>
            <div><strong>Date :</strong> ${row.date}</div>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Patient :</strong> ${row.patient}</div>
            <div><strong>Ref. Doctor :</strong> ${row.referralDoctor || "—"}</div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div><strong>Test :</strong> ${report.test?.name || "—"}</div>
            <div><strong>Result Date :</strong> ${formatDateLabel(report.result?.result_at || row.raw?.result_at)}</div>
          </div>
        </div>

        <!-- Result Details -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
              <th style="padding: 8px 10px; text-align: left; width: 30%;">Field</th>
              <th style="padding: 8px 10px; text-align: left;">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-weight: bold;">Status</td>
              <td style="padding: 7px 10px;">${report.result?.status || row.raw?.status || "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-weight: bold;">Findings / Notes</td>
              <td style="padding: 7px 10px;">${report.result?.result_notes || row.raw?.result_notes || "N/A"}</td>
            </tr>
          </tbody>
        </table>
        `,
        "RADIOLOGY RESULT REPORT"
      );
    } catch (error) {
      showError("Print Failed", error.message || "Failed to load radiology report");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete("Delete Radiology Bill?", `Are you sure you want to delete Bill No "${row.billNo}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    try {
      await apiRequest(`/radiology/orders/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Bill "${row.billNo}" has been deleted.`);
      await loadOrders(page);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete radiology bill");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">Radiology Bill Record</div>

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
                className="h-[40px] w-[220px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none placeholder:text-[#6b6b6b]"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={searchText}
              />
            </label>
          ) : null}

          {filterType !== "All" && filterType !== "By Search" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Filter Value</span>
              <select
                className="h-[40px] w-[220px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setFilterValue(event.target.value)}
                value={filterValue}
              >
                <option value="">Select</option>
                {searchOptions.map((option) => (
                  <option key={`${filterType}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">Record Type</span>
            <select
              className="h-[40px] w-[180px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setRecordType(event.target.value)}
              value={recordType}
            >
              {recordTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

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
              className="h-[36px] min-w-[180px] rounded-[3px] bg-black px-4 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={handleReport}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Patient</th>
              <th className="border border-black px-1.5 py-1 font-normal">Referral Doctor</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Sub Total</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Discount Amt.</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Tax Amt</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Amount</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Paid</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Pay Method</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center" colSpan={15}>
                  Loading radiology bill records...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td className="border border-black px-1.5 py-1">{row.sl}</td>
                    <td className="border border-black px-1.5 py-1">{row.billNo}</td>
                    <td className="border border-black px-1.5 py-1">{row.date}</td>
                    <td className="border border-black px-1.5 py-1">{row.patient}</td>
                    <td className="border border-black px-1.5 py-1">{row.referralDoctor}</td>
                    <td className="border border-black px-1.5 py-1">{row.createdBy}</td>
                    <td className="border border-black px-1.5 py-1">{row.updatedBy}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.subTotal)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.discountAmt)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.taxAmt)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.paid)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.due)}</td>
                    <td className="border border-black px-1.5 py-1">{row.payMethod}</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <IconButton color="text-[#ff6a00]" onClick={() => toggleExpandedRow(row.id)} title="View details">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#1d62d1]" onClick={() => printBill(row)} title="Print bill">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1h8v3H4zm8 9v4H4v-4zm1-5H3a2 2 0 0 0-2 2v3h3V8h8v2h3V7a2 2 0 0 0-2-2" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#138a1b]" onClick={() => printResultReport(row)} title="Print result report">
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
                    </td>
                  </tr>
                  {recordType === "With Detail" || expandedRows.some((item) => String(item) === String(row.id)) ? (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-3" colSpan={15}>
                        <div className="grid gap-1 text-[12px] text-[#33444c]">
                          <div>
                            <strong>Test:</strong> {row.raw.test?.code || ""} - {row.raw.test?.name || ""}
                          </div>
                          <div>
                            <strong>Status:</strong> {row.raw.status || ""}
                          </div>
                          <div>
                            <strong>Notes:</strong> {row.raw.notes || "N/A"}
                          </div>
                          <div>
                            <strong>Result Notes:</strong> {row.raw.result_notes || "N/A"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center" colSpan={15}>
                  No radiology bill records found.
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1.5 py-1 text-right" colSpan={7}>
                Grand Total
              </td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.subTotal)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.discountAmt)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.taxAmt)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.amount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paid)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.due)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-3 text-[12px] text-[#63727b]">
        <button
          className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2 disabled:opacity-50"
          disabled={!metaInfo.hasPrev}
          onClick={async () => {
            const nextPage = Math.max(page - 1, 1);
            setPage(nextPage);
            await loadOrders(nextPage);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="grid h-7 min-w-7 place-items-center rounded-full bg-[#1f73de] px-2 text-white" type="button">
          {metaInfo.page}
        </button>
        <button
          className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2 disabled:opacity-50"
          disabled={!metaInfo.hasNext}
          onClick={async () => {
            const nextPage = page + 1;
            setPage(nextPage);
            await loadOrders(nextPage);
          }}
          type="button"
        >
          ›
        </button>
        <button className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2" onClick={printPage} type="button">
          Print
        </button>
      </div>
    </section>
  );
}
