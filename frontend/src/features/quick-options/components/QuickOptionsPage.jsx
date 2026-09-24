import { Link } from "react-router-dom";
import { quickOptionSections } from "../data/quickOptionsData";

const quickOptionToneClasses = {
  black: "text-[#161616]",
  blue: "text-[#1689cf]",
  brown: "text-[#6d4b3d]",
  green: "text-[#2f8a3d]",
  orange: "text-[#ff6d00]",
  pink: "text-[#e33272]",
  purple: "text-[#9c27b0]",
  red: "text-[#df3137]",
  rose: "text-[#c0185a]",
  sky: "text-[#039bd7]",
  violet: "text-[#8e24aa]",
};

const quickOptionIcons = {
  ambulance:
    "M4 9h1.2l.8-2.1h4.2L12 9h1v3h-.8a1.7 1.7 0 1 1-3.4 0H7.2a1.7 1.7 0 1 1-3.4 0H3V9.9A.9.9 0 0 1 4 9Zm3-3h2V4h1v2h2v1h-2v2H9V7H7V6Z",
  appointment:
    "M4.5 3h7A1.5 1.5 0 0 1 13 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3Zm.7 1.1v1h1v-1h3.6v1h1v-1h.7c.2 0 .4.2.4.4v1.1H4.1V4.5c0-.2.2-.4.4-.4h.7Zm-.4 3.3h5.4v3.5H5.8V7.4Zm2 .5v.8H6v1h1.8v1h1v-1h1.8v-1H8.8v-.8h-1Z",
  bed: "M3 7.2A2.2 2.2 0 0 1 5.2 5h2.1a2 2 0 0 1 1.6.8l.7.9h2.2A1.2 1.2 0 0 1 13 7.9V12h-1v1H11v-1H5v1H4v-1H3V7.2Zm2 .6v2.2h7V7.8H5Z",
  blood:
    "M8 2.4s3.4 3.8 3.4 6.2A3.4 3.4 0 0 1 8 12a3.4 3.4 0 0 1-3.4-3.4C4.6 6.2 8 2.4 8 2.4Zm-1.8 2.9 4.5 4.5.9-.9-4.5-4.5-.9.9Z",
  doctor:
    "M8 2.6a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm-2.8 5.1h5.6a2.4 2.4 0 0 1 2.4 2.4V12H9.7v-1H8.6v1H7.4v-1H6.3v1H2.8v-1.9a2.4 2.4 0 0 1 2.4-2.4Zm6.3 1.9a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm-.4.9v.5h-.5v.9h.5v.5h.9v-.5h.5V11h-.5v-.5h-.9Z",
  ipd: "M3 6h2.4a2 2 0 0 1 1.7.9l.6.9H12a1 1 0 0 1 1 1V12h-1v1H11v-1H5v1H4v-1H3V6Zm2 4h7V9H5v1Zm3-6h1v2H8V4Z",
  opd: "M4.8 3h6.4A1.8 1.8 0 0 1 13 4.8v6.4A1.8 1.8 0 0 1 11.2 13H4.8A1.8 1.8 0 0 1 3 11.2V4.8A1.8 1.8 0 0 1 4.8 3ZM7.3 5.2v1.4H5.9V8h1.4v1.4h1.4V8h1.4V6.6H8.7V5.2H7.3Z",
  pathology: "M7.2 3h1.6v3.2H12v1.6H8.8V11H7.2V7.8H4V6.2h3.2V3Z",
  patient:
    "M8 4.1a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm-3.8 7.2a3.8 3.8 0 0 1 7.6 0H4.2Zm7.1-5.8h1v1h1v1h-1v1h-1v-1h-1v-1h1v-1Zm-6.5 2.3a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm0 .8.4.8.9.1-.7.6.2.9-.8-.4-.8.4.2-.9-.7-.6.9-.1.4-.8Z",
  pharmacy:
    "M6 3h4v1.4H9.1l-.4 1.5H10a2.5 2.5 0 0 1 0 5H6a2.5 2.5 0 0 1-.7-4.9L5.8 4.4H5V3h1Zm1 4.2V8h1V7.2h.8v-1H8V5.4H7v.8h-.8v1H7Z",
  radiology:
    "M8 12.5 3.6 8.2a2.7 2.7 0 0 1 3.8-3.8L8 5l.6-.6a2.7 2.7 0 0 1 3.8 3.8L8 12.5ZM5 7h1.5L7 5.8 8 8l.6-1H11v1H8.9L8 9.5 7 7.3 6.9 8H5V7Z",
};

function QuickOptionIcon({ icon }) {
  return (
    <svg className="h-[24px] w-[24px]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d={quickOptionIcons[icon]} />
    </svg>
  );
}

function QuickOptionCard({ icon, label, tone, path }) {
  return (
    <Link
      className="flex h-[100px] w-full items-center justify-center gap-[18px] rounded-[7px] border border-[#2d8a38] bg-[#e9e9e9] px-6 text-left shadow-[0_2px_4px_rgba(0,0,0,0.16)] transition-colors duration-150 hover:bg-[#f1f1f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d8a38]"
      to={path}
    >
      <span className={`grid place-items-center ${quickOptionToneClasses[tone]}`}>
        <QuickOptionIcon icon={icon} />
      </span>
      <span className="min-w-0 text-[16px] font-bold leading-[20px] text-[#05080c]">
        {label}
      </span>
    </Link>
  );
}

function QuickOptionSection({ title, items }) {
  return (
    <section className="rounded-[7px] border border-[#d7dfe3] bg-[#fbfbfb] px-4 pt-4 pb-4 shadow-[0_2px_8px_rgba(0,0,0,0.28)]">
      <h2 className="mb-[20px] text-[20px] font-bold leading-none text-[#101820]">{title}</h2>
      <div className="grid grid-cols-4 gap-x-4 gap-y-[18px] max-lg:grid-cols-3 max-md:grid-cols-2 max-[520px]:grid-cols-1">
        {items.map((item) => (
          <QuickOptionCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

export function QuickOptionsPage() {
  return (
    <div className="space-y-6">
      {quickOptionSections.map((section) => (
        <QuickOptionSection key={section.title} {...section} />
      ))}
    </div>
  );
}
