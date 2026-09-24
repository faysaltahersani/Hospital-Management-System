import { useNavigate } from "react-router-dom";
import { moduleItems } from "../data/modulesData";
import { canAccessPath, getStoredRole } from "../../../lib/auth";

const moduleToneClasses = {
  amber: "bg-[#f7b64a]",
  blue: "bg-[#4aa2f4]",
  coral: "bg-[#ff5959]",
  cyan: "bg-[#35b6cf]",
  magenta: "bg-[#d95af6]",
  mint: "bg-[#4fd79d]",
  orange: "bg-[#da7c18]",
  slate: "bg-[#3b5e63]",
};

const moduleIcons = {
  ambulance:
    "M4 9h1.2l.8-2.1h4.2L12 9h1v3h-.8a1.7 1.7 0 1 1-3.4 0H7.2a1.7 1.7 0 1 1-3.4 0H3V9.9A.9.9 0 0 1 4 9Zm3-3h2V4h1v2h2v1h-2v2H9V7H7V6Z",
  appointment:
    "M4.5 3h7A1.5 1.5 0 0 1 13 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3Zm.7 1.1v1h1v-1h3.6v1h1v-1h.7c.2 0 .4.2.4.4v1.1H4.1V4.5c0-.2.2-.4.4-.4h.7Zm-.4 3.3h5.4v3.5H5.8V7.4Zm2 .5v.8H6v1h1.8v1h1v-1h1.8v-1H8.8v-.8h-1Z",
  bed: "M3 7.2A2.2 2.2 0 0 1 5.2 5h2.1a2 2 0 0 1 1.6.8l.7.9h2.2A1.2 1.2 0 0 1 13 7.9V12h-1v1H11v-1H5v1H4v-1H3V7.2Zm2 .6v2.2h7V7.8H5Z",
  blood:
    "M8 2.4s3.4 3.8 3.4 6.2A3.4 3.4 0 0 1 8 12a3.4 3.4 0 0 1-3.4-3.4C4.6 6.2 8 2.4 8 2.4Zm-1.8 2.9 4.5 4.5.9-.9-4.5-4.5-.9.9Z",
  doctor:
    "M8 2.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm-2.8 5.1h5.6a2.4 2.4 0 0 1 2.4 2.4V12H9.7v-1H8.6v1H7.4v-1H6.3v1H2.8v-1.9a2.4 2.4 0 0 1 2.4-2.4Zm6.3 1.9a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm-.4.9v.5h-.5v.9h.5v.5h.9v-.5h.5V11h-.5v-.5h-.9Z",
  finance:
    "M8 2.5A5.5 5.5 0 1 1 2.5 8 5.5 5.5 0 0 1 8 2.5Zm-.7 2V5H6v1.2h1.3v1H6.2v1h1.1v1.3h1V8.2h1.1v-1H8.3v-1H9.5v-1H8.3v-.7h-1Z",
  ipd: "M3 6h2.4a2 2 0 0 1 1.7.9l.6.9H12a1 1 0 0 1 1 1V12h-1v1H11v-1H5v1H4v-1H3V6Zm2 4h7V9H5v1Zm3-6h1v2H8V4Z",
  medicine:
    "M5.4 3.3a3 3 0 0 1 4.2 0L12 5.7a3 3 0 0 1-4.2 4.2L5.4 7.5a3 3 0 0 1 0-4.2Zm1 .9-.7.7 3.4 3.4.7-.7a1.6 1.6 0 0 0-2.2-2.2l-.7.7-.7-.7a1.6 1.6 0 0 0-2.2 2.2Z",
  opd: "M4.8 3h6.4A1.8 1.8 0 0 1 13 4.8v6.4A1.8 1.8 0 0 1 11.2 13H4.8A1.8 1.8 0 0 1 3 11.2V4.8A1.8 1.8 0 0 1 4.8 3ZM7.3 5.2v1.4H5.9V8h1.4v1.4h1.4V8h1.4V6.6H8.7V5.2H7.3Z",
  pathology:
    "M4.1 3a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Zm0 1.1a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4.8-.2 1.1.8-1.2 1.8 1.8 2.4-.9.7-1.8-2.5 1-1.5-.5-.4.5-1.3Zm-.8 5.3 1 .4c-.3 1.1-1 1.8-2.1 2.2V13h3.2v1H3.1v-1h2.6v-1c.7-.2 1.2-.5 1.5-.9H5v-1h3.1Z",
  patient:
    "M8 4.1a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm-3.8 7.2a3.8 3.8 0 0 1 7.6 0H4.2Zm7.1-5.8h1v1h1v1h-1v1h-1v-1h-1v-1h1v-1Zm-6.5 2.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm0 .8.4.8.9.1-.7.6.2.9-.8-.4-.8.4.2-.9-.7-.6.9-.1.4-.8Z",
  pharmacy:
    "M6 3h4v1.4H9.1l-.4 1.5H10a2.5 2.5 0 0 1 0 5H6a2.5 2.5 0 0 1-.7-4.9L5.8 4.4H5V3h1Zm1 4.2V8h1V7.2h.8v-1H8V5.4H7v.8h-.8v1H7Z",
  radiology:
    "M8 12.5 3.6 8.2a2.7 2.7 0 0 1 3.8-3.8L8 5l.6-.6a2.7 2.7 0 0 1 3.8 3.8L8 12.5ZM5 7h1.5L7 5.8 8 8l.6-1H11v1H8.9L8 9.5 7 7.3 6.9 8H5V7Z",
  reports:
    "M4.5 3.2H9l2.5 2.5v6.1A1.2 1.2 0 0 1 10.3 13H4.5a1.2 1.2 0 0 1-1.2-1.2V4.4a1.2 1.2 0 0 1 1.2-1.2Zm1.1 3.4h3.8v.9H5.6v-.9Zm0 1.8h3.8v.9H5.6v-.9Zm0 1.8h3.8v.9H5.6v-.9Z",
};

