import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

export function BedOccupancyReportPage() {
  const [report, setReport] = useState({ total: 0, occupied: 0, available: 0, occupancy_rate: 0, by_status: {} });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/reports/bed-occupancy");
      setReport(response.data || { total: 0, occupied: 0, available: 0, occupancy_rate: 0, by_status: {} });
    } catch (error) {
      setErrorMessage(error.message || "Failed to load bed occupancy report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-medium text-[#1f2c33]">Bed Occupancy Report</div>
          <button className="h-[38px] rounded-[4px] bg-black px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoading} onClick={loadReport} type="button">
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {[
          { label: "Total Beds", value: report.total },
          { label: "Occupied", value: report.occupied },
          { label: "Available", value: report.available },
          { label: "Occupancy Rate", value: `${report.occupancy_rate}%`, raw: true },
        ].map(({ label, value, raw }) => (
          <div key={label} className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 text-center shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="text-[28px] font-bold text-[#1f2c33]">{raw ? value : value}</div>
            <div className="mt-1 text-[12px] text-[#5a6775]">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Breakdown by Status</div>
        <table className="min-w-[360px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Status</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(report.by_status || {}).length
              ? Object.entries(report.by_status).map(([status, count]) => (
                  <tr key={status}>
                    <td className="border border-[#1f2c33] px-2 py-1.5 capitalize">{status}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{count}</td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={2}>
                    {isLoading ? "Loading..." : "No bed data found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
