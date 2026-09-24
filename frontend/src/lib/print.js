import { getStoredUser } from "./auth";

/**
 * Utility for printing HTML content without popup blocker issues.
 * Uses a temporary hidden iframe so browser popups are never blocked.
 * Content is wrapped in the configured hospital's letterhead (from Settings →
 * Company Profile); no organisation, clinician or patient identity is defaulted.
 */

/** BUG-014 — the operator is the authenticated user, not a literal string. */
function readPrintOperatorName() {
  const user = getStoredUser();
  return user?.full_name || user?.username || user?.email || "";
}
/**
 * BUG-022 — every value below is interpolated into an HTML string that is then
 * written into a same-origin iframe. Unescaped, a patient name containing
 * markup executes with access to the parent's localStorage (where the auth
 * tokens live). All interpolated values must pass through this.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders one signature column. An unknown signatory yields a blank ruled line
 * — never a fabricated name (BUG-014).
 */
function renderSignatureBlock(signatory) {
  if (!signatory || !signatory.name) {
    return `
            <div style="text-align: left; width: 45%;">
              <div style="border-top: 1px solid #000; padding-top: 4px; min-height: 18px;">&nbsp;</div>
              <div style="color: #888; font-size: 11px;">Signature &amp; Seal</div>
            </div>`;
  }
  return `
            <div style="text-align: left; width: 45%;">
              <div style="border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">${escapeHtml(signatory.name)}</div>
              ${signatory.degrees ? `<div>${escapeHtml(signatory.degrees)}</div>` : ""}
              ${signatory.designation ? `<div style="color: #444;">${escapeHtml(signatory.designation)}</div>` : ""}
            </div>`;
}

/**
 * @param {object} options
 * @param {object} [options.companyProfile] Hospital identity from Settings.
 * @param {Array<{name,degrees,designation}>} [options.signatories] Real signatories; blank lines when omitted.
 * @param {string} [options.printedBy] Authenticated operator's name.
 */
export function printHtml(htmlContent, title = "DOCUMENT REPORT", companyProfile = {}, options = {}) {
  return new Promise((resolve) => {
    // BUG-063 — identity comes from the configured company profile. Falling back
    // to a specific real clinic's name, address, phone and e-mail meant every
    // deployment printed another organisation's letterhead.
    const companyTitle = companyProfile.title || "";
    const companyAddress = companyProfile.address || "";
    const companyMobile = companyProfile.mobile || "";
    const companyEmail = companyProfile.email || "";
    const companyWeb = companyProfile.web || "";
    const logoUrl = companyProfile.logo_url || "";
    const printedOn = new Date().toLocaleString();
    const signatories = Array.isArray(options.signatories) ? options.signatories : [];
    const printedByName = options.printedBy || readPrintOperatorName();
    const watermarkText = String(companyTitle || "").split(" ")[0] || "";

    const isFullDoc = typeof htmlContent === "string" && (htmlContent.includes("ibn-sina-template") || htmlContent.includes("<!-- IBN_SINA_WRAPPER -->"));

    const finalBodyContent = isFullDoc
      ? htmlContent
      : `
        <!-- IBN_SINA_WRAPPER -->
        <div style="font-family: 'Times New Roman', Times, serif; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; position: relative;">
          <!-- Watermark Background -->
          <div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.06; pointer-events: none; z-index: 0; text-align: center;">
            <div style="font-size: 80px; font-weight: 900; color: #b31217; letter-spacing: 5px;">${escapeHtml(watermarkText)}</div>
          </div>

          <!-- Header Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #222; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" style="height: 65px; object-fit: contain;" alt="Logo" />`
                  : `<div style="font-size: 26px; font-weight: bold; color: #b31217; border: 2px solid #b31217; padding: 4px 10px; border-radius: 4px;">${escapeHtml(watermarkText)}</div>`
              }
            </div>
            <div style="text-align: right; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #222;">
              <div><span style="color: red;">●</span> ${escapeHtml(companyAddress)}</div>
              <div><span style="color: red;">●</span> Mobile: ${escapeHtml(companyMobile)} <span style="color: red;">●</span> E-mail: ${escapeHtml(companyEmail)}</div>
              <div><span style="color: red;">●</span> Web: ${escapeHtml(companyWeb)}</div>
            </div>
          </div>

          <!-- Company Title Heading -->
          <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; letter-spacing: 1px; margin: 0; text-transform: uppercase; color: #111;">
              ${escapeHtml(companyTitle)}
            </h1>
            <h2 style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin: 6px 0; text-transform: uppercase; color: #000;">
              ${escapeHtml(title)}
            </h2>
          </div>

          <!-- Document Main Content -->
          <div style="position: relative; z-index: 1; font-family: Arial, sans-serif; font-size: 13px;">
            ${htmlContent}
          </div>

          <!-- Footer Signatures -->
          <!--
            BUG-014: this block previously hardcoded two named clinicians
            ("Mohaiminul Islam Raju" / "Prof. Nazim Ahmed") onto EVERY printed
            document, including invoices and ambulance records — a forged
            professional attestation. Signatories must now be supplied by the
            caller; when none are known the space is left blank for a wet
            signature rather than filled with someone's name.
          -->
          <div style="display: flex; justify-content: space-between; margin-top: 60px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
            ${renderSignatureBlock(signatories[0])}
            ${renderSignatureBlock(signatories[1])}
          </div>

          <!-- Bottom Print Info -->
          <div style="display: flex; justify-content: space-between; margin-top: 25px; font-family: Arial, sans-serif; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 6px;">
            <div>Printed By: ${escapeHtml(printedByName)}</div>
            <div>Print On: ${escapeHtml(printedOn)}</div>
          </div>
        </div>
      `;

    // Create hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 16px;
              color: #1f2c33;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            @media print {
              body {
                padding: 0px;
              }
            }
          </style>
        </head>
        <body>
          ${finalBodyContent}
        </body>
      </html>
    `);
    doc.close();

    // Give browser time to parse HTML content before printing
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          resolve(true);
        }, 1000);
      }
    }, 300);
  });
}

