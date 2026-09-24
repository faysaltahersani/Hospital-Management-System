import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";

export function AppointmentPriorityEntryPage() {
  const [name, setName] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/settings/master-options?type=appointment_priority&limit=100");
      setItems(res.data || []);
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
      if (editId) {
        await apiRequest(`/settings/master-options/${editId}`, {
          method: "PATCH",
          body: JSON.stringify({ label: name.trim() }),
        });
      } else {
        await apiRequest("/settings/master-options", {
          method: "POST",
          body: JSON.stringify({
            type: "appointment_priority",
            code: `priority_${Date.now()}`,
            label: name.trim(),
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

  const startEdit = (item) => {
    setEditId(item.id);
    setName(item.label);
    setError("");
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this priority?")) return;
    try {
      await apiRequest(`/settings/master-options/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[8px] border border-[#d3dde0] bg-white p-5 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="grid grid-cols-[1.05fr_1fr] gap-5 max-lg:grid-cols-1">
          <div>
            <div className="mb-5 rounded-[4px] bg-[#d9eef0] px-4 py-4 text-[18px] font-medium uppercase text-[#22343d]">
              Appointment Priority Name Entry
            </div>

            {error ? (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
            ) : null}

            <input
              className="mb-4 h-[48px] w-full rounded-[3px] border border-x-0 border-t-0 border-b-[#8b8f93] bg-[#f6f6f6] px-3 text-[15px] text-[#34434a] outline-none placeholder:text-[#5f6b74]"
              onChange={(e) => setName(e.target.value)}
              placeholder="NAME"
              type="text"
              value={name}
            />

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
              Appointment Priority Name List
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

              <div className="grid grid-cols-[200px_1fr] border-b border-[#e1e5e8] px-4 py-3 text-[14px] font-semibold text-[#2f3c43]">
                <div className="flex items-center gap-2">
                  <span>ACTIONS</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Name</span>
                  <span className="text-[#c2c7cb]">⇅</span>
                  <span className="text-[#c2c7cb]">⋮</span>
                </div>
              </div>

              {loading ? (
                <div className="px-4 py-6 text-center text-[14px] text-[#6b7a83]">Loading…</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-6 text-center text-[14px] text-[#6b7a83]">No priorities found</div>
              ) : (
                items.map((item) => (
                  <div
                    className="grid grid-cols-[200px_1fr] items-center border-b border-[#e7eaec] px-4 py-4 text-[15px] text-[#293840]"
                    key={item.id}
                  >
                    <div className="flex items-center gap-6 text-[18px]">
                      <button
                        className="text-[#16921f]"
                        onClick={() => startEdit(item)}
                        title="Edit"
                        type="button"
                      >
                        ☰✎
                      </button>
                      <button
                        className="text-[#ff1f1f]"
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                        type="button"
                      >
                        🗑
                      </button>
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))
              )}

              <div className="flex items-center justify-end gap-6 px-4 py-4 text-[15px] text-[#4b5961]">
                <span>Rows per page 10 ▼</span>
                <span>
                  {loading ? "…" : `1-${items.length} of ${items.length}`}
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
