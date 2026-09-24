import { useEffect, useState } from "react";

import { apiRequest } from "../../../lib/api";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY = { summary: { total_medicines: 0, total_units: 0, stock_value: 0 }, low_stock: [] };

export function PharmacyStockReportPage() {
  const [report, setReport] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest("/reports/pharmacy-stock?limit=50");
      setReport(response.data || EMPTY);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pharmacy stock report.");
      setReport(EMPTY);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const summary = report.summary || EMPTY.summary;
  const lowStock = report.low_stock || [];

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      {errorMessage ? (
        <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">{errorMessage}</div>
      ) : null}

      <div className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <div className="flex items-center justify-between">
          <div className="text-[18px] font-medium text-[#1f2c33]">Pharmacy Stock Report</div>
          <button className="h-[38px] rounded-[4px] bg-black px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoading} onClick={loadReport} type="button">
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {[
          { label: "Active Medicines", value: summary.total_medicines },
          { label: "Total Units in Stock", value: Number(summary.total_units || 0).toLocaleString() },
          { label: "Stock Value", value: money(summary.stock_value) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[4px] border border-[#d9e1e5] bg-white px-4 py-5 shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
            <div className="text-[13px] text-[#5a6775]">{label}</div>
            <div className="mt-1 text-[20px] font-bold text-[#1f2c33]">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_2px_8px_rgba(22,36,45,0.06)]">
        <div className="px-4 py-3 text-[14px] font-medium text-[#203446]">Low Stock Medicines</div>
        <table className="min-w-[620px] border-collapse text-left text-[11px] text-[#1f2c33]">
          <thead className="bg-[#eef3f6]">
            <tr>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Code</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Name</th>
              <th className="border border-[#1f2c33] px-2 py-2 font-medium">Category</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Stock Qty</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Reorder Level</th>
              <th className="border border-[#1f2c33] px-2 py-2 text-right font-medium">Sale Price</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.length
              ? lowStock.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.code}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.name}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5">{row.category || "—"}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right font-medium text-[#c0392b]">{row.stock_quantity}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{row.reorder_level}</td>
                    <td className="border border-[#1f2c33] px-2 py-1.5 text-right">{money(row.sale_price)}</td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="border border-[#1f2c33] px-2 py-6 text-center text-[12px] text-[#5f6b76]" colSpan={6}>
                    {isLoading ? "Loading..." : "No low-stock medicines found."}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
