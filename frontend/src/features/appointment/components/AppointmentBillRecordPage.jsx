import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/api";

const filterTypes = ["All", "By Patient", "By Doctor", "By Date", "By Search"];

const todayStr = new Date().toISOString().split("T")[0];

function formatDate(dateStr, timeStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    const time = timeStr ? String(timeStr).slice(0, 5) : "";
    return `${day} ${month} ${year}${time ? ` ${time}` : ""}`;
  } catch {
    return dateStr;
  }
}

function TableHeaderCell({ children, className = "" }) {
  return (
    <th className={`border border-black px-1.5 py-1 font-normal text-left ${className}`}>
      {children}
    </th>
  );
}

function TableCell({ children, className = "" }) {
  return (
    <td className={`border border-black px-1.5 py-1 ${className}`}>{children}</td>
  );
}

function IconButton({ children, color = "", onClick, title }) {
  return (
    <button
      className={`grid h-5 w-5 place-items-center ${color}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function AppointmentBillRecordPage() {
  const [filterType, setFilterType] = useState("All");
  const [patientFilter, setPatientFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          apiRequest("/patients?limit=100"),
          apiRequest("/doctors?limit=100"),
        ]);
        setPatients(pRes.data || []);
        setDoctors(dRes.data || []);
      } catch {
        /* ignore */
      }
    };
    loadLists();
  }, []);

  const buildQuery = (p = page) => {
    const params = new URLSearchParams({ page: String(p), limit: "10" });
    if (filterType === "By Date" || filterType === "All") {
      params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      params.set("to", new Date(`${toDate}T23:59:59`).toISOString());
    }
    if (filterType === "By Patient" && patientFilter) {
      params.set("patient_id", patientFilter);
    }
    if (filterType === "By Doctor" && doctorFilter) {
      params.set("doctor_id", doctorFilter);
    }
    if (filterType === "By Search" && searchText.trim()) {
      params.set("search", searchText.trim());
    }
    return params.toString();
  };

  const load = async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest(`/appointments?${buildQuery(p)}`);
      setAppointments(res.data || []);
      const pagination = res.meta?.pagination || {};
      setMeta({
        page: pagination.page || p,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        total_pages: pagination.total_pages || 1,
        has_next: Boolean(pagination.has_next),
        has_prev: Boolean(pagination.has_prev),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const rows = useMemo(
    () =>
      appointments.map((a, idx) => ({
        id: a.id,
        sl: (meta.page - 1) * meta.limit + idx + 1,
        patient: a.patient?.full_name || "N/A",
        doctor: a.doctor?.user?.full_name || "N/A",
        serialNo: a.appointment_code || "—",
        date: formatDate(a.appointment_date, a.appointment_time),
        slot: a.appointment_time ? String(a.appointment_time).slice(0, 5) : "—",
        shift: "—",
        status: a.status || "",
        fees: parseFloat(a.consultation_fee || 0).toFixed(0),
        discount: "0",
        total: parseFloat(a.consultation_fee || 0).toFixed(2),
        paid: "0.00",
        due: parseFloat(a.consultation_fee || 0).toFixed(2),
        createdBy: "N/A",
        updatedBy: "N/A",
      })),
    [appointments, meta.limit, meta.page]
  );

  const handleReport = () => {
    setPage(1);
    load(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await apiRequest(`/appointments/${id}`, { method: "DELETE" });
      await load(page);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d3dde0] bg-white p-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="mb-5 text-[16px] font-medium uppercase text-[#202f37]">
          Appointment Bill Record
        </div>

        {error ? (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-end gap-4 max-md:gap-3">
          <label className="block text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">Filter Type</span>
            <select
              className="h-[40px] w-[160px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(e) => { setFilterType(e.target.value); setPatientFilter(""); setDoctorFilter(""); setSearchText(""); }}
              value={filterType}
            >
              {filterTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          {filterType === "By Patient" ? (
            <label className="block text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Patient</span>
              <select
                className="h-[40px] w-[200px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                onChange={(e) => setPatientFilter(e.target.value)}
                value={patientFilter}
              >
                <option value="">Search Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.full_name}</option>
                ))}
              </select>
            </label>
          ) : null}

          {filterType === "By Doctor" ? (
            <label className="block text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Doctor</span>
              <select
                className="h-[40px] w-[200px] rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                onChange={(e) => setDoctorFilter(e.target.value)}
                value={doctorFilter}
              >
                <option value="">Search Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.user?.full_name || `Doctor #${d.id}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {filterType === "By Search" ? (
            <label className="block text-[12px] text-[#5d6a72]">
              <span className="mb-1 block">Search</span>
              <input
                className="h-[40px] w-[200px] border-b-2 border-[#8b8f93] bg-[#f6f6f6] px-3 text-[14px] text-[#202f37] outline-none"
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Name / Code"
                type="text"
                value={searchText}
              />
            </label>
          ) : null}

          <label className="block text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">From Date</span>
            <input
              className="h-[40px] w-[180px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(e) => setFromDate(e.target.value)}
              type="date"
              value={fromDate}
            />
          </label>

          <label className="block text-[12px] text-[#5d6a72]">
            <span className="mb-1 block">To Date</span>
            <input
              className="h-[40px] w-[180px] rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[14px] text-[#202f37] outline-none"
              onChange={(e) => setToDate(e.target.value)}
              type="date"
              value={toDate}
            />
          </label>

          <button
            className="h-[40px] min-w-[120px] rounded-[3px] bg-black px-4 text-[12px] font-medium text-white disabled:opacity-60"
            disabled={loading}
            onClick={handleReport}
            type="button"
          >
            {loading ? "LOADING…" : "REPORT"}
          </button>
        </div>
      </div>

      <div className="mt-2 rounded-[2px] border border-[#d7dfe4] bg-white px-4 py-2 shadow-[0_1px_3px_rgba(22,36,45,0.06)]">
        <button className="text-[#333]" onClick={() => window.print()} type="button">
          <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
            <path d="M4 1h8v3H4zm8 9v4H4v-4zm1-5H3a2 2 0 0 0-2 2v3h3V8h8v2h3V7a2 2 0 0 0-2-2" />
          </svg>
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <TableHeaderCell>SL</TableHeaderCell>
              <TableHeaderCell>Patient</TableHeaderCell>
              <TableHeaderCell>Doctor</TableHeaderCell>
              <TableHeaderCell>Serial No</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Slot</TableHeaderCell>
              <TableHeaderCell>Shift</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Fees</TableHeaderCell>
              <TableHeaderCell className="text-right">Discount</TableHeaderCell>
              <TableHeaderCell className="text-right">Total</TableHeaderCell>
              <TableHeaderCell className="text-right">Paid</TableHeaderCell>
              <TableHeaderCell className="text-right">Due</TableHeaderCell>
              <TableHeaderCell>Created By</TableHeaderCell>
              <TableHeaderCell>Updated By</TableHeaderCell>
              <TableHeaderCell className="text-center">Actions</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#6b7a83]" colSpan={16}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="border border-black px-1 py-4 text-center text-[#6b7a83]" colSpan={16}>
                  No appointments found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <TableCell>{row.sl}</TableCell>
                  <TableCell>{row.patient}</TableCell>
                  <TableCell>{row.doctor}</TableCell>
                  <TableCell>{row.serialNo}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.slot}</TableCell>
                  <TableCell>{row.shift}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{row.fees}</TableCell>
                  <TableCell className="text-right">{row.discount}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                  <TableCell className="text-right">{row.paid}</TableCell>
                  <TableCell className="text-right">{row.due}</TableCell>
                  <TableCell>{row.createdBy}</TableCell>
                  <TableCell>{row.updatedBy}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <IconButton color="text-[#ff6a00]" title="Print">
                        <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M3 2h10v12H3zm2 2v2h6V4zm0 4v4h6V8z" />
                        </svg>
                      </IconButton>
                      <IconButton color="text-[#1d62d1]" title="View">
                        <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4 1h6l3 3v11H4zm5 1.5V5h2.5zM6 8h5v1H6zm0 2h5v1H6zm0 2h5v1H6z" />
                        </svg>
                      </IconButton>
                      <IconButton color="text-[#138a1b]" title="Mark complete">
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                          <path d="M2 4h6M2 8h6M2 12h4M10 5l2 2 3-4" stroke="currentColor" strokeWidth="1.6" />
                        </svg>
                      </IconButton>
                      <IconButton color="text-[#f57c00]" onClick={() => handleDelete(row.id)} title="Delete">
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
                          <path d="M4 5h8M6 5V3h4v2M6 7v5M10 7v5M4.5 5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                      </IconButton>
                    </div>
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-center justify-center gap-6 text-[12px] text-[#63727b]">
        <button className="rounded-[2px] border border-[#cfd7dc] bg-[#f3f6f8] px-3 py-2" type="button">
          {meta.limit}
        </button>
        <button
          disabled={!meta.has_prev}
          onClick={() => {
            const next = Math.max(page - 1, 1);
            setPage(next);
            load(next);
          }}
          type="button"
        >
          ‹
        </button>
        <button className="text-[#1f2c33]" type="button">
          {meta.page}
        </button>
        <button
          disabled={!meta.has_next}
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next);
          }}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
