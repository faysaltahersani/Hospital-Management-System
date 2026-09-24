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

const accessGroups = [
  { title: "Finance", sections: financeSections },
  { title: "Quick", sections: [{ items: ["Quick Options"] }] },
  { title: "HR & Payroll", sections: hrPayrollSections },
  { title: "Referral", sections: referralSections },
  {
    title: "Settings",
    sections: [
      {
        items: [
          "Branch Manage",
          "Charge Manage",
          "Company Profile",
          "Modules",
          "User Manage",
          "Backup",
          "Import Data",
          "Send Custom Message",
          "Automation Tasks",
        ],
      },
    ],
  },
  {
    title: "Account Manage",
    sections: [{ items: ["Account", "Account Group", "Account Category", "Area"] }],
  },
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

function normalizeItemLabel(label) {
  return label
    .replace("Entry", "Entry")
    .replace("Pathology Test Category Entry", "Pathology Test Category")
    .replace("Radiology Test Category Entry", "Radiology Test Category")
    .replace("Pathology Parameter Entry", "Pathology Parameter")
    .replace("Radiology Parameter Entry", "Radiology Parameter");
}

function permissionKey(groupTitle, itemLabel) {
  const raw = `${groupTitle}.${itemLabel}`;
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function CheckboxRow({ checked = false, children, onChange, strong = false }) {
  return (
    <label className={`flex items-start gap-3 text-[#111827] ${strong ? "text-[16px] font-medium" : "text-[16px]"}`}>
      <input
        className="mt-[2px] h-[18px] w-[18px] shrink-0 accent-[#1976d2]"
        checked={checked}
        onChange={onChange}
        type="checkbox"
      />
      <span className="leading-[1.35]">{children}</span>
    </label>
  );
}

function AccessGroup({ group, selected, setSelected }) {
  const items = group.sections.flatMap((section) => section.items);
  const groupKeys = items.map((item) => permissionKey(group.title, item));
  const allGroupChecked = groupKeys.every((key) => selected.has(key));

  const togglePermission = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = () => {
    setSelected((current) => {
      const next = new Set(current);
      const shouldCheck = !groupKeys.every((key) => next.has(key));
      groupKeys.forEach((key) => {
        if (shouldCheck) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  return (
    <section className="break-inside-avoid pb-8">
      <CheckboxRow checked={allGroupChecked} onChange={toggleGroup} strong>
        {group.title}
      </CheckboxRow>
      <div className="mt-4 space-y-4 pl-5">
        {items.map((item) => {
          const key = permissionKey(group.title, item);
          return (
            <CheckboxRow checked={selected.has(key)} key={key} onChange={() => togglePermission(key)}>
              {normalizeItemLabel(item)}
            </CheckboxRow>
          );
        })}
      </div>
      <div className="mt-4 pl-3 text-[12px] text-[#667085]">{group.title} Module End</div>
    </section>
  );
}

export function UserAccessPage() {
  const navigate = useNavigate();
  const { role: userId = "" } = useParams();
  const [selected, setSelected] = useState(new Set());
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const roleName = useMemo(() => user?.username || user?.full_name || decodeURIComponent(userId || "User"), [user, userId]);

  useEffect(() => {
    const loadAccess = async () => {
      setError("");
      try {
        const [userResponse, permissionsResponse] = await Promise.all([
          apiRequest(`/users/${userId}`),
          apiRequest(`/users/${userId}/permissions`),
        ]);
        setUser(userResponse.data);
        const keys = (permissionsResponse.data || [])
          .map((permission) => (typeof permission === "string" ? permission : permission?.permission_key || ""))
          .filter(Boolean);
        setSelected(new Set(keys));
      } catch (err) {
        setError(err.message);
      }
    };

    if (userId) loadAccess();
  }, [userId]);

  const saveAccess = async () => {
    setMessage("");
    setError("");
    try {
      const permissionsList = Array.from(selected);
      await apiRequest(`/users/${userId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          permissions: permissionsList.map((key) => ({
            permission_key: key,
            can_read: true,
          })),
        }),
      });
      showSuccess("Access Saved!", `Permissions updated successfully for ${roleName}.`);
      setMessage("Access saved successfully.");
    } catch (err) {
      showError("Save Failed", err.message || "Failed to save user permissions.");
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-[1254px] rounded-[4px] border border-[#d9e1e5] bg-white px-5 pt-5 pb-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <h1 className="mb-4 text-[20px] font-normal text-[#111827]">User Access for {roleName}</h1>

      <div className="grid grid-cols-1 gap-x-[74px] gap-y-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accessGroups.map((group) => (
          <AccessGroup group={group} key={group.title} selected={selected} setSelected={setSelected} />
        ))}
      </div>

      {error ? <div className="mb-4 rounded-[4px] bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded-[4px] bg-green-50 px-3 py-2 text-[13px] text-green-700">{message}</div> : null}

      <div className="mt-1 flex gap-5">
        <button
          className="h-[30px] rounded-[4px] bg-[#1976d2] px-3 text-[12px] font-medium text-white shadow-[0_2px_4px_rgba(25,118,210,0.35)]"
          onClick={saveAccess}
          type="button"
        >
          SAVE ACCESS
        </button>
        <button
          className="h-[30px] rounded-[4px] bg-[#1976d2] px-4 text-[12px] font-medium text-white shadow-[0_2px_4px_rgba(25,118,210,0.35)]"
          onClick={() => navigate("/settings/user-manage")}
          type="button"
        >
          BACK
        </button>
      </div>
    </section>
  );
}
