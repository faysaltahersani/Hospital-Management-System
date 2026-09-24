import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, showError, showSuccess, showToast } from "../../../lib/alerts";

const PAGE_LIMIT = 100;
const WARD_TYPE = "general";

const emptyBuildingForm = { id: null, name: "" };
const emptyFloorForm = { id: null, building_id: "", floor_no: "" };
const emptyWardForm = { id: null, building_id: "", floor_id: "", name: "" };
const emptyRoomForm = { id: null, building_id: "", floor_id: "", ward_id: "", room_number: "", room_type: "", capacity: "0" };

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
      {smallLabel ? <span className="mb-0.5 block text-[9px] text-[#6c7680]">{label}</span> : null}
      <input
        className="h-[46px] w-full border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 text-[15px] text-[#55606a] outline-none"
        name={name}
        onChange={onChange}
        placeholder={label}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({ name, onChange, options, placeholder, value }) {
  return (
    <select
      className="h-[46px] w-full appearance-none border-0 border-b border-[#959da3] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#55606a] outline-none"
      name={name}
      onChange={onChange}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 14px center",
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

function TableShell({ children, title }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="rounded-[2px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">{children}</div>
    </div>
  );
}

function ActionButton({ children, onClick, tone = "text-[#2574d9]" }) {
  return (
    <button className={`${tone} text-[11px] font-medium`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function StatusMessage({ error, success }) {
  if (error) {
    return <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{error}</div>;
  }
  if (success) {
    return <div className="mb-4 rounded bg-[#ecfbef] px-3 py-2 text-[12px] text-[#1f7a2d]">{success}</div>;
  }
  return null;
}

function EmptyState({ colSpan, message }) {
  return (
    <tr>
      <td className="px-3 py-8 text-center text-[17px] italic text-[#78848f]" colSpan={colSpan}>
        {message}
      </td>
    </tr>
  );
}

function FormActions({ isSaving, onReset, submitLabel }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
      <button
        className="h-[36px] rounded-[4px] border border-[#7faeff] text-[11px] font-semibold uppercase text-[#24961b] disabled:opacity-50"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
      <button
        className="h-[36px] rounded-[4px] border border-[#ff5d5d] text-[11px] font-semibold uppercase text-[#ff342f]"
        onClick={onReset}
        type="button"
      >
        Reset
      </button>
    </div>
  );
}

function TwoPane({ form, list }) {
  return <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">{form}{list}</div>;
}

const asOptions = (items, labelBuilder) =>
  items.map((item) => ({
    value: String(item.id),
    label: labelBuilder(item),
  }));

export function BedManagementPage() {
  const [activeTab, setActiveTab] = useState("building");
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildingForm, setBuildingForm] = useState(emptyBuildingForm);
  const [floorForm, setFloorForm] = useState(emptyFloorForm);
  const [wardForm, setWardForm] = useState(emptyWardForm);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const buildingOptions = useMemo(() => asOptions(buildings, (item) => item.name), [buildings]);
  const floorOptions = useMemo(
    () =>
      asOptions(
        floors.filter((item) => !wardForm.building_id || String(item.building_id) === String(wardForm.building_id)),
        (item) => item.floor_no
      ),
    [floors, wardForm.building_id]
  );
  const roomFloorOptions = useMemo(
    () =>
      asOptions(
        floors.filter((item) => !roomForm.building_id || String(item.building_id) === String(roomForm.building_id)),
        (item) => item.floor_no
      ),
    [floors, roomForm.building_id]
  );
  const roomWardOptions = useMemo(
    () =>
      asOptions(
        wards.filter((item) => {
          const wardFloorVal = String(item.floor_id || item.floor || "");
          if (roomForm.floor_id) {
            const selectedFloorObj = floors.find((f) => String(f.id) === String(roomForm.floor_id));
            const selectedFloorNo = selectedFloorObj?.floor_no;
            return wardFloorVal === String(roomForm.floor_id) || (selectedFloorNo && wardFloorVal === String(selectedFloorNo));
          }
          if (roomForm.building_id) {
            const foundFloor = floors.find((f) => String(f.id) === wardFloorVal || String(f.floor_no) === wardFloorVal);
            return foundFloor && String(foundFloor.building_id) === String(roomForm.building_id);
          }
          return true;
        }),
        (item) => item.name
      ),
    [floors, roomForm.building_id, roomForm.floor_id, wards]
  );

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [buildingsResponse, floorsResponse, wardsResponse, roomsResponse] = await Promise.all([
        apiRequest(`/beds/buildings?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/floors?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/wards?limit=${PAGE_LIMIT}`),
        apiRequest(`/beds/rooms?limit=${PAGE_LIMIT}`),
      ]);
      setBuildings(buildingsResponse.data || []);
      setFloors(floorsResponse.data || []);
      setWards(wardsResponse.data || []);
      setRooms(roomsResponse.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load facility data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetAllMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleDelete = async (path, label) => {
    const confirmed = await confirmDelete("Delete Facility Record?", `Are you sure you want to delete "${label}"?`);
    if (!confirmed) return;

    setIsSaving(true);
    resetAllMessages();
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

  const submitBuilding = async (event) => {
    event.preventDefault();
    if (!buildingForm.name.trim()) return setErrorMessage("Building name is required.");
    setIsSaving(true);
    resetAllMessages();
    try {
      await apiRequest(buildingForm.id ? `/beds/buildings/${buildingForm.id}` : "/beds/buildings", {
        method: buildingForm.id ? "PATCH" : "POST",
        body: JSON.stringify({ name: buildingForm.name.trim() }),
      });
      setBuildingForm(emptyBuildingForm);
      setSuccessMessage(buildingForm.id ? "Building updated successfully." : "Building saved successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save building");
    } finally {
      setIsSaving(false);
    }
  };

  const submitFloor = async (event) => {
    event.preventDefault();
    if (!floorForm.floor_no.trim()) return setErrorMessage("Floor number is required.");
    if (!floorForm.building_id) return setErrorMessage("Building is required.");
    setIsSaving(true);
    resetAllMessages();
    try {
      await apiRequest(floorForm.id ? `/beds/floors/${floorForm.id}` : "/beds/floors", {
        method: floorForm.id ? "PATCH" : "POST",
        body: JSON.stringify({
          building_id: Number(floorForm.building_id),
          floor_no: floorForm.floor_no.trim(),
        }),
      });
      setFloorForm(emptyFloorForm);
      setSuccessMessage(floorForm.id ? "Floor updated successfully." : "Floor saved successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save floor");
    } finally {
      setIsSaving(false);
    }
  };

  const submitWard = async (event) => {
    event.preventDefault();
    if (!wardForm.name.trim()) return setErrorMessage("Ward number is required.");
    if (!wardForm.floor_id) return setErrorMessage("Floor is required.");
    setIsSaving(true);
    resetAllMessages();
    try {
      await apiRequest(wardForm.id ? `/beds/wards/${wardForm.id}` : "/beds/wards", {
        method: wardForm.id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: wardForm.name.trim(),
          floor_id: Number(wardForm.floor_id),
          type: WARD_TYPE,
        }),
      });
      setWardForm(emptyWardForm);
      setSuccessMessage(wardForm.id ? "Ward updated successfully." : "Ward saved successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save ward");
    } finally {
      setIsSaving(false);
    }
  };

  const submitRoom = async (event) => {
    event.preventDefault();
    if (!roomForm.room_number.trim()) return setErrorMessage("Room number is required.");
    if (!roomForm.ward_id) return setErrorMessage("Ward is required.");
    setIsSaving(true);
    resetAllMessages();
    try {
      await apiRequest(roomForm.id ? `/beds/rooms/${roomForm.id}` : "/beds/rooms", {
        method: roomForm.id ? "PATCH" : "POST",
        body: JSON.stringify({
          ward_id: Number(roomForm.ward_id),
          room_number: roomForm.room_number.trim(),
          room_type: roomForm.room_type.trim() || null,
          capacity: Number(roomForm.capacity || 0),
        }),
      });
      setRoomForm(emptyRoomForm);
      setSuccessMessage(roomForm.id ? "Room updated successfully." : "Room saved successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save room");
    } finally {
      setIsSaving(false);
    }
  };

  const buildingRows = buildings;
  const floorRows = floors;
  const wardRows = wards;
  const roomRows = rooms;

  const handleRoomWardChange = (wardId) => {
    const selectedWard = wards.find((item) => String(item.id) === String(wardId));
    const wardFloorVal = selectedWard ? String(selectedWard.floor_id || selectedWard.floor || "") : "";
    const foundFloor = floors.find((f) => String(f.id) === wardFloorVal || String(f.floor_no) === wardFloorVal);

    setRoomForm((current) => ({
      ...current,
      ward_id: wardId,
      floor_id: foundFloor ? String(foundFloor.id) : (wardFloorVal || current.floor_id),
      building_id: foundFloor?.building_id ? String(foundFloor.building_id) : current.building_id,
    }));
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-6 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-6 flex justify-center gap-2">
        <TabButton active={activeTab === "building"} onClick={() => setActiveTab("building")}>
          Building
        </TabButton>
        <TabButton active={activeTab === "floor"} onClick={() => setActiveTab("floor")}>
          Floor
        </TabButton>
        <TabButton active={activeTab === "ward"} onClick={() => setActiveTab("ward")}>
          Ward
        </TabButton>
        <TabButton active={activeTab === "room"} onClick={() => setActiveTab("room")}>
          Room
        </TabButton>
      </div>

      <StatusMessage error={errorMessage} success={successMessage} />

      {activeTab === "building" ? (
        <TwoPane
          form={
            <div>
              <SectionTitle>Building Name Entry</SectionTitle>
              <form className="space-y-4" onSubmit={submitBuilding}>
                <TextField
                  label="Name"
                  name="name"
                  onChange={(event) => setBuildingForm((current) => ({ ...current, name: event.target.value }))}
                  value={buildingForm.name}
                />
                <FormActions isSaving={isSaving} onReset={() => setBuildingForm(emptyBuildingForm)} submitLabel={buildingForm.id ? "Update" : "Entry"} />
              </form>
            </div>
          }
          list={
            <TableShell title="Building Name List">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[12px] text-[#525d67]">
                  <thead>
                    <tr>
                      {["Actions", "Name"].map((header) => (
                        <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <EmptyState colSpan={2} message="Loading buildings..." /> : null}
                    {!isLoading && !buildingRows.length ? <EmptyState colSpan={2} message="No records to display" /> : null}
                    {!isLoading
                      ? buildingRows.map((row) => (
                          <tr key={row.id}>
                            <td className="border-b border-[#eef1f3] px-3 py-3">
                              <div className="flex items-center gap-4">
                                <ActionButton
                                  onClick={async () => {
                                    const confirmed = await confirmEdit("Edit Building", `Do you want to edit building "${row.name}"?`);
                                    if (!confirmed) return;
                                    setBuildingForm({ id: row.id, name: row.name });
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                    showToast("Building loaded for editing.", "info");
                                  }}
                                >
                                  Edit
                                </ActionButton>
                                <ActionButton onClick={() => handleDelete(`/beds/buildings/${row.id}`, row.name)} tone="text-[#e43d30]">
                                  Delete
                                </ActionButton>
                              </div>
                            </td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{row.name}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </TableShell>
          }
        />
      ) : null}

      {activeTab === "floor" ? (
        <TwoPane
          form={
            <div>
              <SectionTitle>Floor Entry</SectionTitle>
              <form className="space-y-4" onSubmit={submitFloor}>
                <TextField
                  label="Floor No *"
                  name="floor_no"
                  onChange={(event) => setFloorForm((current) => ({ ...current, floor_no: event.target.value }))}
                  value={floorForm.floor_no}
                />
                <SelectField
                  name="building_id"
                  onChange={(event) => setFloorForm((current) => ({ ...current, building_id: event.target.value }))}
                  options={buildingOptions}
                  placeholder="Building Name"
                  value={floorForm.building_id}
                />
                <FormActions isSaving={isSaving} onReset={() => setFloorForm(emptyFloorForm)} submitLabel={floorForm.id ? "Update" : "Entry"} />
              </form>
            </div>
          }
          list={
            <TableShell title="Floor List">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[12px] text-[#525d67]">
                  <thead>
                    <tr>
                      {["Actions", "Floor No", "Building Name"].map((header) => (
                        <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <EmptyState colSpan={3} message="Loading floors..." /> : null}
                    {!isLoading && !floorRows.length ? <EmptyState colSpan={3} message="No records to display" /> : null}
                    {!isLoading
                      ? floorRows.map((row) => {
                          const foundBuilding = buildings.find((b) => String(b.id) === String(row.building_id));
                          const buildingName = foundBuilding ? foundBuilding.name : row.building?.name || "-";

                          return (
                            <tr key={row.id}>
                              <td className="border-b border-[#eef1f3] px-3 py-3">
                                <div className="flex items-center gap-4">
                                  <ActionButton
                                    onClick={async () => {
                                      const confirmed = await confirmEdit("Edit Floor", `Do you want to edit floor "${row.floor_no}"?`);
                                      if (!confirmed) return;
                                      setFloorForm({
                                        id: row.id,
                                        building_id: row.building_id ? String(row.building_id) : "",
                                        floor_no: row.floor_no || "",
                                      });
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                      showToast("Floor loaded for editing.", "info");
                                    }}
                                  >
                                    Edit
                                  </ActionButton>
                                  <ActionButton onClick={() => handleDelete(`/beds/floors/${row.id}`, row.floor_no)} tone="text-[#e43d30]">
                                    Delete
                                  </ActionButton>
                                </div>
                              </td>
                              <td className="border-b border-[#eef1f3] px-3 py-3">{row.floor_no}</td>
                              <td className="border-b border-[#eef1f3] px-3 py-3">{buildingName}</td>
                            </tr>
                          );
                        })
                      : null}
                  </tbody>
                </table>
              </div>
            </TableShell>
          }
        />
      ) : null}

      {activeTab === "ward" ? (
        <TwoPane
          form={
            <div>
              <SectionTitle>Ward Entry</SectionTitle>
              <form className="space-y-4" onSubmit={submitWard}>
                <TextField
                  label="Ward No *"
                  name="name"
                  onChange={(event) => setWardForm((current) => ({ ...current, name: event.target.value }))}
                  value={wardForm.name}
                />
                <SelectField
                  name="building_id"
                  onChange={(event) =>
                    setWardForm((current) => ({ ...current, building_id: event.target.value, floor_id: "" }))
                  }
                  options={buildingOptions}
                  placeholder="Building Name"
                  value={wardForm.building_id}
                />
                <SelectField
                  name="floor_id"
                  onChange={(event) => setWardForm((current) => ({ ...current, floor_id: event.target.value }))}
                  options={floorOptions}
                  placeholder="Floor No"
                  value={wardForm.floor_id}
                />
                <FormActions isSaving={isSaving} onReset={() => setWardForm(emptyWardForm)} submitLabel={wardForm.id ? "Update" : "Entry"} />
              </form>
            </div>
          }
          list={
            <TableShell title="Ward List">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-[12px] text-[#525d67]">
                  <thead>
                    <tr>
                      {["Actions", "Ward No", "Building Name", "Floor No"].map((header) => (
                        <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? <EmptyState colSpan={4} message="Loading wards..." /> : null}
                    {!isLoading && !wardRows.length ? <EmptyState colSpan={4} message="No records to display" /> : null}
                    {!isLoading
                      ? wardRows.map((row) => {
                          const foundFloor = floors.find(
                            (f) =>
                              String(f.id) === String(row.floor_id || row.floor) ||
                              String(f.floor_no).toLowerCase() === String(row.floor || "").toLowerCase() ||
                              (row.floor && String(f.floor_no).replace(/[^0-9]/g, "") === String(row.floor).replace(/[^0-9]/g, ""))
                          );
                          const floorNo = foundFloor ? foundFloor.floor_no : (row.floor && row.floor !== "-" ? row.floor : "1st Floor");
                          const buildingId = foundFloor?.building_id || row.building_id;
                          const foundBuilding = buildings.find((b) => String(b.id) === String(buildingId));
                          const buildingName = foundBuilding ? foundBuilding.name : (buildings[0]?.name || "Main Hospital Building");

                          return (
                            <tr key={row.id}>
                              <td className="border-b border-[#eef1f3] px-3 py-3">
                                <div className="flex items-center gap-4">
                                  <ActionButton
                                    onClick={async () => {
                                      const confirmed = await confirmEdit("Edit Ward", `Do you want to edit ward "${row.name}"?`);
                                      if (!confirmed) return;
                                      setWardForm({
                                        id: row.id,
                                        building_id: buildingId ? String(buildingId) : "",
                                        floor_id: foundFloor ? String(foundFloor.id) : String(row.floor || ""),
                                        name: row.name || "",
                                      });
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                      showToast("Ward loaded for editing.", "info");
                                    }}
                                  >
                                    Edit
                                  </ActionButton>
                                  <ActionButton onClick={() => handleDelete(`/beds/wards/${row.id}`, row.name)} tone="text-[#e43d30]">
                                    Delete
                                  </ActionButton>
                                </div>
                              </td>
                              <td className="border-b border-[#eef1f3] px-3 py-3">{row.name}</td>
                              <td className="border-b border-[#eef1f3] px-3 py-3">{buildingName}</td>
                              <td className="border-b border-[#eef1f3] px-3 py-3">{floorNo}</td>
                            </tr>
                          );
                        })
                      : null}
                  </tbody>
                </table>
              </div>
            </TableShell>
          }
        />
      ) : null}

      {activeTab === "room" ? (
        <div className="space-y-5">
          <SectionTitle>Room Entry</SectionTitle>
          <form className="space-y-5" onSubmit={submitRoom}>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <TextField
                label="Room No"
                name="room_number"
                onChange={(event) => setRoomForm((current) => ({ ...current, room_number: event.target.value }))}
                value={roomForm.room_number}
              />
              <TextField
                label="Room Type"
                name="room_type"
                onChange={(event) => setRoomForm((current) => ({ ...current, room_type: event.target.value }))}
                value={roomForm.room_type}
              />
              <TextField
                label="Capacity"
                name="capacity"
                onChange={(event) => setRoomForm((current) => ({ ...current, capacity: event.target.value }))}
                smallLabel
                type="number"
                value={roomForm.capacity}
              />
              <SelectField
                name="building_id"
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, building_id: event.target.value, floor_id: "", ward_id: "" }))
                }
                options={buildingOptions}
                placeholder="Building Name"
                value={roomForm.building_id}
              />
              <SelectField
                name="floor_id"
                onChange={(event) => setRoomForm((current) => ({ ...current, floor_id: event.target.value, ward_id: "" }))}
                options={roomFloorOptions}
                placeholder="Floor No"
                value={roomForm.floor_id}
              />
              <SelectField
                name="ward_id"
                onChange={(event) => handleRoomWardChange(event.target.value)}
                options={roomWardOptions}
                placeholder="Ward No"
                value={roomForm.ward_id}
              />
            </div>
            <FormActions isSaving={isSaving} onReset={() => setRoomForm(emptyRoomForm)} submitLabel={roomForm.id ? "Update" : "Entry"} />
          </form>

          <TableShell title="Room List">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-[12px] text-[#44515c]">
                <thead>
                  <tr>
                    {["Actions", "Room No", "Room Type", "Capacity", "Building Name", "Floor No", "Ward No"].map((header) => (
                      <th className="border-b border-[#d9e1e5] px-3 py-3 font-semibold" key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                    {isLoading ? <EmptyState colSpan={7} message="Loading rooms..." /> : null}
                    {!isLoading && !roomRows.length ? <EmptyState colSpan={7} message="No records to display" /> : null}
                    {!isLoading
                      ? roomRows.map((row) => {
                          const foundWard = wards.find((w) => String(w.id) === String(row.ward_id));
                          const wardName = foundWard ? foundWard.name : row.ward?.name || "General Ward";

                          const wardFloorVal = foundWard ? String(foundWard.floor_id || foundWard.floor || "") : "";
                          const foundFloor = floors.find(
                            (f) =>
                              String(f.id) === wardFloorVal ||
                              String(f.floor_no).toLowerCase() === wardFloorVal.toLowerCase() ||
                              (wardFloorVal && String(f.floor_no).replace(/[^0-9]/g, "") === wardFloorVal.replace(/[^0-9]/g, ""))
                          );
                          const floorNo = foundFloor ? foundFloor.floor_no : (wardFloorVal && wardFloorVal !== "-" ? wardFloorVal : "1st Floor");

                          const buildingId = foundFloor?.building_id || foundWard?.building_id;
                          const foundBuilding = buildings.find((b) => String(b.id) === String(buildingId));
                          const buildingName = foundBuilding ? foundBuilding.name : (buildings[0]?.name || "Main Hospital Building");

                        return (
                          <tr key={row.id}>
                            <td className="border-b border-[#eef1f3] px-3 py-3">
                              <div className="flex items-center gap-4">
                                <ActionButton
                                  onClick={async () => {
                                    const confirmed = await confirmEdit("Edit Room", `Do you want to edit room "${row.room_number}"?`);
                                    if (!confirmed) return;
                                    setRoomForm({
                                      id: row.id,
                                      building_id: buildingId ? String(buildingId) : "",
                                      floor_id: foundFloor ? String(foundFloor.id) : wardFloorVal,
                                      ward_id: row.ward_id ? String(row.ward_id) : "",
                                      room_number: row.room_number || "",
                                      room_type: row.room_type || "",
                                      capacity: String(row.capacity ?? 0),
                                    });
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                    showToast("Room loaded for editing.", "info");
                                  }}
                                >
                                  Edit
                                </ActionButton>
                                <ActionButton onClick={() => handleDelete(`/beds/rooms/${row.id}`, row.room_number)} tone="text-[#e43d30]">
                                  Delete
                                </ActionButton>
                              </div>
                            </td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{row.room_number}</td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{row.room_type || ""}</td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{row.capacity}</td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{buildingName}</td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{floorNo}</td>
                            <td className="border-b border-[#eef1f3] px-3 py-3">{wardName}</td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </TableShell>
        </div>
      ) : null}
    </section>
  );
}
