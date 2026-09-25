import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../lib/api";

const tabs = [
  { key: "login", label: "Login History" },
  { key: "audit", label: "Audit Trail" },
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function SecurityActivityPage() {
  const [tab, setTab] = useState("login");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPage = page, term = search, activeTab = tab) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "50" });
      if (activeTab === "login") params.set("entity_type", "authentication");
      if (term.trim()) params.set("search", term.trim());
      const response = await apiRequest(`/audit-logs?${params}`);
      setRows(response.data || []);
      const pagination = response.meta?.pagination || {};
      setPage(pagination.page || targetPage);
      setMeta({ total: pagination.total || 0, total_pages: Math.max(pagination.total_pages || 1, 1) });
    } catch (err) {
      setRows([]);
      setError(err.message || "Security activity could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => {
    load(1, "", tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const displayRows = useMemo(() => rows.map((row) => {
    const changes = row.changes || {};
    return {
      ...row,
      identity: row.user?.email || changes.email || "Unknown",
      actor: row.user?.full_name || changes.email || "Unknown",
      result: changes.success === false ? "Failed" : row.entity_type === "authentication" ? "Success" : "Completed",
      detail: changes.reason || (changes.request ? JSON.stringify(changes.request) : row.entity_id || "—"),
    };
  }), [rows]);

  const exportCsv = () => {
    const csvRows = [
      ["Time", "Actor", "Action", "Entity", "Result", "IP Address", "Details"],
      ...displayRows.map((row) => [formatDate(row.created_at), row.actor, row.action, row.entity_type, row.result, row.ip_address, row.detail]),
    ];
    const blob = new Blob([csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = tab === "login" ? "login-history.csv" : "audit-trail.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1380px] rounded-[8px] border border-[#d9e2e6] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-semibold text-[#203139]">Security Activity</h1>
          <p className="mt-1 text-[12px] text-[#687780]">Successful and failed sign-ins plus the complete system audit trail.</p>
        </div>
        <button className="rounded-[4px] border border-[#72a9e8] px-4 py-2 text-[12px] font-semibold text-[#2469b2]" disabled={!displayRows.length} onClick={exportCsv} type="button">EXPORT CSV</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#dfe7ea] pb-3">
        {tabs.map((item) => <button className={`rounded-[4px] px-4 py-2 text-[13px] ${tab === item.key ? "bg-[#277d87] text-white" : "bg-[#edf3f5] text-[#52616a]"}`} key={item.key} onClick={() => setTab(item.key)} type="button">{item.label}</button>)}
        <form className="ml-auto flex gap-2 max-sm:ml-0 max-sm:w-full" onSubmit={(event) => { event.preventDefault(); load(1, search, tab); }}>
          <input className="h-[36px] w-[260px] rounded-[4px] border border-[#ccd8dd] px-3 text-[13px] outline-none max-sm:flex-1" onChange={(event) => setSearch(event.target.value)} placeholder="Search user, action or IP" value={search} />
          <button className="rounded-[4px] bg-[#1f2c33] px-4 text-[12px] font-semibold text-white" type="submit">SEARCH</button>
        </form>
      </div>

      {error ? <div className="mb-4 rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-[5px] border border-[#dce5e8]">
        <table className="min-w-[1050px] w-full border-collapse text-left text-[12px] text-[#2c3d45]">
          <thead className="bg-[#e8f4f6]">
            <tr><th className="px-3 py-3">TIME</th><th className="px-3 py-3">ACTOR</th><th className="px-3 py-3">ACTION</th><th className="px-3 py-3">ENTITY</th><th className="px-3 py-3">RESULT</th><th className="px-3 py-3">IP ADDRESS</th><th className="px-3 py-3">DETAILS</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="px-3 py-10 text-center" colSpan="7">Loading security activity…</td></tr> : null}
            {!loading && !displayRows.length ? <tr><td className="px-3 py-10 text-center text-[#75838b]" colSpan="7">No activity found.</td></tr> : null}
            {!loading ? displayRows.map((row) => (
              <tr className="border-t border-[#edf1f3]" key={row.id}>
                <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                <td className="px-3 py-3"><div className="font-medium">{row.actor}</div><div className="text-[10px] text-[#7a8890]">{row.user?.role || ""}</div></td>
                <td className="px-3 py-3 uppercase">{row.action}</td>
                <td className="px-3 py-3">{row.entity_type}</td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 font-semibold ${row.result === "Failed" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{row.result}</span></td>
                <td className="px-3 py-3 whitespace-nowrap">{row.ip_address || "—"}</td>
                <td className="max-w-[340px] truncate px-3 py-3" title={row.detail}>{row.detail}</td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4 text-[12px] text-[#52616a]">
        <span>{meta.total} record(s)</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => load(page - 1, search, tab)} type="button">Previous</button>
        <span>Page {page} of {meta.total_pages}</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= meta.total_pages} onClick={() => load(page + 1, search, tab)} type="button">Next</button>
      </div>
    </section>
  );
}

