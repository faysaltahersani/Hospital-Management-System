import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiRequest } from "../../../lib/api";
import { DiagnosticReportViewer } from "./DiagnosticReportViewer";

/**
 * A patient's permanent diagnostic history.
 *
 * Every investigation the patient has ever had, newest first and grouped by year,
 * with the filters a clinician actually uses to find one. This page loads study
 * rows only — no images and no report content. Opening a patient with years of
 * imaging must stay cheap, so pictures are fetched only when a specific study's
 * viewer is opened.
 *
 * Reached as /diagnostics/history?patientId=<id>, which is how the Patient List
 * links into it.
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

const STATUS_STYLE = {
  final: "bg-[#e4f2e5] text-[#2c6e31]",
  verified: "bg-[#e6f1f2] text-[#245e66]",
  result_entered: "bg-[#fdf4e3] text-[#8a6316]",
  under_review: "bg-[#fdf4e3] text-[#8a6316]",
  processing: "bg-[#eef1f3] text-[#5d666d]",
  sample_collected: "bg-[#eef1f3] text-[#5d666d]",
  ordered: "bg-[#eef1f3] text-[#5d666d]",
  cancelled: "bg-[#f7e6e6] text-[#8d3434]",
};

const PAGE_SIZE = 50;

const dateOnly = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
};

/**
 * A doctor's display name. Some doctor rows in this database have no linked user
 * record, so `user.full_name` is null while `doctor_code` is present. Showing the
 * code is better than a dash: the referrer is identifiable either way.
 */
const doctorName = (doctor) => {
  if (!doctor) return "—";
  return doctor.user?.full_name || doctor.doctor_code || "—";
};

const yearOf = (value) => {
  if (!value) return "Undated";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Undated";
  return String(parsed.getFullYear());
};

const EMPTY_FILTERS = {
  category: "",
  modality: "",
  status: "",
  referring_doctor_id: "",
  performing_doctor_id: "",
  from: "",
  to: "",
  search: "",
};

const input =
  "h-[30px] w-full rounded-[3px] border border-[#d6dde0] bg-white px-2 text-[12px] text-[#2c343a] outline-none focus:border-[#327b84]";
const label = "block pb-1 text-[11px] text-[#7b858c]";
const button =
  "rounded-[3px] border border-[#d6dde0] bg-white px-3 py-[5px] text-[12px] leading-none text-[#40484e] transition-colors hover:bg-[#eef3f5] disabled:cursor-not-allowed disabled:opacity-40";

