import { Fragment, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmPrint, showError, showSuccess } from "../../../lib/alerts";
import { printAmbulanceReceipt } from "../lib/ambulanceReceipt";

const filterTypes = [
  "All",
  "By Head",
  "By Ambulance",
  "By Account",
  "By Date",
  "By Search",
];

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

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

function EditCallModal({ meta, onClose, onSave, record }) {
  const [patientId, setPatientId] = useState(String(record?.patient_id || record?.patient?.id || ""));
  const [ambulanceId, setAmbulanceId] = useState(String(record?.ambulance_id || record?.ambulance?.id || ""));
  const [doctorId, setDoctorId] = useState(String(record?.doctor_id || record?.doctor?.id || ""));
  const [chargeRate, setChargeRate] = useState(String(record?.charge_rate || record?.fare || 0));
  const [caseText, setCaseText] = useState(record?.case_text || record?.pickup_address || "");
  const [reference, setReference] = useState(record?.reference || record?.requester_name || "");
  const [note, setNote] = useState(record?.note || record?.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFormSave = async () => {
    setErrorMsg("");
    setIsSaving(true);
    try {
      await onSave(record.id, {
        patient_id: patientId ? Number(patientId) : null,
        ambulance_id: ambulanceId ? Number(ambulanceId) : null,
        doctor_id: doctorId ? Number(doctorId) : null,
        charge_rate: Number(chargeRate || 0),
        total_amount: Number(chargeRate || 0),
        case_text: caseText.trim() || null,
        reference: reference.trim() || null,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update record");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.35)] px-4">
      <div className="w-full max-w-[520px] rounded-[4px] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-[16px] font-semibold text-[#148889]">Edit Call Ambulance Record</h3>
          <button className="text-[18px] text-gray-500 hover:text-gray-700" onClick={onClose} type="button">&times;</button>
        </div>
        {errorMsg ? (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-[12px] text-red-600">
            {errorMsg}
          </div>
        ) : null}
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="mb-1 block font-medium text-gray-700">Patient</label>
            <select
              className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
              onChange={(e) => setPatientId(e.target.value)}
              value={patientId}
            >
              <option value="">Select Patient</option>
              {(meta.patients || []).map((p) => (
                <option key={p.id} value={p.id}>{p.patient_code ? `${p.patient_code} - ` : ''}{p.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-gray-700">Ambulance</label>
            <select
              className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
              onChange={(e) => setAmbulanceId(e.target.value)}
              value={ambulanceId}
            >
              <option value="">Select Ambulance</option>
              {(meta.ambulances || []).map((a) => (
                <option key={a.id} value={a.id}>{a.vehicle_number} {a.model ? `(${a.model})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Doctor</label>
              <select
                className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
                onChange={(e) => setDoctorId(e.target.value)}
                value={doctorId}
              >
                <option value="">Select Doctor</option>
                {(meta.doctors || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Charge Rate (Tk)</label>
              <input
                className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
                onChange={(e) => setChargeRate(e.target.value)}
                type="number"
                value={chargeRate}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Case</label>
              <input
                className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
                onChange={(e) => setCaseText(e.target.value)}
                type="text"
                value={caseText}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Reference</label>
              <input
                className="h-[38px] w-full rounded border border-gray-300 px-3 outline-none"
                onChange={(e) => setReference(e.target.value)}
                type="text"
                value={reference}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-gray-700">Note</label>
            <textarea
              className="h-[60px] w-full rounded border border-gray-300 p-2 outline-none"
              onChange={(e) => setNote(e.target.value)}
              value={note}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t pt-3">
          <button
            className="rounded border border-gray-300 px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded bg-[#148889] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#0f6b6c] disabled:opacity-50"
            disabled={isSaving}
            onClick={handleFormSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Update Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TableHeaderCell({ children, className = "", ...props }) {
  return (
    <th className={`border border-black px-1.5 py-1 font-normal ${className}`} {...props}>
      {children}
    </th>
  );
}

function TableCell({ children, className = "", ...props }) {
  return (
    <td className={`border border-black px-1.5 py-1 ${className}`} {...props}>
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

export function CallAmbulanceRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [meta, setMeta] = useState({ ambulances: [], symptom_heads: [], accounts: [] });
  const [records, setRecords] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);
  const [paymentModalRow, setPaymentModalRow] = useState(null);
  const [paymentModalError, setPaymentModalError] = useState("");
  const [paymentModalAmount, setPaymentModalAmount] = useState("");
  const [paymentModalPayments, setPaymentModalPayments] = useState([]);
  const [paymentModalSelectedAccount, setPaymentModalSelectedAccount] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedHeadId, setSelectedHeadId] = useState("");
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const handleUpdateRecord = async (id, changes) => {
    try {
      await apiRequest(`/ambulance/calls/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      showSuccess("Updated!", "Ambulance call record updated successfully.");
      await loadRecords();
    } catch (err) {
      showError("Update Failed", err.message || "Failed to update call record");
      throw err;
    }
  };

  const handleDeleteRecord = async (record) => {
    const confirmed = await confirmDelete(
      "Delete Call Record?",
      `Are you sure you want to delete ambulance record "${record.call_code || record.trip_code || record.id}"?`
    );
    if (!confirmed) return;

    try {
      await apiRequest(`/ambulance/calls/${record.id}`, { method: "DELETE" });
      showSuccess("Deleted!", "Ambulance call record deleted successfully.");
      await loadRecords();
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete call record");
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const callDate = formatDateInput(record.call_date || record.dispatched_at || record.createdAt);
      if (fromDate && callDate < fromDate) return false;
      if (toDate && callDate > toDate) return false;

      if (filterType === "By Head" && selectedHeadId) {
        if (String(record.symptoms_head_id) !== String(selectedHeadId)) return false;
      }

      if (filterType === "By Ambulance" && selectedAmbulanceId) {
        if (String(record.ambulance_id || record.ambulance?.id) !== String(selectedAmbulanceId)) return false;
      }

      if (filterType === "By Account" && selectedAccount) {
        const accName = record.invoice?.account_name || (Array.isArray(record.payments) ? record.payments[0]?.account_name : "");
        if (accName !== selectedAccount) return false;
      }

      if (filterType === "By Search" && searchValue.trim()) {
        const queryStr = searchValue.trim().toLowerCase();
        const patientName = (record.patient?.full_name || "").toLowerCase();
        const vehicleNum = (record.ambulance?.vehicle_number || "").toLowerCase();
        const code = (record.call_code || record.trip_code || "").toLowerCase();
        const matches = [patientName, vehicleNum, code].some((str) => str && str.includes(queryStr));
        if (!matches) return false;
      }

      return true;
    });
  }, [records, fromDate, toDate, filterType, selectedHeadId, selectedAmbulanceId, selectedAccount, searchValue]);

  const grandTotal = useMemo(() => {
    return filteredRecords.reduce(
      (totals, record) => ({
        // BUG-004-class fix: `paid_amount || total_amount` reported an unpaid
        // record as fully collected. The API returns authoritative figures
        // derived from the linked invoice, so they are used as-is.
        rent: totals.rent + Number(record.rent ?? record.charge_rate ?? record.fare ?? 0),
        discount: totals.discount + Number(record.discount_amount || 0),
        tax: totals.tax + Number(record.tax_amount || 0),
        total: totals.total + Number(record.total_amount ?? record.fare ?? 0),
        paid: totals.paid + Number(record.paid_amount ?? 0),
        due: totals.due + Number(record.due_amount ?? 0),
      }),
      { rent: 0, discount: 0, tax: 0, total: 0, paid: 0, due: 0 }
    );
  }, [filteredRecords]);

  const loadMeta = async () => {
    setIsLoadingMeta(true);
    setErrorMessage("");
    try {
      const [metaRes, headsRes, ambRes, accRes] = await Promise.all([
        apiRequest("/ambulance/call-entry/meta").catch(() => ({ data: {} })),
        apiRequest("/settings/master-options?type=symptom_head&limit=100").catch(() => ({ data: [] })),
        apiRequest("/ambulance?limit=100").catch(() => ({ data: [] })),
        apiRequest("/billing/accounts?limit=100").catch(() => ({ data: [] })),
      ]);

      const payload = metaRes.data || {};
      const rawHeads = headsRes.data && headsRes.data.length ? headsRes.data : payload.symptom_heads || [];
      const rawAmbulances = payload.ambulances && payload.ambulances.length ? payload.ambulances : ambRes.data || [];
      const rawAccounts = payload.accounts && payload.accounts.length ? payload.accounts : (accRes.data || []).map((a) => a.name || a.label || a);

      let symptom_heads = rawHeads.map((h) => ({
        id: String(h.id || h.value || h.name),
        label: h.name || h.label || h.code || `Head #${h.id}`,
      }));

      if (!symptom_heads.length) {
        symptom_heads = [
          { id: "1", label: "Emergency Call" },
          { id: "2", label: "Cardiac Emergency" },
          { id: "3", label: "Accident & Trauma" },
          { id: "4", label: "General Patient Transfer" },
          { id: "5", label: "ICU & Life Support" },
        ];
      }

      setMeta({
        ambulances: rawAmbulances,
        symptom_heads,
        accounts: rawAccounts,
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load record filters");
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const loadRecords = async () => {
    setIsLoadingRecords(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ limit: "100" });

      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      if (filterType === "By Head" && selectedHeadId) {
        params.set("symptoms_head_id", selectedHeadId);
      }
      if (filterType === "By Ambulance" && selectedAmbulanceId) {
        params.set("ambulance_id", selectedAmbulanceId);
      }
      if (filterType === "By Account" && selectedAccount) {
        params.set("account_name", selectedAccount);
      }
      if (filterType === "By Search" && searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      const response = await apiRequest(`/ambulance/calls/list?${params.toString()}`);
      let listData = response.data || [];
      if (!listData.length) {
        const tripsRes = await apiRequest(`/ambulance/trips/list?${params.toString()}`);
        listData = tripsRes.data || [];
      }
      setRecords(listData);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load ambulance records");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadMeta();
    loadRecords();
  }, []);

  useEffect(() => {
    setSelectedHeadId("");
    setSelectedAmbulanceId("");
    setSelectedAccount("");
    setSearchValue("");
  }, [filterType]);

  const handleReport = async () => {
    await loadRecords();
  };

  const closePaymentModal = () => {
    setPaymentModalRow(null);
    setPaymentModalError("");
    setPaymentModalAmount("");
    setPaymentModalPayments([]);
    setPaymentModalSelectedAccount(meta.accounts[0]?.name || "");
  };

  const openPaymentModal = (record) => {
    setPaymentModalRow(record);
    setPaymentModalError("");
    setPaymentModalAmount("");
    setPaymentModalPayments([]);
    setPaymentModalSelectedAccount(meta.accounts[0]?.name || "");
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
    if (currentTotal + amount > Number(paymentModalRow.due_amount || 0)) {
      setPaymentModalError("Payment amount cannot exceed the ambulance due amount.");
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
        await apiRequest(`/ambulance/calls/${paymentModalRow.id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            account_name: payment.account_name,
            amount: Number(payment.amount || 0),
            paid_at: new Date().toISOString(),
          }),
        });
      }
      closePaymentModal();
      await loadRecords();
    } catch (error) {
      setPaymentModalError(error.message || "Failed to collect ambulance payment");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const toggleExpandedRow = (id) => {
    setExpandedRows((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  // One shared receipt layout for this screen and Call Ambulance Entry, so the
  // two cannot print different documents for the same call.
  const printRecord = async (record) => {
    await printAmbulanceReceipt(record);
  };

  const searchOptions =
    filterType === "By Head"
      ? meta.symptom_heads
      : filterType === "By Ambulance"
        ? meta.ambulances
        : filterType === "By Account"
          ? meta.accounts.map((account) => ({ id: account, label: account }))
          : [];

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">Call Ambulance Record</div>

        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-[180px_180px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">Filter Type</span>
            <select
              className="h-[40px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setFilterType(event.target.value)}
              value={filterType}
            >
              {filterTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          {filterType === "By Head" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Head</span>
              <select
                className="h-[40px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setSelectedHeadId(event.target.value)}
                value={selectedHeadId}
              >
                <option value="">Select Head</option>
                {searchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {filterType === "By Ambulance" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Ambulance</span>
              <select
                className="h-[40px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setSelectedAmbulanceId(event.target.value)}
                value={selectedAmbulanceId}
              >
                <option value="">Select Ambulance</option>
                {searchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.vehicle_number}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {filterType === "By Account" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Account</span>
              <select
                className="h-[40px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                disabled={isLoadingMeta}
                onChange={(event) => setSelectedAccount(event.target.value)}
                value={selectedAccount}
              >
                <option value="">Select Account</option>
                {searchOptions.map((option) => (
                  <option key={option.id} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {filterType === "By Search" ? (
            <label className="text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Search</span>
              <input
                className="h-[40px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={searchValue}
              />
            </label>
          ) : null}

          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">From Date</span>
            <input
              className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
          </label>

          <label className="text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">To Date</span>
            <input
              className="h-[40px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(event) => setToDate(event.target.value)}
              type="date"
              value={toDate}
            />
          </label>

          <div className="flex items-end">
            <button
              className="h-[36px] w-full rounded-[3px] bg-black px-4 text-[12px] font-medium text-white disabled:opacity-60"
              disabled={isLoadingRecords}
              onClick={handleReport}
              type="button"
            >
              {isLoadingRecords ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <TableHeaderCell>SL</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Ambulance</TableHeaderCell>
              <TableHeaderCell>Patient</TableHeaderCell>
              <TableHeaderCell className="text-right">Rent</TableHeaderCell>
              <TableHeaderCell className="text-right">Discount Amt</TableHeaderCell>
              <TableHeaderCell className="text-right">Tax Amt</TableHeaderCell>
              <TableHeaderCell className="text-right">Total</TableHeaderCell>
              <TableHeaderCell className="text-right">Paid</TableHeaderCell>
              <TableHeaderCell className="text-right">Due</TableHeaderCell>
              <TableHeaderCell>Created By</TableHeaderCell>
              <TableHeaderCell>Updated By</TableHeaderCell>
              <TableHeaderCell className="text-center">Actions</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {isLoadingRecords ? (
              <tr>
                <TableCell className="py-3 text-center" colSpan={13}>
                  Loading...
                </TableCell>
              </tr>
            ) : filteredRecords.length ? (
              filteredRecords.map((record, index) => (
                <Fragment key={record.id}>
                  <tr>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDateDisplay(record.call_date || record.dispatched_at || record.created_at || record.createdAt)}</TableCell>
                    <TableCell>{record.ambulance?.vehicle_number || "-"}</TableCell>
                    <TableCell>{record.patient?.full_name || "-"}</TableCell>
                    <TableCell className="text-right">{formatMoney(record.rent ?? record.charge_rate ?? record.fare ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatMoney(record.discount_amount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(record.tax_amount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(record.total_amount ?? record.fare)}</TableCell>
                    {/* BUG-004-class: `paid_amount || total_amount` showed every
                        unpaid call as fully collected. */}
                    <TableCell className="text-right">{formatMoney(record.paid_amount ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatMoney(record.due_amount ?? 0)}</TableCell>
                    <TableCell>{record.creator?.full_name || "Admin"}</TableCell>
                    <TableCell>{record.updater?.full_name || "-"}</TableCell>
                    <TableCell className="px-2">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <IconButton color="text-[#ff6a00]" onClick={() => openPaymentModal(record)} title="Collect payment">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#138a1b]" onClick={() => setEditingRecord(record)} title="Edit record">
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                            <path d="M3 11.5V13h1.5L11.8 5.7l-1.5-1.5L3 11.5Zm9.7-6.4a.8.8 0 0 0 0-1.1L11.9 3.2a.8.8 0 0 0-1.1 0l-.8.8 1.5 1.5.8-.8Z" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#1d62d1]" onClick={() => printRecord(record)} title="Print invoice">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1h6l3 3v11H4zm5 1.5V5h2.5zM6 8h5v1H6zm0 2h5v1H6zm0 2h5v1H6z" />
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#d64545]" onClick={() => handleDeleteRecord(record)} title="Delete record">
                          <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </IconButton>
                        <IconButton color="text-[#65727a]" onClick={() => toggleExpandedRow(record.id)} title={expandedRows.includes(record.id) ? "Hide details" : "View details"}>
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </IconButton>
                      </div>
                    </TableCell>
                  </tr>
                  {expandedRows.includes(record.id) ? (
                    <tr>
                      <TableCell className="bg-[#fafcfd] px-3 py-2" colSpan={13}>
                        <div className="grid gap-1 text-[12px] text-[#33444c]">
                          <div>
                            <strong>Bill No:</strong> {record.call_code || record.invoice?.invoice_code || "-"}
                          </div>
                          <div>
                            <strong>Doctor:</strong> {record.doctor?.user?.full_name || record.doctor?.doctor_code || "-"}
                          </div>
                          <div>
                            <strong>Symptoms:</strong> {record.symptoms_description || "-"}
                          </div>
                          <div>
                            <strong>Case:</strong> {record.case_text || "-"}
                          </div>
                          <div>
                            <strong>Reference:</strong> {record.reference || "-"}
                          </div>
                          <div>
                            <strong>Known Allergies:</strong> {record.known_allergies || "-"}
                          </div>
                          <div>
                            <strong>Previous Medical Issue:</strong> {record.previous_medical_issue || "-"}
                          </div>
                          <div>
                            <strong>Note:</strong> {record.note || "-"}
                          </div>
                          <div>
                            <strong>Payments:</strong>{" "}
                            {record.invoice?.payments?.length
                              ? record.invoice.payments.map((payment) => `${payment.account_name}: ${formatMoney(payment.amount)}`).join(", ")
                              : "No payments"}
                          </div>
                        </div>
                      </TableCell>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            ) : (
              <tr>
                <TableCell className="py-3 text-center" colSpan={13}>
                  No ambulance call records found.
                </TableCell>
              </tr>
            )}

            <tr>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell className="text-right">Grand Total</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.rent)}</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.discount)}</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.tax)}</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.total)}</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.paid)}</TableCell>
              <TableCell className="text-right">{formatMoney(grandTotal.due)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
            </tr>
          </tbody>
        </table>
      </div>

      {editingRecord ? (
        <EditCallModal
          meta={meta}
          onClose={() => setEditingRecord(null)}
          onSave={handleUpdateRecord}
          record={editingRecord}
        />
      ) : null}

      {paymentModalRow ? (
        <PaymentCollectionModal
          accounts={(meta.accounts || []).map((account) => (typeof account === 'object' ? account.name || account.label : account)).filter(Boolean)}
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
    </section>
  );
}
