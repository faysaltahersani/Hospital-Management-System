import { useState } from "react";

import { apiRequest } from "../../lib/api";

const toCode = (value, typeId) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
  return `${typeId || "0"}_${normalized || Date.now()}`.slice(0, 100);
};

export function SymptomsHeadModal({ isOpen = false, onClose, onSaved, types = [] }) {
  const [label, setLabel] = useState("");
  const [typeId, setTypeId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setLabel("");
    setTypeId("");
    setError("");
    setIsSaving(false);
    onClose?.();
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Symptoms title is required.");
      return;
    }
    if (!typeId) {
      setError("Select a symptoms type.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await apiRequest("/settings/master-options", {
        method: "POST",
        body: JSON.stringify({
          type: "symptom_head",
          code: toCode(trimmedLabel, typeId),
          label: trimmedLabel,
          sort_order: Number(typeId),
          is_active: true,
        }),
      });
      await onSaved?.(response.data);
      handleClose();
    } catch (saveError) {
      setError(saveError.message || "Failed to save symptoms title.");
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.18)] px-4 py-6">
      <div className="w-full max-w-[360px] rounded-[4px] border-t-2 border-[#14989c] bg-white px-6 pt-6 pb-6 shadow-[0_18px_48px_rgba(18,33,42,0.28)]">
        <h2 className="mb-5 text-[20px] font-normal leading-none text-[#333333]">Add Symptoms Head</h2>
        {error ? <div className="mb-3 rounded-[4px] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{error}</div> : null}
        <select
          className="mb-3 h-[40px] w-full rounded-[3px] border border-[#c8cdd2] px-3 text-[15px] text-[#2f3941] outline-none focus:border-[#86b7fe] focus:shadow-[0_0_0_3px_rgba(13,110,253,0.18)]"
          onChange={(event) => setTypeId(event.target.value)}
          value={typeId}
        >
          <option value="">Select Symptoms Type</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
        <input
          autoFocus
          className="h-[40px] w-full rounded-[3px] border border-[#333333] px-3 text-[16px] text-[#2f3941] outline-none placeholder:text-[#666666] focus:border-[#86b7fe] focus:shadow-[0_0_0_3px_rgba(13,110,253,0.18)]"
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Symptoms Head"
          type="text"
          value={label}
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="h-[36px] rounded-[5px] border border-[#80b7ff] bg-white px-4 text-[14px] font-semibold text-[#0d6fd1] transition-colors hover:bg-[#f3f8ff]"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-[36px] rounded-[5px] bg-[#0d6fd1] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b62bb]"
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
