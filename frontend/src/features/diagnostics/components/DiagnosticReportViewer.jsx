import { useCallback, useEffect, useMemo, useState } from "react";

import { apiBlob, apiRequest } from "../../../lib/api";
import { printHtml } from "../../../lib/print";
import { DiagnosticImageViewer } from "./DiagnosticImageViewer";

/**
 * Reads one investigation.
 *
 * A finalised report is shown from its stored version snapshot, not from the live
 * study rows — that snapshot is the signed document, and rendering it is the only
 * way the screen shows what was actually issued. A study that is not yet final has
 * no snapshot, so its current working content is shown instead and labelled as such.
 *
 * When a report has been amended, the correction is what opens, with the earlier
 * versions listed alongside so the original stays one click away rather than being
 * quietly replaced.
 */

const CATEGORY_LABEL = {
  laboratory: "Laboratory",
  radiology: "Radiology",
  cardiology: "Cardiology",
  histopathology: "Histopathology",
  microbiology: "Microbiology",
  cytology: "Cytology",
  ophthalmology: "Ophthalmology",
  ent: "ENT",
  dental: "Dental",
  pulmonary: "Pulmonary",
  specialized: "Specialized",
};

const STATUS_LABEL = {
  ordered: "Ordered",
  sample_collected: "Sample collected",
  processing: "Processing",
  result_entered: "Result entered",
  under_review: "Under review",
  verified: "Verified",
  final: "Final",
  cancelled: "Cancelled",
};

const FLAG_STYLE = {
  low: "text-[#1b6bb5]",
  high: "text-[#c0392b]",
  critical_low: "font-semibold text-[#1b4f8a]",
  critical_high: "font-semibold text-[#96281b]",
  abnormal: "text-[#c0392b]",
  normal: "text-[#3c4349]",
};

const FLAG_LABEL = {
  low: "Low",
  high: "High",
  critical_low: "Critical low",
  critical_high: "Critical high",
  abnormal: "Abnormal",
  normal: "",
};

const dateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
};

const dateOnly = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
};

const rangeText = (row) => {
  if (row.ref_range_text) return row.ref_range_text;
  const low = row.ref_range_low;
  const high = row.ref_range_high;
  const hasLow = low !== null && low !== undefined && low !== "";
  const hasHigh = high !== null && high !== undefined && high !== "";
  if (hasLow && hasHigh) return `${low} – ${high}`;
  if (hasLow) return `> ${low}`;
  if (hasHigh) return `< ${high}`;
  // Nothing on file. An empty cell is correct; a range must never be implied.
  return "—";
};

/**
 * DECIMAL columns arrive as strings such as "8.200000". Printing that on a report
 * reads as a data error, so trailing zeros are dropped. The value itself is never
 * rounded or reformatted — only zero padding is removed.
 */
const trimNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  if (!/^-?\d+\.\d+$/.test(text)) return text;
  return text.replace(/0+$/, "").replace(/\.$/, "");
};

