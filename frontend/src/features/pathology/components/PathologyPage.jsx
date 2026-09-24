import { useNavigate } from "react-router-dom";
import { pathologySections } from "../data/pathologyData";

function PathologyPanel({ items, title }) {
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
              if (item === "Pathology Bill Entry") {
                navigate("/pathology/bill-entry");
              }

              if (item === "Pathology Test") {
                navigate("/pathology/test-entry");
              }

              if (item === "Pathology Test Category Entry") {
                navigate("/pathology/test-category-entry");
              }

              if (item === "Pathology Parameter Entry") {
                navigate("/pathology/parameter-entry");
              }

              if (item === "Pathology Test Unit") {
                navigate("/pathology/test-unit-entry");
              }

              if (item === "Pathology Bill Record") {
                navigate("/pathology/bill-record");
              }

              if (item === "Pathology Test List") {
                navigate("/pathology/test-list");
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

export function PathologyPage() {
  return (
    <section className="mx-auto max-w-[1240px] pt-[2px]">
      <div className="mb-10 h-[30px] rounded-[4px] bg-[#327b84] text-center text-[18px] leading-[30px] text-white shadow-[0_4px_12px_rgba(24,52,59,0.12)]">
        Pathology
      </div>

      <div className="mx-auto grid max-w-[860px] grid-cols-[360px_300px] justify-center gap-x-8 gap-y-6 max-md:grid-cols-1">
        {pathologySections.map((section) => (
          <PathologyPanel key={section.title} {...section} />
        ))}
      </div>
    </section>
  );
}
