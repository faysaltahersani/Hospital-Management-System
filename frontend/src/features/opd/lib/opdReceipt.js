import { printHtml } from "../../../lib/print";

/**
 * One OPD bill layout, shared by OPD Bill Entry and OPD Bill Record.
 *
 * Entry used to call `window.print()` after saving, which prints the browser
 * window rather than a receipt — and it ran after `resetForm()`, so what actually
 * reached the printer was the application chrome around an empty form. Record
 * already produced a proper receipt, so the same bill printed two different
 * things depending on the screen. The template lives here so they stay identical.
 */

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month} ${date.getFullYear()}`;
};

const orBlank = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text && text !== "-" ? escapeHtml(text) : "&mdash;";
};

/**
 * Accepts either the flattened row the Record table builds, or the mapped visit
 * object POST /opd/bills returns. Only fields that are actually present are
 * printed; nothing is substituted for a missing value.
 */
// The Record table passes flattened strings (`row.patient`), while POST /opd/bills
// returns nested objects under the same key. Taking the value blindly printed
// "[object Object]" on the Entry path, so only a string is accepted as a name.
const asName = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
};

const normalise = (source = {}) => {
  const raw = source.raw || source;
  const patient = (raw.patient && typeof raw.patient === "object" ? raw.patient : null) || {};
  const doctor = (raw.doctor && typeof raw.doctor === "object" ? raw.doctor : null) || {};

  const total = source.amount ?? raw.total_amount ?? raw.consultation_fee ?? 0;
  const paid = source.paid ?? raw.paid_amount ?? 0;
  const due = source.due ?? raw.due_amount ?? Math.max(Number(total) - Number(paid), 0);

  return {
    billNo: source.billNo || raw.visit_code || raw.invoice_code || "",
    invoiceCode: raw.invoice_code || "",
    date: source.date || formatDateDisplay(raw.visit_date || raw.created_at || raw.createdAt),
    patientName: asName(source.patient, patient.full_name),
    patientCode: patient.patient_code || "",
    patientPhone: patient.phone || "",
    doctorName: asName(
      source.doctor,
      doctor.user?.full_name,
      doctor.full_name,
      doctor.doctor_code
    ),
    payMethod: source.payMethod || raw.payment_method || "",
    chargeLabel: raw.charge_description || "OPD Consultation Fee",
    subtotal: raw.subtotal ?? total,
    discount: raw.discount ?? 0,
    tax: raw.tax ?? 0,
    total,
    paid,
    due,
    notes: source.notes || raw.advice || raw.notes || "",
    payments: raw.payments || [],
  };
};

export function buildOpdReceiptHtml(source = {}) {
  const bill = normalise(source);

  // No recorded payment prints as such, instead of an invented cash line that
  // would make an unpaid bill look settled.
  const paymentRows = bill.payments.length
    ? bill.payments
        .map(
          (payment, index) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 6px 10px;">${index + 1}</td>
              <td style="padding: 6px 10px;">${orBlank(payment.account_name || payment.method)}</td>
              <td style="padding: 6px 10px;">${escapeHtml(formatDateDisplay(payment.paid_at))}</td>
              <td style="padding: 6px 10px; text-align: right;">${formatMoney(payment.amount)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="padding: 8px 10px; text-align: center; color: #888;">No payment recorded</td></tr>`;

  return `
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill No :</strong> ${orBlank(bill.billNo)}</div>
          ${bill.invoiceCode ? `<div><strong>Invoice No :</strong> ${escapeHtml(bill.invoiceCode)}</div>` : ""}
          <div><strong>Date :</strong> ${orBlank(bill.date)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Patient :</strong> ${orBlank(bill.patientName)}${
            bill.patientCode ? ` (${escapeHtml(bill.patientCode)})` : ""
          }</div>
          <div><strong>Phone :</strong> ${orBlank(bill.patientPhone)}</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Doctor :</strong> ${orBlank(bill.doctorName)}</div>
          <div><strong>Pay Method :</strong> ${orBlank(bill.payMethod)}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">Description</th>
            <th style="padding: 8px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 7px 10px;">${escapeHtml(bill.chargeLabel)}</td>
            <td style="padding: 7px 10px; text-align: right;">${formatMoney(bill.subtotal)}</td>
          </tr>
          ${Number(bill.discount) ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 7px 10px;">Discount</td><td style="padding: 7px 10px; text-align: right;">-${formatMoney(bill.discount)}</td></tr>` : ""}
          ${Number(bill.tax) ? `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 7px 10px;">Tax</td><td style="padding: 7px 10px; text-align: right;">${formatMoney(bill.tax)}</td></tr>` : ""}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #222; font-weight: bold;">
            <td style="padding: 8px 10px;">Total</td>
            <td style="padding: 8px 10px; text-align: right;">${formatMoney(bill.total)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #388e3c;">Paid</td>
            <td style="padding: 6px 10px; text-align: right; color: #388e3c;">${formatMoney(bill.paid)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; color: #d32f2f; font-weight: bold;">Due</td>
            <td style="padding: 6px 10px; text-align: right; color: #d32f2f; font-weight: bold;">${formatMoney(bill.due)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Collection Payments</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 7px 10px; text-align: left;">SL</th>
            <th style="padding: 7px 10px; text-align: left;">Account</th>
            <th style="padding: 7px 10px; text-align: left;">Date</th>
            <th style="padding: 7px 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>

      ${bill.notes ? `<div style="font-size: 12px; color: #555;"><strong>Notes:</strong> ${escapeHtml(bill.notes)}</div>` : ""}
      `;
}

export function printOpdReceipt(source) {
  return printHtml(buildOpdReceiptHtml(source), "OPD BILL INVOICE");
}
