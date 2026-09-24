import { useState, useEffect, Fragment } from "react";
import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const FILTER_TYPES = ["All", "By Patient", "By Doctor", "By Date", "By Search"];

function SelectField({ label, onChange, options, value, widthClass = "w-[192px]" }) {
  return (
    <label className={`relative block h-[40px] ${widthClass} bg-[#f3f3f3]`}>
      {label ? <span className="absolute left-3 top-[4px] text-[9px] text-[#1a73e8]">{label}</span> : null}
      <select
        className="h-full w-full appearance-none border-0 border-b-2 border-[#1a73e8] bg-transparent px-2 pb-[3px] pt-[16px] text-[12px] text-[#1f2c33] outline-none"
        onChange={onChange}
        value={value}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="relative block h-[40px] w-[194px]">
      <span className="absolute left-3 top-[4px] text-[9px] text-[#6b7780]">{label}</span>
      <input
        className="h-full w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 pb-[4px] pt-[15px] text-[12px] text-[#1f2c33] outline-none"
        type="date"
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function ActionIcon({ children, onClick, title, tone = "" }) {
  return (
    <button
      className={`grid h-6 w-6 place-items-center rounded hover:bg-gray-200 cursor-pointer transition-colors ${tone}`}
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

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function RadiologyBillRecordReportPage() {
  const [filterType, setFilterType] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    apiRequest("/patients?limit=100")
      .then((res) => setPatients(res?.data?.items ?? res?.data ?? []))
      .catch(() => {});
    apiRequest("/doctors?limit=100")
      .then((res) => setDoctors(res?.data?.items ?? res?.data ?? []))
      .catch(() => {});
  }, []);

  const fetchOrders = async (page = 1, overrides = {}) => {
    const ft = overrides.filterType ?? filterType;
    const fd = overrides.fromDate ?? fromDate;
    const td = overrides.toDate ?? toDate;
    const sr = overrides.search ?? search;
    const pid = overrides.selectedPatientId ?? selectedPatientId;
    const did = overrides.selectedDoctorId ?? selectedDoctorId;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (fd) params.set("from", fd);
      if (td) params.set("to", td);
      if (ft === "By Patient" && pid) params.set("patient_id", pid);
      if (ft === "By Doctor" && did) params.set("doctor_id", did);
      if (ft === "By Search" && sr.trim()) params.set("search", sr.trim());

      const res = await apiRequest(`/radiology/orders?${params.toString()}`);
      const items = res?.data?.items ?? res?.data ?? [];
      const paginationMeta = res?.data?.meta?.pagination ?? res?.meta?.pagination ?? { page: 1, total_pages: 1, total: 0 };
      setOrders(Array.isArray(items) ? items : []);
      setPagination(paginationMeta);
      setCurrentPage(page);
      setHasLoaded(true);
    } catch (err) {
      setError(err.message || "Failed to load radiology orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReport = () => fetchOrders(1);

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    fetchOrders(page);
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const printBill = async (order) => {
    const totalFee = Number(order.total_fee || order.total || order.price || 0);
    const paid = Number(order.paid_amount || 0);
    const due = totalFee - paid;
    const patientName = order.patient?.full_name || order.patient ? `${order.patient.patient_code || ''} - ${order.patient.full_name || ''}` : "-";
    const doctorName = order.doctor?.user?.full_name || order.doctor?.doctor_code || "N/A";
    const billNo = order.order_code || `RAD-${order.id}`;

    await printHtml(
      `
      <!-- Patient Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill No :</strong> ${billNo}</div>
          <div><strong>Date :</strong> ${fmtDate(order.ordered_at || order.createdAt)}</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Patient :</strong> ${patientName}</div>
          <div><strong>Ref. Doctor :</strong> ${doctorName}</div>
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
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">1</td>
            <td style="padding: 7px 10px;">${order.test?.code || ""} - ${order.test?.name || "Radiology Test"}</td>
            <td style="padding: 7px 10px; text-align: right;">${fmt(totalFee)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td colspan="2" style="padding: 8px 10px;">Total</td>
            <td style="padding: 8px 10px; text-align: right;">${fmt(totalFee)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 10px; color: #388e3c;">Paid</td>
            <td style="padding: 6px 10px; text-align: right; color: #388e3c;">${fmt(paid)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 10px; color: #d32f2f; font-weight: bold;">Due</td>
            <td style="padding: 6px 10px; text-align: right; color: #d32f2f; font-weight: bold;">${fmt(due)}</td>
          </tr>
        </tfoot>
      </table>
      `,
      "RADIOLOGY BILL INVOICE"
    );
  };

  const printResultReport = async (order) => {
    try {
      const response = await apiRequest(`/radiology/orders/${order.id}/report`);
      const report = response.data || {};
      const billNo = order.order_code || `RAD-${order.id}`;
      const patientName = order.patient?.full_name || "-";
      const doctorName = order.doctor?.user?.full_name || "N/A";

      await printHtml(
        `
        <!-- Patient Info Box -->
        <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Bill No :</strong> ${billNo}</div>
            <div><strong>Date :</strong> ${fmtDate(order.ordered_at)}</div>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
            <div><strong>Patient :</strong> ${patientName}</div>
            <div><strong>Ref. Doctor :</strong> ${doctorName}</div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div><strong>Test :</strong> ${report.test?.name || order.test?.name || "—"}</div>
            <div><strong>Result Date :</strong> ${fmtDate(report.result?.result_at || order.result_at)}</div>
          </div>
        </div>

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
              <td style="padding: 7px 10px;">${report.result?.status || order.status || "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 7px 10px; font-weight: bold;">Findings / Notes</td>
              <td style="padding: 7px 10px;">${report.result?.result_notes || order.result_notes || "N/A"}</td>
            </tr>
          </tbody>
        </table>
        `,
        "RADIOLOGY RESULT REPORT"
      );
    } catch (err) {
      showError("Print Failed", err.message || "Failed to load radiology report");
    }
  };

  const handleDelete = async (order) => {
    const billNo = order.order_code || `RAD-${order.id}`;
    const confirmed = await confirmDelete("Delete Radiology Bill?", `Are you sure you want to delete Bill No "${billNo}"?`);
    if (!confirmed) return;

    setError(null);
    try {
      await apiRequest(`/radiology/orders/${order.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Bill "${billNo}" has been deleted.`);
      await fetchOrders(currentPage);
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete radiology bill");
    }
  };

  const patientOptions = [
    { value: "", label: "Select Patient" },
    ...patients.map((p) => ({ value: String(p.id), label: p.full_name ?? p.name ?? String(p.id) })),
  ];

  const doctorOptions = [
    { value: "", label: "Select Doctor" },
    ...doctors.map((d) => ({
      value: String(d.id),
      label: d.user?.full_name ?? d.full_name ?? String(d.id),
    })),
  ];

  const grandTotal = orders.reduce((a, o) => a + Number(o.total_fee || o.total || o.price || 0), 0);
  const grandPaid = orders.reduce((a, o) => a + Number(o.paid_amount || 0), 0);
  const grandDue = grandTotal - grandPaid;

  const pageNumbers = [];
  for (let i = 1; i <= pagination.total_pages; i++) pageNumbers.push(i);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[14px] font-medium text-[#1f2c33]">RADIOLOGY BILL RECORD</div>

        <div className="flex flex-wrap items-end gap-4 max-md:gap-3">
          <SelectField
            label="Filter Type"
            onChange={(e) => {
              setFilterType(e.target.value);
              setSelectedPatientId("");
              setSelectedDoctorId("");
              setSearch("");
            }}
            options={FILTER_TYPES}
            value={filterType}
          />

          {filterType === "By Patient" && (
            <SelectField
              label="Patient"
              onChange={(e) => setSelectedPatientId(e.target.value)}
              options={patientOptions}
              value={selectedPatientId}
              widthClass="w-[220px]"
            />
          )}

          {filterType === "By Doctor" && (
            <SelectField
              label="Doctor"
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              options={doctorOptions}
              value={selectedDoctorId}
              widthClass="w-[220px]"
            />
          )}

          {filterType === "By Search" && (
            <input
              className="h-[40px] w-[192px] border-b-2 border-[#1a73e8] bg-[#f3f3f3] px-3 text-[12px] text-[#1f2c33] outline-none placeholder:text-[#596778]"
              placeholder="SEARCH"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          <DateField label="From Date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <DateField label="To Date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          <button
            className="h-[28px] min-w-[192px] rounded-[2px] bg-black px-4 text-[10px] font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={handleReport}
            disabled={loading}
          >
            {loading ? "LOADING..." : "REPORT"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 font-normal">SL</th>
              <th className="border border-black px-1 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1 py-1 font-normal">Patient</th>
              <th className="border border-black px-1 py-1 font-normal">Doctor</th>
              <th className="border border-black px-1 py-1 font-normal">Date</th>
              <th className="border border-black px-1 py-1 font-normal">Status</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Amount</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Paid</th>
              <th className="border border-black px-1 py-1 font-normal text-right">Due</th>
              <th className="border border-black px-1 py-1 font-normal text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#596778]" colSpan="10">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && hasLoaded && orders.length === 0 && (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#596778]" colSpan="10">
                  No records found.
                </td>
              </tr>
            )}
            {!loading &&
              orders.map((order, idx) => {
                const totalFee = Number(order.total_fee || order.total || order.price || 0);
                const paid = Number(order.paid_amount || 0);
                const due = totalFee - paid;
                const sl = (currentPage - 1) * 10 + idx + 1;
                const isExpanded = expandedRows.some((item) => String(item) === String(order.id));

                return (
                  <Fragment key={order.id}>
                    <tr>
                      <td className="border border-black px-1 py-0.5">{sl}</td>
                      <td className="border border-black px-1 py-0.5">{order.order_code ?? `RAD-${order.id}`}</td>
                      <td className="border border-black px-1 py-0.5">{order.patient?.full_name ?? "-"}</td>
                      <td className="border border-black px-1 py-0.5">{order.doctor?.user?.full_name ?? "N/A"}</td>
                      <td className="border border-black px-1 py-0.5">{fmtDate(order.ordered_at ?? order.created_at)}</td>
                      <td className="border border-black px-1 py-0.5">{order.status ?? "-"}</td>
                      <td className="border border-black px-1 py-0.5 text-right">{fmt(totalFee)}</td>
                      <td className="border border-black px-1 py-0.5 text-right">{fmt(paid)}</td>
                      <td className="border border-black px-1 py-0.5 text-right">{fmt(due)}</td>
                      <td className="border border-black px-1 py-0.5">
                        <div className="flex items-center justify-center gap-2">
                          <ActionIcon onClick={() => toggleExpandedRow(order.id)} title="View details" tone="text-[#ff6a00]">
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                            </svg>
                          </ActionIcon>
                          <ActionIcon onClick={() => printBill(order)} title="Print bill" tone="text-[#1d62d1]">
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M4 1h8v3H4zm8 9v4H4v-4zm1-5H3a2 2 0 0 0-2 2v3h3V8h8v2h3V7a2 2 0 0 0-2-2" />
                            </svg>
                          </ActionIcon>
                          <ActionIcon onClick={() => printResultReport(order)} title="Print result report" tone="text-[#138a1b]">
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 16 16">
                              <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                            </svg>
                          </ActionIcon>
                          <ActionIcon onClick={() => handleDelete(order)} title="Delete bill" tone="text-[#f57c00]">
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 16 16">
                              <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                            </svg>
                          </ActionIcon>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td className="border border-black bg-[#fafcfd] px-3 py-3" colSpan="10">
                          <div className="grid gap-1 text-[12px] text-[#33444c]">
                            <div>
                              <strong>Test:</strong> {order.test?.code || ""} - {order.test?.name || "Unnamed Test"}
                            </div>
                            <div>
                              <strong>Status:</strong> {order.status || "-"}
                            </div>
                            <div>
                              <strong>Notes:</strong> {order.notes || "N/A"}
                            </div>
                            <div>
                              <strong>Result Notes:</strong> {order.result_notes || "N/A"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

            {/* Grand Total row */}
            {hasLoaded && (
              <tr>
                <td className="border border-black px-1 py-0.5 text-right font-semibold" colSpan="6">
                  Grand Total
                </td>
                <td className="border border-black px-1 py-0.5 text-right font-semibold">{fmt(grandTotal)}</td>
                <td className="border border-black px-1 py-0.5 text-right font-semibold">{fmt(grandPaid)}</td>
                <td className="border border-black px-1 py-0.5 text-right font-semibold">{fmt(grandDue)}</td>
                <td className="border border-black px-1 py-0.5">&nbsp;</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasLoaded && pagination.total_pages > 0 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-[12px] text-[#63727b]">
          <button
            className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f3f8] px-3 py-2 disabled:opacity-40"
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ‹
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`grid h-7 w-7 place-items-center rounded-full ${
                n === currentPage ? "bg-[#1f73de] text-white" : "hover:bg-[#f3f6f8]"
              }`}
              type="button"
              onClick={() => handlePageChange(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2 disabled:opacity-40"
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.total_pages}
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
