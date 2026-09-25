import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const TABS = [
  { key: "organizations", label: "Hospital Groups" },
  { key: "hospitals", label: "Hospitals" },
  { key: "branches", label: "Branches" },
];

const EMPTY = {
  organizations: { name: "", code: "", legal_name: "", registration_number: "", timezone: "Asia/Dhaka", currency_code: "BDT", is_active: true },
  hospitals: { organization_id: "", name: "", code: "", hospital_type: "general", license_number: "", phone: "", email: "", address: "", is_active: true },
  branches: { hospital_id: "", name: "", code: "", phone: "", email: "", address: "", is_main: false, is_active: true },
};

const cleanPayload = (form) => {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (key.endsWith("_id")) {
      if (value) payload[key] = Number(value);
      return;
    }
    if (key === "code" && !String(value || "").trim()) return;
    payload[key] = typeof value === "string" ? value.trim() || null : value;
  });
  return payload;
};

function Field({ label, name, onChange, required = false, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-[#52616a] uppercase">
        {label}{required ? " *" : ""}
      </span>
      <input
        className="h-[42px] w-full rounded-[4px] border border-[#ced9de] bg-white px-3 text-[14px] text-[#203139] outline-none focus:border-[#2d8b96] focus:ring-2 focus:ring-[#2d8b96]/15"
        name={name}
        onChange={onChange}
        type={type}
        value={value ?? ""}
      />
    </label>
  );
}

function SelectField({ children, label, name, onChange, required = false, value }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-[#52616a] uppercase">
        {label}{required ? " *" : ""}
      </span>
      <select
        className="h-[42px] w-full rounded-[4px] border border-[#ced9de] bg-white px-3 text-[14px] text-[#203139] outline-none focus:border-[#2d8b96]"
        name={name}
        onChange={onChange}
        value={value ?? ""}
      >
        {children}
      </select>
    </label>
  );
}

function StatusPill({ active }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-[#e6f7ed] text-[#167944]" : "bg-[#fff0f0] text-[#b73232]"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function OrganizationBranchPage() {
  const [activeTab, setActiveTab] = useState("organizations");
  const [data, setData] = useState({ organizations: [], hospitals: [], branches: [] });
  const [form, setForm] = useState({ ...EMPTY.organizations });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    try {
      const [organizations, hospitals, branches] = await Promise.all([
        apiRequest("/organization/organizations?limit=1000"),
        apiRequest("/organization/hospitals?limit=1000"),
        apiRequest("/organization/branches?limit=1000"),
      ]);
      setData({ organizations: organizations.data || [], hospitals: hospitals.data || [], branches: branches.data || [] });
    } catch (error) {
      setFeedback(error.message || "Organization hierarchy could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const reset = (tab = activeTab) => {
    setForm({ ...EMPTY[tab] });
    setEditingId(null);
    setFeedback("");
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearch("");
    reset(tab);
  };

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!String(form.name || "").trim()) return setFeedback("Name is required.");
    if (activeTab === "hospitals" && !form.organization_id) return setFeedback("Select a hospital group.");
    if (activeTab === "branches" && !form.hospital_id) return setFeedback("Select a hospital.");

    setSaving(true);
    setFeedback("");
    try {
      await apiRequest(`/organization/${activeTab}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(cleanPayload(form)),
      });
      showSuccess(editingId ? "Updated" : "Created", "Organization hierarchy record saved successfully.");
      reset();
      await loadAll();
    } catch (error) {
      const message = error.message || "Record could not be saved.";
      setFeedback(message);
      showError("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    const allowedKeys = Object.keys(EMPTY[activeTab]);
    setForm(Object.fromEntries(allowedKeys.map((key) => [key, row[key] ?? EMPTY[activeTab][key]])));
    setEditingId(row.id);
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row) => {
    if (!(await confirmDelete("Delete record?", `Delete “${row.name}”? Parent records and assigned users are protected.`))) return;
    try {
      await apiRequest(`/organization/${activeTab}/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted", `${row.name} was deleted.`);
      if (editingId === row.id) reset();
      await loadAll();
    } catch (error) {
      showError("Delete failed", error.message || "The record is still in use.");
    }
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data[activeTab];
    return data[activeTab].filter((row) =>
      [row.name, row.code, row.legal_name, row.organization?.name, row.hospital?.name, row.hospital?.organization?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [activeTab, data, search]);

  const counts = {
    organizations: data.organizations.length,
    hospitals: data.hospitals.length,
    branches: data.branches.length,
  };

  return (
    <section className="mx-auto max-w-[1320px] space-y-4">
      <header className="rounded-[8px] bg-linear-to-r from-[#246c76] to-[#359ba2] px-5 py-5 text-white shadow-[0_10px_26px_rgba(20,75,83,0.2)]">
        <h1 className="text-[22px] font-semibold">Organization & Branch Management</h1>
        <p className="mt-1 text-[13px] text-white/80">Hospital Group → Hospital → Branch enterprise hierarchy</p>
      </header>

      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        {TABS.map((tab) => (
          <button
            className={`rounded-[7px] border px-4 py-3 text-left transition ${activeTab === tab.key ? "border-[#2d8b96] bg-[#e6f5f6] text-[#155961]" : "border-[#d8e2e6] bg-white text-[#52616a] hover:bg-[#f4f8f9]"}`}
            key={tab.key}
            onClick={() => changeTab(tab.key)}
            type="button"
          >
            <span className="block text-[13px] font-semibold">{tab.label}</span>
            <span className="mt-1 block text-[24px] font-bold">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {feedback ? <div className="rounded-[5px] border border-[#efb2b2] bg-[#fff2f2] px-4 py-3 text-[13px] text-[#b73232]">{feedback}</div> : null}

      <div className="grid grid-cols-[390px_minmax(0,1fr)] gap-5 max-lg:grid-cols-1">
        <form className="rounded-[8px] border border-[#d9e2e6] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.07)]" onSubmit={handleSave}>
          <h2 className="mb-5 border-b border-[#e2eaed] pb-3 text-[17px] font-semibold text-[#203139]">
            {editingId ? "Edit" : "Create"} {TABS.find((tab) => tab.key === activeTab)?.label.replace(/s$/, "")}
          </h2>
          <div className="space-y-4">
            {activeTab === "hospitals" ? (
              <SelectField label="Hospital Group" name="organization_id" onChange={handleChange} required value={form.organization_id}>
                <option value="">Select group</option>
                {data.organizations.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectField>
            ) : null}
            {activeTab === "branches" ? (
              <SelectField label="Hospital" name="hospital_id" onChange={handleChange} required value={form.hospital_id}>
                <option value="">Select hospital</option>
                {data.hospitals.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </SelectField>
            ) : null}
            <Field label="Name" name="name" onChange={handleChange} required value={form.name} />
            <Field label="Code (auto if blank)" name="code" onChange={handleChange} value={form.code} />
            {activeTab === "organizations" ? (
              <>
                <Field label="Legal Name" name="legal_name" onChange={handleChange} value={form.legal_name} />
                <Field label="Registration Number" name="registration_number" onChange={handleChange} value={form.registration_number} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Timezone" name="timezone" onChange={handleChange} value={form.timezone} />
                  <Field label="Currency" name="currency_code" onChange={handleChange} value={form.currency_code} />
                </div>
              </>
            ) : null}
            {activeTab === "hospitals" ? (
              <>
                <Field label="Hospital Type" name="hospital_type" onChange={handleChange} value={form.hospital_type} />
                <Field label="License Number" name="license_number" onChange={handleChange} value={form.license_number} />
              </>
            ) : null}
            {activeTab !== "organizations" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" name="phone" onChange={handleChange} value={form.phone} />
                  <Field label="Email" name="email" onChange={handleChange} type="email" value={form.email} />
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-[#52616a] uppercase">Address</span>
                  <textarea className="min-h-[78px] w-full rounded-[4px] border border-[#ced9de] p-3 text-[14px] outline-none focus:border-[#2d8b96]" name="address" onChange={handleChange} value={form.address ?? ""} />
                </label>
              </>
            ) : null}
            <div className="flex flex-wrap gap-5 text-[13px] text-[#465860]">
              <label className="flex items-center gap-2"><input checked={Boolean(form.is_active)} name="is_active" onChange={handleChange} type="checkbox" /> Active</label>
              {activeTab === "branches" ? <label className="flex items-center gap-2"><input checked={Boolean(form.is_main)} name="is_main" onChange={handleChange} type="checkbox" /> Main branch</label> : null}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="h-[38px] rounded-[4px] bg-[#267b85] text-[12px] font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? "SAVING…" : editingId ? "UPDATE" : "CREATE"}</button>
            <button className="h-[38px] rounded-[4px] border border-[#ccdade] text-[12px] font-semibold text-[#52616a]" onClick={() => reset()} type="button">RESET</button>
          </div>
        </form>

        <div className="min-w-0 overflow-hidden rounded-[8px] border border-[#d9e2e6] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.07)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e2eaed] p-4 max-sm:flex-col max-sm:items-stretch">
            <h2 className="text-[17px] font-semibold text-[#203139]">{TABS.find((tab) => tab.key === activeTab)?.label}</h2>
            <input className="h-[36px] w-[260px] rounded-[4px] border border-[#d1dce1] px-3 text-[13px] outline-none max-sm:w-full" onChange={(event) => setSearch(event.target.value)} placeholder="Search name or code" value={search} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-[12px] text-[#283941]">
              <thead className="bg-[#eef5f6] text-[#43555d]">
                <tr>
                  <th className="px-3 py-3 font-semibold">NAME</th>
                  <th className="px-3 py-3 font-semibold">CODE</th>
                  {activeTab !== "organizations" ? <th className="px-3 py-3 font-semibold">PARENT</th> : null}
                  <th className="px-3 py-3 font-semibold">STATUS</th>
                  <th className="px-3 py-3 text-right font-semibold">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td className="px-3 py-10 text-center text-[#718089]" colSpan="5">Loading organization data…</td></tr> : null}
                {!loading && !rows.length ? <tr><td className="px-3 py-10 text-center text-[#718089]" colSpan="5">No records found.</td></tr> : null}
                {!loading ? rows.map((row) => (
                  <tr className="border-t border-[#edf1f3]" key={row.id}>
                    <td className="px-3 py-3 font-medium">{row.name}{row.is_main ? <span className="ml-2 rounded bg-[#e8f1ff] px-1.5 py-0.5 text-[10px] text-[#2869b8]">MAIN</span> : null}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{row.code}</td>
                    {activeTab !== "organizations" ? <td className="px-3 py-3">{activeTab === "hospitals" ? row.organization?.name : row.hospital?.name}</td> : null}
                    <td className="px-3 py-3"><StatusPill active={row.is_active} /></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-[#8abbd8] px-2.5 py-1 text-[#24749c]" onClick={() => handleEdit(row)} type="button">Edit</button>
                        <button className="rounded border border-[#f1aaaa] px-2.5 py-1 text-[#c23d3d]" onClick={() => handleDelete(row)} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
