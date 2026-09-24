import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";

export function BloodStockReportPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/reports/blood-stock");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load blood stock report.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    for (const row of rows) {
      const key = `${row.blood_group}|${row.component}`;
      if (!map[key]) map[key] = { blood_group: row.blood_group, component: row.component, statuses: {} };
      map[key].statuses[row.status] = Number(row.count || 0);
    }
    return Object.values(map);
  }, [rows]);

  const allStatuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-medium text-[#1f2c33]">Blood Stock Report</div>
          <button className="h-[38px] rounded-[4px] bg-black px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoading} onClick={loadReport} type="button">
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <table className="min-w-[520px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Blood Group</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Component</th>
              {allStatuses.map((s) => (
                <th key={s} className="border border-[#1f2c33] px-2 py-2 text-right font-medium capitalize">{s}</th>
              ))}
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length
              ? grouped.map((row) => {
                  const rowTotal = Object.values(row.statuses).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={`${row.blood_group}-${row.component}`}>
                      <td className="border border-[#1f2c33] px-2 py-1.5 font-medium">{row.blood_group}</td>
                      <td className="border border-[#1f2c33] px-2 py-1.5">{row.component || "Whole Blood"}</td>
                      {allStatuses.map((s) => (
                        <td key={s} className="border border-[#1f2c33] px-2 py-1.5 text-right">{row.statuses[s] || 0}</td>
                      ))}
                      <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium">{rowTotal}</td>
                    </tr>
                  );
                })
              : (
                <tr>
                  <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={3 + allStatuses.length}>
                    {isLoading ? "Loading..." : "No blood bags found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
