import { printHtml } from "../../../lib/print";

/**
 * One ambulance receipt layout, shared by the Call Ambulance Entry and Record
 * screens.
 *
 * Entry used to call `window.print()` after saving, which prints the browser
 * viewport — navbar, module menu, the still-filled form and all — instead of a
 * receipt. Record already produced a proper receipt through `printHtml`, so the
 * two screens printed completely different things for the same call. The template
 * lives here now so they cannot drift apart again.
 *
 * Values are escaped before they reach the HTML string: a patient name or case
 * note containing markup would otherwise run inside the print iframe, which is
 * same-origin with the app and its stored tokens.
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

const formatDateDisplay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  return `${day} ${month} ${date.getFullYear()}`;
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

/** Blank rather than a placeholder dash, so an empty field reads as "not recorded". */
const orBlank = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text && text !== "-" ? escapeHtml(text) : "&mdash;";
};

const optionalRow = (label, value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text || text === "-") return "";
  return `<div style="margin-top: 5px;"><strong>${label} :</strong> ${escapeHtml(text)}</div>`;
};

export function buildAmbulanceReceiptHtml(record = {}) {
  const billCode = record.call_code || record.trip_code || record.invoice_code || "";
  const invoiceCode = record.invoice_code || record.invoice?.invoice_code || billCode;
  const billDate = formatDateDisplay(
    record.call_date || record.dispatched_at || record.created_at || record.createdAt
  );

  const patientName = record.patient?.full_name || record.requester_name || record.patient_name;
  const patientCode = record.patient?.patient_code;
  const patientPhone = record.patient?.phone || record.requester_phone;
  const vehicleNum = record.ambulance?.vehicle_number || record.charge_name;
  const driverName = record.ambulance?.driver_name;
  const doctorName =
    record.doctor?.user?.full_name || record.doctor?.full_name || record.doctor?.doctor_code;
  const reference = record.reference || record.requester_name;
  const caseText = record.case_text || record.pickup_address;

  const rent = Number(record.rent ?? record.charge_rate ?? record.fare ?? 0);
  const discount = Number(record.discount_amount || 0);
  const tax = Number(record.tax_amount || 0);
  const total = Number(record.total_amount ?? record.fare ?? rent);
  // Never default paid to the total — an unpaid call must print as unpaid.
  const paid = Number(record.paid_amount ?? 0);
  const due = Number(record.due_amount ?? Math.max(total - paid, 0));

  const payments = record.payments || record.invoice?.payments || [];
  // With no recorded payment the table stays empty instead of inventing a cash
  // line, which previously made an unpaid call look settled.
  const paymentRows = payments.length
    ? payments
        .map(
          (payment, index) => `
              <tr>
                <td style="padding: 6px 8px;">${index + 1}</td>
                <td style="padding: 6px 8px;">${orBlank(payment.account_name || payment.method)}</td>
                <td style="padding: 6px 8px;">${escapeHtml(
                  formatDateDisplay(payment.paid_at || record.dispatched_at)
                )}</td>
                <td style="padding: 6px 8px; text-align:right">${formatMoney(payment.amount)}</td>
              </tr>
            `
        )
        .join("")
    : `<tr><td colspan="4" style="padding: 8px; text-align: center; color: #888;">No payment recorded</td></tr>`;

  return `
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Bill Code :</strong> ${orBlank(billCode)}</div>
          <div><strong>Invoice No :</strong> ${orBlank(invoiceCode)}</div>
          <div><strong>Date :</strong> ${orBlank(billDate)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Patient :</strong> ${orBlank(patientName)}${
            patientCode ? ` (${escapeHtml(patientCode)})` : ""
          }</div>
          <div><strong>Phone :</strong> ${orBlank(patientPhone)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
          <div><strong>Ambulance :</strong> ${orBlank(vehicleNum)}</div>
          <div><strong>Driver :</strong> ${orBlank(driverName)}</div>
          <div><strong>Doctor :</strong> ${orBlank(doctorName)}</div>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Case :</strong> ${orBlank(caseText)}</div>
          <div><strong>Reference :</strong> ${orBlank(reference)}</div>
        </div>
        ${optionalRow("Symptoms", record.symptoms_description || record.notes)}
        ${optionalRow("Allergies", record.known_allergies)}
        ${optionalRow("Previous issue", record.previous_medical_issue)}
        ${optionalRow("Note", record.note)}
      </div>

      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Collection Payments</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
                <th style="padding: 7px 8px; text-align: left;">SL</th>
                <th style="padding: 7px 8px; text-align: left;">Account</th>
                <th style="padding: 7px 8px; text-align: left;">Date</th>
                <th style="padding: 7px 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>
        <div style="background: #f8fafb; padding: 12px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Rent:</span><strong>${formatMoney(rent)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Discount:</span><strong>${formatMoney(discount)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>Tax:</span><strong>${formatMoney(tax)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 6px;"><span>Total:</span><strong>${formatMoney(total)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #388e3c;"><span>Paid:</span><strong>${formatMoney(paid)}</strong></div>
          <div style="display: flex; justify-content: space-between; color: #d32f2f; font-weight: bold;"><span>Due:</span><strong>${formatMoney(due)}</strong></div>
        </div>
      </div>
      `;
}

export function printAmbulanceReceipt(record) {
  return printHtml(buildAmbulanceReceiptHtml(record), "AMBULANCE SERVICE INVOICE");
}
