import { useNavigate } from "react-router-dom";
import { pharmacySections } from "../data/pharmacyData";

function PharmacyPanel({ items, title }) {
  const navigate = useNavigate();
  const pharmacyRoutes = {
    "Pharmacy Sales": "/pharmacy/sales",
    "Pharmacy Purchase": "/pharmacy/purchase",
    "Pharmacy Sales Return": "/pharmacy/sales-return",
    "Pharmacy Purchase Return": "/pharmacy/purchase-return",
    "Pharmacy Supplier": "/pharmacy/supplier",
    "Medicine Batch Wise Stock": "/pharmacy/medicine-batch-stock",
    "Medicine Stock Report": "/pharmacy/medicine-stock-report",
    "Pharmacy Sales Record": "/pharmacy/sales-record",
    "Pharmacy Purchase Record": "/pharmacy/purchase-record",
    "Pharmacy Sales Return Record": "/pharmacy/sales-return-record",
    "Pharmacy Purchase Return Record": "/pharmacy/purchase-return-record",
  };

  return (
    <section className="min-h-[240px] rounded-[8px] bg-white px-4 pt-3 pb-4 shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
      <h2 className="pb-3 text-center text-[17px] leading-none font-semibold text-[#1f252b]">
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            className="flex h-[34px] w-full items-center rounded-[3px] bg-[#edf2f4] px-3 text-left text-[13px] leading-none text-[#5d666d] transition-colors duration-150 hover:bg-[#e5ecef]"
            key={item}
            onClick={() => {
              const path = pharmacyRoutes[item];

              if (path) {
                navigate(path);
              }
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

export function PharmacyPage() {
  return (
    <section className="mx-auto max-w-[1240px] pt-[2px]">
      <div className="mb-10 h-[30px] rounded-[4px] bg-[#327b84] text-center text-[18px] leading-[30px] text-white shadow-[0_4px_12px_rgba(24,52,59,0.12)]">
        Pharmacy
      </div>

      <div className="mx-auto grid max-w-[860px] grid-cols-[360px_300px] justify-center gap-x-8 gap-y-6 max-md:grid-cols-1">
        {pharmacySections.map((section) => (
          <PharmacyPanel key={section.title} {...section} />
        ))}
      </div>
    </section>
  );
}
