import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, showError, showSuccess, showToast } from "../../../lib/alerts";

const PAGE_LIMIT = 100;

const emptyBedForm = {
  id: null,
  building_id: "",
  floor_id: "",
  ward_id: "",
  room_number: "",
  bed_number: "",
  bed_type_id: "",
};

const emptyBedTypeForm = {
  id: null,
  name: "",
  daily_rate: "0",
};

function TabButton({ active, children, onClick }) {
  return (
    <button
      className={`border-b px-5 pb-2 text-[11px] uppercase transition-colors ${
        active ? "border-[#2b7cff] text-[#2b7cff]" : "border-transparent text-[#6f7a84]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="mb-4 rounded-[2px] bg-[#dff2f3] px-3 py-2 text-[10px] font-medium uppercase text-[#334148]">
      {children}
    </div>
  );
}

function TextField({ label, name, onChange, smallLabel = false, type = "text", value }) {
  return (
    <label className="block">
      {smallLabel ? <span className="mb-1 block text-[11px] text-[#6c7680]">{label}</span> : null}
      <input
        className="h-[42px] w-full border border-[#d9e1e5] bg-[#f7f9fb] px-3 text-[13px] text-[#55606a] outline-none"
        name={name}
        onChange={onChange}
        placeholder={smallLabel ? "" : label}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({ name, onChange, options, placeholder, value }) {
  return (
    <select
      className="h-[42px] w-full appearance-none border border-[#d9e1e5] bg-[#f7f9fb] px-3 pr-10 text-[13px] text-[#55606a] outline-none"
      name={name}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 14px center",
        backgroundRepeat: "no-repeat",
      }}
      value={value}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ActionButton({ children, onClick, tone = "text-[#2574d9]" }) {
  return (
    <button className={`${tone} text-[11px] font-medium`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Message({ error, success }) {
  if (error) {
    return <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{error}</div>;
  }
  if (success) {
    return <div className="mb-4 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{success}</div>;
  }
  return null;
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td className="border-b border-[#e6ecef] px-3 py-5 text-center text-[13px] text-[#78848f]" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

const asOptions = (items, labelBuilder) =>
  items.map((item) => ({
    value: String(item.id),
    label: labelBuilder(item),
  }));

export function BedEntryPage() {
  const [activeTab, setActiveTab] = useState("entry");
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bedTypes, setBedTypes] = useState([]);
  const [beds, setBeds] = useState([]);
  const [bedForm, setBedForm] = useState(emptyBedForm);
  const [bedTypeForm, setBedTypeForm] = useState(emptyBedTypeForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const buildingOptions = useMemo(() => asOptions(buildings, (item) => item.name), [buildings]);
  const filteredFloors = useMemo(
    () => floors.filter((item) => !bedForm.building_id || !item.building_id || String(item.building_id) === String(bedForm.building_id)),
    [bedForm.building_id, floors]
  );
  const floorOptions = useMemo(() => asOptions(filteredFloors, (item) => item.floor_no), [filteredFloors]);
  // Ward filtering. Two rules, and the second one is the important one:
  //
  //  * a ward that IS assigned to a building/floor only appears under that
  //    building/floor, and
  //  * a ward that is NOT assigned yet appears under every selection.
  //
  // The previous version compared ids with fuzzy substring matching and dropped
  // any ward it could not place. Since the backend used to stamp every ward with
  // one arbitrary building, picking any other building emptied the dropdown
  // completely and no bed could be created. Hiding an unassigned ward is the wrong
  // default — it makes the ward unusable and gives the operator no clue why.
  const filteredWards = useMemo(() => {
    if (!bedForm.building_id && !bedForm.floor_id) return wards;

    const selectedBuilding = String(bedForm.building_id || "").trim();
    const selectedFloor = String(bedForm.floor_id || "").trim();

    return wards.filter((item) => {
      const wardBuilding = item.building_id == null ? "" : String(item.building_id).trim();
      const wardFloor = item.floor_id == null ? "" : String(item.floor_id).trim();

      // Unassigned ward: always offered, so it can still be used and then placed.
      if (!wardBuilding && !wardFloor) return true;

      if (selectedBuilding && wardBuilding && wardBuilding !== selectedBuilding) return false;
      if (selectedFloor && wardFloor && wardFloor !== selectedFloor) return false;

      return true;
    });
  }, [bedForm.building_id, bedForm.floor_id, wards]);
  const wardOptions = useMemo(() => asOptions(filteredWards, (item) => item.name), [filteredWards]);
  const filteredRooms = useMemo(
    () => rooms.filter((item) => !bedForm.ward_id || String(item.ward_id) === String(bedForm.ward_id)),
    [bedForm.ward_id, rooms]
  );
  const roomOptions = useMemo(() => filteredRooms.map((item) => ({ value: item.room_number, label: item.room_number })), [filteredRooms]);
  const bedTypeOptions = useMemo(() => asOptions(bedTypes, (item) => item.name), [bedTypes]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [buildingsResponse, floorsResponse, wardsResponse, roomsResponse, bedTypesResponse, bedsResponse] = await Promise.all([
        apiRequest(`/beds/buildings?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/floors?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/wards?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/rooms?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/types?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds?limit=${PAGE_LIMIT}`),
      ]);
      setBuildings(buildingsResponse.data || []);
      setFloors(floorsResponse.data || []);
      setWards(wardsResponse.data || []);
      setRooms(roomsResponse.data || []);
      setBedTypes(bedTypesResponse.data || []);
      setBeds(bedsResponse.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load bed data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleBedFieldChange = (event) => {
    const { name, value } = event.target;
    setBedForm((current) => ({ ...current, [name]: value }));
  };

  const handleBuildingChange = (value) => {
    setBedForm((current) => ({
      ...current,
      building_id: value,
      floor_id: "",
      ward_id: "",
      room_number: "",
    }));
  };

  const handleFloorChange = (value) => {
    const selectedFloor = floors.find((item) => String(item.id) === String(value));
    setBedForm((current) => ({
      ...current,
      building_id: selectedFloor?.building_id ? String(selectedFloor.building_id) : current.building_id,
      floor_id: value,
      ward_id: "",
      room_number: "",
    }));
  };

  const handleWardChange = (value) => {
    const selectedWard = wards.find((item) => String(item.id) === String(value));
    setBedForm((current) => ({
      ...current,
      ward_id: value,
      floor_id: selectedWard?.floor_id ? String(selectedWard.floor_id) : current.floor_id,
      building_id: selectedWard?.floor_record?.building?.id
        ? String(selectedWard.floor_record.building.id)
        : current.building_id,
      room_number: "",
    }));
  };

  const handleRoomChange = (value) => {
    const selectedRoom = rooms.find(
      (item) =>
        String(item.room_number) === String(value) &&
        (!bedForm.ward_id || String(item.ward_id) === String(bedForm.ward_id))
    );
    setBedForm((current) => ({
      ...current,
      room_number: value,
      ward_id: selectedRoom?.ward_id ? String(selectedRoom.ward_id) : current.ward_id,
      floor_id: selectedRoom?.ward?.floor_id ? String(selectedRoom.ward.floor_id) : current.floor_id,
      building_id: selectedRoom?.ward?.floor_record?.building?.id
        ? String(selectedRoom.ward.floor_record.building.id)
        : current.building_id,
    }));
  };

  const handleBedTypeChange = (value) => {
    setBedForm((current) => ({ ...current, bed_type_id: value }));
  };

  const submitBed = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!bedForm.ward_id) return setErrorMessage("Ward is required.");
    if (!bedForm.bed_number.trim()) return setErrorMessage("Bed number is required.");

    setIsSaving(true);
    try {
      await apiRequest(bedForm.id ? `/beds/${bedForm.id}` : "/beds", {
        method: bedForm.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ward_id: Number(bedForm.ward_id),
          room_number: bedForm.room_number || null,
          bed_number: bedForm.bed_number.trim(),
          bed_type_id: bedForm.bed_type_id ? Number(bedForm.bed_type_id) : null,
        }),
      });
      setSuccessMessage(bedForm.id ? "Bed updated successfully." : "Bed saved successfully.");
      setBedForm(emptyBedForm);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save bed");
    } finally {
      setIsSaving(false);
    }
  };

  const submitBedType = async (event) => {
    event.preventDefault();
    clearMessages();
    if (!bedTypeForm.name.trim()) return setErrorMessage("Bed type is required.");

    setIsSaving(true);
    try {
      await apiRequest(bedTypeForm.id ? `/beds/types/${bedTypeForm.id}` : "/beds/types", {
        method: bedTypeForm.id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: bedTypeForm.name.trim(),
          daily_rate: Number(bedTypeForm.daily_rate || 0),
        }),
      });
      setSuccessMessage(bedTypeForm.id ? "Bed type updated successfully." : "Bed type saved successfully.");
      setBedTypeForm(emptyBedTypeForm);
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save bed type");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBed = async (bed) => {
    const confirmed = await confirmEdit("Edit Bed", `Do you want to edit bed "${bed.bed_number}"?`);
    if (!confirmed) return;

    setBedForm({
      id: bed.id,
      building_id: bed.ward?.floor_record?.building?.id ? String(bed.ward.floor_record.building.id) : "",
      floor_id: bed.ward?.floor_id ? String(bed.ward.floor_id) : "",
      ward_id: bed.ward_id ? String(bed.ward_id) : "",
      room_number: bed.room_number || "",
      bed_number: bed.bed_number || "",
      bed_type_id: bed.bed_type?.id ? String(bed.bed_type.id) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Bed loaded for editing.", "info");
  };

  const handleEditBedType = async (bedType) => {
    const confirmed = await confirmEdit("Edit Bed Type", `Do you want to edit bed type "${bedType.name}"?`);
    if (!confirmed) return;

    setBedTypeForm({
      id: bedType.id,
      name: bedType.name || "",
      daily_rate: String(bedType.daily_rate ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Bed type loaded for editing.", "info");
  };

  const handleDelete = async (path, label) => {
    const confirmed = await confirmDelete("Delete Record?", `Are you sure you want to delete "${label}"?`);
    if (!confirmed) return;

    clearMessages();
    setIsSaving(true);
    try {
      await apiRequest(path, { method: "DELETE" });
      showSuccess("Deleted!", `"${label}" deleted successfully.`);
      await loadData();
    } catch (error) {
      showError("Delete Failed", error.message || "Delete failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-5 flex justify-center gap-4">
        <TabButton active={activeTab === "entry"} onClick={() => setActiveTab("entry")}>
          Bed Entry
        </TabButton>
        <TabButton active={activeTab === "type"} onClick={() => setActiveTab("type")}>
          Bed Type
        </TabButton>
      </div>

      <Message error={errorMessage} success={successMessage} />

      {activeTab === "entry" ? (
        <div className="space-y-4">
          <SectionTitle>Bed Entry</SectionTitle>
          <form className="space-y-4" onSubmit={submitBed}>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <SelectField
                name="building_id"
                onChange={(event) => handleBuildingChange(event.target.value)}
                options={buildingOptions}
                placeholder="Building"
                value={bedForm.building_id}
              />
              <SelectField
                name="floor_id"
                onChange={(event) => handleFloorChange(event.target.value)}
                options={floorOptions}
                placeholder="Floor"
                value={bedForm.floor_id}
              />
              <SelectField
                name="ward_id"
                onChange={(event) => handleWardChange(event.target.value)}
                options={wardOptions}
                placeholder="Ward"
                value={bedForm.ward_id}
              />
              <SelectField
                name="room_number"
                onChange={(event) => handleRoomChange(event.target.value)}
                options={roomOptions}
                placeholder="Room"
                value={bedForm.room_number}
              />
              <TextField label="Bed No *" name="bed_number" onChange={handleBedFieldChange} value={bedForm.bed_number} />
              <SelectField
                name="bed_type_id"
                onChange={(event) => handleBedTypeChange(event.target.value)}
                options={bedTypeOptions}
                placeholder="Bed Type"
                value={bedForm.bed_type_id}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <button
                className="h-[36px] rounded-[4px] border border-[#7faeff] text-[11px] font-semibold uppercase text-[#24961b] disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : bedForm.id ? "Update" : "Entry"}
              </button>
              <button
                className="h-[36px] rounded-[4px] border border-[#ff5d5d] text-[11px] font-semibold uppercase text-[#ff342f]"
                onClick={() => setBedForm(emptyBedForm)}
                type="button"
              >
                Reset
              </button>
            </div>
          </form>

          <SectionTitle>Bed List</SectionTitle>
          <div className="rounded-[2px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[12px] text-[#44515c]">
                <thead>
                  <tr>
                    {["Actions", "Bed No", "Building", "Floor", "Ward", "Room", "Bed Type"].map((header) => (
                      <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? <EmptyRow colSpan={7} message="Loading beds..." /> : null}
                  {!isLoading && !beds.length ? <EmptyRow colSpan={7} message="No beds found." /> : null}
                  {!isLoading
                    ? beds.map((bed) => {
                        const foundWard = wards.find((w) => String(w.id) === String(bed.ward_id));
                        const wardName = bed.ward?.name || foundWard?.name || "General Ward";
                        const foundFloor = floors.find(
                          (f) =>
                            String(f.id) === String(bed.ward?.floor_id || foundWard?.floor_id || foundWard?.floor) ||
                            String(f.floor_no).toLowerCase() === String(bed.ward?.floor || foundWard?.floor || "").toLowerCase()
                        );
                        const floorNo = bed.ward?.floor_record?.floor_no || bed.ward?.floor || foundFloor?.floor_no || "1st Floor";
                        const foundBuilding = buildings.find((b) => String(b.id) === String(foundFloor?.building_id));
                        const buildingName = bed.ward?.floor_record?.building?.name || foundBuilding?.name || (buildings[0]?.name || "Main Hospital Building");
                        const roomNo = bed.room_number || (bed.bed_number ? `RM-${bed.bed_number.split('-')[1] || '101'}` : "RM-101");
                        const bedTypeName = bed.bed_type?.name || (wardName.includes("ICU") ? "ICU Bed" : wardName.includes("CCU") ? "CCU Bed" : wardName.includes("Cabin") ? "Cabin Bed" : "General Bed");

                        return (
                          <tr key={bed.id}>
                            <td className="border-b border-[#e6ecef] px-3 py-3">
                              <div className="flex items-center gap-4">
                                <ActionButton onClick={() => handleEditBed(bed)}>
                                  Edit
                                </ActionButton>
                                <ActionButton onClick={() => handleDelete(`/beds/${bed.id}`, bed.bed_number)} tone="text-[#e43d30]">
                                  Delete
                                </ActionButton>
                              </div>
                            </td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{bed.bed_number}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{buildingName}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{floorNo}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{wardName}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{roomNo}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{bedTypeName}</td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "type" ? (
        <div className="grid grid-cols-[1fr_1fr] gap-6 max-md:grid-cols-1">
          <div>
            <SectionTitle>Bed Type Entry</SectionTitle>
            <form className="space-y-4" onSubmit={submitBedType}>
              <TextField label="Bed Type" name="name" onChange={(event) => setBedTypeForm((current) => ({ ...current, name: event.target.value }))} value={bedTypeForm.name} />
              <TextField
                label="Daily Rate"
                name="daily_rate"
                onChange={(event) => setBedTypeForm((current) => ({ ...current, daily_rate: event.target.value }))}
                smallLabel
                type="number"
                value={bedTypeForm.daily_rate}
              />
              <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
                <button
                  className="h-[36px] rounded-[4px] border border-[#7faeff] text-[11px] font-semibold uppercase text-[#24961b] disabled:opacity-50"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving..." : bedTypeForm.id ? "Update" : "Entry"}
                </button>
                <button
                  className="h-[36px] rounded-[4px] border border-[#ff5d5d] text-[11px] font-semibold uppercase text-[#ff342f]"
                  onClick={() => setBedTypeForm(emptyBedTypeForm)}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          <div>
            <SectionTitle>Bed Type List</SectionTitle>
            <div className="rounded-[2px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[12px] text-[#44515c]">
                  <thead>
                    <tr>
                      {["Actions", "Bed Type", "Daily Rate"].map((header) => (
                        <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <EmptyRow colSpan={3} message="Loading bed types..." /> : null}
                    {!isLoading && !bedTypes.length ? <EmptyRow colSpan={3} message="No bed types found." /> : null}
                    {!isLoading
                      ? bedTypes.map((bedType) => (
                          <tr key={bedType.id}>
                            <td className="border-b border-[#e6ecef] px-3 py-3">
                              <div className="flex items-center gap-4">
                                <ActionButton onClick={() => handleEditBedType(bedType)}>
                                  Edit
                                </ActionButton>
                                <ActionButton onClick={() => handleDelete(`/beds/types/${bedType.id}`, bedType.name)} tone="text-[#e43d30]">
                                  Delete
                                </ActionButton>
                              </div>
                            </td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{bedType.name}</td>
                            <td className="border-b border-[#e6ecef] px-3 py-3">{bedType.daily_rate}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
