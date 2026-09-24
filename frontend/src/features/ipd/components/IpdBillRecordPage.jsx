import { Fragment, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printHtml } from "../../../lib/print";
import { printIpdReceipt } from "../lib/ipdReceipt";

const filterTypes = ["All", "By Patient", "By Doctor", "By All Doctor", "By User", "By All User", "By Search"];
const editableAdmissionStatuses = [
  { value: "admitted", label: "admitted" },
  { value: "release", label: "release" },
];

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

const numberToWords = (value) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const toWordsBelowThousand = (num) => {
    if (num < 20) return ones[num];
    if (num < 100) return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${toWordsBelowThousand(num % 100)}` : ""}`.trim();
  };

  const integer = Math.floor(Number(value || 0));
  if (!integer) return "Zero";

  const parts = [];
  const millions = Math.floor(integer / 1000000);
  const thousands = Math.floor((integer % 1000000) / 1000);
  const remainder = integer % 1000;

  if (millions) parts.push(`${toWordsBelowThousand(millions)} Million`);
  if (thousands) parts.push(`${toWordsBelowThousand(thousands)} Thousand`);
  if (remainder) parts.push(toWordsBelowThousand(remainder));

  return parts.join(" ").trim();
};

function TableHeaderCell({ children, className = "" }) {
  return <th className={`border border-black px-1.5 py-[3px] font-normal whitespace-nowrap ${className}`}>{children}</th>;
}

