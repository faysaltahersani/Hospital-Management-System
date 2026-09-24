import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { showError, showSuccess } from "../../../lib/alerts";

const DEFAULT_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DEFAULT_UNITS = ["ml", "Bag", "Unit"];
const DEFAULT_COMPONENTS = ["Red Cells (RBC)", "Fresh Frozen Plasma (FFP)", "Platelets", "Cryoprecipitate", "Whole Blood"];

const mapComponentToCode = (name) => {
  if (!name) return "whole_blood";
  const lower = name.toLowerCase();
  if (lower.includes("rbc") || lower.includes("red")) return "rbc";
  if (lower.includes("plasma") || lower.includes("ffp")) return "plasma";
  if (lower.includes("platelet")) return "platelets";
  if (lower.includes("cryo")) return "cryo";
  return "whole_blood";
};

const formatDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function Panel({ children, title }) {
  return (
    <section className="rounded-[4px] border border-[#d8e0e5] bg-white p-4 shadow-[0_3px_8px_rgba(22,36,45,0.08)]">
      <h2 className="border-b border-[#dde5e8] pb-2 text-[14px] font-semibold text-[#1f2c33]">{title}</h2>
      <div className="pt-3">{children}</div>
    </section>
  );
}

function Fieldset({ children, label, className = "" }) {
  return (
    <div className={`relative min-w-0 rounded-[2px] border border-[#c7d0d5] bg-white pt-[4px] ${className}`}>
      {label ? (
        <span className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-white px-1 text-[9px] leading-none text-[#7f8990]">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function Input({ className = "", hasError = false, onChange, placeholder = "", readOnly = false, type = "text", value = "" }) {
  return (
    <input
      className={`h-[28px] w-full rounded-[2px] border-0 bg-white px-3 text-[13px] text-[#26343b] outline-none placeholder:text-[#7f8990] ${
        hasError ? "border border-[#ff5a5a]" : ""
      } ${readOnly ? "bg-[#f5f8fa] text-[#6b757b]" : ""} ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      type={type}
      value={value}
    />
  );
}

function TextArea({ className = "", onChange, placeholder = "", value = "" }) {
  return (
    <textarea
      className={`min-h-[72px] w-full resize-none rounded-[2px] border-0 bg-white px-3 py-2 text-[13px] text-[#26343b] outline-none placeholder:text-[#7f8990] ${className}`}
      onChange={onChange}
      placeholder={placeholder}
      value={value}
    />
  );
}

function Select({ className = "", hasError = false, onChange, options, placeholder, value = "" }) {
  return (
    <select
      className={`h-[28px] w-full appearance-none rounded-[2px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] outline-none ${
        hasError ? "border border-[#ff5a5a] text-[#ff5a5a]" : "text-[#6d787f]"
      } ${className}`}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23717d84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 9px center",
      }}
      value={value}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const normalized = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

function MessageBanner({ tone = "error", children }) {
  return (
    <div
      className={`rounded-[4px] border px-3 py-2 text-[13px] ${
        tone === "error"
          ? "border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]"
          : "border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
      }`}
    >
      {children}
    </div>
  );
}

const createEmptyRow = (index = 0) => ({
  id: Date.now() + index,
  component: "",
  bag_code: "",
  volume: "",
  unit: "",
  lot: "",
});

const createInitialForm = () => ({
  date: formatDateInput(),
  blood_group: "",
  source_bag_id: "",
  note: "",
});

export function BloodComponentSeparationPage() {
  const [form, setForm] = useState(createInitialForm);
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bags, setBags] = useState([]);
  const [units, setUnits] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  const filteredBags = useMemo(
    () =>
      bags.filter((bag) => {
        if (form.blood_group && bag.blood_group !== form.blood_group) return false;
        return true;
      }),
    [bags, form.blood_group]
  );

  const selectedBag = useMemo(
    () => filteredBags.find((bag) => String(bag.id) === String(form.source_bag_id)),
    [filteredBags, form.source_bag_id]
  );

  useEffect(() => {
    let isMounted = true;

    const loadMeta = async () => {
      setIsLoadingMeta(true);
      setErrorMessage("");

      try {
        const [groupsResponse, bagsResponse, unitsResponse, componentsResponse] = await Promise.all([
          apiRequest("/blood-bank/groups?limit=100"),
          apiRequest("/blood-bank/bags?limit=100&status=available&component=whole_blood"),
          apiRequest("/blood-bank/units?limit=100"),
          apiRequest("/blood-bank/components?limit=100"),
        ]);

        if (!isMounted) return;
        const fetchedGroups = (groupsResponse.data || []).map((group) => group.name || group.label).filter(Boolean);
        setGroups([...new Set([...DEFAULT_GROUPS, ...fetchedGroups])]);

        setBags(bagsResponse.data || []);

        const fetchedUnits = (unitsResponse.data || []).map((unit) => unit.name || unit.label).filter(Boolean);
        setUnits(fetchedUnits.length > 0 ? fetchedUnits : DEFAULT_UNITS);

        const fetchedComponents = (componentsResponse.data || []).map((comp) => comp.name || comp.label).filter(Boolean);
        setComponents(fetchedComponents.length > 0 ? fetchedComponents : DEFAULT_COMPONENTS);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood component separation data");
      } finally {
        if (isMounted) {
          setIsLoadingMeta(false);
        }
      }
    };

    loadMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedBag?.blood_group) {
      setForm((current) => ({ ...current, blood_group: selectedBag.blood_group }));
    }
  }, [selectedBag]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "blood_group" ? { source_bag_id: "" } : {}),
    }));
  };

  const addComponentRow = () => {
    setRows((current) => [...current, createEmptyRow(current.length)]);
  };

  const updateRow = (rowId, field, value) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  const removeRow = (rowId) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setRows([]);
    setErrorMessage("");
    setSuccessMessage("");
    setHasAttemptedSave(false);
  };

  const handleCreate = async () => {
    setHasAttemptedSave(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.blood_group) {
      setErrorMessage("Blood group is required.");
      return;
    }
    if (!form.source_bag_id) {
      setErrorMessage("Select a source bag.");
      return;
    }
    if (!rows.length) {
      setErrorMessage("Add at least one separation component row.");
      return;
    }

    const invalidRow = rows.find(
      (row) => !row.component || !row.volume || Number(row.volume) <= 0 || !row.unit
    );
    if (invalidRow) {
      setErrorMessage("Each component row requires component, volume, and unit.");
      return;
    }

    const sourceBag = bags.find((bag) => String(bag.id) === String(form.source_bag_id));
    if (!sourceBag) {
      setErrorMessage("Selected source bag was not found.");
      return;
    }

    setIsSaving(true);
    try {
      const baseCollectedAt = sourceBag.collected_at ? new Date(sourceBag.collected_at) : new Date();

      for (const row of rows) {
        const compCode = mapComponentToCode(row.component);
        const shelfLifeDays = compCode === "platelets" ? 5 : compCode === "plasma" || compCode === "cryo" ? 365 : 35;
        const expiresAtDate = new Date(baseCollectedAt.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);

        await apiRequest("/blood-bank/bags", {
          method: "POST",
          body: JSON.stringify({
            bag_code: row.bag_code.trim() || null,
            donor_id: sourceBag.donor_id || null,
            blood_group: form.blood_group,
            institution: sourceBag.institution || null,
            component: compCode,
            volume_ml: Number(row.volume),
            unit_name: row.unit,
            lot_no: row.lot.trim() || null,
            collected_at: baseCollectedAt.toISOString(),
            expires_at: expiresAtDate.toISOString(),
            charge: 0,
            discount_percent: 0,
            discount_amount: 0,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: 0,
            paid_amount: 0,
            due_amount: 0,
            price: 0,
            notes: `Separated from ${sourceBag.bag_code}${form.note.trim() ? ` | ${form.note.trim()}` : ""}`,
          }),
        });
      }

      await apiRequest(`/blood-bank/bags/${sourceBag.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "discarded",
          notes: `${sourceBag.notes ? `${sourceBag.notes} | ` : ""}Separated into ${rows.length} component bag(s) on ${form.date}`,
        }),
      });

      const msg = `Created ${rows.length} separated component bag(s) from ${sourceBag.bag_code}.`;
      setBags((current) => current.filter((bag) => String(bag.id) !== String(sourceBag.id)));
      setSuccessMessage(msg);
      showSuccess("Separation Successful", msg);
      resetForm();
    } catch (error) {
      const errMsg = error.message || "Failed to create separated component bags";
      setErrorMessage(errMsg);
      showError("Separation Failed", errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-4 text-[17px] font-semibold text-[#1f2c33]">Blood Component Separation</h1>

        <div className="space-y-4">
          {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}
          {successMessage ? <MessageBanner tone="success">{successMessage}</MessageBanner> : null}

          <Panel title="Basic Information">
            <div className="grid grid-cols-[280px_260px_260px] items-start gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
              <Fieldset label="Created Date">
                <Input onChange={(event) => updateForm("date", event.target.value)} type="date" value={form.date} />
              </Fieldset>

              <Fieldset label="Blood Group">
                <Select
                  onChange={(event) => updateForm("blood_group", event.target.value)}
                  options={groups}
                  placeholder={isLoadingMeta ? "Loading groups..." : "Select Blood Group"}
                  value={form.blood_group}
                />
              </Fieldset>

              <Fieldset label="Source Bag">
                <Select
                  onChange={(event) => updateForm("source_bag_id", event.target.value)}
                  options={filteredBags.map((bag) => ({
                    value: String(bag.id),
                    label: `${bag.bag_code} - ${bag.blood_group}`,
                  }))}
                  placeholder={isLoadingMeta ? "Loading bags..." : "Select Bag"}
                  value={form.source_bag_id}
                />
              </Fieldset>
            </div>
          </Panel>

          <Panel title="Separation Components">
            <button
              className="mb-4 rounded-[4px] border border-[#7fb1f2] px-4 py-1.5 text-[12px] font-semibold text-[#1f73de]"
              onClick={addComponentRow}
              type="button"
            >
              + Add Component
            </button>

            <div className="overflow-hidden rounded-[4px] border border-[#e2e8eb]">
              <div className="grid grid-cols-[60px_1.4fr_1.4fr_1fr_120px_1fr_90px] items-center bg-[#f5f7f8] px-3 py-2 text-[13px] font-medium text-[#334048] max-md:hidden">
                <span>SL</span>
                <span>Component</span>
                <span>Bag Number</span>
                <span>Volume</span>
                <span>Unit</span>
                <span>Lot</span>
                <span>Action</span>
              </div>

              {rows.length ? (
                rows.map((row, index) => (
                  <div
                    className="grid grid-cols-[60px_1.4fr_1.4fr_1fr_120px_1fr_90px] items-center gap-3 border-t border-[#e2e8eb] px-3 py-2 max-md:grid-cols-1"
                    key={row.id}
                  >
                    <span className="text-[13px] text-[#26343b]">{index + 1}</span>

                    <div className="rounded-[4px] border border-[#cfd8de] bg-white">
                      <Select
                        hasError={hasAttemptedSave && !row.component}
                        onChange={(event) => updateRow(row.id, "component", event.target.value)}
                        options={components}
                        placeholder="Select Component"
                        value={row.component}
                      />
                    </div>

                    <div className="rounded-[4px] border border-[#cfd8de] bg-[#fff]">
                      <Input
                        onChange={(event) => updateRow(row.id, "bag_code", event.target.value)}
                        placeholder="Bag Number"
                        value={row.bag_code}
                      />
                    </div>

                    <div className="rounded-[4px] border border-[#cfd8de] bg-white">
                      <Input
                        hasError={hasAttemptedSave && (!row.volume || Number(row.volume) <= 0)}
                        onChange={(event) => updateRow(row.id, "volume", event.target.value)}
                        placeholder="Volume"
                        type="number"
                        value={row.volume}
                      />
                    </div>

                    <div className="rounded-[4px] border border-[#cfd8de] bg-white">
                      <Select
                        hasError={hasAttemptedSave && !row.unit}
                        onChange={(event) => updateRow(row.id, "unit", event.target.value)}
                        options={units}
                        placeholder="Select Unit"
                        value={row.unit}
                      />
                    </div>

                    <div className="rounded-[4px] border border-[#cfd8de] bg-white">
                      <Input
                        onChange={(event) => updateRow(row.id, "lot", event.target.value)}
                        placeholder="Lot"
                        value={row.lot}
                      />
                    </div>

                    <div className="flex justify-center">
                      <button
                        className="rounded-[4px] border border-[#ff8f8f] p-2 text-[#ff3f34]"
                        onClick={() => removeRow(row.id)}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                          <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-[13px] text-[#6f7b84]">No separation components added yet.</div>
              )}
            </div>
          </Panel>

          <Panel title="Additional Note">
            <Fieldset label="Note">
              <TextArea onChange={(event) => updateForm("note", event.target.value)} placeholder="Note" value={form.note} />
            </Fieldset>
          </Panel>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <button
            className="rounded-[4px] bg-[#23811d] py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
            disabled={isSaving}
            onClick={handleCreate}
            type="button"
          >
            {isSaving ? "CREATING..." : "CREATE"}
          </button>
          <button
            className="rounded-[4px] border border-[#ff8f8f] py-2.5 text-[12px] font-semibold text-[#ff3f34]"
            onClick={resetForm}
            type="button"
          >
            RESET
          </button>
        </div>
      </div>
    </section>
  );
}
