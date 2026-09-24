import { useEffect, useMemo, useState, Fragment } from "react";
import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";

const salesFilters = ["All", "By Medicine", "By Patient", "By Doctor", "By Search"];
const purchaseFilters = ["All", "By Medicine", "By Supplier", "By Search"];

const salesReturnFilters = ["All", "By Medicine", "By Patient", "By Doctor", "By Search"];

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const dateObj = typeof dateStr === "string" && dateStr.length === 10 ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = dateObj.toLocaleString("en-GB", { month: "short" });
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${day} ${month} ${year}`;
}

function formatDateInput(dateStr) {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" && dateStr.length === 10 ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPaymentMethods(paymentDetails) {
  if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) return "";
  return paymentDetails
    .map((p) => p.account_name)
    .filter(Boolean)
    .join(", ");
}

function DateField({ label, onChange, value }) {
  return (
    <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-white">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{label}</legend>
      <input
        className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </fieldset>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{label}</legend>
      <select
        className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 9px center",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

function SearchField({ onChange = () => {}, value = "" }) {
  return (
    <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Search</legend>
      <input
        autoFocus
        className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Here"
        type="text"
        value={value}
      />
    </fieldset>
  );
}

function buildPatientLabel(patient) {
  if (!patient) return "N/A";
  return [patient.patient_code, patient.full_name].filter(Boolean).join(" - ") || patient.full_name || "N/A";
}

function buildDoctorLabel(doctor) {
  if (!doctor) return "N/A";
  return doctor.user?.full_name || doctor.full_name || doctor.doctor_code || "N/A";
}

function extractDoctorFromSale(sale) {
  if (sale.doctor) {
    const docLabel = buildDoctorLabel(sale.doctor);
    if (docLabel !== "N/A") return docLabel;
  }
  const prescriptionDoctor = buildDoctorLabel(sale.prescription?.doctor);
  if (prescriptionDoctor !== "N/A") return prescriptionDoctor;
  const note = String(sale.notes || "");
  const match = note.match(/Doctor:\s*([^|]+)/i);
  return match?.[1]?.trim() || "N/A";
}

function printCurrentPage() {
  if (typeof window !== "undefined") window.print();
}

function ModalShell({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="max-h-[90vh] w-full max-w-[920px] overflow-auto rounded-[8px] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-[#e6edf0] px-5 py-4">
          <h2 className="text-[16px] font-semibold text-[#1f2c33]">{title}</h2>
          <button className="text-[22px] leading-none text-[#6c7a84]" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalField({ children, label }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[#5d6b74]">{label}</span>
      {children}
    </label>
  );
}

export function PharmacySalesRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [expandedRows, setExpandedRows] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorSearch, setSelectedDoctorSearch] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadFilters() {
      setLoadingFilters(true);
      try {
        const [patientsResponse, doctorsResponse, medicinesResponse] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/doctors?limit=100"),
          apiRequest("/pharmacy/medicines?limit=100"),
        ]);
        if (ignore) return;
        setPatients(patientsResponse.data || []);
        setDoctors(doctorsResponse.data || []);
        setMedicines(medicinesResponse.data || []);
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load sales report filters.");
      } finally {
        if (!ignore) setLoadingFilters(false);
      }
    }

    loadFilters();
    return () => {
      ignore = true;
    };
  }, []);

  async function fetchData(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (filterType === "By Patient" && selectedPatientId) params.set("patient_id", selectedPatientId);
      if (filterType === "By Medicine" && selectedMedicineId) params.set("medicine_id", selectedMedicineId);
      if (filterType === "By Doctor" && selectedDoctorSearch) params.set("search", selectedDoctorSearch);
      if (filterType === "By Search" && searchText.trim()) params.set("search", searchText.trim());
      const result = await apiRequest(`/pharmacy/sales?${params}`);
      setRows(result.data ?? []);
      const pagination = result.meta?.pagination;
      setPage(pagination?.page ?? 1);
      setTotalPages(pagination?.total_pages ?? 0);
    } catch (err) {
      setError(err.message || "Failed to load sales records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const printSalesInvoice = async (row) => {
    const itemRows = (row.items || [])
      .map(
        (item, index) =>
          `<tr><td>${index + 1}</td><td>${item.medicine?.code || ""} - ${item.medicine?.name || "Medicine"}</td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${formatMoney(
            item.unit_price
          )}</td><td style="text-align:right">${formatMoney(item.subtotal)}</td></tr>`
      )
      .join("");

    await printHtml(
      `
      <!-- Patient Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill No :</strong> ${row.sale_code}</div>
          <div><strong>Date :</strong> ${formatDate(row.sold_at)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Patient :</strong> ${buildPatientLabel(row.patient)}</div>
          <div><strong>Ref. Doctor :</strong> ${extractDoctorFromSale(row) || "—"}</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Payment Method :</strong> ${row.payment_method || "N/A"}</div>
          <div><strong>Sold By :</strong> ${row.cashier?.full_name || "N/A"}</div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">SL</th>
            <th style="padding: 8px 10px; text-align: left;">Medicine</th>
            <th style="padding: 8px 10px; text-align: right;">Qty</th>
            <th style="padding: 8px 10px; text-align: right;">Unit Price</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top: 1px solid #ddd;">
            <td colspan="4" style="padding: 7px 10px; text-align: right;">Subtotal</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 7px 10px; text-align: right; color: #388e3c;">Discount</td>
            <td style="padding: 7px 10px; text-align: right; color: #388e3c;">- ${formatMoney(row.discount)}</td>
          </tr>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td colspan="4" style="padding: 8px 10px; text-align: right;">Total</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(row.total)}</td>
          </tr>
        </tfoot>
      </table>
      `,
      "PHARMACY SALES INVOICE"
    );
  };

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const soldDate = formatDateInput(row.sold_at);
      if (fromDate && soldDate < fromDate) return false;
      if (toDate && soldDate > toDate) return false;

      if (filterType === "By Patient" && selectedPatientId) {
        if (String(row.patient_id) !== String(selectedPatientId)) return false;
      }

      if (filterType === "By Medicine" && selectedMedicineId) {
        const hasMedicine = Array.isArray(row.items) && row.items.some((item) => String(item.medicine_id) === String(selectedMedicineId));
        if (!hasMedicine) return false;
      }

      if (filterType === "By Doctor" && selectedDoctorSearch) {
        const doctorName = extractDoctorFromSale(row).toLowerCase();
        if (!doctorName.includes(selectedDoctorSearch.toLowerCase())) return false;
      }

      if (filterType === "By Search" && searchText.trim()) {
        const queryStr = searchText.trim().toLowerCase();
        const patientLabel = buildPatientLabel(row.patient).toLowerCase();
        const cashierLabel = (row.cashier?.full_name || "").toLowerCase();
        const doctorLabel = extractDoctorFromSale(row).toLowerCase();
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        const matches = [row.sale_code?.toLowerCase(), patientLabel, cashierLabel, doctorLabel, itemsLabel].some(
          (str) => str && str.includes(queryStr)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, selectedPatientId, selectedMedicineId, selectedDoctorSearch, searchText]);

  const totals = useMemo(
    () => ({
      subTotal: filteredRows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0),
      discountAmount: filteredRows.reduce((sum, row) => sum + Number(row.discount || 0), 0),
      taxAmount: 0,
      totalAmount: filteredRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
      paidAmount: filteredRows.reduce((sum, row) => sum + Number(row.total || 0), 0),
      dueAmount: 0,
    }),
    [filteredRows],
  );

  const patientOptions = useMemo(
    () => ["Select Patient", ...patients.map((patient) => buildPatientLabel(patient))],
    [patients],
  );
  const patientValue = useMemo(() => {
    const selectedPatient = patients.find((patient) => String(patient.id) === String(selectedPatientId));
    return selectedPatient ? buildPatientLabel(selectedPatient) : "Select Patient";
  }, [patients, selectedPatientId]);

  const doctorOptions = useMemo(
    () => ["Select Doctor", ...doctors.map((doctor) => buildDoctorLabel(doctor))],
    [doctors],
  );
  const doctorValue = selectedDoctorSearch || "Select Doctor";

  const medicineOptions = useMemo(
    () => ["Select Medicine", ...medicines.map((medicine) => `${medicine.code} - ${medicine.name}`)],
    [medicines],
  );
  const medicineValue = useMemo(() => {
    const selectedMedicine = medicines.find((medicine) => String(medicine.id) === String(selectedMedicineId));
    return selectedMedicine ? `${selectedMedicine.code} - ${selectedMedicine.name}` : "Select Medicine";
  }, [medicines, selectedMedicineId]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">PHARMACY SALES RECORD</h1>

        <div className="grid grid-cols-[180px_190px_190px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={(value) => {
              setFilterType(value);
              setSearchText("");
              setSelectedPatientId("");
              setSelectedDoctorSearch("");
              setSelectedMedicineId("");
            }}
            options={salesFilters}
            value={filterType}
          />
          {filterType === "By Medicine" ? (
            <SelectField
              label="Search Medicine"
              onChange={(value) => {
                const selectedMedicine = medicines.find((medicine) => `${medicine.code} - ${medicine.name}` === value);
                setSelectedMedicineId(selectedMedicine ? String(selectedMedicine.id) : "");
              }}
              options={medicineOptions}
              value={medicineValue}
            />
          ) : null}
          {filterType === "By Patient" ? (
            <SelectField
              label="Select Patient"
              onChange={(value) => {
                const selectedPatient = patients.find((patient) => buildPatientLabel(patient) === value);
                setSelectedPatientId(selectedPatient ? String(selectedPatient.id) : "");
              }}
              options={patientOptions}
              value={patientValue}
            />
          ) : null}
          {filterType === "By Doctor" ? (
            <SelectField
              label="Select Doctor"
              onChange={(value) => {
                setSelectedDoctorSearch(value === "Select Doctor" ? "" : value);
              }}
              options={doctorOptions}
              value={doctorValue}
            />
          ) : null}
          {filterType === "By Search" ? <SearchField onChange={setSearchText} value={searchText} /> : null}
          <SelectField
            label="Record Type"
            onChange={(value) => setRecordType(value)}
            options={["Without Detail", "With Detail"]}
            value={recordType}
          />
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              disabled={loading || loadingFilters}
              onClick={() => fetchData(1)}
              type="button"
            >
              {loading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}

      <div className="mt-1 rounded-[2px] border border-[#d9e1e5] bg-white px-3 py-2 shadow-[0_3px_8px_rgba(22,36,45,0.05)]">
        <button
          aria-label="Print sales record"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-[#2e2e2e]"
          onClick={printCurrentPage}
          type="button"
        >
          <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
            <path
              d="M4 2.5h8v3H4zM4 10.5h8V14H4zM2 6.5h12a1 1 0 0 1 1 1v3h-2v-2H3v2H1v-3a1 1 0 0 1 1-1zm3 5h6v1H5z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Patient</th>
              <th className="border border-black px-1.5 py-1 font-normal">Referral Doctor</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Sub Total</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Discount Amt.</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Tax Amt</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Amount</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Pay Method</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={15}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={15}>
                  No records found.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row, idx) => {
              const isExpanded = recordType === "With Detail" || expandedRows.some((id) => String(id) === String(row.id));
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-[#f8fbfc]">
                    <td className="border border-black px-1.5 py-1">{(page - 1) * limit + idx + 1}</td>
                    <td className="border border-black px-1.5 py-1">{row.sale_code}</td>
                    <td className="border border-black px-1.5 py-1">{formatDate(row.sold_at)}</td>
                    <td className="border border-black px-1.5 py-1">{buildPatientLabel(row.patient)}</td>
                    <td className="border border-black px-1.5 py-1">{extractDoctorFromSale(row)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.subtotal)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.discount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(0)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.total)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.total)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(0)}</td>
                    <td className="border border-black px-1.5 py-1">{row.payment_method || "N/A"}</td>
                    <td className="border border-black px-1.5 py-1">{row.cashier?.full_name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1">N/A</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Toggle detail ${row.sale_code}`}
                          className="text-[#ff6a00] hover:opacity-80"
                          onClick={() => toggleExpandedRow(row.id)}
                          title="View items detail"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" fill="currentColor" />
                          </svg>
                        </button>
                        <button
                          aria-label={`Print bill ${row.sale_code}`}
                          className="text-[#1976d2] hover:opacity-80"
                          onClick={() => printSalesInvoice(row)}
                          title="Print sales invoice"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path
                              d="M4 1h5l3 3v11H4zM9 1v3h3M6 7h4M6 9h4M6 11h4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.4"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-2" colSpan={15}>
                        <div className="space-y-1">
                          <div className="font-medium text-[#3a4951]">Sold Medicine Items:</div>
                          {Array.isArray(row.items) && row.items.length > 0 ? (
                            <div className="grid gap-1">
                              {row.items.map((item, index) => (
                                <div className="flex items-center justify-between text-[12px] text-[#4d5a61]" key={item.id || index}>
                                  <span>
                                    {index + 1}. {item.medicine?.code || ""} - {item.medicine?.name || "Medicine"} (Qty: {item.quantity})
                                  </span>
                                  <span>
                                    Unit Price: {formatMoney(item.unit_price)} | Total: {formatMoney(item.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[12px] text-[#6b7c85] italic py-1">
                              Invoice: {row.sale_code} | Date: {formatDate(row.sold_at)} | Amount: {formatMoney(row.total)} | Cashier: {row.cashier?.full_name || "Admin"} (No item breakdown registered)
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right">Grand Total</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.subTotal)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.discountAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.taxAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.totalAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paidAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.dueAmount)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#75828d]">
        <button
          className="flex h-8 min-w-[56px] items-center justify-between rounded-[4px] border border-[#c7d0d5] bg-white px-3 text-[#3f4d57]"
          type="button"
        >
          <span>{limit}</span>
          <span className="text-[10px]">▼</span>
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page <= 1 || loading}
          onClick={() => fetchData(page - 1)}
          type="button"
        >
          ‹
        </button>
        <button
          className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#1976d2] px-2 text-white"
          type="button"
        >
          {page}
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page >= totalPages || loading}
          onClick={() => fetchData(page + 1)}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}

export function PharmacyPurchaseRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [expandedRows, setExpandedRows] = useState([]);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editForm, setEditForm] = useState({ supplier_id: "", purchased_at: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ account_name: "", amount: "", paid_at: "" });

  const showSearchInput = filterType !== "All";

  useEffect(() => {
    let ignore = false;

    async function loadMeta() {
      try {
        const [suppliersResponse, accountsResponse] = await Promise.all([
          apiRequest("/pharmacy/suppliers?limit=100"),
          apiRequest("/billing/accounts?limit=100"),
        ]);
        if (ignore) return;
        setSuppliers(suppliersResponse.data || []);
        setAccounts((accountsResponse.data || []).map((account) => ({ value: account.name, label: account.name })));
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load purchase actions.");
      }
    }

    loadMeta();
    return () => {
      ignore = true;
    };
  }, []);

  async function fetchData(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (showSearchInput && query.trim()) params.set("search", query.trim());
      const result = await apiRequest(`/pharmacy/purchases?${params}`);
      setRows(result.data ?? []);
      const pagination = result.meta?.pagination;
      setPage(pagination?.page ?? 1);
      setTotalPages(pagination?.total_pages ?? 0);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  async function loadPurchaseDetails(purchaseId) {
    const result = await apiRequest(`/pharmacy/purchases/${purchaseId}`);
    return result.data;
  }

  async function openViewModal(purchaseId) {
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      const purchase = await loadPurchaseDetails(purchaseId);
      setSelectedPurchase(purchase);
      setIsViewOpen(true);
    } catch (err) {
      setError(err.message || "Failed to load purchase invoice.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function openEditModal(purchaseId) {
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      const purchase = await loadPurchaseDetails(purchaseId);
      setSelectedPurchase(purchase);
      setEditForm({
        supplier_id: purchase.supplier_id ? String(purchase.supplier_id) : "",
        purchased_at: formatDateInput(purchase.purchased_at),
        notes: purchase.notes || "",
      });
      setIsEditOpen(true);
    } catch (err) {
      setError(err.message || "Failed to load purchase for editing.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function openPaymentModal(purchaseId) {
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      const purchase = await loadPurchaseDetails(purchaseId);
      setSelectedPurchase(purchase);
      setPaymentForm({
        account_name: accounts[0]?.value || "",
        amount: formatMoney(purchase.due_amount || 0).replace(/,/g, ""),
        paid_at: formatDateInput(new Date()),
      });
      setIsPaymentOpen(true);
    } catch (err) {
      setError(err.message || "Failed to load purchase payment form.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedPurchase) return;
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      await apiRequest(`/pharmacy/purchases/${selectedPurchase.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          supplier_id: editForm.supplier_id ? Number(editForm.supplier_id) : undefined,
          purchased_at: editForm.purchased_at || undefined,
          notes: editForm.notes,
        }),
      });
      setIsEditOpen(false);
      setSuccessMessage(`Purchase ${selectedPurchase.purchase_code} updated successfully.`);
      await fetchData(page);
    } catch (err) {
      setError(err.message || "Failed to update purchase.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleCollectPayment() {
    if (!selectedPurchase) return;
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      await apiRequest(`/pharmacy/purchases/${selectedPurchase.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          account_name: paymentForm.account_name,
          amount: Number(paymentForm.amount || 0),
          paid_at: paymentForm.paid_at || null,
        }),
      });
      setIsPaymentOpen(false);
      setSuccessMessage(`Payment collected for ${selectedPurchase.purchase_code}.`);
      await fetchData(page);
    } catch (err) {
      setError(err.message || "Failed to collect purchase payment.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDeletePurchase(purchase) {
    const code = purchase.purchase_code || `Purchase #${purchase.id}`;
    const confirmed = await confirmDelete("Delete Purchase?", `Are you sure you want to delete purchase "${code}"?`);
    if (!confirmed) return;
    setError(null);
    setSuccessMessage("");
    setIsActionLoading(true);
    try {
      await apiRequest(`/pharmacy/purchases/${purchase.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Purchase "${code}" has been deleted.`);
      await fetchData(page);
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete purchase.");
    } finally {
      setIsActionLoading(false);
    }
  }

  const printPurchaseInvoice = async (row) => {
    await printHtml(
      `
      <!-- Supplier Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Purchase Code :</strong> ${row.purchase_code}</div>
          <div><strong>Date :</strong> ${formatDate(row.purchased_at)}</div>
        </div>
        <div><strong>Supplier :</strong> ${row.supplier?.name || "N/A"}</div>
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
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td style="padding: 8px 10px;">Total Amount</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(row.total_amount)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #388e3c;">Paid Amount</td>
            <td style="padding: 6px 10px; text-align: right; color: #388e3c;">${formatMoney(row.paid_amount)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #d32f2f; font-weight: bold;">Due Amount</td>
            <td style="padding: 6px 10px; text-align: right; color: #d32f2f; font-weight: bold;">${formatMoney(row.due_amount)}</td>
          </tr>
        </tbody>
      </table>
      `,
      "PHARMACY PURCHASE RECORD"
    );
  };

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const purchasedDate = formatDateInput(row.purchased_at);
      if (fromDate && purchasedDate < fromDate) return false;
      if (toDate && purchasedDate > toDate) return false;

      if (!normalizedQuery) return true;

      const supplierName = (row.supplier?.name || "").toLowerCase();
      const purchaseCode = (row.purchase_code || "").toLowerCase();

      if (filterType === "By Supplier") {
        return supplierName.includes(normalizedQuery);
      }

      if (filterType === "By Medicine") {
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        return itemsLabel.includes(normalizedQuery);
      }

      if (filterType === "By Search") {
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        return [purchaseCode, supplierName, itemsLabel, row.notes].some((str) => str && String(str).toLowerCase().includes(normalizedQuery));
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, query]);

  const totals = useMemo(
    () => ({
      subTotal: filteredRows.reduce((s, r) => s + Number(r.subtotal || 0), 0),
      discountAmount: filteredRows.reduce((s, r) => s + Number(r.discount_amount || 0), 0),
      taxAmount: filteredRows.reduce((s, r) => s + Number(r.tax_amount || 0), 0),
      totalAmount: filteredRows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      paidAmount: filteredRows.reduce((s, r) => s + Number(r.paid_amount || 0), 0),
      dueAmount: filteredRows.reduce((s, r) => s + Number(r.due_amount || 0), 0),
    }),
    [filteredRows],
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">PHARMACY PURCHASE RECORD</h1>

        <div className="grid grid-cols-[180px_190px_190px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={(v) => {
              setFilterType(v);
              setQuery("");
            }}
            options={purchaseFilters}
            value={filterType}
          />
          {showSearchInput ? (
            <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-white">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{filterType.replace("By ", "")}</legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${filterType.replace("By ", "").toLowerCase()}`}
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <SelectField
            label="Record Type"
            onChange={(v) => setRecordType(v)}
            options={["Without Detail", "With Detail"]}
            value={recordType}
          />
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => fetchData(1)}
              type="button"
            >
              REPORT
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-4 py-3 text-[13px] text-[#1d7a46]">{successMessage}</div>
      ) : null}

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Supplier</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Sub Total</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Discount Amt.</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Tax Amt</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Amount</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Pay Method</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={14}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={14}>
                  No records found.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row, idx) => {
              const isExpanded = recordType === "With Detail" || expandedRows.some((id) => String(id) === String(row.id));
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-[#f8fbfc]">
                    <td className="border border-black px-1.5 py-1">{(page - 1) * limit + idx + 1}</td>
                    <td className="border border-black px-1.5 py-1">{row.purchase_code}</td>
                    <td className="border border-black px-1.5 py-1">{formatDate(row.purchased_at)}</td>
                    <td className="border border-black px-1.5 py-1">{row.supplier?.name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.subtotal)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.discount_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.tax_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.total_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.paid_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.due_amount)}</td>
                    <td className="border border-black px-1.5 py-1">{formatPaymentMethods(row.payment_details)}</td>
                    <td className="border border-black px-1.5 py-1">{row.purchaser?.full_name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1">N/A</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Toggle detail ${row.purchase_code}`}
                          className="text-[#ff6a00] hover:opacity-80"
                          onClick={() => toggleExpandedRow(row.id)}
                          title="View items detail"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" fill="currentColor" />
                          </svg>
                        </button>
                        <button
                          aria-label={`Collect payment for ${row.purchase_code}`}
                          className="text-[#2e7d32] disabled:opacity-50"
                          disabled={isActionLoading}
                          onClick={() => openPaymentModal(row.id)}
                          title="Collect Payment"
                          type="button"
                        >
                          ৳
                        </button>
                        <button
                          aria-label={`Edit purchase ${row.purchase_code}`}
                          className="text-[#ef6c00] disabled:opacity-50"
                          disabled={isActionLoading}
                          onClick={() => openEditModal(row.id)}
                          title="Edit purchase"
                          type="button"
                        >
                          ✎
                        </button>
                        <button
                          aria-label={`Print purchase ${row.purchase_code}`}
                          className="text-[#1976d2] disabled:opacity-50"
                          disabled={isActionLoading}
                          onClick={() => printPurchaseInvoice(row)}
                          title="Print purchase invoice"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path
                              d="M4 1h5l3 3v11H4zM9 1v3h3M6 7h4M6 9h4M6 11h4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.4"
                            />
                          </svg>
                        </button>
                        <button
                          aria-label={`Delete purchase ${row.purchase_code}`}
                          className="text-[#d32f2f] disabled:opacity-50"
                          disabled={isActionLoading}
                          onClick={() => handleDeletePurchase(row)}
                          title="Delete purchase"
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-2" colSpan={14}>
                        <div className="space-y-1">
                          <div className="font-medium text-[#3a4951]">Purchased Medicine Items:</div>
                          {Array.isArray(row.items) && row.items.length > 0 ? (
                            <div className="grid gap-1">
                              {row.items.map((item, index) => (
                                <div className="flex items-center justify-between text-[12px] text-[#4d5a61]" key={item.id || index}>
                                  <span>
                                    {index + 1}. {item.medicine?.code || ""} - {item.medicine?.name || "Medicine"} (Qty: {item.quantity})
                                  </span>
                                  <span>
                                    Unit Price: {formatMoney(item.purchase_price)} | Total: {formatMoney(item.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[12px] text-[#6b7c85] italic py-1">
                              Bill: {row.purchase_code} | Date: {formatDate(row.purchased_at)} | Supplier: {row.supplier?.name || "N/A"} | Amount: {formatMoney(row.total_amount)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right font-semibold">Page Total</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.subTotal)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.discountAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.taxAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.totalAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.paidAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.dueAmount)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#75828d]">
        <button
          className="flex h-8 min-w-[56px] items-center justify-between rounded-[4px] border border-[#c7d0d5] bg-white px-3 text-[#3f4d57]"
          type="button"
        >
          <span>{limit}</span>
          <span className="text-[10px]">▼</span>
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => fetchData(page - 1)}
          type="button"
        >
          ‹
        </button>
        <button className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#1976d2] px-2 text-white" type="button">
          {page}
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => fetchData(page + 1)}
          type="button"
        >
          ›
        </button>
      </div>

      {isViewOpen && selectedPurchase ? (
        <ModalShell onClose={() => setIsViewOpen(false)} title={`Purchase Invoice - ${selectedPurchase.purchase_code}`}>
          <div className="grid grid-cols-2 gap-4 text-[13px] text-[#334048] max-md:grid-cols-1">
            <div>
              <div><span className="font-semibold">Supplier:</span> {selectedPurchase.supplier?.name || "N/A"}</div>
              <div className="mt-1"><span className="font-semibold">Date:</span> {formatDate(selectedPurchase.purchased_at)}</div>
              <div className="mt-1"><span className="font-semibold">Created By:</span> {selectedPurchase.purchaser?.full_name || "N/A"}</div>
            </div>
            <div>
              <div><span className="font-semibold">Sub Total:</span> {formatMoney(selectedPurchase.subtotal)}</div>
              <div className="mt-1"><span className="font-semibold">Paid:</span> {formatMoney(selectedPurchase.paid_amount)}</div>
              <div className="mt-1"><span className="font-semibold">Due:</span> {formatMoney(selectedPurchase.due_amount)}</div>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
              <thead>
                <tr className="bg-[#edf5f8]">
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Medicine</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Qty</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Purchase</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Sale</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Batch</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Expiry</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Tax</th>
                  <th className="border border-[#d6e2e7] px-2 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPurchase.items || []).map((item, idx) => {
                  const q = Number(item.quantity || 0);
                  const p = Number(item.purchase_price ?? item.unit_price ?? 0);
                  const tax = Number(item.tax_amount ?? ((q * p * Number(item.tax_rate || 0)) / 100));
                  const lineTot = Number(item.total_price ?? item.total ?? (q * p + tax));
                  return (
                    <tr key={item.id || idx}>
                      <td className="border border-[#d6e2e7] px-2 py-2">{item.medicine?.name || item.medicine_name || "N/A"}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{q}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{formatMoney(p)}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{formatMoney(item.sale_price)}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{item.batch_no || "-"}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{formatDate(item.expiry_date)}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{formatMoney(tax)}</td>
                      <td className="border border-[#d6e2e7] px-2 py-2">{formatMoney(lineTot)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ModalShell>
      ) : null}

      {isEditOpen && selectedPurchase ? (
        <ModalShell onClose={() => setIsEditOpen(false)} title={`Edit Purchase - ${selectedPurchase.purchase_code}`}>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <ModalField label="Supplier">
              <select
                className="h-[38px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setEditForm((current) => ({ ...current, supplier_id: event.target.value }))}
                value={editForm.supplier_id}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Purchase Date">
              <input
                className="h-[38px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setEditForm((current) => ({ ...current, purchased_at: event.target.value }))}
                type="date"
                value={editForm.purchased_at}
              />
            </ModalField>
            <div className="col-span-2 max-md:col-span-1">
              <ModalField label="Notes">
                <textarea
                  className="min-h-[90px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 py-2 text-[13px] text-[#25333b] outline-none"
                  onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  value={editForm.notes}
                />
              </ModalField>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button className="rounded-[4px] border border-[#d9e1e5] px-4 py-2 text-[12px]" onClick={() => setIsEditOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="rounded-[4px] bg-[#2376da] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
              disabled={isActionLoading}
              onClick={handleSaveEdit}
              type="button"
            >
              {isActionLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {isPaymentOpen && selectedPurchase ? (
        <ModalShell onClose={() => setIsPaymentOpen(false)} title={`Collect Payment - ${selectedPurchase.purchase_code}`}>
          <div className="mb-4 rounded-[6px] bg-[#f7fbfd] px-4 py-3 text-[13px] text-[#334048]">
            Due Amount: <span className="font-semibold">{formatMoney(selectedPurchase.due_amount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <ModalField label="Account">
              <select
                className="h-[38px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setPaymentForm((current) => ({ ...current, account_name: event.target.value }))}
                value={paymentForm.account_name}
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.label}
                  </option>
                ))}
              </select>
            </ModalField>
            <ModalField label="Amount">
              <input
                className="h-[38px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                type="number"
                value={paymentForm.amount}
              />
            </ModalField>
            <ModalField label="Paid At">
              <input
                className="h-[38px] w-full rounded-[6px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#25333b] outline-none"
                onChange={(event) => setPaymentForm((current) => ({ ...current, paid_at: event.target.value }))}
                type="date"
                value={paymentForm.paid_at}
              />
            </ModalField>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button className="rounded-[4px] border border-[#d9e1e5] px-4 py-2 text-[12px]" onClick={() => setIsPaymentOpen(false)} type="button">
              Cancel
            </button>
            <button
              className="rounded-[4px] bg-[#2e7d32] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
              disabled={isActionLoading}
              onClick={handleCollectPayment}
              type="button"
            >
              {isActionLoading ? "Saving..." : "Add Payment"}
            </button>
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}

export function PharmacySalesReturnRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [expandedRows, setExpandedRows] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadFilters() {
      setLoadingFilters(true);
      try {
        const [patientsResponse, doctorsResponse, medicinesResponse] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/doctors?limit=100"),
          apiRequest("/pharmacy/medicines?limit=100"),
        ]);
        if (ignore) return;
        setPatients(patientsResponse.data || []);
        setDoctors(doctorsResponse.data || []);
        setMedicines(medicinesResponse.data || []);
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load sales return report filters.");
      } finally {
        if (!ignore) setLoadingFilters(false);
      }
    }

    loadFilters();
    return () => {
      ignore = true;
    };
  }, []);

  async function fetchData(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (filterType === "By Patient" && selectedPatientId) params.set("patient_id", selectedPatientId);
      if (filterType === "By Doctor" && selectedDoctorId) params.set("doctor_id", selectedDoctorId);
      if (filterType === "By Medicine" && selectedMedicineId) params.set("medicine_id", selectedMedicineId);
      if (filterType === "By Search" && searchText.trim()) params.set("search", searchText.trim());
      const result = await apiRequest(`/pharmacy/sales-returns?${params}`);
      setRows(result.data ?? []);
      const pagination = result.meta?.pagination;
      setPage(pagination?.page ?? 1);
      setTotalPages(pagination?.total_pages ?? 0);
    } catch (err) {
      setError(err.message || "Failed to load sales return records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const printSalesReturnInvoice = async (row) => {
    const itemRows = (row.items || [])
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">${index + 1}</td>
            <td style="padding: 7px 10px;">${item.medicine?.code || ""} - ${item.medicine?.name || "Medicine"}</td>
            <td style="padding: 7px 10px; text-align:right;">${item.quantity}</td>
            <td style="padding: 7px 10px; text-align:right;">${formatMoney(item.return_price)}</td>
            <td style="padding: 7px 10px; text-align:right;">${formatMoney(item.total_price)}</td>
          </tr>`
      )
      .join("");

    await printHtml(
      `
      <!-- Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Return Code :</strong> ${row.return_code}</div>
          <div><strong>Date :</strong> ${formatDate(row.returned_at)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Patient :</strong> ${buildPatientLabel(row.patient)}</div>
          <div><strong>Ref. Doctor :</strong> ${extractDoctorFromSale(row) || "—"}</div>
        </div>
        <div><strong>Created By :</strong> ${row.returner?.full_name || "N/A"}</div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">SL</th>
            <th style="padding: 8px 10px; text-align: left;">Medicine</th>
            <th style="padding: 8px 10px; text-align: right;">Qty</th>
            <th style="padding: 8px 10px; text-align: right;">Return Price</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top: 1px solid #ddd;">
            <td colspan="4" style="padding: 7px 10px; text-align: right;">Subtotal</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 7px 10px; text-align: right; color: #388e3c;">Discount</td>
            <td style="padding: 7px 10px; text-align: right; color: #388e3c;">- ${formatMoney(row.discount_amount)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 7px 10px; text-align: right;">Tax</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.tax_amount)}</td>
          </tr>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td colspan="4" style="padding: 8px 10px; text-align: right;">Total Amount</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(row.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
      `,
      "PHARMACY SALES RETURN INVOICE"
    );
  };

  const handleDeleteSalesReturn = async (row) => {
    const code = row.return_code || `Return #${row.id}`;
    const confirmed = await confirmDelete("Delete Sales Return?", `Are you sure you want to delete return "${code}"?`);
    if (!confirmed) return;
    try {
      await apiRequest(`/pharmacy/sales-returns/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Sales return "${code}" has been deleted.`);
      await fetchData(page);
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete sales return.");
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const returnedDate = formatDateInput(row.returned_at);
      if (fromDate && returnedDate < fromDate) return false;
      if (toDate && returnedDate > toDate) return false;

      if (filterType === "By Patient" && selectedPatientId) {
        if (String(row.patient_id || row.patient?.id) !== String(selectedPatientId)) return false;
      }

      if (filterType === "By Doctor" && selectedDoctorId) {
        if (String(row.doctor_id || row.doctor?.id) !== String(selectedDoctorId)) return false;
      }

      if (filterType === "By Medicine" && selectedMedicineId) {
        const hasMedicine = Array.isArray(row.items) && row.items.some((item) => String(item.medicine_id) === String(selectedMedicineId));
        if (!hasMedicine) return false;
      }

      if (filterType === "By Search" && searchText.trim()) {
        const queryStr = searchText.trim().toLowerCase();
        const patientLabel = buildPatientLabel(row.patient).toLowerCase();
        const doctorLabel = extractDoctorFromSale(row).toLowerCase();
        const returnerLabel = (row.returner?.full_name || "").toLowerCase();
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        const matches = [row.return_code?.toLowerCase(), patientLabel, doctorLabel, returnerLabel, itemsLabel].some(
          (str) => str && str.includes(queryStr)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, selectedPatientId, selectedDoctorId, selectedMedicineId, searchText]);

  const totals = useMemo(
    () => ({
      subTotal: filteredRows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0),
      discountAmount: filteredRows.reduce((sum, row) => sum + Number(row.discount_amount || 0), 0),
      taxAmount: filteredRows.reduce((sum, row) => sum + Number(row.tax_amount || 0), 0),
      totalAmount: filteredRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      paidAmount: filteredRows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0),
      dueAmount: filteredRows.reduce((sum, row) => sum + Number(row.due_amount || 0), 0),
    }),
    [filteredRows],
  );

  const patientOptions = useMemo(
    () => ["Select Patient", ...patients.map((patient) => buildPatientLabel(patient))],
    [patients],
  );
  const patientValue = useMemo(() => {
    const selectedPatient = patients.find((patient) => String(patient.id) === String(selectedPatientId));
    return selectedPatient ? buildPatientLabel(selectedPatient) : "Select Patient";
  }, [patients, selectedPatientId]);

  const doctorOptions = useMemo(
    () => ["Select Doctor", ...doctors.map((doctor) => buildDoctorLabel(doctor))],
    [doctors],
  );
  const doctorValue = useMemo(() => {
    const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(selectedDoctorId));
    return selectedDoctor ? buildDoctorLabel(selectedDoctor) : "Select Doctor";
  }, [doctors, selectedDoctorId]);

  const medicineOptions = useMemo(
    () => ["Select Medicine", ...medicines.map((medicine) => `${medicine.code} - ${medicine.name}`)],
    [medicines],
  );
  const medicineValue = useMemo(() => {
    const selectedMedicine = medicines.find((medicine) => String(medicine.id) === String(selectedMedicineId));
    return selectedMedicine ? `${selectedMedicine.code} - ${selectedMedicine.name}` : "Select Medicine";
  }, [medicines, selectedMedicineId]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">PHARMACY SALES RETURN RECORD</h1>

        <div className="grid grid-cols-[180px_190px_190px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={(value) => {
              setFilterType(value);
              setSearchText("");
              setSelectedPatientId("");
              setSelectedDoctorId("");
              setSelectedMedicineId("");
            }}
            options={salesReturnFilters}
            value={filterType}
          />
          {filterType === "By Medicine" ? (
            <SelectField
              label="Search Medicine"
              onChange={(value) => {
                const selectedMedicine = medicines.find((medicine) => `${medicine.code} - ${medicine.name}` === value);
                setSelectedMedicineId(selectedMedicine ? String(selectedMedicine.id) : "");
              }}
              options={medicineOptions}
              value={medicineValue}
            />
          ) : null}
          {filterType === "By Patient" ? (
            <SelectField
              label="Select Patient"
              onChange={(value) => {
                const selectedPatient = patients.find((patient) => buildPatientLabel(patient) === value);
                setSelectedPatientId(selectedPatient ? String(selectedPatient.id) : "");
              }}
              options={patientOptions}
              value={patientValue}
            />
          ) : null}
          {filterType === "By Doctor" ? (
            <SelectField
              label="Select Doctor"
              onChange={(value) => {
                const selectedDoctor = doctors.find((doctor) => buildDoctorLabel(doctor) === value);
                setSelectedDoctorId(selectedDoctor ? String(selectedDoctor.id) : "");
              }}
              options={doctorOptions}
              value={doctorValue}
            />
          ) : null}
          {filterType === "By Search" ? <SearchField onChange={setSearchText} value={searchText} /> : null}
          <SelectField
            label="Record Type"
            onChange={(value) => setRecordType(value)}
            options={["Without Detail", "With Detail"]}
            value={recordType}
          />
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              disabled={loading || loadingFilters}
              onClick={() => fetchData(1)}
              type="button"
            >
              {loading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Patient</th>
              <th className="border border-black px-1.5 py-1 font-normal">Referral Doctor</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Sub Total</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Discount Amt.</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Tax Amt</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Amount</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Pay Method</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={15}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={15}>
                  No records found.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row, idx) => {
              const isExpanded = recordType === "With Detail" || expandedRows.some((id) => String(id) === String(row.id));
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-[#f8fbfc]">
                    <td className="border border-black px-1.5 py-1">{(page - 1) * limit + idx + 1}</td>
                    <td className="border border-black px-1.5 py-1">{row.return_code}</td>
                    <td className="border border-black px-1.5 py-1">{formatDate(row.returned_at)}</td>
                    <td className="border border-black px-1.5 py-1">{buildPatientLabel(row.patient)}</td>
                    <td className="border border-black px-1.5 py-1">{extractDoctorFromSale(row)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.subtotal)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.discount_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.tax_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.total_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.paid_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.due_amount)}</td>
                    <td className="border border-black px-1.5 py-1">{formatPaymentMethods(row.payment_details)}</td>
                    <td className="border border-black px-1.5 py-1">{row.returner?.full_name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1">N/A</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Toggle detail ${row.return_code}`}
                          className="text-[#ff6a00] hover:opacity-80"
                          onClick={() => toggleExpandedRow(row.id)}
                          title="View items detail"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" fill="currentColor" />
                          </svg>
                        </button>
                        <button
                          aria-label={`View return ${row.return_code}`}
                          className="text-[#1976d2] hover:opacity-80"
                          onClick={() => printSalesReturnInvoice(row)}
                          title="Print sales return invoice"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path
                              d="M4 1h5l3 3v11H4zM9 1v3h3M6 7h4M6 9h4M6 11h4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.4"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-2" colSpan={15}>
                        <div className="space-y-1">
                          <div className="font-medium text-[#3a4951]">Returned Medicine Items:</div>
                          {Array.isArray(row.items) && row.items.length > 0 ? (
                            <div className="grid gap-1">
                              {row.items.map((item, index) => (
                                <div className="flex items-center justify-between text-[12px] text-[#4d5a61]" key={item.id || index}>
                                  <span>
                                    {index + 1}. {item.medicine?.code || ""} - {item.medicine?.name || "Medicine"} (Qty: {item.quantity})
                                  </span>
                                  <span>
                                    Return Price: {formatMoney(item.return_price)} | Total: {formatMoney(item.total_price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[12px] text-[#6b7c85] italic py-1">
                              Return Bill: {row.return_code} | Date: {formatDate(row.returned_at)} | Subtotal: {formatMoney(row.subtotal)} | Total Amount: {formatMoney(row.total_amount)} | Created By: {row.returner?.full_name || "Admin"}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right">Grand Total</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.subTotal)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.discountAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.taxAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.totalAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paidAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.dueAmount)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#75828d]">
        <button
          className="flex h-8 min-w-[56px] items-center justify-between rounded-[4px] border border-[#c7d0d5] bg-white px-3 text-[#3f4d57]"
          type="button"
        >
          <span>{limit}</span>
          <span className="text-[10px]">▼</span>
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page <= 1 || loading}
          onClick={() => fetchData(page - 1)}
          type="button"
        >
          ‹
        </button>
        <button className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#1976d2] px-2 text-white" type="button">
          {page}
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page >= totalPages || loading}
          onClick={() => fetchData(page + 1)}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}

export function PharmacyPurchaseReturnRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [recordType, setRecordType] = useState("Without Detail");
  const [expandedRows, setExpandedRows] = useState([]);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const showSearchInput = filterType !== "All";

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) =>
      current.some((item) => String(item) === String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    );
  };

  const printPurchaseReturnInvoice = async (row) => {
    const itemRows = (row.items || [])
      .map(
        (item, index) =>
          `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">${index + 1}</td>
            <td style="padding: 7px 10px;">${item.medicine?.code || ""} - ${item.medicine?.name || "Medicine"}</td>
            <td style="padding: 7px 10px; text-align:right;">${item.quantity}</td>
            <td style="padding: 7px 10px; text-align:right;">${formatMoney(item.return_price)}</td>
            <td style="padding: 7px 10px; text-align:right;">${formatMoney(item.total_price)}</td>
          </tr>`
      )
      .join("");

    await printHtml(
      `
      <!-- Info Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Return Code :</strong> ${row.return_code}</div>
          <div><strong>Date :</strong> ${formatDate(row.returned_at)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Supplier :</strong> ${row.supplier?.name || "N/A"}</div>
          <div><strong>Created By :</strong> ${row.returner?.full_name || "N/A"}</div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">SL</th>
            <th style="padding: 8px 10px; text-align: left;">Medicine</th>
            <th style="padding: 8px 10px; text-align: right;">Qty</th>
            <th style="padding: 8px 10px; text-align: right;">Return Price</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr style="border-top: 1px solid #ddd;">
            <td colspan="4" style="padding: 7px 10px; text-align: right;">Subtotal</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 7px 10px; text-align: right; color: #388e3c;">Discount</td>
            <td style="padding: 7px 10px; text-align: right; color: #388e3c;">- ${formatMoney(row.discount_amount)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 7px 10px; text-align: right;">Tax</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(row.tax_amount)}</td>
          </tr>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td colspan="4" style="padding: 8px 10px; text-align: right;">Total Amount</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(row.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
      `,
      "PHARMACY PURCHASE RETURN INVOICE"
    );
  };

  async function fetchData(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(limit) });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (showSearchInput && query.trim()) params.set("search", query.trim());
      const result = await apiRequest(`/pharmacy/purchase-returns?${params}`);
      setRows(result.data ?? []);
      const pagination = result.meta?.pagination;
      setPage(pagination?.page ?? 1);
      setTotalPages(pagination?.total_pages ?? 0);
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const returnedDate = formatDateInput(row.returned_at);
      if (fromDate && returnedDate < fromDate) return false;
      if (toDate && returnedDate > toDate) return false;

      if (!normalizedQuery) return true;

      const supplierName = (row.supplier?.name || "").toLowerCase();
      const returnCode = (row.return_code || "").toLowerCase();

      if (filterType === "By Supplier") {
        return supplierName.includes(normalizedQuery);
      }

      if (filterType === "By Medicine") {
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        return itemsLabel.includes(normalizedQuery);
      }

      if (filterType === "By Search") {
        const itemsLabel = Array.isArray(row.items) ? row.items.map((i) => `${i.medicine?.code} ${i.medicine?.name}`).join(" ").toLowerCase() : "";
        return [returnCode, supplierName, itemsLabel, row.notes].some((str) => str && String(str).toLowerCase().includes(normalizedQuery));
      }

      return true;
    });
  }, [rows, fromDate, toDate, filterType, query]);

  const totals = useMemo(
    () => ({
      subTotal: filteredRows.reduce((s, r) => s + Number(r.subtotal || 0), 0),
      discountAmount: filteredRows.reduce((s, r) => s + Number(r.discount_amount || 0), 0),
      taxAmount: filteredRows.reduce((s, r) => s + Number(r.tax_amount || 0), 0),
      totalAmount: filteredRows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
      paidAmount: filteredRows.reduce((s, r) => s + Number(r.paid_amount || 0), 0),
      dueAmount: filteredRows.reduce((s, r) => s + Number(r.due_amount || 0), 0),
    }),
    [filteredRows],
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">PHARMACY PURCHASE RETURN RECORD</h1>

        <div className="grid grid-cols-[180px_190px_190px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={(v) => {
              setFilterType(v);
              setQuery("");
            }}
            options={purchaseFilters}
            value={filterType}
          />
          {showSearchInput ? (
            <fieldset className="min-w-[190px] rounded-[3px] border border-[#c7d0d5] bg-white">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{filterType.replace("By ", "")}</legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${filterType.replace("By ", "").toLowerCase()}`}
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <SelectField
            label="Record Type"
            onChange={(val) => setRecordType(val)}
            options={["Without Detail", "With Detail"]}
            value={recordType}
          />
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => fetchData(1)}
              type="button"
            >
              REPORT
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}

      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bill No</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Supplier</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Sub Total</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Discount Amt.</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Tax Amt</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Amount</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Pay Method</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={14}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td className="border border-black px-1.5 py-4 text-center text-[#66737b]" colSpan={14}>
                  No records found.
                </td>
              </tr>
            ) : null}
            {filteredRows.map((row, idx) => {
              const isExpanded = recordType === "With Detail" || expandedRows.some((id) => String(id) === String(row.id));
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-[#f8fbfc]">
                    <td className="border border-black px-1.5 py-1">{(page - 1) * limit + idx + 1}</td>
                    <td className="border border-black px-1.5 py-1">{row.return_code}</td>
                    <td className="border border-black px-1.5 py-1">{formatDate(row.returned_at)}</td>
                    <td className="border border-black px-1.5 py-1">{row.supplier?.name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.subtotal)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.discount_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.tax_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.total_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.paid_amount)}</td>
                    <td className="border border-black px-1.5 py-1 text-right">{formatMoney(row.due_amount)}</td>
                    <td className="border border-black px-1.5 py-1">{formatPaymentMethods(row.payment_details)}</td>
                    <td className="border border-black px-1.5 py-1">{row.returner?.full_name ?? "N/A"}</td>
                    <td className="border border-black px-1.5 py-1">N/A</td>
                    <td className="border border-black px-1.5 py-1">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Toggle detail ${row.return_code}`}
                          className="text-[#ff6a00] hover:opacity-80"
                          onClick={() => toggleExpandedRow(row.id)}
                          title="View items detail"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" fill="currentColor" />
                          </svg>
                        </button>
                        <button
                          aria-label={`View return ${row.return_code}`}
                          className="text-[#1976d2] hover:opacity-80"
                          onClick={() => printPurchaseReturnInvoice(row)}
                          title="Print purchase return invoice"
                          type="button"
                        >
                          <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
                            <path
                              d="M4 1h5l3 3v11H4zM9 1v3h3M6 7h4M6 9h4M6 11h4"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.4"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td className="border border-black bg-[#fafcfd] px-3 py-2" colSpan={14}>
                        <div className="space-y-1">
                          <div className="font-medium text-[#3a4951]">Returned Purchase Items:</div>
                          {Array.isArray(row.items) && row.items.length > 0 ? (
                            <div className="grid gap-1">
                              {row.items.map((item, index) => (
                                <div className="flex items-center justify-between text-[12px] text-[#4d5a61]" key={item.id || index}>
                                  <span>
                                    {index + 1}. {item.medicine?.code || ""} - {item.medicine?.name || "Medicine"} (Qty: {item.quantity})
                                  </span>
                                  <span>
                                    Return Price: {formatMoney(item.return_price)} | Total: {formatMoney(item.total_price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[12px] text-[#6b7c85] italic py-1">
                              Return Bill: {row.return_code} | Date: {formatDate(row.returned_at)} | Supplier: {row.supplier?.name || "N/A"} | Subtotal: {formatMoney(row.subtotal)} | Total Amount: {formatMoney(row.total_amount)} | Created By: {row.returner?.full_name || "Admin"}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right font-semibold">Page Total</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.subTotal)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.discountAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.taxAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.totalAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.paidAmount)}</td>
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{formatMoney(totals.dueAmount)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5 text-[12px] text-[#75828d]">
        <button
          className="flex h-8 min-w-[56px] items-center justify-between rounded-[4px] border border-[#c7d0d5] bg-white px-3 text-[#3f4d57]"
          type="button"
        >
          <span>{limit}</span>
          <span className="text-[10px]">▼</span>
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => fetchData(page - 1)}
          type="button"
        >
          ‹
        </button>
        <button className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-[#1976d2] px-2 text-white" type="button">
          {page}
        </button>
        <button
          className="text-[18px] leading-none disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => fetchData(page + 1)}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
