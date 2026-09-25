import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmAction, showError, showSuccess } from "../../../lib/alerts";
import { getStoredRole } from "../../../lib/auth";

const WORKFLOW_TYPES = [
  ["purchase_approval", "Purchase Approval"],
  ["refund_approval", "Refund Approval"],
  ["discount_approval", "Discount Approval"],
  ["salary_approval", "Salary Approval"],
  ["insurance_approval", "Insurance Approval"],
  ["blood_issue_approval", "Blood Issue Approval"],
  ["discharge_approval", "Discharge Approval"],
];
const ROLES = ["admin", "doctor", "nurse", "receptionist", "accountant", "pharmacist", "lab_tech"];
const EMPTY_DEFINITION = {
  code: "", name: "", workflow_type: "purchase_approval", entity_type: "purchase_requisition",
  description: "", organization_id: "", hospital_id: "", branch_id: "", min_amount: "", max_amount: "",
  currency_code: "BDT", is_active: true,
  steps: [{ name: "Department Approval", approver_role: "admin", approver_user_id: "", min_approvals: 1, can_reject: true, due_hours: 24 }],
};
const EMPTY_REQUEST = { workflow_definition_id: "", entity_id: "", title: "", description: "", amount: "", currency_code: "BDT", submit_now: true };

const formatDate = (value) => value ? new Date(value).toLocaleString() : "—";
const money = (value, currency = "BDT") => value == null || value === "" ? "—" : `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusClass = (status) => ({
  approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", cancelled: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-800", submitted: "bg-blue-100 text-blue-800", draft: "bg-gray-100 text-gray-700",
}[status] || "bg-gray-100 text-gray-700");
const labelize = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

function Field({ children, label }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5c6b73]">{label}</span>{children}</label>;
}
const inputClass = "h-[40px] w-full rounded border border-[#ccd9de] bg-white px-3 text-[13px] outline-none focus:border-[#2b8791] focus:ring-2 focus:ring-[#2b8791]/10";
const textareaClass = "min-h-[82px] w-full rounded border border-[#ccd9de] bg-white p-3 text-[13px] outline-none focus:border-[#2b8791]";

function SummaryCard({ label, value, tone = "teal" }) {
  const tones = { teal: "border-[#b8dfe2] bg-[#effafa] text-[#19666e]", amber: "border-[#f0d9a0] bg-[#fff9e9] text-[#8a6216]", green: "border-[#b9e0c6] bg-[#f1fbf4] text-[#237443]", red: "border-[#efc0c0] bg-[#fff4f4] text-[#a33b3b]" };
  return <div className={`rounded-[7px] border p-4 ${tones[tone]}`}><div className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</div><div className="mt-1 text-[25px] font-bold">{value}</div></div>;
}

function DefinitionEditor({ meta, onSaved, selected, onCancel }) {
  const [form, setForm] = useState(() => selected ? {
    ...EMPTY_DEFINITION, ...selected,
    organization_id: selected.organization_id || "", hospital_id: selected.hospital_id || "", branch_id: selected.branch_id || "",
    min_amount: selected.min_amount ?? "", max_amount: selected.max_amount ?? "",
    steps: (selected.steps || []).map((step) => ({ ...step, approver_user_id: step.approver_user_id || "" })),
  } : { ...EMPTY_DEFINITION, organization_id: meta.organizations?.[0]?.id || "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(selected ? {
      ...EMPTY_DEFINITION, ...selected,
      organization_id: selected.organization_id || "", hospital_id: selected.hospital_id || "", branch_id: selected.branch_id || "",
      min_amount: selected.min_amount ?? "", max_amount: selected.max_amount ?? "",
      steps: (selected.steps || []).map((step) => ({ ...step, approver_user_id: step.approver_user_id || "" })),
    } : { ...EMPTY_DEFINITION, organization_id: meta.organizations?.[0]?.id || "" });
  }, [meta.organizations, selected]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setStep = (index, key, value) => setForm((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [key]: value } : step) }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: Number(form.organization_id), hospital_id: form.hospital_id ? Number(form.hospital_id) : null,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        min_amount: form.min_amount === "" ? null : Number(form.min_amount), max_amount: form.max_amount === "" ? null : Number(form.max_amount),
        steps: form.steps.map((step) => ({ ...step, approver_user_id: step.approver_user_id ? Number(step.approver_user_id) : null, min_approvals: Number(step.min_approvals || 1), due_hours: step.due_hours ? Number(step.due_hours) : null })),
      };
      await apiRequest(`/workflows/definitions${selected ? `/${selected.id}` : ""}`, { method: selected ? "PATCH" : "POST", body: JSON.stringify(payload) });
      showSuccess(selected ? "Workflow updated" : "Workflow created", "Approval rules and steps are now active.");
      onSaved();
    } catch (error) { showError("Could not save workflow", error.message); }
    finally { setSaving(false); }
  };

  const hospitals = (meta.hospitals || []).filter((item) => !form.organization_id || Number(item.organization_id) === Number(form.organization_id));
  const branches = (meta.branches || []).filter((item) => !form.hospital_id || Number(item.hospital_id) === Number(form.hospital_id));

  return (
    <form className="rounded-[8px] border border-[#d8e3e6] bg-white p-5" onSubmit={submit}>
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-[17px] font-semibold text-[#203139]">{selected ? "Edit Workflow" : "New Workflow Definition"}</h2><p className="mt-1 text-[11px] text-[#718087]">Configure the ordered approval chain; active requests keep a permanent action history.</p></div>{onCancel ? <button className="text-[12px] text-[#6b7a82]" onClick={onCancel} type="button">CANCEL EDIT</button> : null}</div>
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Field label="Workflow Name *"><input className={inputClass} onChange={(event) => set("name", event.target.value)} required value={form.name} /></Field>
        <Field label="Code (auto if blank)"><input className={inputClass} onChange={(event) => set("code", event.target.value)} value={form.code || ""} /></Field>
        <Field label="Workflow Type *"><select className={inputClass} onChange={(event) => set("workflow_type", event.target.value)} value={form.workflow_type}>{WORKFLOW_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Entity Type *"><input className={inputClass} onChange={(event) => set("entity_type", event.target.value)} required value={form.entity_type} /></Field>
        <Field label="Organization *"><select className={inputClass} onChange={(event) => { set("organization_id", event.target.value); set("hospital_id", ""); set("branch_id", ""); }} required value={form.organization_id}><option value="">Select</option>{(meta.organizations || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Hospital"><select className={inputClass} onChange={(event) => { set("hospital_id", event.target.value); set("branch_id", ""); }} value={form.hospital_id || ""}><option value="">All hospitals</option>{hospitals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Branch"><select className={inputClass} disabled={!form.hospital_id} onChange={(event) => set("branch_id", event.target.value)} value={form.branch_id || ""}><option value="">All branches</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Currency"><input className={inputClass} maxLength="3" onChange={(event) => set("currency_code", event.target.value.toUpperCase())} value={form.currency_code} /></Field>
        <Field label="Minimum Amount"><input className={inputClass} min="0" onChange={(event) => set("min_amount", event.target.value)} step="0.01" type="number" value={form.min_amount} /></Field>
        <Field label="Maximum Amount"><input className={inputClass} min="0" onChange={(event) => set("max_amount", event.target.value)} step="0.01" type="number" value={form.max_amount} /></Field>
        <label className="flex items-end gap-2 pb-2 text-[13px] text-[#485a62]"><input checked={Boolean(form.is_active)} onChange={(event) => set("is_active", event.target.checked)} type="checkbox" /> Active workflow</label>
        <div className="col-span-full"><Field label="Description"><textarea className={textareaClass} onChange={(event) => set("description", event.target.value)} value={form.description || ""} /></Field></div>
      </div>

      <div className="mt-5 rounded-[6px] border border-[#dce6e9]">
        <div className="flex items-center justify-between bg-[#eef6f7] px-4 py-3"><h3 className="text-[13px] font-semibold text-[#29474d]">Approval Steps</h3><button className="rounded bg-[#267b85] px-3 py-1.5 text-[11px] font-semibold text-white" onClick={() => set("steps", [...form.steps, { name: `Approval Step ${form.steps.length + 1}`, approver_role: "admin", approver_user_id: "", min_approvals: 1, can_reject: true, due_hours: 24 }])} type="button">+ ADD STEP</button></div>
        <div className="space-y-3 p-4">
          {form.steps.map((step, index) => (
            <div className="grid grid-cols-[50px_2fr_1fr_1.4fr_90px_90px_75px] items-end gap-2 rounded border border-[#e2e9eb] p-3 max-xl:grid-cols-2" key={`${index}-${step.id || "new"}`}>
              <div className="pb-2 text-center text-[18px] font-bold text-[#2b7d86]">{index + 1}</div>
              <Field label="Step Name *"><input className={inputClass} onChange={(event) => setStep(index, "name", event.target.value)} required value={step.name} /></Field>
              <Field label="Approver Role"><select className={inputClass} onChange={(event) => setStep(index, "approver_role", event.target.value)} value={step.approver_role || ""}><option value="">Any assigned user</option>{ROLES.map((role) => <option key={role} value={role}>{labelize(role)}</option>)}</select></Field>
              <Field label="Specific User"><select className={inputClass} onChange={(event) => setStep(index, "approver_user_id", event.target.value)} value={step.approver_user_id || ""}><option value="">Role based</option>{(meta.users || []).map((user) => <option key={user.id} value={user.id}>{user.full_name} ({labelize(user.role)})</option>)}</select></Field>
              <Field label="Approvals"><input className={inputClass} min="1" onChange={(event) => setStep(index, "min_approvals", event.target.value)} type="number" value={step.min_approvals} /></Field>
              <Field label="Due Hours"><input className={inputClass} min="1" onChange={(event) => setStep(index, "due_hours", event.target.value)} type="number" value={step.due_hours || ""} /></Field>
              <button className="h-[40px] rounded border border-red-200 text-[11px] font-semibold text-red-600 disabled:opacity-40" disabled={form.steps.length === 1} onClick={() => set("steps", form.steps.filter((_, stepIndex) => stepIndex !== index))} type="button">REMOVE</button>
              <label className="col-start-2 flex items-center gap-2 text-[12px] text-[#52616a]"><input checked={step.can_reject !== false} onChange={(event) => setStep(index, "can_reject", event.target.checked)} type="checkbox" /> This step may reject</label>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-end"><button className="rounded bg-[#1f717a] px-6 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "SAVING…" : selected ? "UPDATE WORKFLOW" : "CREATE WORKFLOW"}</button></div>
    </form>
  );
}

function RequestEditor({ definitions, onSaved }) {
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [saving, setSaving] = useState(false);
  const definition = definitions.find((item) => Number(item.id) === Number(form.workflow_definition_id));
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await apiRequest("/workflows/requests", { method: "POST", body: JSON.stringify({ ...form, workflow_definition_id: Number(form.workflow_definition_id), amount: form.amount === "" ? null : Number(form.amount) }) });
      showSuccess("Request created", form.submit_now ? "The request is now waiting for approval." : "The request was saved as a draft.");
      setForm(EMPTY_REQUEST); onSaved();
    } catch (error) { showError("Could not create request", error.message); }
    finally { setSaving(false); }
  };
  return (
    <form className="rounded-[8px] border border-[#d8e3e6] bg-white p-5" onSubmit={submit}>
      <h2 className="text-[18px] font-semibold text-[#203139]">Create Approval Request</h2><p className="mb-5 mt-1 text-[12px] text-[#708087]">Select an active workflow; its amount rules and ordered approvals will be enforced by the server.</p>
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Field label="Workflow *"><select className={inputClass} onChange={(event) => { set("workflow_definition_id", event.target.value); const item = definitions.find((row) => Number(row.id) === Number(event.target.value)); if (item) set("currency_code", item.currency_code); }} required value={form.workflow_definition_id}><option value="">Select workflow</option>{definitions.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></Field>
        <Field label="Related Record ID"><input className={inputClass} onChange={(event) => set("entity_id", event.target.value)} placeholder={definition?.entity_type ? `${definition.entity_type} reference` : "Optional"} value={form.entity_id} /></Field>
        <Field label="Amount"><div className="flex"><span className="grid w-[58px] place-items-center rounded-l border border-r-0 border-[#ccd9de] bg-[#eff4f5] text-[11px]">{form.currency_code}</span><input className={`${inputClass} rounded-l-none`} min="0" onChange={(event) => set("amount", event.target.value)} step="0.01" type="number" value={form.amount} /></div></Field>
        <div className="col-span-2 max-md:col-span-1"><Field label="Title *"><input className={inputClass} onChange={(event) => set("title", event.target.value)} required value={form.title} /></Field></div>
        <label className="flex items-end gap-2 pb-2 text-[13px]"><input checked={form.submit_now} onChange={(event) => set("submit_now", event.target.checked)} type="checkbox" /> Submit immediately</label>
        <div className="col-span-full"><Field label="Business Justification"><textarea className={textareaClass} onChange={(event) => set("description", event.target.value)} value={form.description} /></Field></div>
      </div>
      {definition ? <div className="mt-4 rounded bg-[#eff8f9] px-4 py-3 text-[12px] text-[#45636a]">Entity: <b>{labelize(definition.entity_type)}</b> · Allowed amount: <b>{definition.min_amount ?? "0"} – {definition.max_amount ?? "No maximum"} {definition.currency_code}</b></div> : null}
      <div className="mt-5 flex justify-end"><button className="rounded bg-[#237780] px-6 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "SAVING…" : form.submit_now ? "CREATE & SUBMIT" : "SAVE DRAFT"}</button></div>
    </form>
  );
}

function RequestDetail({ request, onClose, onChanged }) {
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const action = async (name) => {
    const labels = { submit: "Submit this request for approval?", approve: "Approve the current workflow step?", reject: "Reject this request?", cancel: "Cancel this request?" };
    if (name === "reject" && !comments.trim()) return showError("Reason required", "Write a rejection reason before rejecting.");
    if (!(await confirmAction({ title: labels[name], text: comments || "This action will be stored in the permanent approval history.", confirmText: labelize(name) }))) return;
    setBusy(true);
    try { await apiRequest(`/workflows/requests/${request.id}/${name}`, { method: "POST", body: JSON.stringify({ comments: comments || null }) }); showSuccess("Action recorded", `Request ${name} completed.`); onChanged(); }
    catch (error) { showError("Action failed", error.message); }
    finally { setBusy(false); }
  };
  const currentStep = request.definition?.steps?.find((step) => Number(step.step_order) === Number(request.current_step_order));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-[10px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#dfe8eb] p-5"><div><div className="text-[11px] font-semibold text-[#2c7d86]">{request.request_code}</div><h2 className="mt-1 text-[20px] font-semibold text-[#203139]">{request.title}</h2><div className="mt-2 flex gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClass(request.status)}`}>{labelize(request.status)}</span>{currentStep ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Step {currentStep.step_order}: {currentStep.name}</span> : null}</div></div><button className="text-[22px] text-[#63747c]" onClick={onClose} type="button">×</button></div>
        <div className="grid grid-cols-4 gap-3 border-b border-[#e6edef] p-5 text-[12px] max-md:grid-cols-2"><div><span className="text-[#7a898f]">Workflow</span><b className="mt-1 block">{request.definition?.name}</b></div><div><span className="text-[#7a898f]">Requester</span><b className="mt-1 block">{request.requester?.full_name}</b></div><div><span className="text-[#7a898f]">Amount</span><b className="mt-1 block">{money(request.amount, request.currency_code)}</b></div><div><span className="text-[#7a898f]">Created</span><b className="mt-1 block">{formatDate(request.created_at)}</b></div><div className="col-span-full rounded bg-[#f6f9fa] p-3 text-[#516169]">{request.description || "No description supplied."}</div></div>
        <div className="p-5"><h3 className="mb-3 text-[14px] font-semibold text-[#273c43]">Approval History</h3><div className="space-y-2">{(request.actions || []).length ? request.actions.map((item) => <div className="grid grid-cols-[110px_1fr_180px] gap-3 rounded border border-[#e2e9eb] px-3 py-2.5 text-[12px] max-sm:grid-cols-1" key={item.id}><span className={`font-semibold uppercase ${item.action === "reject" ? "text-red-600" : item.action === "approve" ? "text-green-700" : "text-[#277984]"}`}>{item.action}</span><span><b>{item.actor?.full_name}</b>{item.step?.name ? ` · ${item.step.name}` : ""}<small className="mt-1 block text-[#75848b]">{item.comments || "No comment"}</small></span><span className="text-right text-[#718087] max-sm:text-left">{formatDate(item.created_at)}</span></div>) : <div className="rounded bg-[#f6f9fa] p-4 text-center text-[12px] text-[#74838a]">No action history yet.</div>}</div></div>
        {['draft', 'in_review'].includes(request.status) ? <div className="border-t border-[#dfe8eb] bg-[#f8fbfb] p-5"><textarea className={textareaClass} onChange={(event) => setComments(event.target.value)} placeholder="Approval comment or rejection reason" value={comments} /><div className="mt-3 flex flex-wrap justify-end gap-2">{request.status === "draft" ? <button className="rounded bg-blue-600 px-4 py-2 text-[11px] font-semibold text-white" disabled={busy} onClick={() => action("submit")} type="button">SUBMIT</button> : <><button className="rounded bg-green-700 px-4 py-2 text-[11px] font-semibold text-white" disabled={busy} onClick={() => action("approve")} type="button">APPROVE</button><button className="rounded bg-red-600 px-4 py-2 text-[11px] font-semibold text-white" disabled={busy} onClick={() => action("reject")} type="button">REJECT</button></>}<button className="rounded border border-[#b9c6cb] px-4 py-2 text-[11px] font-semibold text-[#52616a]" disabled={busy} onClick={() => action("cancel")} type="button">CANCEL REQUEST</button></div></div> : null}
      </div>
    </div>
  );
}

