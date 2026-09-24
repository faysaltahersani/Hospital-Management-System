import { apiRequest } from "../../../lib/api";
import { printHtml } from "../../../lib/print";

/**
 * One IPD bill layout, shared by IPD Bill Entry and IPD Bill Record.
 *
 * Two problems it replaces:
 *  - Entry called `window.print()` after saving, which prints the browser window,
 *    and it ran after `resetForm()` — so the printer received the application
 *    chrome around an empty form rather than a bill.
 *  - Record built a standalone HTML document and opened it with `window.open`,
 *    which a popup blocker can stop outright. Printing now goes through the shared
 *    hidden-iframe helper, which is why that helper exists.
 *
 * Figures come from GET /ipd/:id/bill-print, so the receipt shows the same
 * charges, payments and due as the rest of the system rather than a recalculation.
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

// The API sends the string 'N/A' for fields it has no value for. Printing that
// verbatim reads as data; a dash reads as "not recorded".
const orBlank = (value) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text || text === "-" || text.toUpperCase() === "N/A") return "&mdash;";
  return escapeHtml(text);
};

const row = (label, value) => `<p style="margin: 2px 0;"><strong>${label} :</strong> ${orBlank(value)}</p>`;

export function buildIpdReceiptHtml(report = {}) {
  const admission = report.admission || {};
  const patient = report.patient || {};
  const doctor = report.doctor || {};
  const summary = report.summary || {};
  const payments = report.payments || [];

  const bed = admission.bed || {};
  const ward = bed.ward || admission.ward || {};

  const paymentRows = payments.length
    ? payments
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

  const total = summary.total ?? admission.total_charges ?? 0;
  const paid = summary.paid ?? admission.paid_amount ?? 0;
  const due = summary.due ?? admission.due_amount ?? Math.max(Number(total) - Number(paid), 0);

  return `
      <div style="border: 1px solid #222; border-radius: 4px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 8px; font-weight: bold;">
          <div>IPD Bill : ${orBlank(admission.admission_code)}</div>
          <div>Date : ${orBlank(formatDateDisplay(admission.admitted_at))}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; line-height: 1.6;">
          <div>
            ${row("Patient Code", patient.patient_code)}
            ${row("Name", patient.full_name)}
            ${row("Contact", patient.phone)}
            ${row("Gender", patient.gender)}
          </div>
          <div>
            ${row("Age", patient.age)}
            ${row("Blood Group", patient.blood_group)}
            ${row("Doctor", doctor.full_name)}
            ${row("Status", admission.status)}
          </div>
        </div>
        <div style="border-top: 1px solid #ddd; margin-top: 8px; padding-top: 6px; line-height: 1.6;">
          ${row("Ward", ward.name)}
          ${row("Bed", bed.bed_number)}
          ${row("Address", patient.address)}
        </div>
        ${summary.symptoms && summary.symptoms.length ? row("Reason", summary.symptoms.join(", ")) : ""}
        ${summary.notes ? row("Notes", summary.notes) : ""}
      </div>

      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div>
          <div style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Collection Payments</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
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
        </div>
        <div style="background: #f8fafb; padding: 12px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 6px;"><span>Total Charges:</span><strong>${formatMoney(total)}</strong></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #388e3c;"><span>Paid:</span><strong>${formatMoney(paid)}</strong></div>
          <div style="display: flex; justify-content: space-between; color: #d32f2f; font-weight: bold;"><span>Due:</span><strong>${formatMoney(due)}</strong></div>
        </div>
      </div>
      `;
}

/** Fetches the bill payload for an admission and prints it. */
export async function printIpdReceipt(admissionId) {
  const response = await apiRequest(`/ipd/${admissionId}/bill-print`);
  return printHtml(buildIpdReceiptHtml(response.data || {}), "IPD BILL INVOICE");
}
