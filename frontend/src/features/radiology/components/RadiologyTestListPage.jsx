import { Fragment, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const filterTypes = ["All", "By Date", "By Search"];
const recordTypes = ["With Detail", "Without Detail"];

const emptyMeta = {
  next_test_code: "",
  categories: [],
  parameters: [],
  tax_rates: [],
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
    <button className={`grid h-5 w-5 place-items-center ${color}`} onClick={onClick} title={title} type="button">
      {children}
    </button>
  );
}

export function RadiologyTestListPage() {
  const [meta, setMeta] = useState(emptyMeta);
  const [tests, setTests] = useState([]);
  const [metaInfo, setMetaInfo] = useState({ page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [fromDate, setFromDate] = useState(formatDateInput());
  const [toDate, setToDate] = useState(formatDateInput());
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    try {
      const response = await apiRequest("/radiology/test-entry/meta");
      setMeta(response.data || emptyMeta);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology test metadata");
    } finally {
      setIsLoadingMeta(false);
    }
  };

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

  const loadTests = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/radiology/tests?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      const pagination = response.meta?.pagination || {};
      setTests(items);
      setMetaInfo({
        page: pagination.page || nextPage,
        limit: pagination.limit || 10,
        total: pagination.total || items.length,
        totalPages: pagination.total_pages || 0,
        hasNext: Boolean(pagination.has_next),
        hasPrev: Boolean(pagination.has_prev),
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load radiology tests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
    loadTests(1);
  }, []);

  const rows = useMemo(
    () =>
      tests.map((test, index) => ({
        id: test.id,
        sl: (metaInfo.page - 1) * metaInfo.limit + index + 1,
        testName: test.name || "",
        shortName: test.short_name || test.code || "-",
        category: test.category || "-",
        testType: test.test_type || (test.category ? String(test.category).toUpperCase() : "Standard"),
        method: test.method || test.description || "Standard",
        baseCharge: Number(test.base_charge ?? test.price ?? 0),
        finalCharge: Number(test.final_charge ?? test.price ?? 0),
        createdBy: formatDateLabel(test.createdAt || test.created_at) || "N/A",
        updatedBy: formatDateLabel(test.updatedAt || test.updated_at) || "N/A",
        reportDeliveryDay: test.report_delivery_day || "1 Day",
        taxRate: test.tax_rate ?? "0",
        parameters: Array.isArray(test.parameter_option_ids)
          ? test.parameter_option_ids
              .map((id) => (meta.parameters || []).find((parameter) => Number(parameter.id) === Number(id))?.name)
              .filter(Boolean)
          : [],
      })),
    [meta.parameters, metaInfo.limit, metaInfo.page, tests]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          baseCharge: sum.baseCharge + row.baseCharge,
          finalCharge: sum.finalCharge + row.finalCharge,
        }),
        { baseCharge: 0, finalCharge: 0 }
      ),
    [rows]
  );

  const handleFilterTypeChange = (value) => {
    setFilterType(value);
    setSearchText("");
  };

  const handleReport = async () => {
    setPage(1);
    await loadTests(1);
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const printPage = () => {
    window.print();
  };

  const printSingleTest = (row) => {
    printHtml(
      `
      <!-- Test Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Test Name :</strong> ${row.testName}</div>
          <div><strong>Short Name :</strong> ${row.shortName || "—"}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Category :</strong> ${row.category || "—"}</div>
          <div><strong>Test Type :</strong> ${row.testType || "N/A"}</div>
        </div>
        <div><strong>Method :</strong> ${row.method || "N/A"}</div>
      </div>

      <!-- Charge Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">Charge Type</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">Base Charge</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.baseCharge)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px; font-weight: bold;">Final Charge</td>
            <td style="padding: 7px 10px; text-align: right; font-weight: bold;">${formatMoney(row.finalCharge)}</td>
          </tr>
        </tbody>
      </table>
      `,
      "RADIOLOGY TEST DETAILS"
    );
  };

  const handleDelete = async (row) => {
    const confirmed = window.confirm(`Delete radiology test "${row.testName}"?`);
    if (!confirmed) return;
    setErrorMessage("");
    try {
      await apiRequest(`/radiology/tests/${row.id}`, { method: "DELETE" });
      await loadTests(page);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete radiology test");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">Radiology Test</div>

        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">Filter Type</span>
            <select
              className="h-[40px] w-[180px] rounded-[3px] border border-x-0 border-t-0 border-b-[#1a73e8] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
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

          {filterType === "By Date" ? (
            <>
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
            </>
          ) : null}

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

      <div className="mt-2 rounded-[2px] border border-[#d7dfe4] bg-white px-4 py-2 shadow-[0_1px_3px_rgba(22,36,45,0.06)]">
        <button className="text-[#333]" onClick={printPage} title="Print current report" type="button">
          <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 1h8v3H4zm8 9v4H4v-4zm1-5H3a2 2 0 0 0-2 2v3h3V8h8v2h3V7a2 2 0 0 0-2-2" />
          </svg>
        </button>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Test Name</th>
              <th className="border border-black px-1.5 py-1 font-normal">Short Name</th>
              <th className="border border-black px-1.5 py-1 font-normal">Category</th>
              <th className="border border-black px-1.5 py-1 font-normal">Test Type</th>
              <th className="border border-black px-1.5 py-1 font-normal">Method</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Base Charge</th>
              <th className="border border-black px-1.5 py-1 font-normal text-right">Final Charge</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center" colSpan={11}>
                  Loading radiology tests...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td className="border border-black px-1.5 py-1">{row.sl}</td>
                    <td className="border border-black px-1.5 py-1">{row.testName}</td>
                    <td className="border border-black px-1.5 py-1">{row.shortName}</td>
                    <td className="border border-black px-1.5 py-1">{row.category}</td>
                    <td className="border border-black px-1.5 py-1">{row.testType}</td>
                    <td className="border border-black px-1.5 py-1">{row.method}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.baseCharge)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.finalCharge)}</td>
                    <td className="border border-black px-1.5 py-1">{row.createdBy}</td>
                    <td className="border border-black px-1.5 py-1">{row.updatedBy}</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <IconButton color="text-[#1d62d1]" onClick={() => printSingleTest(row)} title="Print">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1h6l3 3v11H4zm5 1.5V5h2.5zM6 8h5v1H6zm0 2h5v1H6zm0 2h5v1H6z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#138a1b]" onClick={() => toggleExpandedRow(row.id)} title="View details">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#f57c00]" onClick={() => handleDelete(row)} title="Delete">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                  {recordType === "With Detail" || expandedRows.includes(row.id) ? (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-3" colSpan={11}>
                        <div className="grid gap-1 text-[12px] text-[#33444c]">
                          <div>
                            <strong>Report Delivery Day:</strong> {row.reportDeliveryDay || "N/A"}
                          </div>
                          <div>
                            <strong>Tax Rate:</strong> {row.taxRate || "N/A"}
                          </div>
                          <div>
                            <strong>Parameters:</strong> {row.parameters.length ? row.parameters.join(", ") : "N/A"}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center" colSpan={11}>
                  No radiology tests found.
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1.5 py-1 text-right" colSpan={6}>
                Grand Total
              </td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.baseCharge)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.finalCharge)}</td>
              <td className="border border-black px-1.5 py-1" />
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
            await loadTests(nextPage);
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
            await loadTests(nextPage);
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
