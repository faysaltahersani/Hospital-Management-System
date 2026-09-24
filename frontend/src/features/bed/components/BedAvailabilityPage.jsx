import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { printHtml } from "../../../lib/print";

const PAGE_LIMIT = 100;

function ToolbarButton({ children, onClick }) {
  return (
    <button
      className="rounded border border-[#d9e1e5] bg-white px-3 py-2 text-[14px] text-[#2d2d2d] transition-colors hover:bg-[#f5f7f9]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function InfoLine({ children, icon }) {
  return (
    <div className="flex items-start gap-2 text-[12px] text-[#2f3941]">
      <span className="mt-[1px] text-[12px]">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function StatusLine({ status }) {
  const isAvailable = status === "available";

  return (
    <div className={`flex items-center gap-1.5 text-[13px] font-semibold ${isAvailable ? "text-[#1f8c2b]" : "text-[#e4372f]"}`}>
      <span>{isAvailable ? "◉" : "◉"}</span>
      <span>{isAvailable ? "Available" : "Booked"}</span>
    </div>
  );
}

function BedCard({ bed }) {
  const status = String(bed.status || "").toLowerCase();
  const isAvailable = status === "available";
  const ward = bed.ward;
  const floor = ward?.floor_record?.floor_no || ward?.floor || (bed.bed_number?.includes("1") ? "1st Floor" : bed.bed_number?.includes("2") ? "2nd Floor" : "3rd Floor");
  const building = ward?.floor_record?.building?.name || "Main Hospital Building";
  const room = bed.room_number || (bed.bed_number ? `RM-${bed.bed_number.split('-')[1] || '101'}` : "RM-101");

  return (
    <div
      className={`rounded-[12px] border p-4 shadow-[0_4px_14px_rgba(22,36,45,0.08)] transition-shadow ${
        isAvailable ? "border-[#b6e5b8] bg-[#dbffd8]" : "border-[#ebb4b4] bg-[#ffd8d8]"
      }`}
    >
      <div className="space-y-2">
        <InfoLine icon="🛏">Bed: {bed.bed_number || "N/A"}</InfoLine>
        <InfoLine icon="🚪">Room: {room}</InfoLine>
        <InfoLine icon="🏢">Ward: {ward?.name || "General Ward"}</InfoLine>
        <InfoLine icon="✧">Floor: {floor}</InfoLine>
        <InfoLine icon="🏥">Building: {building}</InfoLine>
        <StatusLine status={status} />
      </div>
    </div>
  );
}

export function BedAvailabilityPage() {
  const [beds, setBeds] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadBeds = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const response = await apiRequest(`/beds?${params.toString()}`);
      setBeds(response.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load bed availability");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBeds();
  }, [statusFilter]);

  const summary = useMemo(() => {
    const available = beds.filter((bed) => bed.status === "available").length;
    const booked = beds.length - available;
    return { total: beds.length, available, booked };
  }, [beds]);

  const exportCsv = () => {
    const header = ["Bed No", "Room", "Ward", "Floor", "Building", "Status"];
    const rows = beds.map((bed) => [
      bed.bed_number || "",
      bed.room_number || "",
      bed.ward?.name || "",
      bed.ward?.floor_record?.floor_no || bed.ward?.floor || "",
      bed.ward?.floor_record?.building?.name || "",
      bed.status || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bed-availability.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = async () => {
    const rows = beds
      .map((bed) => {
        const ward = bed.ward;
        const floor = ward?.floor_record;
        const building = floor?.building;

        return `
          <tr>
            <td>${bed.bed_number || "N/A"}</td>
            <td>${bed.room_number || "N/A"}</td>
            <td>${ward?.name || "N/A"}</td>
            <td>${floor?.floor_no || ward?.floor || "N/A"}</td>
            <td>${building?.name || "N/A"}</td>
            <td>${bed.status || "N/A"}</td>
          </tr>
        `;
      })
      .join("");

    await printHtml(
      `
      <!-- Summary Box -->
      <div style="border: 1px solid #222; border-radius: 4px; padding: 8px 14px; margin-bottom: 16px; font-size: 13px; line-height: 1.7;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div><strong>Total Beds</strong><br/><span style="font-size: 20px; font-weight: bold;">${summary.total}</span></div>
          <div><strong>Available</strong><br/><span style="font-size: 20px; font-weight: bold; color: #388e3c;">${summary.available}</span></div>
          <div><strong>Occupied</strong><br/><span style="font-size: 20px; font-weight: bold; color: #d32f2f;">${summary.booked}</span></div>
        </div>
      </div>

      <!-- Beds Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #222;">
            <th style="padding: 8px 10px; text-align: left;">Bed No</th>
            <th style="padding: 8px 10px; text-align: left;">Room</th>
            <th style="padding: 8px 10px; text-align: left;">Ward</th>
            <th style="padding: 8px 10px; text-align: left;">Floor</th>
            <th style="padding: 8px 10px; text-align: left;">Building</th>
            <th style="padding: 8px 10px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="padding: 10px; text-align: center;">No beds found.</td></tr>'}
        </tbody>
      </table>
      `,
      "BED AVAILABILITY REPORT"
    );
  };

  return (
    <section className="mx-auto max-w-[1280px] space-y-3">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[18px] font-medium text-[#1f2c33]">Bed Availability</div>

        {errorMessage ? <div className="mb-4 rounded bg-[#fff1f1] px-3 py-2 text-[12px] text-[#c51f1a]">{errorMessage}</div> : null}

        <div className="grid grid-cols-[minmax(0,1fr)_160px_120px] gap-4 max-lg:grid-cols-1">
          <input
            className="h-[44px] rounded-[4px] border border-[#d9e1e5] bg-[#f7f9fb] px-4 text-[14px] text-[#55606a] outline-none"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadBeds();
            }}
            placeholder="Search by bed, room, ward"
            value={search}
          />
          <select
            className="h-[44px] appearance-none rounded-[4px] border border-[#d9e1e5] bg-[#f7f9fb] px-3 pr-10 text-[14px] text-[#55606a] outline-none"
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23737c84' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
              backgroundPosition: "right 14px center",
              backgroundRepeat: "no-repeat",
            }}
            value={statusFilter}
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Booked</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button
            className="h-[44px] rounded-[4px] bg-black px-5 text-[14px] font-semibold text-white"
            onClick={loadBeds}
            type="button"
          >
            Report
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-[#55606a]">
          <span className="rounded-full bg-[#eef3f7] px-3 py-1">Total: {summary.total}</span>
          <span className="rounded-full bg-[#e8f9ea] px-3 py-1 text-[#1f8c2b]">Available: {summary.available}</span>
          <span className="rounded-full bg-[#ffe8e8] px-3 py-1 text-[#d93128]">Booked/Other: {summary.booked}</span>
        </div>
      </div>

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="flex items-center gap-3">
          <ToolbarButton onClick={printReport}>Print</ToolbarButton>
          <ToolbarButton onClick={exportCsv}>Export CSV</ToolbarButton>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div className="h-[170px] animate-pulse rounded-[12px] border border-[#d9e1e5] bg-[#f5f7f9]" key={index} />
          ))
        ) : beds.length ? (
          beds.map((bed) => <BedCard bed={bed} key={bed.id} />)
        ) : (
          <div className="col-span-full rounded-[12px] border border-[#d9e1e5] bg-white px-4 py-10 text-center text-[14px] text-[#78848f]">
            No beds found.
          </div>
        )}
      </div>
    </section>
  );
}
