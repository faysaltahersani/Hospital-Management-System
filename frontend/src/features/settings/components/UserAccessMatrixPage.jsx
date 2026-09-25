import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";
import { ambulanceSections } from "../../ambulance/data/ambulanceData";
import { appointmentSections } from "../../appointment/data/appointmentData";
import { bedSections } from "../../bed/data/bedData";
import { bloodSections } from "../../blood/data/bloodData";
import { doctorSections } from "../../doctor/data/doctorData";
import { financeSections } from "../../finance/data/financeData";
import { hrPayrollSections } from "../../hr-payroll/data/hrPayrollData";
import { medicineSections } from "../../medicine/data/medicineData";
import { opdSections } from "../../opd/data/opdData";
import { pathologySections } from "../../pathology/data/pathologyData";
import { patientSections } from "../../patient/data/patientData";
import { pharmacySections } from "../../pharmacy/data/pharmacyData";
import { radiologySections } from "../../radiology/data/radiologyData";
import { referralSections } from "../../referral/data/referralData";
import { reportsItems } from "../../reports/data/reportsData";

const GROUPS = [
  { title: "Finance", sections: financeSections },
  { title: "Quick", sections: [{ items: ["Quick Options"] }] },
  { title: "HR & Payroll", sections: hrPayrollSections },
  { title: "Referral", sections: referralSections },
  { title: "Settings", sections: [{ items: ["Branch Manage", "Charge Manage", "Company Profile", "Modules", "User Manage", "Security Activity", "Backup", "Import Data"] }] },
  { title: "Account Manage", sections: [{ items: ["Account", "Account Group", "Account Category", "Area"] }] },
  { title: "Doctor", sections: doctorSections },
  { title: "OPD", sections: opdSections },
  { title: "IPD", sections: [{ items: ["IPD Bill Entry", "IPD Bill Record"] }] },
  { title: "Bed", sections: bedSections },
  { title: "Patient", sections: patientSections },
  { title: "Ambulance", sections: ambulanceSections },
  { title: "Reports", sections: [{ items: reportsItems }] },
  { title: "Appointment", sections: appointmentSections },
  { title: "Pathology", sections: pathologySections },
  { title: "Radiology", sections: radiologySections },
  { title: "Blood", sections: bloodSections },
  { title: "Pharmacy", sections: pharmacySections },
  { title: "Medicine", sections: medicineSections },
];

const ACTIONS = [
  ["can_read", "View"],
  ["can_create", "Create"],
  ["can_update", "Edit"],
  ["can_delete", "Delete"],
  ["can_approve", "Approve"],
  ["can_reject", "Reject"],
  ["can_print", "Print"],
  ["can_export", "Export"],
  ["can_refund", "Refund"],
  ["can_access_sensitive", "Sensitive"],
];

const permissionKey = (group, item) =>
  `${group}.${item}`
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const emptyEntry = (key) => Object.fromEntries([["permission_key", key], ...ACTIONS.map(([field]) => [field, false])]);