function TableCell({ children, className = "", colSpan }) {
  return (
    <td className={`border border-black px-1.5 py-[3px] align-top ${className}`} colSpan={colSpan}>
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

function PaymentCollectionModal({
  accounts,
  errorMessage,
  isSaving,
  onAdd,
  onAmountChange,
  onClose,
  onRemove,
  onSave,
  onSelectedAccountChange,
  payments,
  selectedAccount,
  total,
  value,
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.35)] px-4">
      <div className="w-full max-w-[470px] rounded-[4px] bg-white shadow-[0_18px_48px_rgba(20,30,40,0.35)]">
        <div className="px-6 pb-4 pt-4">
          <div className="mb-4 text-[14px] font-medium text-[#222f36]">Payment Collection</div>
          {errorMessage ? (
            <div className="mb-3 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[12px] text-[#b94a48]">
              {errorMessage}
            </div>
          ) : null}
          <div className="grid grid-cols-[1.2fr_0.75fr_0.4fr] gap-4 max-sm:grid-cols-1">
            <select
              className="h-[40px] rounded-[4px] border border-[#d4dce1] bg-white px-3 text-[14px] text-[#27343b] outline-none"
              onChange={(event) => onSelectedAccountChange(event.target.value)}
              value={selectedAccount}
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
            <input
              className="h-[40px] rounded-[4px] border border-[#d4dce1] px-3 text-[14px] text-[#27343b] outline-none"
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="Amount"
              type="number"
              value={value}
            />
            <button
              className="h-[40px] rounded-[4px] bg-[#b8c3b6] px-3 text-[13px] font-semibold text-[#19232a]"
              onClick={onAdd}
              type="button"
            >
              ADD
            </button>
          </div>

          {payments.length ? (
            <div className="mt-4 space-y-2">
              {payments.map((payment, index) => (
                <div className="flex items-center justify-between rounded-[4px] border border-[#e0e8ec] bg-[#f8fbfc] px-3 py-2 text-[13px] text-[#32434b]" key={`${payment.account_name}-${index}`}>
                  <span>
                    {payment.account_name}: {formatMoney(payment.amount)}
                  </span>
                  <button className="text-[12px] font-medium text-[#d64545]" onClick={() => onRemove(index)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4 text-[15px] text-[#1d2b31]">
            Total: <span className="font-semibold">{formatMoney(total)}</span>
          </div>

          <button
            className="mt-6 rounded-[4px] bg-[#2c86df] px-6 py-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || total <= 0}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "SAVE"}
          </button>
        </div>

        <div className="flex justify-end px-6 pb-4">
          <button className="text-[13px] font-medium text-[#2c7fe0]" onClick={onClose} type="button">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function EditAdmissionModal({
  admitStatus,
  doctorId,
  doctors,
  errorMessage,
  isSaving,
  notes,
  onClose,
  onDiagnosisChange,
  onDoctorChange,
  onNotesChange,
  onReasonChange,
  onStatusChange,
  onSave,
  patientLabel,
  reason,
  row,
  diagnosis,
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.35)] px-4">
      <div className="w-full max-w-[980px] rounded-[8px] border border-[#d3dde0] bg-white p-3 shadow-[0_18px_48px_rgba(20,30,40,0.35)]">
        <div className="mb-5 flex items-center justify-between rounded-[4px] bg-[#148889] px-4 py-3">
          <div className="text-[16px] font-semibold text-white">Edit IPD Bill</div>
          <div className="rounded-[4px] bg-white px-3 py-2 text-[12px] font-semibold text-[#138591]">{row.billNo}</div>
        </div>

        <div className="px-1 pb-1">
          <div className="mb-4 rounded-[4px] bg-[#eef8f8] px-3 py-2 text-[13px] text-[#24434a]">
            Selected: {patientLabel}
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid grid-cols-[2fr_1fr] gap-3 max-lg:grid-cols-1">
            <div>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#8b959b]">Doctor</span>
                  <select
                    className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27343d] outline-none"
                    onChange={(event) => onDoctorChange(event.target.value)}
                    value={doctorId}
                  >
                    <option value="">Search Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.user?.full_name || doctor.doctor_code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#8b959b]">Bill No</span>
                  <input
                    className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                    readOnly
                    type="text"
                    value={row.billNo}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 max-md:grid-cols-1">
                <input
                  className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                  onChange={(event) => onReasonChange(event.target.value)}
                  placeholder="Case"
                  type="text"
                  value={reason}
                />
                <input
                  className="h-[38px] rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={row.date}
                />
              </div>

              <div className="mt-3">
                <textarea
                  className="block h-[80px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                  onChange={(event) => onDiagnosisChange(event.target.value)}
                  placeholder="Previous Medical Issue"
                  value={diagnosis}
                />
              </div>

              <div className="mt-3">
                <textarea
                  className="block min-h-[160px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 py-3 text-[15px] text-[#5d6a72] outline-none placeholder:text-[#5d6a72]"
                  onChange={(event) => onNotesChange(event.target.value)}
                  placeholder="Note"
                  value={notes}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-[#8b959b]">Patient</span>
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={patientLabel}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-[#8b959b]">Admit Status</span>
                <select
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] capitalize text-[#27353d] outline-none"
                  onChange={(event) => onStatusChange(event.target.value)}
                  value={admitStatus}
                >
                  {editableAdmissionStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-[#8b959b]">Amount</span>
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(row.amount)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-[#8b959b]">Paid</span>
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(row.paid)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-[#8b959b]">Due</span>
                <input
                  className="h-[38px] w-full rounded-[3px] border border-[#c8d2d7] bg-[#eef3f5] px-3 text-[15px] text-[#27353d] outline-none"
                  readOnly
                  type="text"
                  value={formatMoney(row.due)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 px-1">
          <button
            className="rounded-[4px] border border-[#ff9d9d] bg-white px-5 py-2.5 text-[13px] font-medium text-[#ef4b4b]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-[4px] bg-[#2c86df] px-5 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? "SAVING..." : "SAVE BILL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IpdBillRecordPage() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [admissions, setAdmissions] = useState([]);
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
  const [creatorOptions, setCreatorOptions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [paymentModalRow, setPaymentModalRow] = useState(null);
  const [paymentModalError, setPaymentModalError] = useState("");
  const [paymentModalAmount, setPaymentModalAmount] = useState("");
  const [paymentModalPayments, setPaymentModalPayments] = useState([]);
  const [paymentModalSelectedAccount, setPaymentModalSelectedAccount] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editStatus, setEditStatus] = useState("admitted");
  const [editReason, setEditReason] = useState("");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      const [patientsResponse, doctorsResponse, accountsResponse] = await Promise.all([
        apiRequest("/patients?limit=100"),
        apiRequest("/doctors?limit=100"),
        apiRequest("/billing/accounts?limit=100"),
      ]);
      setPatients(patientsResponse.data || []);
      setDoctors(doctorsResponse.data || []);
      setAccounts((accountsResponse.data || []).map((account) => account.name).filter(Boolean));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load IPD bill record filters");
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

  const loadAdmissions = async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(`/ipd?${buildQueryString(nextPage)}`);
      const items = response.data || [];
      setAdmissions(items);
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
      setErrorMessage(error.message || "Failed to load IPD bill records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadAdmissions(1);
    setPage(1);
  }, []);

  const searchOptions = useMemo(() => {
    switch (filterType) {
      case "By Patient":
        return patients.map((patient) => ({
          value: String(patient.id),
          label: `${patient.patient_code} - ${patient.full_name}`,
        }));
      case "By Doctor":
      case "By All Doctor":
        return doctors.map((doctor) => ({
          value: String(doctor.id),
          label: `${doctor.doctor_code} - ${doctor.user?.full_name || doctor.doctor_code}`,
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
  }, [creatorOptions, doctors, filterType, patients]);

  const rows = useMemo(
    () =>
      admissions.map((admission, index) => {
        const amount = Number(admission.total_charges || 0);
        const paid = Number(admission.paid_amount || 0);
        const due = Math.max(amount - paid, 0);

        return {
          id: admission.id,
          sl: (metaInfo.page - 1) * metaInfo.limit + index + 1,
          billNo: admission.admission_code,
          patient: admission.patient ? `${admission.patient.patient_code} - ${admission.patient.full_name}` : "N/A",
          admitStatus: admission.status || "N/A",
          date: formatDateLabel(admission.admitted_at),
          doctor: admission.doctor?.user?.full_name || admission.doctor?.doctor_code || "N/A",
          createdBy: admission.creator?.full_name || admission.creator?.email || "System Administrator",
          updatedBy: admission.updater?.full_name || admission.updater?.email || (admission.updatedAt && admission.createdAt && (new Date(admission.updatedAt).getTime() - new Date(admission.createdAt).getTime() > 2000) ? "System Administrator" : "N/A"),
          amount,
          paid,
          due,
          ward: admission.ward?.name || "N/A",
          bed: admission.bed?.bed_number || "N/A",
          room: admission.bed?.room_number || "N/A",
          reason: admission.reason || "N/A",
          notes: admission.notes || "N/A",
          raw: admission,
        };
      }),
    [admissions, metaInfo.limit, metaInfo.page]
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
    await loadAdmissions(1);
  };

  const closePaymentModal = () => {
    setPaymentModalRow(null);
    setPaymentModalError("");
    setPaymentModalAmount("");
    setPaymentModalPayments([]);
    setPaymentModalSelectedAccount(accounts[0] || "");
  };

  const openPaymentModal = (row) => {
    setPaymentModalRow(row);
    setPaymentModalError("");
    setPaymentModalAmount("");
    setPaymentModalPayments([]);
    setPaymentModalSelectedAccount(accounts[0] || "");
  };

  const openEditModal = (row) => {
    setEditRow(row);
    setEditDoctorId(row.raw?.doctor?.id ? String(row.raw.doctor.id) : "");
    setEditStatus(row.raw?.status === "discharged" ? "release" : row.raw?.status || "admitted");
    setEditReason(row.raw?.reason || "");
    setEditDiagnosis(row.raw?.diagnosis || "");
    setEditNotes(row.raw?.notes || "");
    setEditError("");
  };

  const closeEditModal = () => {
    setEditRow(null);
    setEditDoctorId("");
    setEditStatus("admitted");
    setEditReason("");
    setEditDiagnosis("");
    setEditNotes("");
    setEditError("");
  };

  const addModalPayment = () => {
    setPaymentModalError("");
    if (!paymentModalRow) return;
    if (!paymentModalSelectedAccount) {
      setPaymentModalError("Select an account before adding a payment.");
      return;
    }

    const amount = Number(paymentModalAmount || 0);
    const currentTotal = paymentModalPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (amount <= 0) {
      setPaymentModalError("Payment amount must be greater than 0.");
      return;
    }
    if (currentTotal + amount > paymentModalRow.due) {
      setPaymentModalError("Payment amount cannot exceed the IPD due amount.");
      return;
    }

    setPaymentModalPayments((current) => [...current, { account_name: paymentModalSelectedAccount, amount }]);
    setPaymentModalAmount("");
  };

  const saveModalPayments = async () => {
    if (!paymentModalRow) return;
    const total = paymentModalPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    if (total <= 0) {
      setPaymentModalError("Add at least one payment before saving.");
      return;
    }

    setIsSavingPayment(true);
    setPaymentModalError("");
    try {
      for (const payment of paymentModalPayments) {
        await apiRequest(`/ipd/${paymentModalRow.id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            account_name: payment.account_name,
            amount: Number(payment.amount || 0),
            paid_at: new Date().toISOString(),
          }),
        });
      }
      closePaymentModal();
      await loadAdmissions(page);
    } catch (error) {
      setPaymentModalError(error.message || "Failed to collect IPD payment");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const saveEditModal = async () => {
    if (!editRow) return;

    setIsSavingEdit(true);
    setEditError("");
    try {
      const nextDoctorId = editDoctorId ? Number(editDoctorId) : null;
      const nextReason = editReason.trim() || null;
      const nextDiagnosis = editDiagnosis.trim() || null;
      const nextNotes = editNotes.trim() || null;
      const currentStatus = editRow.raw?.status || "admitted";

      if (currentStatus !== "admitted") {
        throw new Error(`Cannot edit admission in "${currentStatus}" status`);
      }

      if (editStatus === "release") {
        await apiRequest(`/ipd/${editRow.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            doctor_id: nextDoctorId,
            reason: nextReason,
            diagnosis: nextDiagnosis,
            notes: nextNotes,
          }),
        });

        await apiRequest(`/ipd/${editRow.id}/discharge`, {
          method: "POST",
          body: JSON.stringify({
            total_charges: Number(editRow.raw?.total_charges || 0),
            notes: nextNotes,
          }),
        });
      } else {
        await apiRequest(`/ipd/${editRow.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            doctor_id: nextDoctorId,
            reason: nextReason,
            diagnosis: nextDiagnosis,
            notes: nextNotes,
          }),
        });
      }
      closeEditModal();
      await loadAdmissions(page);
    } catch (error) {
      setEditError(error.message || "Failed to update IPD bill");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const printPage = () => {
    window.print();
  };
  // Shared with IPD Bill Entry. This used to assemble a standalone HTML document
  // and open it with window.open, which a popup blocker can stop; printing now
  // goes through the shared hidden-iframe helper.
  const printBill = async (row) => {
    try {
      await printIpdReceipt(row.id);
    } catch (err) {
      showError("Print Error", err.message || "Failed to load bill print details");
    }
  };

  const printDischargeSummary = async (row) => {
    const confirmed = await confirmPrint("Print Discharge Summary", `Print discharge summary for Bill No: ${row.billNo}?`);
    if (!confirmed) return;

    try {
      const response = await apiRequest(`/ipd/${row.id}/discharge-summary`);
      const summary = response.data || {};
      await printHtml(
        `
        <h2>IPD Discharge Summary</h2>
        <p><strong>Bill No:</strong> ${row.billNo}</p>
        <p><strong>Patient:</strong> ${row.patient}</p>
        <p><strong>Doctor:</strong> ${summary.doctor?.user?.full_name || summary.doctor?.doctor_code || "N/A"}</p>
        <p><strong>Status:</strong> ${summary.summary?.status || row.admitStatus}</p>
        <p><strong>Admitted At:</strong> ${formatDateLabel(summary.summary?.admitted_at)}</p>
        <p><strong>Discharged At:</strong> ${formatDateLabel(summary.summary?.discharged_at)}</p>
        <p><strong>Stay Days:</strong> ${summary.summary?.stay_days ?? "N/A"}</p>
        <p><strong>Reason:</strong> ${summary.summary?.reason || "N/A"}</p>
        <p><strong>Diagnosis:</strong> ${summary.summary?.diagnosis || "N/A"}</p>
        <p><strong>Discharge Note:</strong> ${summary.summary?.discharge_note || "N/A"}</p>
      `,
        `${row.billNo}_Discharge_Summary`
      );
    } catch (error) {
      showError("Print Failed", error.message || "Failed to load discharge summary");
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete("Delete IPD Record?", `Are you sure you want to delete IPD record "${row.billNo}"?`);
    if (!confirmed) return;

    setErrorMessage("");
    try {
      await apiRequest(`/ipd/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `IPD record "${row.billNo}" has been deleted.`);
      await loadAdmissions(page);
    } catch (error) {
      showError("Delete Failed", error.message || "Failed to delete IPD record");
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">IPD Bill Record</div>

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
              {isLoading ? "LOADING..." : "GENERATE REPORT"}
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

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] leading-[1.15] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <TableHeaderCell className="w-[40px]">SL</TableHeaderCell>
              <TableHeaderCell className="min-w-[74px]">Bill No</TableHeaderCell>
              <TableHeaderCell className="min-w-[198px]">Patient</TableHeaderCell>
              <TableHeaderCell className="min-w-[120px]">Admit Status</TableHeaderCell>
              <TableHeaderCell className="min-w-[98px]">Date</TableHeaderCell>
              <TableHeaderCell className="min-w-[122px]">Doctor</TableHeaderCell>
              <TableHeaderCell className="min-w-[100px]">Created By</TableHeaderCell>
              <TableHeaderCell className="min-w-[100px]">Updated By</TableHeaderCell>
              <TableHeaderCell className="min-w-[78px] text-right">Amount</TableHeaderCell>
              <TableHeaderCell className="min-w-[78px] text-right">Paid</TableHeaderCell>
              <TableHeaderCell className="min-w-[78px] text-right">Due</TableHeaderCell>
              <TableHeaderCell className="min-w-[116px] text-center">Actions</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <TableCell className="py-4 text-center" colSpan={12}>
                  Loading IPD bill records...
                </TableCell>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <TableCell>{row.sl}</TableCell>
                    <TableCell>{row.billNo}</TableCell>
                    <TableCell>{row.patient}</TableCell>
                    <TableCell>{row.admitStatus}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.doctor}</TableCell>
                    <TableCell>{row.createdBy}</TableCell>
                    <TableCell>{row.updatedBy}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.amount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.paid)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.due)}</TableCell>
                    <TableCell className="px-2">
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                        <IconButton
                          color="text-[#ff6a00]"
                          onClick={() => {
                            if (row.due > 0) {
                              openPaymentModal(row);
                              return;
                            }
                            toggleExpandedRow(row.id);
                          }}
                          title={row.due > 0 ? "Collect payment" : "View details"}
                        >
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#1d62d1]" onClick={() => printBill(row)} title="Print record">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1h6l3 3v11H4zm5 1.5V5h2.5zM6 8h5v1H6zm0 2h5v1H6zm0 2h5v1H6z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#138a1b]" onClick={() => openEditModal(row)} title="Edit record">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M3 11.5V13h1.5L11.8 5.7l-1.5-1.5L3 11.5Zm9.7-6.4a.8.8 0 0 0 0-1.1L11.9 3.2a.8.8 0 0 0-1.1 0l-.8.8 1.5 1.5.8-.8Z" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#f57c00]" onClick={() => handleDelete(row)} title="Delete record">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                          </svg>
                        </IconButton>
                      </div>
                    </TableCell>
                  </tr>
                  {expandedRows.includes(row.id) ? (
                    <tr>
                      <TableCell className="bg-[#fafcfd] px-3 py-2" colSpan={12}>
                        <div className="grid gap-1 text-[12px] text-[#33444c]">
                          <div>
                            <strong>Ward / Room / Bed:</strong> {row.ward} / {row.room} / {row.bed}
                          </div>
                          <div>
                            <strong>Reason:</strong> {row.reason}
                          </div>
                          <div>
                            <strong>Notes:</strong> {row.notes}
                          </div>
                        </div>
                      </TableCell>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <TableCell className="py-4 text-center" colSpan={12}>
                  No IPD bill records found.
                </TableCell>
              </tr>
            )}
            <tr>
              <TableCell className="font-semibold text-right" colSpan={8}>
                Grand Total:
              </TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(totals.amount)}</TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(totals.paid)}</TableCell>
              <TableCell className="text-right font-semibold">{formatMoney(totals.due)}</TableCell>
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
            await loadAdmissions(nextPage);
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
            await loadAdmissions(nextPage);
          }}
          type="button"
        >
          ›
        </button>
      </div>

      {paymentModalRow ? (
        <PaymentCollectionModal
          accounts={accounts}
          errorMessage={paymentModalError}
          isSaving={isSavingPayment}
          onAdd={addModalPayment}
          onAmountChange={setPaymentModalAmount}
          onClose={closePaymentModal}
          onRemove={(index) => setPaymentModalPayments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onSave={saveModalPayments}
          onSelectedAccountChange={setPaymentModalSelectedAccount}
          payments={paymentModalPayments}
          selectedAccount={paymentModalSelectedAccount}
          total={paymentModalPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)}
          value={paymentModalAmount}
        />
      ) : null}

      {editRow ? (
        <EditAdmissionModal
          admitStatus={editStatus}
          diagnosis={editDiagnosis}
          doctorId={editDoctorId}
          doctors={doctors}
          errorMessage={editError}
          isSaving={isSavingEdit}
          notes={editNotes}
          onClose={closeEditModal}
          onDiagnosisChange={setEditDiagnosis}
          onDoctorChange={setEditDoctorId}
          onNotesChange={setEditNotes}
          onReasonChange={setEditReason}
          onStatusChange={setEditStatus}
          onSave={saveEditModal}
          patientLabel={editRow.patient}
          reason={editReason}
          row={editRow}
        />
      ) : null}
    </section>
  );
}
