import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const TABS = [
  { key: "allergies", label: "Allergies" },
  { key: "problems", label: "Problems & Diagnosis" },
  { key: "histories", label: "Clinical History" },
  { key: "vitals", label: "Vital Signs" },
  { key: "notes", label: "Clinical Notes" },
];

const EMPTY = {
  allergies: { allergen: "", reaction: "", severity: "unknown", status: "active", onset_date: "", notes: "" },
  problems: { title: "", code: "", problem_type: "diagnosis", status: "active", onset_date: "", resolved_date: "", notes: "" },
  histories: { category: "medical", title: "", occurred_on: "", details: "" },
  vitals: { captured_at: "", temperature_c: "", pulse_bpm: "", respiratory_rate: "", systolic_bp: "", diastolic_bp: "", spo2_percent: "", height_cm: "", weight_kg: "", pain_score: "", notes: "" },
  notes: { note_type: "progress", title: "", status: "draft", content: "" },
};

const FIELDS = {
  allergies: [
    ["allergen", "Allergen", "text"], ["reaction", "Reaction", "text"],
    ["severity", "Severity", "select", ["unknown", "mild", "moderate", "severe", "life_threatening"]],
    ["status", "Status", "select", ["active", "inactive", "resolved"]],
    ["onset_date", "Onset Date", "date"], ["notes", "Notes", "textarea"],
  ],
  problems: [
    ["title", "Problem / Diagnosis", "text"], ["code", "ICD / Code", "text"],
    ["problem_type", "Type", "select", ["diagnosis", "chronic_disease", "symptom", "risk"]],
    ["status", "Status", "select", ["active", "resolved", "inactive"]],
    ["onset_date", "Onset Date", "date"], ["resolved_date", "Resolved Date", "date"], ["notes", "Notes", "textarea"],
  ],
  histories: [
    ["category", "Category", "select", ["medical", "surgical", "family", "immunization", "previous_treatment"]],
    ["title", "Title", "text"], ["occurred_on", "Date", "date"], ["details", "Details", "textarea"],
  ],
  vitals: [
    ["captured_at", "Captured At", "datetime-local"], ["temperature_c", "Temperature °C", "number"],
    ["pulse_bpm", "Pulse / min", "number"], ["respiratory_rate", "Respiration / min", "number"],
    ["systolic_bp", "Systolic BP", "number"], ["diastolic_bp", "Diastolic BP", "number"],
    ["spo2_percent", "SpO₂ %", "number"], ["height_cm", "Height cm", "number"],
    ["weight_kg", "Weight kg", "number"], ["pain_score", "Pain Score 0–10", "number"], ["notes", "Notes", "textarea"],
  ],
  notes: [
    ["note_type", "Note Type", "select", ["doctor", "nursing", "progress", "assessment", "procedure", "follow_up", "discharge"]],
    ["title", "Title", "text"], ["status", "Status", "select", ["draft", "final"]], ["content", "Clinical Note", "textarea"],
  ],
};

const clean = (form) => Object.fromEntries(Object.entries(form).filter(([, value]) => value !== "" && value !== null).map(([key, value]) => [key, value]));
const labelize = (value) => String(value || "—").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value) => value ? new Date(value).toLocaleString() : "—";

