import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../../lib/api";

const bloodGroups = ["O-", "O+", "AB-", "AB+", "B-", "B+", "A-", "A+"];

const actionButtons = [
  { label: "Blood Donate", path: "/blood/donate", className: "bg-[#2376da]" },
  { label: "Blood Issue", path: "/blood/issue", className: "bg-[#43a22b]" },
  { label: "Component Issue", path: "/blood/component-issue", className: "bg-[#ea5a17]" },
  { label: "Component Separation", path: "/blood/component-separation", className: "bg-[#7a24b2]" },
];

const componentLabelMap = {
  whole_blood: "Whole Blood",
  rbc: "RBC",
  plasma: "FFP (Plasma)",
  platelets: "Platelets",
  cryo: "Cryo",
};

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-[10px] border border-[#d9e1e5] bg-white shadow-[0_10px_24px_rgba(22,36,45,0.08)] ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="px-4 py-8 text-center text-[14px] text-[#66737b]">{children}</div>;
}

function MessageBanner({ tone = "error", children }) {
  return (
    <div
      className={`rounded-[4px] border px-3 py-2 text-[13px] ${
        tone === "error"
          ? "border-[#f2b2b2] bg-[#fff5f5] text-[#b94a48]"
          : "border-[#b7dfc7] bg-[#f3fff7] text-[#1d7a46]"
      }`}
    >
      {children}
    </div>
  );
}

export function BloodStockPage() {
  const navigate = useNavigate();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState(bloodGroups[0]);
  const [bags, setBags] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadStock = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          limit: "100",
          status: "available",
          blood_group: selectedBloodGroup,
        });

        const [bagsResponse, summaryResponse] = await Promise.all([
          apiRequest(`/blood-bank/bags?${params.toString()}`),
          apiRequest("/blood-bank/bags/summary"),
        ]);

        if (!isMounted) return;
        setBags(bagsResponse.data || []);
        setSummaryRows(summaryResponse.data || []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood stock");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadStock();
    return () => {
      isMounted = false;
    };
  }, [selectedBloodGroup]);

  const stockRows = useMemo(
    () =>
      bags
        .filter((bag) => bag.status === "available" && bag.component === "whole_blood")
        .map((bag) => ({
          bagNo: bag.bag_code || "-",
          lotNo: bag.lot_no || "N/A",
          donor: bag.donor?.full_name || bag.donor?.donor_code || "Walk-in",
          unit: bag.unit_name || "ml",
        })),
    [bags]
  );

  const componentRows = useMemo(
    () =>
      bags
        .filter((bag) => bag.status === "available" && bag.component !== "whole_blood")
        .map((bag) => ({
          key: bag.id,
          component: componentLabelMap[bag.component] || bag.component,
          bagNo: bag.bag_code || "-",
          volume: bag.volume_ml || "-",
          unit: bag.unit_name || "ml",
          lot: bag.lot_no || "N/A",
        })),
    [bags]
  );

  const wholeBloodCount = useMemo(
    () =>
      summaryRows
        .filter((row) => row.status === "available" && row.blood_group === selectedBloodGroup && row.component === "whole_blood")
        .reduce((sum, row) => sum + Number(row.count || 0), 0),
    [selectedBloodGroup, summaryRows]
  );

  const componentCount = useMemo(
    () =>
      summaryRows
        .filter((row) => row.status === "available" && row.blood_group === selectedBloodGroup && row.component !== "whole_blood")
        .reduce((sum, row) => sum + Number(row.count || 0), 0),
    [selectedBloodGroup, summaryRows]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <Card className="overflow-hidden">
        <div className="grid min-h-[460px] grid-cols-[220px_1fr] bg-[#f7fbfd] max-md:grid-cols-1">
          <aside className="border-r border-[#d5dde1] bg-white max-md:border-r-0 max-md:border-b">
            {bloodGroups.map((group) => (
              <label
                className={`flex h-[52px] w-full cursor-pointer items-center justify-center border-b border-[#edf2f4] text-[18px] text-[#606d75] transition-colors duration-150 ${
                  selectedBloodGroup === group ? "bg-[#dcebfa] font-semibold text-[#246de0]" : "hover:bg-[#f5f8fa]"
                }`}
                key={group}
              >
                <input
                  checked={selectedBloodGroup === group}
                  className="sr-only"
                  name="blood-group"
                  onChange={() => setSelectedBloodGroup(group)}
                  type="radio"
                  value={group}
                />
                <span>{group}</span>
              </label>
            ))}
          </aside>

          <div className="p-6">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              {actionButtons.map((button) => (
                <button
                  className={`${button.className} rounded-[4px] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-white shadow-[0_6px_14px_rgba(17,24,39,0.18)]`}
                  key={button.label}
                  onClick={() => navigate(button.path)}
                  type="button"
                >
                  {button.label}
                </button>
              ))}
            </div>

            <Card className="p-4">
              <h1 className="mb-5 text-[18px] font-semibold text-[#24333b]">{selectedBloodGroup} Blood Details</h1>

              {errorMessage ? <MessageBanner>{errorMessage}</MessageBanner> : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-4">
                  <h2 className="mb-4 text-center text-[16px] font-semibold text-[#252f35]">Blood Stock ({wholeBloodCount})</h2>
                  {stockRows.length ? (
                    <table className="w-full text-left text-[14px] text-[#29353d]">
                      <thead className="text-[#2c3740]">
                        <tr className="border-b border-[#d9e1e5]">
                          <th className="px-4 py-2 font-medium">Bag No</th>
                          <th className="px-4 py-2 font-medium">Lot No</th>
                          <th className="px-4 py-2 font-medium">Donor</th>
                          <th className="px-4 py-2 font-medium">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockRows.map((row) => (
                          <tr className="border-b border-[#e7edf0]" key={row.bagNo}>
                            <td className="px-4 py-2">{row.bagNo}</td>
                            <td className="px-4 py-2">{row.lotNo}</td>
                            <td className="px-4 py-2">{row.donor}</td>
                            <td className="px-4 py-2">{row.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState>{isLoading ? "Loading blood stock..." : "No available whole blood bags for this group."}</EmptyState>
                  )}
                </Card>

                <Card className="p-4">
                  <h2 className="mb-4 text-center text-[16px] font-semibold text-[#252f35]">Blood Component Stock ({componentCount})</h2>
                  {componentRows.length ? (
                    <table className="w-full text-left text-[14px] text-[#29353d]">
                      <thead className="text-[#2c3740]">
                        <tr className="border-b border-[#d9e1e5]">
                          <th className="px-4 py-2 font-medium">Component</th>
                          <th className="px-4 py-2 font-medium">Bag No</th>
                          <th className="px-4 py-2 font-medium">Volume</th>
                          <th className="px-4 py-2 font-medium">Unit</th>
                          <th className="px-4 py-2 font-medium">Lot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {componentRows.map((row) => (
                          <tr className="border-b border-[#e7edf0]" key={row.key}>
                            <td className="px-4 py-2">{row.component}</td>
                            <td className="px-4 py-2">{row.bagNo}</td>
                            <td className="px-4 py-2">{row.volume}</td>
                            <td className="px-4 py-2">{row.unit}</td>
                            <td className="px-4 py-2">{row.lot}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyState>{isLoading ? "Loading component stock..." : "No available component bags for this group."}</EmptyState>
                  )}
                </Card>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </section>
  );
}