const valueOf = (row) => {
  if (row.result_value !== null && row.result_value !== undefined && row.result_value !== "") {
    return row.result_value;
  }
  if (row.result_numeric !== null && row.result_numeric !== undefined && row.result_numeric !== "") {
    return trimNumber(row.result_numeric);
  }
  return "—";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function Section({ title, children }) {
  return (
    <section className="border-t border-[#e8edef] pt-3">
      <h4 className="pb-2 text-[12px] font-semibold tracking-wide text-[#327b84] uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <span className="block text-[11px] text-[#8b959b]">{label}</span>
      <span className="block text-[13px] text-[#2c343a]">{value}</span>
    </div>
  );
}

function Narrative({ label, body }) {
  if (!body) return null;
  return (
    <div className="pb-3">
      <span className="block pb-1 text-[12px] font-semibold text-[#40484e]">{label}</span>
      <p className="whitespace-pre-wrap text-[13px] leading-[1.55] text-[#2c343a]">{body}</p>
    </div>
  );
}

export function DiagnosticReportViewer({ studyId, onClose }) {
  const [study, setStudy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionNo, setSelectedVersionNo] = useState(null);
  const [versionContent, setVersionContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImages, setShowImages] = useState(false);

  /* ── the study, plus its version chain ──────────────────────────────────── */
  useEffect(() => {
    if (!studyId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest(`/diagnostics/${studyId}`),
      apiRequest(`/diagnostics/${studyId}/versions`).catch(() => null),
    ])
      .then(([studyResponse, versionResponse]) => {
        if (cancelled) return;
        setStudy(studyResponse?.data || null);

        const rows = Array.isArray(versionResponse?.data?.versions)
          ? versionResponse.data.versions
          : [];
        setVersions(rows);

        // Open at the version in force, which for an amended report is the
        // correction rather than the original.
        const currentVersion = rows.find((v) => v.is_current) || rows[rows.length - 1];
        setSelectedVersionNo(currentVersion ? currentVersion.version_no : null);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError.message || "Could not load this investigation");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studyId]);

  /* ── the selected version's frozen content ──────────────────────────────── */
  useEffect(() => {
    if (!studyId || selectedVersionNo === null) {
      setVersionContent(null);
      return undefined;
    }

    let cancelled = false;
    apiRequest(`/diagnostics/${studyId}/versions/${selectedVersionNo}`)
      .then((response) => {
        if (!cancelled) setVersionContent(response?.data || null);
      })
      .catch(() => {
        if (!cancelled) setVersionContent(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVersionNo, studyId]);

  const snapshot = versionContent?.content || null;
  const isSnapshot = Boolean(snapshot);

  /* Content to render: the signed snapshot when there is one, the working study
     otherwise. Kept in one shape so the markup below has a single source. */
  const view = useMemo(() => {
    if (snapshot) {
      const frozen = snapshot.doctors || {};
      const named = (doctor) =>
        doctor ? { ...doctor, name: doctor.name || doctor.doctor_code || null } : null;

      return {
        patient: snapshot.patient || {},
        study: snapshot.study || {},
        doctors: { referring: named(frozen.referring), performing: named(frozen.performing) },
        signatories: snapshot.signatories || {},
        report: snapshot.report || null,
        result: snapshot.result || {},
        narrative: snapshot.narrative || {},
        attachmentCount: (snapshot.attachments || []).length,
      };
    }

    if (!study) return null;

    return {
      patient: {
        uhid: study.patient?.patient_code,
        name: study.patient?.full_name,
        gender: study.patient?.gender,
        phone: study.patient?.phone,
        blood_group: study.patient?.blood_group,
      },
      study: {
        study_code: study.study_code,
        category: study.category,
        modality: study.modality,
        test_name: study.test_name,
        status: study.status,
        study_datetime: study.study_datetime,
        sample_collected_at: study.sample_collected_at,
        result_at: study.result_at,
        clinical_history: study.clinical_history,
        procedure_note: study.procedure_note,
        body_part: study.body_part,
        laterality: study.laterality,
        views: study.views,
        contrast_used: study.contrast_used,
        contrast_agent: study.contrast_agent,
        specimen: study.specimen,
        sample_type: study.sample_type,
        collection_method: study.collection_method,
        adequacy: study.adequacy,
      },
      doctors: {
        // Falls back to the code when a doctor row has no linked user, so the
        // referrer is still identifiable instead of appearing blank.
        referring: study.referring_doctor
          ? {
              name:
                study.referring_doctor.user?.full_name || study.referring_doctor.doctor_code || null,
              doctor_code: study.referring_doctor.doctor_code,
            }
          : null,
        performing: study.performing_doctor
          ? {
              name:
                study.performing_doctor.user?.full_name || study.performing_doctor.doctor_code || null,
              doctor_code: study.performing_doctor.doctor_code,
            }
          : null,
      },
      signatories: {
        verified_at: study.verified_at,
        finalized_at: study.finalized_at,
      },
      report: study.report ? { report_number: study.report.report_number } : null,
      result: {
        parameters: study.parameters || [],
        measurements: study.measurements || [],
        findings: study.findings || [],
        organisms: study.organisms || [],
      },
      narrative: {
        interpretation: study.interpretation,
        impression: study.impression,
        conclusion: study.conclusion,
        recommendation: study.recommendation,
      },
      attachmentCount: (study.attachments || []).length,
    };
  }, [snapshot, study]);

  const selectedVersion = versions.find((v) => v.version_no === selectedVersionNo) || null;

  const [pdfBusy, setPdfBusy] = useState(false);

  /**
   * Opens the issued PDF of the selected version. The server renders it from the
   * stored snapshot and keeps the file, so this is the document of record rather
   * than a re-render of whatever the screen happens to show.
   */
  const openPdf = useCallback(async () => {
    if (!studyId || selectedVersionNo === null) return;
    setPdfBusy(true);
    try {
      const blob = await apiBlob(`/diagnostics/${studyId}/versions/${selectedVersionNo}/pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      // Revoked after the new tab has had a chance to read it.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (pdfError) {
      setError(pdfError.message || "Could not produce the report PDF");
    } finally {
      setPdfBusy(false);
    }
  }, [selectedVersionNo, studyId]);

  const print = useCallback(() => {
    if (!view) return;

    const rows = (view.result.parameters || [])
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.parameter_name)}</td>
          <td>${escapeHtml(valueOf(row))}</td>
          <td>${escapeHtml(row.unit || "")}</td>
          <td>${escapeHtml(rangeText(row))}</td>
          <td>${escapeHtml(FLAG_LABEL[row.flag] || "")}</td>
        </tr>`
      )
      .join("");

    const measurements = (view.result.measurements || [])
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value_text || trimNumber(row.value_numeric))}</td>
          <td>${escapeHtml(row.unit || "")}</td>
          <td>${escapeHtml(row.normal_range || "")}</td>
        </tr>`
      )
      .join("");

    const findings = (view.result.findings || [])
      .map(
        (row) =>
          `<div class="block"><strong>${escapeHtml(row.section || "Findings")}</strong>` +
          `<p>${escapeHtml(row.body)}</p></div>`
      )
      .join("");

    const organisms = (view.result.organisms || [])
      .map((row) => {
        const sens = (row.sensitivities || [])
          .map(
            (s) =>
              `<tr><td>${escapeHtml(s.antibiotic)}</td><td>${escapeHtml(
                s.interpretation || ""
              )}</td><td>${escapeHtml(s.mic || "")}</td></tr>`
          )
          .join("");
        return (
          `<div class="block"><strong>${escapeHtml(row.organism_name)}</strong>` +
          `<p>${escapeHtml(
            [row.growth, row.colony_count, row.culture_medium].filter(Boolean).join(" · ")
          )}</p>` +
          (sens
            ? `<table><thead><tr><th>Antibiotic</th><th>Interpretation</th><th>MIC</th></tr></thead><tbody>${sens}</tbody></table>`
            : "") +
          `</div>`
        );
      })
      .join("");

    const amendmentNote = selectedVersion?.amendment_reason
      ? `<div class="amend"><strong>Amended report — version ${escapeHtml(
          selectedVersion.version_no
        )}</strong><p>Reason: ${escapeHtml(selectedVersion.amendment_reason)}</p>
        <p>Issued ${escapeHtml(dateTime(selectedVersion.issued_at))}. The original version remains on record.</p></div>`
      : "";

    const provisional = isSnapshot
      ? ""
      : `<div class="amend"><strong>Not a finalised report</strong>
         <p>This investigation is "${escapeHtml(
           STATUS_LABEL[view.study.status] || view.study.status || ""
         )}" and has not been signed off.</p></div>`;

    // Letterhead comes from Settings -> Company Profile, exactly as every other
    // print in the app does; it is not hardcoded here.
    printHtml(
      `
      <style>
        h2 { margin: 0 0 2px; font-size: 16px; }
        .sub { color: #555; font-size: 11px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; margin-bottom: 12px; }
        .grid span { display: block; }
        .grid .k { color: #777; font-size: 10px; }
        .grid .v { font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 11px; text-align: left; }
        th { background: #f0f4f5; }
        .block { margin-bottom: 10px; }
        .block p { margin: 2px 0 0; font-size: 12px; white-space: pre-wrap; }
        .amend { border: 1px solid #c99; background: #fdf4f4; padding: 6px 8px; margin-bottom: 10px; font-size: 11px; }
        .amend p { margin: 2px 0 0; }
        .sig { margin-top: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; font-size: 11px; }
        .sig div { border-top: 1px solid #999; padding-top: 3px; }
      </style>
      <h2>${escapeHtml(view.study.test_name || "Investigation report")}</h2>
      <div class="sub">
        ${escapeHtml(CATEGORY_LABEL[view.study.category] || view.study.category || "")}
        ${view.study.modality ? ` · ${escapeHtml(view.study.modality)}` : ""}
        · ${escapeHtml(view.study.study_code || "")}
        ${view.report?.report_number ? ` · Report ${escapeHtml(view.report.report_number)}` : ""}
      </div>

      ${provisional}
      ${amendmentNote}

      <div class="grid">
        <div><span class="k">Patient</span><span class="v">${escapeHtml(view.patient.name || "")}</span></div>
        <div><span class="k">UHID</span><span class="v">${escapeHtml(view.patient.uhid || "")}</span></div>
        <div><span class="k">Age / Sex</span><span class="v">${escapeHtml(
          [view.patient.age_at_study ? `${view.patient.age_at_study} y` : "", view.patient.gender]
            .filter(Boolean)
            .join(" / ")
        )}</span></div>
        <div><span class="k">Blood group</span><span class="v">${escapeHtml(
          view.patient.blood_group || ""
        )}</span></div>
        <div><span class="k">Study date</span><span class="v">${escapeHtml(
          dateTime(view.study.study_datetime)
        )}</span></div>
        <div><span class="k">Reported</span><span class="v">${escapeHtml(
          dateTime(view.study.result_at)
        )}</span></div>
        <div><span class="k">Referred by</span><span class="v">${escapeHtml(
          view.doctors.referring?.name || ""
        )}</span></div>
        <div><span class="k">Reported by</span><span class="v">${escapeHtml(
          view.doctors.performing?.name || ""
        )}</span></div>
      </div>

      ${
        view.study.clinical_history
          ? `<div class="block"><strong>Clinical history</strong><p>${escapeHtml(
              view.study.clinical_history
            )}</p></div>`
          : ""
      }

      ${
        rows
          ? `<table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>`
          : ""
      }
      ${
        measurements
          ? `<table><thead><tr><th>Measurement</th><th>Value</th><th>Unit</th><th>Normal</th></tr></thead><tbody>${measurements}</tbody></table>`
          : ""
      }
      ${findings}
      ${organisms}

      ${
        view.narrative.interpretation
          ? `<div class="block"><strong>Interpretation</strong><p>${escapeHtml(
              view.narrative.interpretation
            )}</p></div>`
          : ""
      }
      ${
        view.narrative.impression
          ? `<div class="block"><strong>Impression</strong><p>${escapeHtml(
              view.narrative.impression
            )}</p></div>`
          : ""
      }
      ${
        view.narrative.conclusion
          ? `<div class="block"><strong>Conclusion</strong><p>${escapeHtml(
              view.narrative.conclusion
            )}</p></div>`
          : ""
      }
      ${
        view.narrative.recommendation
          ? `<div class="block"><strong>Recommendation</strong><p>${escapeHtml(
              view.narrative.recommendation
            )}</p></div>`
          : ""
      }

      <div class="sig">
        <div>Verified: ${escapeHtml(
          view.signatories.verified_by?.name || ""
        )} ${escapeHtml(view.signatories.verified_at ? dateOnly(view.signatories.verified_at) : "")}</div>
        <div>Issued: ${escapeHtml(
          view.signatories.finalized_by?.name || ""
        )} ${escapeHtml(view.signatories.finalized_at ? dateOnly(view.signatories.finalized_at) : "")}</div>
      </div>
    `,
      isSnapshot ? "DIAGNOSTIC REPORT" : "PROVISIONAL RESULT — NOT FINALISED"
    );
  }, [isSnapshot, selectedVersion, view]);

  const button =
    "rounded-[3px] border border-[#d6dde0] bg-white px-2.5 py-[4px] text-[12px] leading-none text-[#40484e] transition-colors hover:bg-[#eef3f5] disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[rgba(16,26,31,0.6)] p-3 sm:p-6">
      <div className="w-full max-w-[980px] rounded-[8px] bg-white shadow-[0_18px_44px_rgba(9,20,26,0.35)]">
        {/* header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e4eaec] bg-[#f7fafb] px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-[#1f252b]">
              {view?.study.test_name || "Investigation"}
            </h3>
            <p className="truncate text-[11px] text-[#7b858c]">
              {view?.study.study_code}
              {view?.report?.report_number ? ` · Report ${view.report.report_number}` : ""}
              {view?.study.category ? ` · ${CATEGORY_LABEL[view.study.category] || view.study.category}` : ""}
            </p>
          </div>

          <button className={button} disabled={!view} onClick={print} type="button">
            Print
          </button>
          {/* Only a finalised report has an issued PDF; a working result has none. */}
          <button
            className={button}
            disabled={!isSnapshot || pdfBusy}
            onClick={openPdf}
            title={isSnapshot ? "Open the issued PDF" : "Only a finalised report has an issued PDF"}
            type="button"
          >
            {pdfBusy ? "Preparing…" : "Report PDF"}
          </button>
          {/* Enabled even with no attachment: an open study needs a way in to add
              its first picture, and the viewer itself carries the upload control. */}
          <button
            className={button}
            disabled={!view}
            onClick={() => setShowImages(true)}
            type="button"
            title={view?.attachmentCount ? "View images" : "Add or view images"}
          >
            Images{view?.attachmentCount ? ` (${view.attachmentCount})` : ""}
          </button>
          <button className={button} onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="px-4 py-3">
          {loading && <p className="py-8 text-center text-[13px] text-[#6b757c]">Loading…</p>}
          {!loading && error && <p className="py-8 text-center text-[13px] text-[#c0392b]">{error}</p>}

          {!loading && !error && view && (
            <>
              {/* provenance banner */}
              {!isSnapshot && (
                <div className="mb-3 rounded-[4px] border border-[#e3d6a8] bg-[#fdf9ec] px-3 py-2 text-[12px] text-[#6b5a1f]">
                  <strong>Working result, not a finalised report.</strong> This investigation is
                  “{STATUS_LABEL[view.study.status] || view.study.status}” and has not been signed off, so
                  what is shown here can still change.
                </div>
              )}

              {isSnapshot && selectedVersion?.amendment_reason && (
                <div className="mb-3 rounded-[4px] border border-[#d9b3b3] bg-[#fdf4f4] px-3 py-2 text-[12px] text-[#7b3b3b]">
                  <strong>Amended report — version {selectedVersion.version_no}.</strong>{" "}
                  {selectedVersion.amendment_reason}
                  <span className="block pt-0.5 text-[11px] text-[#8d5a5a]">
                    Issued {dateTime(selectedVersion.issued_at)}
                    {selectedVersion.changed_fields?.length
                      ? ` · changed: ${selectedVersion.changed_fields.join(", ")}`
                      : ""}
                    . The original version is still on record below.
                  </span>
                </div>
              )}

              {/* version chain */}
              {versions.length > 1 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[#7b858c]">Versions:</span>
                  {versions.map((version) => (
                    <button
                      className={`rounded-[3px] border px-2 py-[3px] text-[11px] leading-none transition-colors ${
                        version.version_no === selectedVersionNo
                          ? "border-[#327b84] bg-[#e6f1f2] text-[#245e66]"
                          : "border-[#dfe6e9] bg-white text-[#5d666d] hover:bg-[#eef3f5]"
                      }`}
                      key={version.id}
                      onClick={() => setSelectedVersionNo(version.version_no)}
                      type="button"
                    >
                      v{version.version_no}
                      {version.is_current ? " · current" : ""}
                      {version.version_status === "amended" ? " · amended" : ""}
                    </button>
                  ))}
                </div>
              )}

              {/* identity */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-3 sm:grid-cols-4">
                <Field label="Patient" value={view.patient.name} />
                <Field label="UHID" value={view.patient.uhid} />
                <Field
                  label="Age / Sex"
                  value={
                    [view.patient.age_at_study ? `${view.patient.age_at_study} y` : "", view.patient.gender]
                      .filter(Boolean)
                      .join(" / ") || null
                  }
                />
                <Field label="Blood group" value={view.patient.blood_group} />
                <Field label="Study date" value={dateTime(view.study.study_datetime)} />
                <Field label="Reported" value={dateTime(view.study.result_at)} />
                <Field label="Referred by" value={view.doctors.referring?.name} />
                <Field label="Reported by" value={view.doctors.performing?.name} />
                <Field label="Status" value={STATUS_LABEL[view.study.status] || view.study.status} />
                <Field label="Modality" value={view.study.modality} />
                <Field label="Body part" value={view.study.body_part} />
                <Field label="Laterality" value={view.study.laterality} />
                <Field label="Specimen" value={view.study.specimen} />
                <Field label="Sample type" value={view.study.sample_type} />
                <Field label="Views" value={view.study.views} />
                <Field
                  label="Contrast"
                  value={view.study.contrast_used ? view.study.contrast_agent || "Used" : null}
                />
              </div>

              {view.study.clinical_history && (
                <Section title="Clinical history">
                  <p className="whitespace-pre-wrap pb-3 text-[13px] leading-[1.55] text-[#2c343a]">
                    {view.study.clinical_history}
                  </p>
                </Section>
              )}

              {/* parameters */}
              {(view.result.parameters || []).length > 0 && (
                <Section title="Results">
                  <div className="overflow-x-auto pb-3">
                    <table className="w-full min-w-[560px] border-collapse">
                      <thead>
                        <tr className="bg-[#f2f6f7]">
                          {["Test", "Result", "Unit", "Reference", "Flag"].map((head) => (
                            <th
                              className="border border-[#e2e8ea] px-2 py-1.5 text-left text-[11px] font-semibold text-[#40484e]"
                              key={head}
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {view.result.parameters.map((row, position) => (
                          <tr key={`${row.parameter_name}-${position}`}>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#2c343a]">
                              {row.group_label ? (
                                <span className="block text-[10px] text-[#9aa4aa]">{row.group_label}</span>
                              ) : null}
                              {row.parameter_name}
                            </td>
                            <td
                              className={`border border-[#e2e8ea] px-2 py-1.5 text-[12px] ${
                                FLAG_STYLE[row.flag] || "text-[#2c343a]"
                              }`}
                            >
                              {valueOf(row)}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                              {row.unit || "—"}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                              {rangeText(row)}
                            </td>
                            <td
                              className={`border border-[#e2e8ea] px-2 py-1.5 text-[12px] ${
                                FLAG_STYLE[row.flag] || "text-[#5d666d]"
                              }`}
                            >
                              {FLAG_LABEL[row.flag] || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {/* measurements */}
              {(view.result.measurements || []).length > 0 && (
                <Section title="Measurements">
                  <div className="overflow-x-auto pb-3">
                    <table className="w-full min-w-[520px] border-collapse">
                      <thead>
                        <tr className="bg-[#f2f6f7]">
                          {["Measurement", "Site", "Value", "Unit", "Normal"].map((head) => (
                            <th
                              className="border border-[#e2e8ea] px-2 py-1.5 text-left text-[11px] font-semibold text-[#40484e]"
                              key={head}
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {view.result.measurements.map((row, position) => (
                          <tr key={`${row.label}-${position}`}>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#2c343a]">
                              {row.label}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                              {row.site || "—"}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#2c343a]">
                              {row.value_text || trimNumber(row.value_numeric) || "—"}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                              {row.unit || "—"}
                            </td>
                            <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                              {row.normal_range || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {/* findings */}
              {(view.result.findings || []).length > 0 && (
                <Section title="Findings">
                  {view.result.findings.map((row, position) => (
                    <Narrative
                      body={row.body}
                      key={`${row.section}-${position}`}
                      label={row.section || "Findings"}
                    />
                  ))}
                </Section>
              )}

              {/* organisms */}
              {(view.result.organisms || []).length > 0 && (
                <Section title="Culture and sensitivity">
                  {view.result.organisms.map((organism, position) => (
                    <div className="pb-3" key={`${organism.organism_name}-${position}`}>
                      <p className="text-[13px] font-semibold text-[#2c343a]">
                        {organism.organism_name}
                      </p>
                      <p className="pb-1 text-[11px] text-[#7b858c]">
                        {[organism.growth, organism.colony_count, organism.culture_medium]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      {(organism.sensitivities || []).length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[420px] border-collapse">
                            <thead>
                              <tr className="bg-[#f2f6f7]">
                                {["Antibiotic", "Interpretation", "MIC", "Zone (mm)"].map((head) => (
                                  <th
                                    className="border border-[#e2e8ea] px-2 py-1 text-left text-[11px] font-semibold text-[#40484e]"
                                    key={head}
                                  >
                                    {head}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {organism.sensitivities.map((s, sPosition) => (
                                <tr key={`${s.antibiotic}-${sPosition}`}>
                                  <td className="border border-[#e2e8ea] px-2 py-1 text-[12px] text-[#2c343a]">
                                    {s.antibiotic}
                                  </td>
                                  <td className="border border-[#e2e8ea] px-2 py-1 text-[12px] text-[#2c343a]">
                                    {s.interpretation || "—"}
                                  </td>
                                  <td className="border border-[#e2e8ea] px-2 py-1 text-[12px] text-[#5d666d]">
                                    {s.mic || "—"}
                                  </td>
                                  <td className="border border-[#e2e8ea] px-2 py-1 text-[12px] text-[#5d666d]">
                                    {trimNumber(s.zone_diameter_mm) || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* narrative */}
              {(view.narrative.interpretation ||
                view.narrative.impression ||
                view.narrative.conclusion ||
                view.narrative.recommendation) && (
                <Section title="Report">
                  <Narrative body={view.narrative.interpretation} label="Interpretation" />
                  <Narrative body={view.narrative.impression} label="Impression" />
                  <Narrative body={view.narrative.conclusion} label="Conclusion" />
                  <Narrative body={view.narrative.recommendation} label="Recommendation" />
                </Section>
              )}

              {/* signatures */}
              <Section title="Sign-off">
                <div className="grid grid-cols-2 gap-4 pb-2">
                  <Field
                    label="Verified"
                    value={
                      [
                        view.signatories.verified_by?.name,
                        view.signatories.verified_at ? dateTime(view.signatories.verified_at) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Not verified"
                    }
                  />
                  <Field
                    label="Issued"
                    value={
                      [
                        view.signatories.finalized_by?.name,
                        view.signatories.finalized_at ? dateTime(view.signatories.finalized_at) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Not issued"
                    }
                  />
                </div>
              </Section>
            </>
          )}
        </div>
      </div>

      {showImages && study && (
        <DiagnosticImageViewer onClose={() => setShowImages(false)} study={study} />
      )}
    </div>
  );
}
