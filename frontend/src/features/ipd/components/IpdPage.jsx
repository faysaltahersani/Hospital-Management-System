import { useNavigate } from "react-router-dom";
import { ipdSections } from "../data/ipdData";

function IpdPanel({ items, title }) {
  const navigate = useNavigate();

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
              if (item === "IPD Bill Entry") {
                navigate("/ipd/bill-entry");
              }

              if (item === "Symptoms Manage") {
                navigate("/ipd/symptoms-manage");
              }

              if (item === "IPD Bill Record") {
                navigate("/ipd/bill-record");
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

export function IpdPage() {
  return (
    <section className="mx-auto max-w-[1240px] pt-[2px]">
      <div className="mb-10 h-[30px] rounded-[4px] bg-[#327b84] text-center text-[18px] leading-[30px] text-white shadow-[0_4px_12px_rgba(24,52,59,0.12)]">
        IPD
      </div>

      <div className="mx-auto grid max-w-[860px] grid-cols-[360px_300px] justify-center gap-x-8 gap-y-6 max-md:grid-cols-1">
        {ipdSections.map((section) => (
          <IpdPanel key={section.title} {...section} />
        ))}
      </div>
    </section>
  );
}
