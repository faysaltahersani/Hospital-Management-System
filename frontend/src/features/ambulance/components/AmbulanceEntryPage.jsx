import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const vehicleTypeOptions = ["AC", "Non AC", "ICU", "Freezer Van", "Other"];

const emptyForm = {
  vehicle_number: "",
  model: "",
  manufacture_year: "",
  driver_name: "",
  driver_phone: "",
  base_fare: "",
  vehicle_type: "",
  notes: "",
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

export function AmbulanceEntryPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isAddAmbulanceModalOpen, setIsAddAmbulanceModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadAmbulances = async (searchValue = search) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchValue.trim()) params.set("search", searchValue.trim());
      const response = await apiRequest(`/ambulance?${params.toString()}`);
      setRows(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load ambulances");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAmbulances();
  }, []);

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const closeModal = () => {
    setIsAddAmbulanceModalOpen(false);
    resetForm();
  };

  const openAddModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    resetForm();
    setIsAddAmbulanceModalOpen(true);
  };

  const openEditModal = (row) => {
    setErrorMessage("");
    setSuccessMessage("");
    setEditingId(row.id);
    const cleanNotes = row.notes ? row.notes.replace(/\[Year:\s*\d{4}\]\s*/, '').trim() : "";
    setForm({
      vehicle_number: row.vehicle_number || "",
      model: row.model || "",
      manufacture_year: row.manufacture_year ? String(row.manufacture_year) : "",
      driver_name: row.driver_name || "",
      driver_phone: row.driver_phone || "",
      base_fare: row.base_fare ? String(row.base_fare) : "",
      vehicle_type: row.vehicle_type || "",
      notes: cleanNotes,
    });
    setIsAddAmbulanceModalOpen(true);
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!form.vehicle_number.trim()) {
      setErrorMessage("Vehicle number is required.");
      return;
    }
    if (!form.model.trim()) {
      setErrorMessage("Vehicle model is required.");
      return;
    }
    if (!form.vehicle_type.trim()) {
      setErrorMessage("Vehicle type is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        vehicle_number: form.vehicle_number.trim(),
        model: form.model.trim(),
        manufacture_year: form.manufacture_year ? Number(form.manufacture_year) : null,
        driver_name: form.driver_name.trim() || null,
        driver_phone: form.driver_phone.trim() || null,
        base_fare: Number(form.base_fare || 0),
        vehicle_type: form.vehicle_type.trim(),
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await apiRequest(`/ambulance/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Ambulance ${payload.vehicle_number} updated successfully.`);
      } else {
        await apiRequest("/ambulance", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccessMessage(`Ambulance ${payload.vehicle_number} created successfully.`);
      }

      closeModal();
      await loadAmbulances();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save ambulance");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const confirmed = await confirmDelete(
      "Delete Ambulance?",
      `Are you sure you want to delete ambulance "${row.vehicle_number}"?`
    );
    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsDeletingId(row.id);
    try {
      await apiRequest(`/ambulance/${row.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `Ambulance ${row.vehicle_number} deleted successfully.`);
      setSuccessMessage(`Ambulance ${row.vehicle_number} deleted successfully.`);
      await loadAmbulances();
    } catch (error) {
      showError("Error", error.message || "Failed to delete ambulance");
      setErrorMessage(error.message || "Failed to delete ambulance");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSearchSubmit = async () => {
    await loadAmbulances(search);
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-4 text-[18px] font-normal text-[#202f37]">Ambulance List</div>

        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
            {successMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#e1e5e8] px-4 py-3 max-md:flex-col max-md:items-start">
            <button
              className="rounded-[4px] border border-[#7baef7] bg-white px-4 py-2 text-[14px] font-medium uppercase text-[#2675db]"
              onClick={openAddModal}
              type="button"
            >
              Add Ambulance
            </button>
            <div className="flex items-center gap-3">
              <input
                className="h-[38px] w-[220px] rounded-[4px] border border-[#d6dde2] px-3 text-[14px] text-[#34434a] outline-none"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearchSubmit();
                }}
                placeholder="Search ambulance"
                type="text"
                value={search}
              />
              <button
                className="rounded-[4px] bg-[#2276da] px-4 py-2 text-[13px] font-medium text-white"
                onClick={handleSearchSubmit}
                type="button"
              >
                Search
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[110px_1fr_1fr_0.8fr_1fr_1fr_0.9fr_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[14px] font-semibold text-[#2f3c43] max-lg:hidden">
            <div>Actions</div>
            <div>Vehicle Number</div>
            <div>Vehicle Model</div>
            <div>Year</div>
            <div>Driver</div>
            <div>Contact</div>
            <div>Charge</div>
            <div>Note</div>
          </div>

          {isLoading ? (
            <div className="px-4 py-5 text-[14px] text-[#6d7980]">Loading...</div>
          ) : rows.length ? (
            rows.map((row) => (
              <div
                className="grid grid-cols-[110px_1fr_1fr_0.8fr_1fr_1fr_0.9fr_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[15px] text-[#293840] max-lg:grid-cols-1 max-lg:gap-2"
                key={row.id}
              >
                <div className="flex items-center gap-4">
                  <button className="text-[14px] text-[#16921f]" onClick={() => openEditModal(row)} type="button">
                    Edit
                  </button>
                  <button
                    className="text-[14px] text-[#ff1f1f] disabled:opacity-50"
                    disabled={isDeletingId === row.id}
                    onClick={() => handleDelete(row)}
                    type="button"
                  >
                    {isDeletingId === row.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
                <span>{row.vehicle_number || "-"}</span>
                <span>{row.model || "-"}</span>
                <span>{row.manufacture_year || "-"}</span>
                <span>{row.driver_name || "-"}</span>
                <span>{row.driver_phone || "-"}</span>
                <span>{formatMoney(row.base_fare)}</span>
                <span>{row.notes ? row.notes.replace(/\[Year:\s*\d{4}\]\s*/, '').trim() || "-" : "-"}</span>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 text-[14px] text-[#6d7980]">No ambulances found.</div>
          )}

          <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
            <span>Rows per page 100</span>
            <span>{rows.length ? `1-${rows.length} of ${rows.length}` : "0-0 of 0"}</span>
          </div>
        </div>
      </div>

      {isAddAmbulanceModalOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(7,34,39,0.28)] px-4 py-6">
          <div className="w-full max-w-[860px] rounded-[4px] border border-[#d8dee2] bg-white shadow-[0_24px_60px_rgba(10,40,48,0.22)]">
            <div className="border-b border-[#e4e8eb] px-6 py-4">
              <h2 className="text-[18px] font-normal text-[#26353c]">
                {editingId ? "Edit Ambulance" : "Add Ambulance"}
              </h2>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <input
                  className="h-[50px] rounded-[4px] border border-[#ff3f34] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#ff3f34]"
                  onChange={(event) => updateFormField("vehicle_number", event.target.value)}
                  placeholder="Vehicle Number *"
                  type="text"
                  value={form.vehicle_number}
                />
                <input
                  className="h-[50px] rounded-[4px] border border-[#ff3f34] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#ff3f34]"
                  onChange={(event) => updateFormField("model", event.target.value)}
                  placeholder="Vehicle Model *"
                  type="text"
                  value={form.model}
                />
                <input
                  className="h-[50px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateFormField("manufacture_year", event.target.value)}
                  placeholder="Manufacture Year"
                  type="number"
                  value={form.manufacture_year}
                />
                <input
                  className="h-[50px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateFormField("driver_name", event.target.value)}
                  placeholder="Driver Name"
                  type="text"
                  value={form.driver_name}
                />
                <input
                  className="h-[50px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateFormField("driver_phone", event.target.value)}
                  placeholder="Driver Contact"
                  type="text"
                  value={form.driver_phone}
                />
                <input
                  className="h-[50px] rounded-[4px] border border-[#c8d2d7] px-4 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                  onChange={(event) => updateFormField("base_fare", event.target.value)}
                  placeholder="Charge"
                  type="number"
                  value={form.base_fare}
                />
                <select
                  className="h-[50px] rounded-[4px] border border-[#c8d2d7] bg-white px-4 text-[14px] text-[#6f7b84] outline-none"
                  onChange={(event) => updateFormField("vehicle_type", event.target.value)}
                  value={form.vehicle_type}
                >
                  <option value="">Vehicle Type *</option>
                  {vehicleTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="mt-4 h-[100px] w-full rounded-[4px] border border-[#c8d2d7] px-4 py-3 text-[14px] text-[#2a3840] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => updateFormField("notes", event.target.value)}
                placeholder="Note"
                value={form.notes}
              />
            </div>

            <div className="flex justify-end gap-6 border-t border-[#e4e8eb] px-6 py-4">
              <button className="text-[16px] font-medium text-[#8a2be2]" onClick={closeModal} type="button">
                CANCEL
              </button>
              <button
                className="rounded-[4px] bg-[#2b7be5] px-5 py-2 text-[14px] font-medium text-white disabled:opacity-60"
                disabled={isSaving}
                onClick={handleSave}
                type="button"
              >
                {isSaving ? "SAVING..." : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