function Tick({ checked, label, onChange }) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center" title={label}>
      <input className="h-4 w-4 accent-[#1976d2]" checked={checked} onChange={onChange} type="checkbox" />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function UserAccessMatrixPage() {
  const navigate = useNavigate();
  const { role: userId = "" } = useParams();
  const [entries, setEntries] = useState({});
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const roleName = useMemo(() => user?.full_name || decodeURIComponent(userId || "User"), [user, userId]);

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const [userResponse, permissionResponse] = await Promise.all([
          apiRequest(`/users/${userId}`),
          apiRequest(`/users/${userId}/permissions`),
        ]);
        setUser(userResponse.data);
        const next = {};
        (permissionResponse.data || []).forEach((raw) => {
          const item = typeof raw === "string" ? { permission_key: raw, can_read: true } : raw;
          if (!item?.permission_key) return;
          const hasExplicitActions = ACTIONS.slice(1).some(([field]) => item[field] !== undefined);
          next[item.permission_key] = {
            ...emptyEntry(item.permission_key),
            ...item,
            ...(hasExplicitActions ? {} : Object.fromEntries(ACTIONS.slice(1).map(([field]) => [field, Boolean(item.can_read)]))),
          };
        });
        setEntries(next);
      } catch (err) {
        setError(err.message || "Permissions could not be loaded.");
      }
    };
    if (userId) load();
  }, [userId]);

  const setAction = (key, field, checked) => {
    setEntries((current) => {
      const entry = { ...(current[key] || emptyEntry(key)), [field]: checked };
      if (field !== "can_read" && checked) entry.can_read = true;
      if (field === "can_read" && !checked) ACTIONS.slice(1).forEach(([action]) => { entry[action] = false; });
      return { ...current, [key]: entry };
    });
  };

  const toggleRow = (key, checked) => {
    setEntries((current) => ({
      ...current,
      [key]: { permission_key: key, ...Object.fromEntries(ACTIONS.map(([field]) => [field, checked])) },
    }));
  };

  const toggleGroup = (group, checked) => {
    setEntries((current) => {
      const next = { ...current };
      group.sections.flatMap((section) => section.items).forEach((item) => {
        const key = permissionKey(group.title, item);
        next[key] = { permission_key: key, ...Object.fromEntries(ACTIONS.map(([field]) => [field, checked])) };
      });
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const permissions = Object.values(entries).filter((entry) => ACTIONS.some(([field]) => entry[field]));
      await apiRequest(`/users/${userId}/permissions`, { method: "PUT", body: JSON.stringify({ permissions }) });
      showSuccess("Access saved", `Granular permissions updated for ${roleName}.`);
    } catch (err) {
      setError(err.message || "Permissions could not be saved.");
      showError("Save failed", err.message || "Permissions could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1500px] rounded-[8px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold text-[#1f2c33]">Permission Matrix — {roleName}</h1>
          <p className="mt-1 text-[12px] text-[#687780]">API actions are enforced on the server. Turning off View also clears the row’s other actions.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-[4px] border border-[#b9cbd2] px-4 py-2 text-[12px] text-[#52616a]" onClick={() => navigate("/settings/user-manage")} type="button">BACK</button>
          <button className="rounded-[4px] bg-[#1976d2] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50" disabled={saving} onClick={save} type="button">{saving ? "SAVING…" : "SAVE ACCESS"}</button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-[4px] bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-[6px] border border-[#dce5e8]">
        <table className="min-w-[1320px] w-full border-collapse text-[12px] text-[#26363e]">
          <thead className="sticky top-0 z-10 bg-[#e5f3f5]">
            <tr>
              <th className="min-w-[230px] px-3 py-3 text-left font-semibold">MODULE / SCREEN</th>
              <th className="px-2 py-3 font-semibold">ALL</th>
              {ACTIONS.map(([, label]) => <th className="px-2 py-3 font-semibold" key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {GROUPS.flatMap((group) => {
              const items = group.sections.flatMap((section) => section.items);
              const keys = items.map((item) => permissionKey(group.title, item));
              const groupChecked = keys.length > 0 && keys.every((key) => ACTIONS.every(([field]) => entries[key]?.[field]));
              return [
                <tr className="border-t border-[#cadde2] bg-[#f2f8f9]" key={`${group.title}-group`}>
                  <td className="px-3 py-2.5 font-bold text-[#1f5960]">{group.title}</td>
                  <td className="px-2 py-2.5 text-center"><Tick checked={groupChecked} label={`All ${group.title}`} onChange={(event) => toggleGroup(group, event.target.checked)} /></td>
                  <td colSpan={ACTIONS.length} />
                </tr>,
                ...items.map((item) => {
                  const key = permissionKey(group.title, item);
                  const entry = entries[key] || emptyEntry(key);
                  const all = ACTIONS.every(([field]) => entry[field]);
                  return (
                    <tr className="border-t border-[#edf1f3] hover:bg-[#fbfdfd]" key={key}>
                      <td className="px-3 py-2.5 pl-7">{item}</td>
                      <td className="px-2 py-2.5 text-center"><Tick checked={all} label={`All actions for ${item}`} onChange={(event) => toggleRow(key, event.target.checked)} /></td>
                      {ACTIONS.map(([field, label]) => (
                        <td className="px-2 py-2.5 text-center" key={field}><Tick checked={Boolean(entry[field])} label={`${label} ${item}`} onChange={(event) => setAction(key, field, event.target.checked)} /></td>
                      ))}
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