function ModuleIcon({ icon }) {
  return (
    <svg className="h-[22px] w-[22px]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d={moduleIcons[icon]} />
    </svg>
  );
}

function ModuleCard({ icon, label, onClick, tone }) {
  return (
    <button
      className="flex h-[104px] w-full flex-col items-center justify-center gap-2.5 rounded-[8px] border border-[#d6dce2] bg-white px-4 py-4 text-center shadow-[0_8px_22px_rgba(28,38,48,0.1)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_12px_26px_rgba(28,38,48,0.12)]"
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${moduleToneClasses[tone]}`}
      >
        <ModuleIcon icon={icon} />
      </span>
      <span className="text-[15px] leading-none font-normal text-[#22272d]">{label}</span>
    </button>
  );
}

export function ModulesPage() {
  const navigate = useNavigate();
  const currentRole = getStoredRole();
  const moduleRoutes = {
    Appointment: "/appointment",
    Ambulance: "/ambulance",
    Bed: "/bed",
    Blood: "/blood",
    Doctor: "/doctor",
    Finance: "/finance",
    IPD: "/ipd",
    Medicine: "/medicine",
    OPD: "/opd",
    Pathology: "/pathology",
    Patient: "/patient",
    "Pharmacy Sales": "/pharmacy",
    Radiology: "/radiology",
    Referral: "/referral",
    Reports: "/reports",
  };

  const allowedItems = moduleItems.filter((item) => {
    const path = moduleRoutes[item.label];
    return path ? canAccessPath(path, currentRole) : true;
  });

  const displayItems = allowedItems.length > 0 ? allowedItems : moduleItems;

  return (
    <section className="mx-auto max-w-[1180px] px-8 pt-1 pb-8">
      <div className="mx-auto grid max-w-[1120px] grid-cols-5 gap-x-5 gap-y-5 max-xl:grid-cols-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {displayItems.map((item) => (
          <ModuleCard
            key={item.label}
            {...item}
            onClick={() => {
              const path = moduleRoutes[item.label];

              if (path) {
                navigate(path);
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
