import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import { apiRequest } from "../../../lib/api";

const PATIENT_TYPES = ["OPD", "IPD", "Pharmacy", "Pathology", "Radiology", "Blood Bank", "Ambulance"];

const emptyForm = {
  patient_id: "",
  referral_person_id: "",
  patient_type: "",
  invoice_id: "",
  bill_number: "",
  bill_amount: "0.00",
  commission_percent: "0.00",
  commission_amount: "0.00",
  paid_amount: "0.00",
  due_amount: "0.00",
  account_id: "",
  amount: "",
};

function toMoney(value) {
  return Number(value || 0);
}

function formatMoney(value) {
  return toMoney(value).toFixed(2);
}

function SelectField({ label, name, onChange, options, required = false, tone = "normal", value }) {
  const borderClass = tone === "error" ? "border-[#ff5a5a]" : "border-[#cfd6db]";

  return (
    <label className="block">
      <select
        className={`h-[42px] w-full appearance-none rounded-[4px] border ${borderClass} bg-white bg-right bg-no-repeat px-3 pr-10 text-[14px] text-[#55606a] outline-none`}
        name={name}
        onChange={onChange}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
        value={value}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {required ? <span className="mt-1 block pl-1 text-[10px] text-[#ff4a4a]">Required</span> : null}
    </label>
  );
}