/**
 * Generates an IBN SINA Style Report & Invoice HTML Document
 */
export function generateIbnSinaInvoiceHtml({
  company = {},
  patient = {},
  reportTitle = "HAEMATOLOGY REPORT",
  note = "",
  rows = [],
  columns = ["Parameters", "Test Result", "Reference Range"],
  comment = "",
  // BUG-014 — no default signatories. An unsigned column prints a blank ruled
  // line for a wet signature instead of attributing the report to a named
  // professional who never reviewed it.
  technologist = null,
  doctor = null,
  printedBy = readPrintOperatorName(),
  printOn = new Date().toLocaleString(),
}) {
  const companyTitle = company.title || "";
  const companyAddress = company.address || "";
  const companyMobile = company.mobile || "";
  const companyEmail = company.email || "";
  const companyWeb = company.web || "";
  const logoUrl = company.logo_url || "";

  // BUG-014 — these fields previously defaulted to a specific real-looking
  // patient ("MOSHARAF HOSSAIN", ID "N106265", age "54 Y", sex "M") and a named
  // referring doctor. A report rendered with missing data therefore looked like
  // a valid report for the wrong person: a wrong-patient result hazard. Missing
  // identity now renders blank, and `printIbnSinaInvoice` refuses to print when
  // the essentials are absent.
  const patientId = patient.id_no || patient.patient_code || "";
  const voucherTime = patient.voucher_time || "";
  const reportingTime = patient.reporting_time || "";
  const patientName = patient.name || patient.full_name || "";
  const age = patient.age ? `${patient.age} Y` : "";
  const sex = patient.sex || patient.gender || "";
  const specimen = patient.specimen || "";
  const refBy = patient.ref_by || "";

  return `
    <!-- IBN_SINA_WRAPPER -->
    <div style="font-family: 'Times New Roman', Times, serif; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; position: relative;">
      <!-- Watermark Background -->
      <div style="position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); opacity: 0.07; pointer-events: none; z-index: 0; text-align: center;">
        <div style="font-size: 84px; font-weight: 900; color: #b31217; letter-spacing: 6px;">${escapeHtml(watermarkText)}</div>
      </div>

      <!-- Header Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" style="height: 70px; object-fit: contain;" alt="Logo" />`
              : `<div style="font-size: 28px; font-weight: bold; color: #b31217; border: 2px solid #b31217; padding: 4px 10px; border-radius: 4px;">${escapeHtml(watermarkText)}</div>`
          }
        </div>
        <div style="text-align: right; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #222;">
          <div><span style="color: red;">●</span> ${escapeHtml(companyAddress)}</div>
          <div><span style="color: red;">●</span> Mobile: ${escapeHtml(companyMobile)} <span style="color: red;">●</span> E-mail: ${escapeHtml(companyEmail)}</div>
          <div><span style="color: red;">●</span> Web: ${escapeHtml(companyWeb)}</div>
        </div>
      </div>

      <!-- Company Title Heading -->
      <div style="text-align: center; margin-bottom: 5px;">
        <h1 style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; letter-spacing: 1px; margin: 0; text-transform: uppercase; color: #111;">
          ${escapeHtml(companyTitle)}
        </h1>
        <h2 style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin: 6px 0; text-transform: uppercase; color: #000;">
          ${escapeHtml(reportTitle)}
        </h2>
      </div>

      <!-- Patient Information Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 4px;">
          <div><strong>ID No :</strong> ${escapeHtml(patientId)} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Voucher Time:</strong> ${escapeHtml(voucherTime)}</div>
          <div><strong>Reporting Time:</strong> ${escapeHtml(reportingTime)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 4px;">
          <div><strong>Name :</strong> ${escapeHtml(patientName)}</div>
          <div><strong>Age:</strong> ${escapeHtml(age)} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Sex:</strong> ${escapeHtml(sex)} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Specimen:</strong> ${escapeHtml(specimen)}</div>
        </div>
        <div>
          <strong>Ref. By :</strong> ${escapeHtml(refBy)}
        </div>
      </div>

      ${
        note
          ? `<div style="font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 15px; color: #333; font-style: italic;">${note}</div>`
          : ""
      }

      <!-- Results Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px; position: relative; z-index: 1;">
        <thead>
          <tr style="border-bottom: 2px solid #222; font-family: Arial, sans-serif; text-align: left;">
            <th style="padding: 6px 8px; font-size: 14px; font-weight: bold; width: 40%;">${escapeHtml(columns[0] || "Parameters")}</th>
            <th style="padding: 6px 8px; font-size: 14px; font-weight: bold; width: 30%;">${escapeHtml(columns[1] || "Test Result")}</th>
            <th style="padding: 6px 8px; font-size: 14px; font-weight: bold; width: 30%;">${escapeHtml(columns[2] || "Reference Range")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr style="${row.isGroupHeader ? "font-weight: bold; text-decoration: underline;" : ""}">
              <td style="padding: 5px 8px; ${row.isGroupHeader ? "font-weight: bold;" : ""}">${escapeHtml(row.param || row.name || "")}</td>
              <td style="padding: 5px 8px; ${row.isGroupHeader ? "font-weight: bold;" : ""}">${escapeHtml(row.result || row.value || "")}</td>
              <td style="padding: 5px 8px;">${escapeHtml(row.refRange || row.normalRange || "")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      ${
        comment
          ? `<div style="font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 40px; border-top: 1px solid #ddd; padding-top:8px;"><strong>Comment:</strong> ${comment}</div>`
          : ""
      }

      <!-- Footer Signatures -->
      <div style="display: flex; justify-content: space-between; margin-top: 60px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
        ${renderSignatureBlock(technologist)}
        ${renderSignatureBlock(doctor)}
      </div>

      <!-- Bottom Print Info -->
      <div style="display: flex; justify-content: space-between; margin-top: 25px; font-family: Arial, sans-serif; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 6px;">
        <div>Printed By: ${escapeHtml(printedBy)}</div>
        <div>Print On: ${escapeHtml(printOn)}</div>
      </div>
    </div>
  `;
}

/**
 * BUG-014 — clinical documents must fail safely. A diagnostic report that
 * cannot identify its patient is refused rather than printed with blanks (or,
 * as before, with someone else's details).
 */
export class IncompletePrintDataError extends Error {
  constructor(missing) {
    super(`Cannot print: missing required field(s): ${missing.join(", ")}`);
    this.name = "IncompletePrintDataError";
    this.missing = missing;
  }
}

export function assertPrintablePatient(patient = {}) {
  const missing = [];
  if (!(patient.name || patient.full_name)) missing.push("patient name");
  if (!(patient.id_no || patient.patient_code)) missing.push("patient ID");
  if (missing.length) throw new IncompletePrintDataError(missing);
}

export function printIbnSinaInvoice(options) {
  assertPrintablePatient(options?.patient || {});
  const html = generateIbnSinaInvoiceHtml(options);
  return printHtml(html, options.reportTitle || "Report Document", options.company || {}, {
    signatories: options.signatories,
    printedBy: options.printedBy,
  });
}