export function WorkflowApprovalPage() {
  const [tab, setTab] = useState("requests");
  const [meta, setMeta] = useState({ definitions: [], users: [], organizations: [], hospitals: [], branches: [] });
  const [definitions, setDefinitions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ totals: {}, by_status: [], by_type: [] });
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = ["super_admin", "admin", "hospital_admin", "branch_admin"].includes(getStoredRole());

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ limit: "100" }); if (search.trim()) params.set("search", search.trim()); if (status) params.set("status", status);
      const [metaResponse, definitionsResponse, requestsResponse, summaryResponse] = await Promise.all([
        apiRequest("/workflows/meta"), apiRequest("/workflows/definitions?limit=100"), apiRequest(`/workflows/requests?${params}`), apiRequest("/workflows/reports/summary"),
      ]);
      setMeta(metaResponse.data || {}); setDefinitions(definitionsResponse.data || []); setRequests(requestsResponse.data || []); setSummary(summaryResponse.data || {});
    } catch (loadError) { setError(loadError.message || "Workflow data could not be loaded."); }
    finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);
  const counts = useMemo(() => Object.fromEntries((summary.by_status || []).map((item) => [item.status, Number(item.count)])), [summary]);
  const openRequest = async (id) => { try { const response = await apiRequest(`/workflows/requests/${id}`); setSelectedRequest(response.data); } catch (detailError) { showError("Could not open request", detailError.message); } };
  const refreshDetail = async () => { const id = selectedRequest?.id; await load(); if (id) await openRequest(id); };
  const deleteDefinition = async (row) => { if (!(await confirmAction({ title: "Delete workflow?", text: "Workflows with request history cannot be deleted; deactivate them instead.", icon: "warning", confirmText: "Delete", confirmColor: "#c33" }))) return; try { await apiRequest(`/workflows/definitions/${row.id}`, { method: "DELETE" }); showSuccess("Workflow deleted"); await load(); } catch (deleteError) { showError("Cannot delete workflow", deleteError.message); } };
  const exportCsv = () => { const rows = [["Code", "Title", "Workflow", "Requester", "Amount", "Status", "Created"], ...requests.map((row) => [row.request_code, row.title, row.definition?.name, row.requester?.full_name, row.amount, row.status, row.created_at])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "approval-requests.csv"; anchor.click(); URL.revokeObjectURL(url); };

  return (
    <section className="mx-auto max-w-[1420px] space-y-4">
      <header className="rounded-[8px] bg-linear-to-r from-[#245f68] to-[#328f98] px-5 py-5 text-white shadow-lg"><h1 className="text-[22px] font-semibold">Workflow & Approval Center</h1><p className="mt-1 text-[12px] text-white/80">Configurable multi-step approvals with organization scope, RBAC, audit history and reporting</p></header>
      <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1"><SummaryCard label="Total Requests" value={Number(summary.totals?.total || 0)} /><SummaryCard label="Awaiting Review" tone="amber" value={counts.in_review || 0} /><SummaryCard label="Approved" tone="green" value={counts.approved || 0} /><SummaryCard label="Rejected" tone="red" value={counts.rejected || 0} /><SummaryCard label="Total Amount" value={money(summary.totals?.total_amount || 0)} /></div>
      <div className="flex flex-wrap items-center gap-2 rounded-[7px] border border-[#d8e3e6] bg-white p-3">{[["requests", "Approval Requests"], ["new", "New Request"], ...(isAdmin ? [["definitions", "Workflow Definitions"]] : [])].map(([key, label]) => <button className={`rounded px-4 py-2 text-[12px] font-semibold ${tab === key ? "bg-[#277b84] text-white" : "bg-[#edf3f5] text-[#52616a]"}`} key={key} onClick={() => setTab(key)} type="button">{label}</button>)}</div>
      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</div> : null}

      {tab === "new" ? <RequestEditor definitions={definitions} onSaved={() => { setTab("requests"); load(); }} /> : null}
      {tab === "definitions" && isAdmin ? <div className="space-y-4"><DefinitionEditor meta={meta} onCancel={selectedDefinition ? () => setSelectedDefinition(null) : null} onSaved={() => { setSelectedDefinition(null); load(); }} selected={selectedDefinition} /><div className="overflow-x-auto rounded border border-[#d8e3e6] bg-white"><table className="min-w-[950px] w-full text-left text-[12px]"><thead className="bg-[#eaf4f5]"><tr><th className="p-3">WORKFLOW</th><th className="p-3">TYPE / ENTITY</th><th className="p-3">SCOPE</th><th className="p-3">AMOUNT RULE</th><th className="p-3">STEPS</th><th className="p-3">STATUS</th><th className="p-3 text-right">ACTIONS</th></tr></thead><tbody>{loading ? <tr><td className="p-8 text-center" colSpan="7">Loading workflows…</td></tr> : definitions.map((row) => <tr className="border-t border-[#e7edef]" key={row.id}><td className="p-3"><b>{row.name}</b><small className="block text-[#75838a]">{row.code}</small></td><td className="p-3">{labelize(row.workflow_type)}<small className="block text-[#75838a]">{labelize(row.entity_type)}</small></td><td className="p-3">{row.branch?.name || row.hospital?.name || row.organization?.name || "Organization"}</td><td className="p-3">{money(row.min_amount || 0, row.currency_code)} – {row.max_amount ? money(row.max_amount, row.currency_code) : "No maximum"}</td><td className="p-3">{row.steps?.length || 0}</td><td className="p-3"><span className={`rounded-full px-2 py-1 ${row.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{row.is_active ? "Active" : "Inactive"}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button className="rounded border border-blue-200 px-2 py-1 text-blue-700" onClick={() => { setSelectedDefinition(row); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Edit</button><button className="rounded border border-red-200 px-2 py-1 text-red-600" onClick={() => deleteDefinition(row)} type="button">Delete</button></div></td></tr>)}</tbody></table></div></div> : null}
      {tab === "requests" ? <div className="rounded-[8px] border border-[#d8e3e6] bg-white"><div className="flex flex-wrap gap-2 border-b border-[#e1e9eb] p-4"><form className="flex flex-1 gap-2 max-sm:flex-col" onSubmit={(event) => { event.preventDefault(); load(); }}><input className={`${inputClass} max-w-[330px]`} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, title or related record" value={search} /><select className={`${inputClass} max-w-[190px]`} onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{["draft", "in_review", "approved", "rejected", "cancelled"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select><button className="rounded bg-[#263940] px-5 text-[11px] font-semibold text-white" type="submit">FILTER</button></form><button className="rounded border border-blue-200 px-4 py-2 text-[11px] font-semibold text-blue-700" disabled={!requests.length} onClick={exportCsv} type="button">EXPORT CSV</button></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-[12px]"><thead className="bg-[#eaf4f5]"><tr><th className="p-3">CODE / DATE</th><th className="p-3">REQUEST</th><th className="p-3">WORKFLOW</th><th className="p-3">REQUESTER</th><th className="p-3">AMOUNT</th><th className="p-3">STATUS</th><th className="p-3 text-right">ACTION</th></tr></thead><tbody>{loading ? <tr><td className="p-10 text-center" colSpan="7">Loading approval requests…</td></tr> : null}{!loading && !requests.length ? <tr><td className="p-10 text-center text-[#718087]" colSpan="7">No approval requests found. Create a request to start a real workflow.</td></tr> : null}{!loading ? requests.map((row) => <tr className="border-t border-[#e6edef]" key={row.id}><td className="p-3"><b className="text-[#24747d]">{row.request_code}</b><small className="block text-[#78868d]">{formatDate(row.created_at)}</small></td><td className="p-3"><b>{row.title}</b><small className="block text-[#78868d]">{labelize(row.entity_type)} {row.entity_id ? `#${row.entity_id}` : ""}</small></td><td className="p-3">{row.definition?.name}</td><td className="p-3">{row.requester?.full_name}<small className="block text-[#78868d]">{labelize(row.requester?.role)}</small></td><td className="p-3 font-semibold">{money(row.amount, row.currency_code)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusClass(row.status)}`}>{labelize(row.status)}</span></td><td className="p-3 text-right"><button className="rounded border border-[#8bc1c8] px-3 py-1.5 font-semibold text-[#216f78]" onClick={() => openRequest(row.id)} type="button">OPEN</button></td></tr>) : null}</tbody></table></div></div> : null}
      {selectedRequest ? <RequestDetail onChanged={refreshDetail} onClose={() => setSelectedRequest(null)} request={selectedRequest} /> : null}
    </section>
  );
}
