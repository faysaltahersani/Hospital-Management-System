import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";

export function AppointmentShiftEntryPage() {
  const [name, setName] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/settings/master-options?type=appointment_shift&limit=100");
      setShifts(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setName("");
    setTimeFrom("");
    setTimeTo("");
    setEditId(null);
    setError("");
  };

  const entry = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const description = JSON.stringify({ time_from: timeFrom, time_to: timeTo });
      if (editId) {
        await apiRequest(`/settings/master-options/${editId}`, {
          method: "PATCH",
          body: JSON.stringify({ label: name.trim(), description }),
        });
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify({
            type: "appointment_shift",
            code: `shift_${Date.now()}`,
            label: name.trim(),
            description,
          }),
        });
      }
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setName(s.label);
    try {
      const d = JSON.parse(s.description || "{}");
      setTimeFrom(d.time_from || "");
      setTimeTo(d.time_to || "");
    } catch {
      setTimeFrom("");
      setTimeTo("");
    }
    setError("");
  };

  const deleteShift = async (id) => {
    if (!window.confirm("Delete this shift?")) return;
    try {
      await apiRequest(`/settings/master-options/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const parseTimes = (s) => {
    try {
      const d = JSON.parse(s.description || "{}");
      return [d.time_from || "—", d.time_to || "—"];
    } catch {
      return ["—", "—"];
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="grid grid-cols-[1.05fr_1fr] gap-5 max-lg:grid-cols-1">
          <div>
            <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
              Appointment Shift Entry
            </div>

            {error ? (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
            ) : null}

            <input
              className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              type="text"
              value={name}
            />

            <label className="mb-4 block text-[11px] text-[#8b959b]">
              <span className="mb-1 block">Time From</span>
              <input
                className="h-[48px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                onChange={(e) => setTimeFrom(e.target.value)}
                type="time"
                value={timeFrom}
              />
            </label>

            <label className="mb-4 block text-[11px] text-[#8b959b]">
              <span className="mb-1 block">Time To</span>
              <input
                className="h-[48px] w-full rounded-[3px] border border-[#c8d2d7] bg-white px-3 text-[15px] text-[#27353d] outline-none"
                onChange={(e) => setTimeTo(e.target.value)}
                type="time"
                value={timeTo}
              />
            </label>

            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <button
                className="w-full rounded-[6px] border border-[#8eb6ff] bg-white px-4 py-3 text-[15px] font-semibold text-[#159020] disabled:opacity-60"
                disabled={saving}
                onClick={entry}
                type="button"
              >
                {editId ? "Update" : "Entry"}
              </button>
              <button
                className="w-full rounded-[6px] border border-[#ff8f8f] bg-white px-4 py-3 text-[15px] font-semibold text-[#ff3f34]"
                onClick={reset}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>

          <div>
            <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
              Appointment Shift List
            </div>

            <div className="overflow-hidden rounded-[6px] border border-[#d7dde2] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
              <div className="flex items-center justify-between border-b border-[#e1e5e8] px-4 py-3">
                <button
                  className="rounded-[6px] border border-[#7baef7] bg-white px-4 py-2 text-[14px] font-medium text-[#2675db]"
                  type="button"
                >
                  Export CSV
                </button>
                <div className="flex items-center gap-5 text-[#767676]">
                  <span className="text-[24px]">⌕</span>
                  <span className="text-[24px]">≡</span>
                  <span className="text-[22px]">▥</span>
                  <span className="text-[24px]">☰</span>
                  <span className="text-[18px]">⛶</span>
                </div>
              </div>

              <div className="grid grid-cols-[140px_1fr_1fr_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[14px] font-semibold text-[#2f3c43]">
                <div className="flex items-center gap-2">
                  <span>ACTIONS</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Name</span>
                  <span className="text-[#c2c7cb]">⇅</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Time From</span>
                  <span className="text-[#c2c7cb]">⇅</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Time To</span>
                  <span className="text-[#c2c7cb]">⇅</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
              </div>

              {loading ? (
                <div className="px-4 py-6 text-center text-[14px] text-[#6b7a83]">Loading…</div>
              ) : shifts.length === 0 ? (
                <div className="px-4 py-6 text-center text-[14px] text-[#6b7a83]">No shifts found</div>
              ) : (
                shifts.map((s) => {
                  const [tf, tt] = parseTimes(s);
                  return (
                    <div
                      className="grid grid-cols-[140px_1fr_1fr_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[15px] text-[#293840]"
                      key={s.id}
                    >
                      <div className="flex items-center gap-6 text-[18px]">
                        <button
                          className="text-[#16921f]"
                          onClick={() => startEdit(s)}
                          title="Edit"
                          type="button"
                        >
                          ☰✎
                        </button>
                        <button
                          className="text-[#ff1f1f]"
                          onClick={() => deleteShift(s.id)}
                          title="Delete"
                          type="button"
                        >
                          🗑
                        </button>
                      </div>
                      <span>{s.label}</span>
                      <span>{tf}</span>
                      <span>{tt}</span>
                    </div>
                  );
                })
              )}

              <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
                <span>Rows per page 10 ▼</span>
                <span>
                  {loading ? "…" : `1-${shifts.length} of ${shifts.length}`}
                </span>
                <span className="text-[24px] text-[#c2c7cb]">‹</span>
                <span className="text-[24px] text-[#c2c7cb]">›</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