function FormField({ field, form, onChange }) {
  const [name, label, type, options] = field;
  const base = "w-full rounded-[4px] border border-[#ccd9de] bg-white px-3 text-[13px] text-[#24353d] outline-none focus:border-[#2c8791]";
  return (
    <label className={type === "textarea" ? "block md:col-span-2" : "block"}>
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-[#62727a] uppercase">{label}</span>
      {type === "select" ? (
        <select className={`${base} h-[40px]`} name={name} onChange={onChange} value={form[name] ?? ""}>
          {options.map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea className={`${base} min-h-[82px] py-2`} name={name} onChange={onChange} value={form[name] ?? ""} />
      ) : (
        <input className={`${base} h-[40px]`} name={name} onChange={onChange} step={type === "number" ? "any" : undefined} type={type} value={form[name] ?? ""} />
      )}
    </label>
  );
}

function RecordSummary({ record, type }) {
  if (type === "allergies") return <><strong>{record.allergen}</strong><span>{record.reaction || "No reaction recorded"}</span></>;
  if (type === "problems") return <><strong>{record.title}</strong><span>{record.code || labelize(record.problem_type)}</span></>;
  if (type === "histories") return <><strong>{record.title}</strong><span>{labelize(record.category)} · {record.occurred_on || "Date unknown"}</span></>;
  if (type === "vitals") return <><strong>{dateLabel(record.captured_at)}</strong><span>BP {record.systolic_bp || "—"}/{record.diastolic_bp || "—"} · Pulse {record.pulse_bpm || "—"} · Temp {record.temperature_c || "—"}°C · SpO₂ {record.spo2_percent || "—"}%</span></>;
  return <><strong>{record.title}</strong><span>{labelize(record.note_type)} · {record.author?.full_name || "Unknown author"}</span></>;
}

export function PatientEmrPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("allergies");
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ ...EMPTY.allergies });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest(`/emr/patients/${patientId}/summary`);
      setData(response.data);
    } catch (err) {
      setError(err.message || "EMR profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const records = data?.[activeTab] || [];
  const patient = data?.patient || {};
  const activeAllergies = useMemo(() => (data?.allergies || []).filter((item) => item.status === "active").length, [data]);
  const activeProblems = useMemo(() => (data?.problems || []).filter((item) => item.status === "active").length, [data]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setForm({ ...EMPTY[tab] });
    setEditingId(null);
    setError("");
  };

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest(editingId ? `/emr/${activeTab}/${editingId}` : `/emr/patients/${patientId}/${activeTab}`, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(clean(form)),
      });
      showSuccess("Saved", "Clinical record saved to the patient EMR.");
      setForm({ ...EMPTY[activeTab] });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || "Clinical record could not be saved.");
      showError("Save failed", err.message || "Clinical record could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (record) => {
    const next = {};
    Object.keys(EMPTY[activeTab]).forEach((key) => {
      let value = record[key] ?? "";
      if (key === "captured_at" && value) value = new Date(value).toISOString().slice(0, 16);
      next[key] = value;
    });
    setForm(next);
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (record) => {
    if (!(await confirmDelete("Delete clinical record?", "Only draft/non-final clinical records can be deleted."))) return;
    try {
      await apiRequest(`/emr/${activeTab}/${record.id}`, { method: "DELETE" });
      showSuccess("Deleted", "Clinical record deleted.");
      await load();
    } catch (err) {
      showError("Delete failed", err.message || "Clinical record could not be deleted.");
    }
  };

  const exportCsv = () => {
    const headers = FIELDS[activeTab].map(([key]) => key);
    const csv = [headers, ...records.map((record) => headers.map((key) => record[key] ?? ""))]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${patient.patient_code || "patient"}-${activeTab}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="mx-auto max-w-[1280px] rounded bg-white p-10 text-center text-[#667780]">Loading centralized EMR…</div>;

  return (
    <section className="mx-auto max-w-[1380px] space-y-4">
      <header className="rounded-[8px] bg-linear-to-r from-[#1f6670] to-[#36a0a5] p-5 text-white shadow-[0_10px_28px_rgba(20,75,83,0.2)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">Centralized EMR / EHR</p><h1 className="mt-1 text-[25px] font-bold">{patient.full_name || "Patient"}</h1><p className="mt-1 text-[13px] text-white/85">MRN: {patient.patient_code || "—"} · {labelize(patient.gender)} · Blood {patient.blood_group || "—"} · {patient.phone || "No phone"}</p></div>
          <button className="rounded border border-white/50 px-4 py-2 text-[12px]" onClick={() => navigate("/patient/list")} type="button">BACK TO PATIENTS</button>
        </div>
      </header>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div> : null}

      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
        {[
          ["Active Allergies", activeAllergies, activeAllergies ? "text-red-700 bg-red-50" : "text-green-700 bg-green-50"],
          ["Active Problems", activeProblems, "text-amber-700 bg-amber-50"],
          ["Vital Entries", data?.vitals?.length || 0, "text-blue-700 bg-blue-50"],
          ["Clinical Notes", data?.notes?.length || 0, "text-purple-700 bg-purple-50"],
        ].map(([label, value, tone]) => <div className={`rounded-[7px] p-4 ${tone}`} key={label}><div className="text-[11px] font-semibold uppercase">{label}</div><div className="mt-1 text-[25px] font-bold">{value}</div></div>)}
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-[7px] border border-[#d9e3e7] bg-white p-2">
        {TABS.map((tab) => <button className={`whitespace-nowrap rounded-[5px] px-4 py-2 text-[12px] font-semibold ${activeTab === tab.key ? "bg-[#247982] text-white" : "bg-[#edf3f5] text-[#53636b]"}`} key={tab.key} onClick={() => changeTab(tab.key)} type="button">{tab.label} ({data?.[tab.key]?.length || 0})</button>)}
      </div>

      <div className="grid grid-cols-[420px_minmax(0,1fr)] gap-5 max-lg:grid-cols-1">
        <form className="rounded-[8px] border border-[#d9e2e6] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.06)]" onSubmit={save}>
          <h2 className="mb-4 text-[17px] font-semibold text-[#203139]">{editingId ? "Edit" : "Add"} {TABS.find((tab) => tab.key === activeTab)?.label}</h2>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            {FIELDS[activeTab].map((field) => <FormField field={field} form={form} key={field[0]} onChange={handleChange} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3"><button className="h-[38px] rounded bg-[#247982] text-[12px] font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "SAVING…" : editingId ? "UPDATE" : "SAVE"}</button><button className="h-[38px] rounded border border-[#cbd8dd] text-[12px] font-semibold text-[#53636b]" onClick={() => { setForm({ ...EMPTY[activeTab] }); setEditingId(null); }} type="button">RESET</button></div>
        </form>

        <div className="min-w-0 rounded-[8px] border border-[#d9e2e6] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.06)]">
          <div className="flex items-center justify-between border-b border-[#e3eaed] p-4"><h2 className="text-[17px] font-semibold text-[#203139]">{TABS.find((tab) => tab.key === activeTab)?.label} History</h2><button className="rounded border border-[#83b2e9] px-3 py-1.5 text-[11px] font-semibold text-[#276cb5] disabled:opacity-40" disabled={!records.length} onClick={exportCsv} type="button">EXPORT CSV</button></div>
          <div className="max-h-[640px] overflow-y-auto p-3">
            {!records.length ? <div className="py-16 text-center text-[13px] text-[#7b8990]">No {TABS.find((tab) => tab.key === activeTab)?.label.toLowerCase()} recorded.</div> : null}
            <div className="space-y-2">
              {records.map((record) => {
                const locked = activeTab === "notes" && ["final", "amended"].includes(record.status);
                return <article className="rounded-[6px] border border-[#e1e8eb] p-3" key={record.id}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-col gap-1 text-[12px] text-[#66757d]"><RecordSummary record={record} type={activeTab} /><span>{labelize(record.status || record.severity || record.category)} · Recorded {dateLabel(record.created_at)}</span></div><div className="flex shrink-0 gap-2"><button className="rounded border border-[#8dbbd2] px-2 py-1 text-[11px] text-[#236d91] disabled:opacity-35" disabled={locked} onClick={() => edit(record)} type="button">Edit</button><button className="rounded border border-[#efaaaa] px-2 py-1 text-[11px] text-[#bc3737] disabled:opacity-35" disabled={locked} onClick={() => remove(record)} type="button">Delete</button></div></div>{record.notes || record.details || record.content ? <p className="mt-2 whitespace-pre-wrap border-t border-[#edf1f3] pt-2 text-[12px] leading-5 text-[#3f5058]">{record.notes || record.details || record.content}</p> : null}</article>;
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