function InputField({ label, name, onChange, readOnly = false, type = "text", value }) {
  return (
    <input
      className="h-[42px] w-full rounded-[4px] border border-[#cfd6db] bg-white px-3 text-[14px] text-[#55606a] outline-none read-only:bg-[#f4f7f9]"
      name={name}
      onChange={onChange}
      placeholder={label}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function FramedField({ label, name, onChange, readOnly = true, type = "text", value }) {
  return (
    <fieldset className="rounded-[4px] border border-[#cfd6db] px-3 pb-1.5 pt-0.5 focus-within:border-[#0f8788] focus-within:ring-1 focus-within:ring-[#0f8788]">
      <legend className="px-1 text-[11px] font-medium text-[#5f6a74]">{label}</legend>
      <input
        className={`h-[24px] w-full border-0 bg-transparent text-[14px] font-semibold outline-none ${
          readOnly ? "text-[#4a555e]" : "text-[#1f2c33]"
        }`}
        name={name}
        onChange={onChange}
        readOnly={readOnly}
        type={type}
        value={value}
      />
    </fieldset>
  );
}

const commissionFieldByType = {
  OPD: "opd_commission_per",
  IPD: "ipd_commission_per",
  Pharmacy: "pharmacy_commission_per",
  Pathology: "pathology_commission_per",
  Radiology: "radiology_commission_per",
  "Blood Bank": "blood_bank_commission_per",
  Ambulance: "ambulance_commission_per",
};

export function ReferralBillEntryPage() {
  const [form, setForm] = useState(emptyForm);
  const [patients, setPatients] = useState([]);
  const [referralPersons, setReferralPersons] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const calculateFinancials = ({
    billAmount = toMoney(form.bill_amount),
    commPercent = null,
    commAmount = null,
    nextPayments = payments,
    referralPersonId = form.referral_person_id,
    patientType = form.patient_type,
  }) => {
    let percent = commPercent !== null ? toMoney(commPercent) : null;
    let amount = commAmount !== null ? toMoney(commAmount) : null;

    if (percent === null && amount === null) {
      const person = referralPersons.find((item) => String(item.id) === String(referralPersonId));
      if (person && patientType && commissionFieldByType[patientType]) {
        percent = toMoney(person[commissionFieldByType[patientType]]);
      } else {
        percent = toMoney(form.commission_percent);
      }
    }

    if (amount === null) {
      amount = (billAmount * (percent || 0)) / 100;
    } else if (percent === null) {
      percent = billAmount > 0 ? (amount / billAmount) * 100 : 0;
    }

    const paidAmt = nextPayments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const dueAmt = Math.max(amount - paidAmt, 0);

    return {
      bill_amount: formatMoney(billAmount),
      commission_percent: formatMoney(percent),
      commission_amount: formatMoney(amount),
      paid_amount: formatMoney(paidAmt),
      due_amount: formatMoney(dueAmt),
    };
  };

  useEffect(() => {
    const loadLookups = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [patientResponse, personResponse, accountResponse] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/referrals/persons?limit=100"),
          apiRequest("/referrals/bills/accounts"),
        ]);
        setPatients(patientResponse.data || []);
        setReferralPersons(personResponse.data || []);
        setAccounts(accountResponse.data || []);
      } catch (error) {
        setErrorMessage(error.message || "Failed to load referral bill lookups");
      } finally {
        setIsLoading(false);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!form.patient_id) {
        setInvoices([]);
        return;
      }

      try {
        const response = await apiRequest(`/billing/invoices?patient_id=${form.patient_id}&limit=100`);
        setInvoices(response.data || []);
      } catch (error) {
        setErrorMessage(error.message || "Failed to load bills");
      }
    };

    loadInvoices();
  }, [form.patient_id]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    let nextForm = { ...form, [name]: value };

    if (name === "patient_id") {
      nextForm = {
        ...nextForm,
        invoice_id: "",
        bill_number: "",
        bill_amount: "0.00",
      };
      setPayments([]);
      const updated = calculateFinancials({
        billAmount: 0,
        nextPayments: [],
        referralPersonId: nextForm.referral_person_id,
        patientType: nextForm.patient_type,
      });
      setForm({ ...nextForm, ...updated });
      return;
    }

    if (name === "invoice_id") {
      const invoice = invoices.find((item) => String(item.id) === value);
      const newBillAmount = invoice?.total || 0;
      nextForm = {
        ...nextForm,
        bill_number: invoice?.invoice_code || "",
        bill_amount: formatMoney(newBillAmount),
      };
      setPayments([]);
      const updated = calculateFinancials({
        billAmount: newBillAmount,
        nextPayments: [],
        referralPersonId: nextForm.referral_person_id,
        patientType: nextForm.patient_type,
      });
      setForm({ ...nextForm, ...updated });
      return;
    }

    if (name === "referral_person_id" || name === "patient_type") {
      const updated = calculateFinancials({
        referralPersonId: name === "referral_person_id" ? value : nextForm.referral_person_id,
        patientType: name === "patient_type" ? value : nextForm.patient_type,
      });
      setForm({ ...nextForm, ...updated });
      return;
    }

    setForm(nextForm);
  };

  const handleCommissionPercentChange = (event) => {
    const rawVal = event.target.value;
    const percent = parseFloat(rawVal) || 0;
    const billAmt = toMoney(form.bill_amount);
    const commAmt = (billAmt * percent) / 100;
    const paidAmt = payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const dueAmt = Math.max(commAmt - paidAmt, 0);

    setForm((current) => ({
      ...current,
      commission_percent: rawVal,
      commission_amount: formatMoney(commAmt),
      paid_amount: formatMoney(paidAmt),
      due_amount: formatMoney(dueAmt),
    }));
  };

  const handleCommissionAmountChange = (event) => {
    const rawVal = event.target.value;
    const commAmt = parseFloat(rawVal) || 0;
    const billAmt = toMoney(form.bill_amount);
    const percent = billAmt > 0 ? (commAmt / billAmt) * 100 : 0;
    const paidAmt = payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const dueAmt = Math.max(commAmt - paidAmt, 0);

    setForm((current) => ({
      ...current,
      commission_percent: formatMoney(percent),
      commission_amount: rawVal,
      paid_amount: formatMoney(paidAmt),
      due_amount: formatMoney(dueAmt),
    }));
  };

  const handleAddPayment = () => {
    setErrorMessage("");
    if (!form.account_id) {
      setErrorMessage("Select an account before adding payment.");
      return;
    }
    if (!form.amount || toMoney(form.amount) <= 0) {
      setErrorMessage("Enter a valid payment amount.");
      return;
    }

    const account = accounts.find((item) => String(item.id) === form.account_id);
    const nextPayments = [
      ...payments,
      {
        account_id: Number(form.account_id),
        account_name: account?.name || "",
        amount: formatMoney(form.amount),
      },
    ];

    setPayments(nextPayments);
    const commAmt = toMoney(form.commission_amount);
    const paidAmt = nextPayments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const dueAmt = Math.max(commAmt - paidAmt, 0);

    setForm((current) => ({
      ...current,
      paid_amount: formatMoney(paidAmt),
      due_amount: formatMoney(dueAmt),
      account_id: "",
      amount: "",
    }));
  };

  const handleRemovePayment = (index) => {
    const nextPayments = payments.filter((_, paymentIndex) => paymentIndex !== index);
    setPayments(nextPayments);
    const commAmt = toMoney(form.commission_amount);
    const paidAmt = nextPayments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const dueAmt = Math.max(commAmt - paidAmt, 0);

    setForm((current) => ({
      ...current,
      paid_amount: formatMoney(paidAmt),
      due_amount: formatMoney(dueAmt),
    }));
  };

  const validate = () => {
    if (!form.patient_id) return "Patient is required.";
    if (!form.referral_person_id) return "Referral person is required.";
    if (!form.patient_type) return "Patient type is required.";
    if (!form.invoice_id) return "Bill selection is required.";
    return "";
  };

  const handleReset = () => {
    setForm(emptyForm);
    setInvoices([]);
    setPayments([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    const validationMessage = validate();
    setErrorMessage("");
    setSuccessMessage("");
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest("/referrals/bills", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(form.patient_id),
          referral_person_id: Number(form.referral_person_id),
          patient_type: form.patient_type,
          invoice_id: Number(form.invoice_id),
          bill_number: form.bill_number,
          bill_amount: toMoney(form.bill_amount),
          commission_percent: toMoney(form.commission_percent),
          commission_amount: toMoney(form.commission_amount),
          paid_amount: toMoney(form.paid_amount),
          due_amount: toMoney(form.due_amount),
          payments: payments.map((payment) => ({
            account_id: payment.account_id,
            amount: toMoney(payment.amount),
          })),
        }),
      });

      const savedCode = response?.data?.referral_bill_code || form.bill_number || "";
      const successMsg = savedCode
        ? `Referral Bill "${savedCode}" saved successfully.`
        : "Referral bill saved successfully.";

      setSuccessMessage(successMsg);

      await Swal.fire({
        icon: "success",
        title: "Bill Saved Successfully!",
        text: successMsg,
        confirmButtonColor: "#0f8788",
        confirmButtonText: "OK",
        customClass: {
          popup: "rounded-[8px] p-6",
          confirmButton: "px-6 py-2 text-sm font-semibold rounded-[4px]",
        },
      });

      handleReset();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save referral bill");
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error.message || "Failed to save referral bill",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const patientOptions = patients.map((patient) => ({
    value: String(patient.id),
    label: `${patient.full_name || "Unknown"} (${patient.patient_code || "N/A"})`,
  }));
  const referralPersonOptions = referralPersons.map((person) => ({
    value: String(person.id),
    label: `${person.name} (${person.referral_person_code || "N/A"})`,
  }));
  const invoiceOptions = invoices.map((invoice) => ({
    value: String(invoice.id),
    label: `${invoice.invoice_code} - ${formatMoney(invoice.total)}`,
  }));
  const accountOptions = accounts.map((account) => ({
    value: String(account.id),
    label: account.name,
  }));

  return (
    <section className="mx-auto max-w-[1280px] rounded-[8px] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      {errorMessage ? <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div> : null}
      {successMessage ? <div className="mb-4 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{successMessage}</div> : null}

      <div className="rounded-[4px] bg-[#0f8788] p-4">
        <div className="grid grid-cols-[1fr_240px] items-end gap-6 max-md:grid-cols-1">
          <div>
            <div className="mb-1 pl-1 text-[12px] font-medium text-[#d8f2f3]">Patient</div>
            <SelectField label="Search Patient" name="patient_id" onChange={handleFormChange} options={patientOptions} value={form.patient_id} />
          </div>
          <div>
            <div className="mb-1 pl-1 text-[12px] font-medium text-[#d8f2f3]">Create Date</div>
            <div className="flex h-[42px] items-center rounded-[4px] bg-white px-3 text-[14px] font-medium text-[#1f2c33]">
              {new Intl.DateTimeFormat("en-GB").format(new Date())}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <SelectField
          label="Referral Person"
          name="referral_person_id"
          onChange={handleFormChange}
          options={referralPersonOptions}
          required={!form.referral_person_id}
          tone={!form.referral_person_id ? "error" : "normal"}
          value={form.referral_person_id}
        />
        <SelectField
          label="Patient Type"
          name="patient_type"
          onChange={handleFormChange}
          options={PATIENT_TYPES.map((item) => ({ value: item, label: item }))}
          required={!form.patient_type}
          tone={!form.patient_type ? "error" : "normal"}
          value={form.patient_type}
        />
        <SelectField label="Select Bill" name="invoice_id" onChange={handleFormChange} options={invoiceOptions} value={form.invoice_id} />
        <InputField label="Bill Number" name="bill_number" readOnly value={form.bill_number} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <FramedField label="Bill Amount" readOnly value={form.bill_amount} />
        <FramedField
          label="Commission %"
          name="commission_percent"
          onChange={handleCommissionPercentChange}
          readOnly={false}
          type="number"
          value={form.commission_percent}
        />
        <FramedField
          label="Commission Amount"
          name="commission_amount"
          onChange={handleCommissionAmountChange}
          readOnly={false}
          type="number"
          value={form.commission_amount}
        />
        <FramedField label="Paid Amount" readOnly value={form.paid_amount} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <div>
          <FramedField label="Due Amount" value={form.due_amount} />
        </div>

        <div className="col-span-3 rounded-[4px] border border-[#d8e3e7] bg-[#f7fafb] p-3.5 max-lg:col-span-2 max-sm:col-span-1">
          <div className="mb-2 text-[13px] font-semibold text-[#2a3840]">Add Payment</div>
          <div className="flex gap-3 max-md:flex-col">
            <div className="flex-1">
              <SelectField label="Select Account" name="account_id" onChange={handleFormChange} options={accountOptions} value={form.account_id} />
            </div>
            <div className="w-[180px] max-md:w-full">
              <InputField label="Amount" name="amount" onChange={handleFormChange} type="number" value={form.amount} />
            </div>
            <button
              className="h-[42px] min-w-[88px] rounded-[4px] bg-[#0f8788] text-[14px] font-semibold text-white transition-colors hover:bg-[#0c7172]"
              onClick={handleAddPayment}
              type="button"
            >
              ADD
            </button>
          </div>

          {payments.length ? (
            <div className="mt-3 overflow-x-auto rounded-[4px] border border-[#e2e8eb] bg-white">
              <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
                <thead>
                  <tr className="bg-[#f5f8fa]">
                    <th className="border-b border-[#e2e8eb] px-3 py-2 font-semibold">Account</th>
                    <th className="border-b border-[#e2e8eb] px-3 py-2 font-semibold">Amount</th>
                    <th className="border-b border-[#e2e8eb] px-3 py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={`${payment.account_id}-${index}`}>
                      <td className="border-b border-[#eef2f4] px-3 py-2">{payment.account_name}</td>
                      <td className="border-b border-[#eef2f4] px-3 py-2">{payment.amount}</td>
                      <td className="border-b border-[#eef2f4] px-3 py-2 text-right">
                        <button className="font-medium text-[#d83a3a] hover:underline" onClick={() => handleRemovePayment(index)} type="button">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          className="h-[38px] rounded-[4px] border border-[#ff6767] px-5 text-[14px] font-medium text-[#ff3b30] transition-colors hover:bg-[#fff5f5]"
          onClick={handleReset}
          type="button"
        >
          RESET
        </button>
        <button
          className="h-[38px] rounded-[4px] bg-[#2874d8] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#1f63be] disabled:opacity-50"
          disabled={isLoading || isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
      </div>
    </section>
  );
}
