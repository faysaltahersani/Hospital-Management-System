import { useNavigate } from "react-router-dom";
import { reportsItems } from "../data/reportsData";
import { reportRoutes } from "../data/reportRoutes";

export function ReportsPage() {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-[1240px] pt-[2px]">
      <div className="mb-10 h-[30px] rounded-[4px] bg-[#327b84] text-center text-[18px] leading-[30px] text-white shadow-[0_4px_12px_rgba(24,52,59,0.12)]">
        Reports
      </div>

      <div className="rounded-[8px] bg-white p-[8px] shadow-[0_10px_24px_rgba(22,36,45,0.08)]">
        <div className="grid grid-cols-6 gap-[8px] max-xl:grid-cols-5 max-lg:grid-cols-4 max-md:grid-cols-3 max-sm:grid-cols-2">
          {reportsItems.map((item) => (
            <button
              className="flex min-h-[38px] items-center rounded-[2px] bg-[#edf2f4] px-5 text-left text-[13px] leading-[1.2] text-[#42535f] transition-colors duration-150 hover:bg-[#e5ecef]"
              key={item}
              onClick={() => {
                const path = reportRoutes[item];

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
      </div>
    </section>
  );
}