export function DiagnosticHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId") || "";

  const [patients, setPatients] = useState([]);
  const [meta, setMeta] = useState(null);
  const [patientId, setPatientId] = useState(patientIdParam);
  const [patientQuery, setPatientQuery] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [studies, setStudies] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openStudyId, setOpenStudyId] = useState(null);

  /* ── reference data: the modality catalogue and the pickers ─────────────── */
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiRequest("/diagnostics/meta").catch(() => null),
      apiRequest("/patients?limit=200").catch(() => ({ data: [] })),
      apiRequest("/doctors?limit=200").catch(() => ({ data: [] })),
    ]).then(([metaResponse, patientResponse, doctorResponse]) => {
      if (cancelled) return;
      setMeta({
        categories: metaResponse?.data?.categories || [],
        modalities: metaResponse?.data?.modalities || [],
        statuses: metaResponse?.data?.statuses || Object.keys(STATUS_LABEL),
        doctors: Array.isArray(doctorResponse?.data) ? doctorResponse.data : [],
      });
      setPatients(Array.isArray(patientResponse?.data) ? patientResponse.data : []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── the history itself ─────────────────────────────────────────────────── */
  const load = useCallback(() => {
    if (!patientId) {
      setStudies([]);
      setPagination(null);
      setPatientInfo(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    Object.entries(applied).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) query.set(key, value);
    });

    apiRequest(`/diagnostics/patient/${patientId}/history?${query.toString()}`)
      .then((response) => {
        if (cancelled) return;
        setStudies(Array.isArray(response?.data) ? response.data : []);
        setPagination(response?.meta?.pagination || null);
        setPatientInfo(response?.meta?.patient || null);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError.message || "Could not load the diagnostic history");
        setStudies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applied, page, patientId]);

  useEffect(() => load(), [load]);

  /* ── grouping ───────────────────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const buckets = new Map();
    studies.forEach((study) => {
      const key = yearOf(study.study_datetime);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(study);
    });

    return [...buckets.entries()]
      .sort((a, b) => {
        if (a[0] === "Undated") return 1;
        if (b[0] === "Undated") return -1;
        return Number(b[0]) - Number(a[0]);
      })
      .map(([year, rows]) => [
        year,
        rows.sort((a, b) => new Date(b.study_datetime || 0) - new Date(a.study_datetime || 0)),
      ]);
  }, [studies]);

  const visiblePatients = useMemo(() => {
    const needle = patientQuery.trim().toLowerCase();
    if (!needle) return patients.slice(0, 60);
    return patients
      .filter((p) =>
        [p.full_name, p.patient_code, p.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle))
      )
      .slice(0, 60);
  }, [patientQuery, patients]);

  const modalitiesForCategory = useMemo(() => {
    if (!meta?.modalities) return [];
    if (!filters.category) return meta.modalities;
    return meta.modalities.filter((m) => m.category === filters.category);
  }, [filters.category, meta]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Changing category invalidates a modality that belongs to another one.
      ...(key === "category" ? { modality: "" } : {}),
    }));

  const apply = () => {
    setPage(1);
    setApplied(filters);
  };

  const clear = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const choosePatient = (id) => {
    setPatientId(id);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("patientId", id);
    else next.delete("patientId");
    setSearchParams(next, { replace: true });
  };

  const activeFilterCount = Object.values(applied).filter((v) => v !== "").length;

  return (
    <section className="mx-auto max-w-[1240px] pt-[2px] pb-10">
      <div className="mb-6 h-[30px] rounded-[4px] bg-[#327b84] text-center text-[18px] leading-[30px] text-white shadow-[0_4px_12px_rgba(24,52,59,0.12)]">
        Diagnostic History
      </div>

      {/* patient selection */}
      <div className="mb-4 rounded-[8px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <div>
            <span className={label}>Find patient (name, UHID or phone)</span>
            <input
              className={input}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder="Type to filter the list"
              value={patientQuery}
            />
          </div>
          <div>
            <span className={label}>Patient</span>
            <select
              className={input}
              onChange={(event) => choosePatient(event.target.value)}
              value={patientId}
            >
              <option value="">— select a patient —</option>
              {visiblePatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.patient_code ? `${patient.patient_code} · ` : ""}
                  {patient.full_name}
                  {patient.phone ? ` · ${patient.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {patientInfo && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[#eef2f4] pt-2.5 text-[12px] text-[#5d666d]">
            <span>
              <strong className="text-[#2c343a]">{patientInfo.full_name}</strong>
            </span>
            <span>UHID: {patientInfo.patient_code || "—"}</span>
            <span>Sex: {patientInfo.gender || "—"}</span>
            <span>Blood group: {patientInfo.blood_group || "—"}</span>
            <span>Phone: {patientInfo.phone || "—"}</span>
            <span>
              Investigations on record: <strong>{pagination?.total ?? studies.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* filters */}
      {patientId && (
        <div className="mb-4 rounded-[8px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <span className={label}>Category / department</span>
              <select
                className={input}
                onChange={(event) => setFilter("category", event.target.value)}
                value={filters.category}
              >
                <option value="">All</option>
                {(meta?.categories || []).map((category) => {
                  const key = typeof category === "string" ? category : category.key;
                  return (
                    <option key={key} value={key}>
                      {CATEGORY_LABEL[key] || key}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <span className={label}>Test / modality</span>
              <select
                className={input}
                onChange={(event) => setFilter("modality", event.target.value)}
                value={filters.modality}
              >
                <option value="">All</option>
                {modalitiesForCategory.map((modality) => (
                  <option key={modality.key} value={modality.key}>
                    {modality.label || modality.key}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}>Status</span>
              <select
                className={input}
                onChange={(event) => setFilter("status", event.target.value)}
                value={filters.status}
              >
                <option value="">All</option>
                {(meta?.statuses || []).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status] || status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}>Test name contains</span>
              <input
                className={input}
                onChange={(event) => setFilter("search", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") apply();
                }}
                placeholder="e.g. MRI, CBC"
                value={filters.search}
              />
            </div>

            <div>
              <span className={label}>Referring doctor</span>
              <select
                className={input}
                onChange={(event) => setFilter("referring_doctor_id", event.target.value)}
                value={filters.referring_doctor_id}
              >
                <option value="">All</option>
                {(meta?.doctors || []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.full_name || doctor.full_name || doctor.doctor_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}>Reporting doctor</span>
              <select
                className={input}
                onChange={(event) => setFilter("performing_doctor_id", event.target.value)}
                value={filters.performing_doctor_id}
              >
                <option value="">All</option>
                {(meta?.doctors || []).map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.full_name || doctor.full_name || doctor.doctor_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}>From date</span>
              <input
                className={input}
                onChange={(event) => setFilter("from", event.target.value)}
                type="date"
                value={filters.from}
              />
            </div>

            <div>
              <span className={label}>To date</span>
              <input
                className={input}
                min={filters.from || undefined}
                onChange={(event) => setFilter("to", event.target.value)}
                type="date"
                value={filters.to}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eef2f4] pt-2.5">
            <button className={button} onClick={apply} type="button">
              Apply filters
            </button>
            <button className={button} onClick={clear} type="button">
              Clear
            </button>
            {activeFilterCount > 0 && (
              <span className="text-[11px] text-[#7b858c]">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
              </span>
            )}
          </div>
        </div>
      )}

      {/* history */}
      <div className="rounded-[8px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        {!patientId && (
          <p className="py-10 text-center text-[13px] text-[#7b858c]">
            Select a patient to see their diagnostic history.
          </p>
        )}

        {patientId && loading && (
          <p className="py-10 text-center text-[13px] text-[#7b858c]">Loading history…</p>
        )}

        {patientId && !loading && error && (
          <p className="py-10 text-center text-[13px] text-[#c0392b]">{error}</p>
        )}

        {patientId && !loading && !error && studies.length === 0 && (
          <p className="py-10 text-center text-[13px] text-[#7b858c]">
            {activeFilterCount > 0
              ? "No investigation matches these filters."
              : "This patient has no investigation on record."}
          </p>
        )}

        {patientId &&
          !loading &&
          !error &&
          grouped.map(([year, rows]) => (
            <div className="pb-4" key={year}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-[#1f252b]">{year}</h3>
                <span className="text-[11px] text-[#8b959b]">
                  {rows.length} investigation{rows.length === 1 ? "" : "s"}
                </span>
                <span className="h-px flex-1 bg-[#eef2f4]" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse">
                  <thead>
                    <tr className="bg-[#f2f6f7]">
                      {[
                        "Date",
                        "Study code",
                        "Investigation",
                        "Category",
                        "Referred by",
                        "Status",
                        "Report",
                        "",
                      ].map((head, position) => (
                        <th
                          className="border border-[#e2e8ea] px-2 py-1.5 text-left text-[11px] font-semibold text-[#40484e]"
                          key={`${head}-${position}`}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((study) => (
                      <tr className="hover:bg-[#fafcfc]" key={study.id}>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] whitespace-nowrap text-[#2c343a]">
                          {dateOnly(study.study_datetime)}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] whitespace-nowrap text-[#5d666d]">
                          {study.study_code}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#2c343a]">
                          {study.test_name}
                          {study.modality ? (
                            <span className="block text-[10px] text-[#9aa4aa]">{study.modality}</span>
                          ) : null}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                          {CATEGORY_LABEL[study.category] || study.category}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] text-[#5d666d]">
                          {/* Some doctor rows have no linked user, so no name exists.
                              The code is what is on file and is shown rather than a dash. */}
                          {doctorName(study.referring_doctor)}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 whitespace-nowrap">
                          <span
                            className={`rounded-[3px] px-1.5 py-[2px] text-[11px] leading-none ${
                              STATUS_STYLE[study.status] || "bg-[#eef1f3] text-[#5d666d]"
                            }`}
                          >
                            {STATUS_LABEL[study.status] || study.status}
                          </span>
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 text-[12px] whitespace-nowrap text-[#5d666d]">
                          {study.report?.report_number || "—"}
                          {study.report?.is_amended ? (
                            <span className="block text-[10px] text-[#a05252]">amended</span>
                          ) : null}
                        </td>
                        <td className="border border-[#e2e8ea] px-2 py-1.5 whitespace-nowrap">
                          <button
                            className="text-[12px] text-[#1b75d1] hover:underline"
                            onClick={() => setOpenStudyId(study.id)}
                            type="button"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

        {/* paging: history can be long, so it is not all fetched at once */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-[#eef2f4] pt-3">
            <button
              className={button}
              disabled={!pagination.has_prev}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              ‹ Newer
            </button>
            <span className="text-[12px] text-[#5d666d]">
              Page {pagination.page} of {pagination.total_pages} · {pagination.total} total
            </span>
            <button
              className={button}
              disabled={!pagination.has_next}
              onClick={() => setPage((prev) => prev + 1)}
              type="button"
            >
              Older ›
            </button>
          </div>
        )}
      </div>

      {openStudyId && (
        <DiagnosticReportViewer onClose={() => setOpenStudyId(null)} studyId={openStudyId} />
      )}
    </section>
  );
}
