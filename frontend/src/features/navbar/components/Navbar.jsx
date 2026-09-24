import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bedRoutes } from "../../bed/data/bedRoutes";
import { doctorRoutes } from "../../doctor/data/doctorRoutes";
import { financeRoutes } from "../../finance/data/financeRoutes";
import { hrPayrollRoutes } from "../../hr-payroll/data/hrPayrollRoutes";
import { patientRoutes } from "../../patient/data/patientRoutes";
import { referralRoutes } from "../../referral/data/referralRoutes";
import { reportRoutes } from "../../reports/data/reportRoutes";
import { settingsRoutes } from "../../settings/data/settingsRoutes";
import { apiRequest } from "../../../lib/api";
import { canAccessPath, clearAuthSession, filterNavigationItems, getStoredRole, getStoredUser } from "../../../lib/auth";
import { secondaryNavMenus } from "../data/menuSections";
import { primaryNavItems, secondaryNavItems } from "../data/navigation";

const menuRoutes = {
  ...financeRoutes,
  ...bedRoutes,
  ...patientRoutes,
  ...doctorRoutes,
  ...hrPayrollRoutes,
  ...referralRoutes,
  ...settingsRoutes,
  "Call Ambulance Entry": "/ambulance/call-entry",
  "Ambulance Entry": "/ambulance/entry",
  Appointment: "/appointment/entry",
  "Appointment Slots": "/appointment/slots",
  "Appointment Shift": "/appointment/shift-entry",
  "Appointment Priority": "/appointment/priority-entry",
  "Appointment List": "/appointment/bill-record",
  "Blood Bank Stock Ui": "/blood/stock",
  "Blood Issue": "/blood/issue",
  "Blood Component Issue": "/blood/component-issue",
  "Blood Donate": "/blood/donate",
  "Component Separation Entry": "/blood/component-separation",
  "Blood Donor": "/blood/donor",
  "Blood Group": "/blood/group",
  "Blood Unit": "/blood/unit",
  "Component Entry": "/blood/component-entry",
  "Blood Issue Record": "/reports/blood-issue-record",
  "Blood Component Issue Record": "/reports/blood-component-issue-record",
  "Blood Donate Record": "/reports/blood-donate-record",
  "Component Separation Record": "/reports/component-separation-record",
  "IPD Bill Entry": "/ipd/bill-entry",
  "Symptoms Manage": "/ipd/symptoms-manage",
  "IPD Bill Record": "/ipd/bill-record",
  "Medicine Entry": "/medicine/entry",
  "Medicine Unit": "/medicine/unit",
  "Medicine Group": "/medicine/group",
  "Medicine Category": "/medicine/category",
  "Medicine Company": "/medicine/company",
  "Medicine List": "/medicine/list",
  "OPD Bill Entry": "/opd/bill-entry",
  "OPD Bill Record": "/opd/bill-record",
  "Pathology Bill Entry": "/pathology/bill-entry",
  "Pathology Test": "/pathology/test-entry",
  "Pathology Test Category Entry": "/pathology/test-category-entry",
  "Pathology Parameter Entry": "/pathology/parameter-entry",
  "Pathology Test Unit": "/pathology/test-unit-entry",
  "Pathology Test List": "/pathology/test-list",
  "Pharmacy Sales": "/pharmacy/sales",
  "Pharmacy Purchase": "/pharmacy/purchase",
  "Pharmacy Sales Return": "/pharmacy/sales-return",
  "Pharmacy Purchase Return": "/pharmacy/purchase-return",
  "Pharmacy Supplier": "/pharmacy/supplier",
  "Medicine Batch Wise Stock": "/pharmacy/medicine-batch-stock",
  "Medicine Stock Report": "/pharmacy/medicine-stock-report",
  "Radiology Bill Entry": "/radiology/bill-entry",
  "Radiology Test": "/radiology/test-entry",
  "Radiology Test Category Entry": "/radiology/test-category-entry",
  "Radiology Parameter Entry": "/radiology/parameter-entry",
  "Radiology Test Unit": "/radiology/test-unit-entry",
  "Radiology Test List": "/radiology/test-list",
};

const moduleMenuRoutes = {
  "/ambulance": {
    "Call Ambulance Record": "/ambulance/call-record",
  },
  "/ipd": {
    "Symptoms Manage": "/ipd/symptoms-manage",
    "IPD Bill Record": "/ipd/bill-record",
  },
  "/opd": {
    "Symptoms Manage": "/opd/symptoms-manage",
    "OPD Bill Record": "/opd/bill-record",
  },
  "/pathology": {
    "Pathology Bill Record": "/pathology/bill-record",
  },
  "/pharmacy": {
    "Pharmacy Sales Record": "/pharmacy/sales-record",
    "Pharmacy Purchase Record": "/pharmacy/purchase-record",
    "Pharmacy Sales Return Record": "/pharmacy/sales-return-record",
    "Pharmacy Purchase Return Record": "/pharmacy/purchase-return-record",
  },
  "/radiology": {
    "Radiology Bill Record": "/radiology/bill-record",
  },
  "/reports": reportRoutes,
};

const tierStyles = {
  primary: {
    shell:
      "grid items-stretch grid-cols-[30px_minmax(0,1fr)_30px] max-md:grid-cols-[26px_minmax(0,1fr)_26px]",
    panel:
      "overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-linear-to-b from-[#0e8488] to-[#0b6669] border-b border-b-[rgba(255,255,255,0.18)]",
    arrow:
      "bg-linear-to-b from-[#127f83] to-[#0b6669] text-[#f8fdfd] border-r border-r-[rgba(255,255,255,0.12)] last:border-r-0 last:border-l last:border-l-[rgba(255,255,255,0.12)] enabled:hover:bg-white/14 enabled:focus-visible:bg-white/14",
    button:
      "flex min-w-[72px] flex-col items-center justify-center gap-1.5 px-3 py-2 text-[#f8fdfd] transition-colors duration-150 hover:bg-white/10 focus-visible:bg-white/10 max-md:min-w-[66px] max-md:px-2.5 max-md:py-2",
    active: "bg-white/15",
    icon: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/16",
    label: "text-[11px] leading-[1.1] whitespace-nowrap",
  },
  secondary: {
    shell:
      "grid items-stretch grid-cols-[30px_minmax(0,1fr)_30px] max-md:grid-cols-[26px_minmax(0,1fr)_26px]",
    panel:
      "relative overflow-visible bg-[rgba(255,255,255,0.95)] border-b border-b-[#d5e3e5]",
    scroller:
      "overflow-x-auto overflow-y-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    arrow:
      "bg-[rgba(255,255,255,0.95)] text-[#0b6669] border-r border-r-[#d5e3e5] last:border-r-0 last:border-l last:border-l-[#d5e3e5] enabled:hover:bg-[rgba(14,132,136,0.08)] enabled:focus-visible:bg-[rgba(14,132,136,0.08)]",
    button:
      "flex min-w-[86px] flex-row items-center justify-center gap-2 px-[14px] py-2.5 text-[#0b6669] transition-colors duration-150 hover:bg-[rgba(14,132,136,0.08)] focus-visible:bg-[rgba(14,132,136,0.08)] max-md:min-w-[76px] max-md:px-3 max-md:py-[9px]",
    active: "bg-[rgba(14,132,136,0.12)]",
    icon: "flex h-[18px] w-[18px] shrink-0 items-center justify-center",
    label: "whitespace-nowrap text-[11px] font-semibold leading-[1.1]",
  },
};

const iconPaths = {
  ambulance: "M3 10h2l1-3h7l2 3h2v5h-1a2 2 0 1 1-4 0H7a2 2 0 1 1-4 0H2v-4a1 1 0 0 1 1-1Zm5-6h2v2h2v2h-2v2H8V8H6V6h2V4Z",
  bed: "M3 6h4a3 3 0 0 1 3 3v1h4a2 2 0 0 1 2 2v2h-1v2h-2v-2H5v2H3v-8Zm2 5h9v-1H5v1Z",
  blocks: "M3 3h4v4H3V3Zm6 0h4v4H9V3Zm-6 6h4v4H3V9Zm6 0h4v4H9V9Z",
  briefcase: "M6 5V4h4v1h3a1 1 0 0 1 1 1v7H2V6a1 1 0 0 1 1-1h3Zm2 0h2V4H8v1Z",
  calendar: "M4 2h2v2h4V2h2v2h1a1 1 0 0 1 1 1v8H3V5a1 1 0 0 1 1-1h0V2Zm0 5v4h8V7H4Z",
  capsule: "M5.5 3a3.5 3.5 0 0 1 4.95 0l1.55 1.55a3.5 3.5 0 1 1-4.95 4.95L5.5 7.95A3.5 3.5 0 0 1 5.5 3Zm1.4 1.4L4.6 6.7l3.7 3.7 2.3-2.3-3.7-3.7Z",
  cart: "M3 4h2l1.2 5.5a1 1 0 0 0 1 .8h5.8a1 1 0 0 0 1-.8L15 6H6.2",
  coin: "M8 2c3.3 0 6 1.3 6 3s-2.7 3-6 3-6-1.3-6-3 2.7-3 6-3Zm-6 6v3c0 1.7 2.7 3 6 3s6-1.3 6-3V8c-1.2 1.1-3.6 1.8-6 1.8S3.2 9.1 2 8Z",
  document: "M4 2h6l3 3v9H4V2Zm6 1.5V6h2.5L10 3.5Z",
  droplet: "M8 2s4 4.3 4 7a4 4 0 1 1-8 0c0-2.7 4-7 4-7Z",
  grid: "M3 3h3v3H3V3Zm5 0h5v1H8V3Zm0 3h5v1H8V6ZM3 8h3v3H3V8Zm5 0h5v1H8V8Zm0 3h5v1H8v-1Z",
  home: "M3 8.2 8 4l5 4.2V14H9v-3H7v3H3V8.2Z",
  lab:
    "M4.2 2.6a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm0 1.1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0 .4 1 .45-.12 1.08-.88.65-.88-.65-.12-1.08 1-.45Zm-.08 1.42.08.06.08-.06.02-.1-.1-.05-.1.05.02.1Zm4.9-1.8 1.2.84-1.24 1.77 1.93 2.53-.97.74-2-2.61 1.08-1.55-.64-.45.64-1.27Zm-.96 5.22 1.08.4c-.3 1.17-1.1 1.95-2.34 2.34V13h3.5v1.1H2.6V13h2.96v-1.05c.75-.2 1.27-.52 1.57-.97H4.6V9.88h3.46Z",
  message: "M3 4h10a1 1 0 0 1 1 1v6H6l-3 2V5a1 1 0 0 1 1-1Z",
  quickOptions:
    "M4.5 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8ZM8 3.4h5v1.6H8V3.4ZM4.5 8.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 1.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8ZM8 9.4h5V11H8V9.4Z",
  scan:
    "M5.1 2.7h5.8a1.2 1.2 0 0 1 1.2 1.2v8.2a1.2 1.2 0 0 1-1.2 1.2H5.1a1.2 1.2 0 0 1-1.2-1.2V3.9a1.2 1.2 0 0 1 1.2-1.2Zm2.9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm-2 3.1h4.1v.8H6v-.8Zm-.1 1.2h4.2v3.3H5.9V7.8Zm1 .7v1.9h2.2V8.5H6.9Zm.8.3h.6v1.3h-.6V8.8Zm-1.6 3.1H7v.7h-.9v-.7Zm1.4 0h.9v.7h-.9v-.7Zm1.4 0h.9v.7h-.9v-.7Z",
  settings: "M8 3.2 9 2l1 1.2 1.6-.1.4 1.5 1.4.8-.8 1.4.8 1.4-1.4.8-.4 1.5-1.6-.1L9 14l-1-1.2-1.6.1-.4-1.5-1.4-.8.8-1.4-.8-1.4 1.4-.8.4-1.5 1.6.1ZM8 10.5A2.5 2.5 0 1 0 8 5.5a2.5 2.5 0 0 0 0 5Z",
  stethoscope: "M5 3v4a3 3 0 1 0 6 0V3h2v4a5 5 0 0 1-4 4.9V13h2v2H5v-2h2v-1.1A5 5 0 0 1 3 7V3h2Z",
  swap: "M4 5h7l-2-2 1.4-1.4L15.8 5l-5.4 3.4L9 7l2-2H4V5Zm8 6H5l2 2-1.4 1.4L.2 11l5.4-3.4L7 9l-2 2h7v0Z",
  user: "M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm-4 6a4 4 0 0 1 8 0H4Z",
  users: "M6 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2Zm4 1a2 2 0 1 0-1.4-.6A2 2 0 0 0 10 9Zm-7 4a3 3 0 0 1 6 0H3Zm6.5 0a2.5 2.5 0 0 1 5 0h-5Z",
};

function NavIcon({ type }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="block h-[14px] w-[14px]">
      <path d={iconPaths[type] || iconPaths.grid} />
    </svg>
  );
}

function ScrollArrow({ className, direction, disabled, onClick }) {
  const path =
    direction === "left"
      ? "M9.8 3.2 5 8l4.8 4.8 1.4-1.4L7.8 8l3.4-3.4-1.4-1.4Z"
      : "m6.2 3.2-1.4 1.4L8.2 8l-3.4 3.4 1.4 1.4L11 8 6.2 3.2Z";

  return (
    <button
      aria-label={`Scroll ${direction}`}
      className={`grid place-items-center border-0 p-0 transition-all duration-150 disabled:cursor-default disabled:opacity-45 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-[14px] w-[14px]">
        <path d={path} />
      </svg>
    </button>
  );
}

function NavTier({ activePath, items, onItemHover, onNavigate, tier, trailingContent = null }) {
  const styles = tierStyles[tier];
  const tierRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const element = tierRef.current;

    if (!element) {
      return undefined;
    }

    const updateScrollState = () => {
      const { scrollLeft, clientWidth, scrollWidth } = element;
      const maxScrollLeft = scrollWidth - clientWidth;

      setScrollState({
        canScrollLeft: scrollLeft > 4,
        canScrollRight: scrollLeft < maxScrollLeft - 4,
      });
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [items]);

  const scrollByItem = (direction) => {
    const element = tierRef.current;

    if (!element) {
      return;
    }

    const firstItem = element.querySelector("[data-nav-item]");
    const itemWidth = firstItem?.getBoundingClientRect().width ?? 96;
    const delta = direction === "right" ? itemWidth : -itemWidth;

    element.scrollBy({
      left: delta,
      behavior: "smooth",
    });
  };

  return (
    <div className={styles.shell}>
      <ScrollArrow
        className={styles.arrow}
        direction="left"
        disabled={!scrollState.canScrollLeft}
        onClick={() => scrollByItem("left")}
      />
      <div className={styles.panel}>
        <div className={styles.scroller ?? styles.panel} ref={tierRef}>
          <ul className="m-0 flex min-w-max list-none items-stretch gap-0 px-2">
          {items.map((item) => (
            <li className="relative shrink-0" data-nav-item key={`${tier}-${item.label}`}>
              <button
                aria-pressed={activePath === item.path}
                className={`${styles.button} ${activePath === item.path ? styles.active : ""} after:absolute after:right-0 after:top-[15%] after:bottom-[15%] after:w-px after:bg-current after:opacity-[0.12] last:after:hidden focus-visible:outline-2 focus-visible:outline-offset-[-3px] ${
                  tier === "primary"
                    ? "focus-visible:outline-[rgba(255,255,255,0.8)]"
                    : "focus-visible:outline-[rgba(14,132,136,0.35)]"
                }`}
                onFocus={(event) => onItemHover?.(item.path, event.currentTarget)}
                onMouseEnter={(event) => onItemHover?.(item.path, event.currentTarget)}
                onClick={(event) => onNavigate(item.path, event.currentTarget)}
                type="button"
              >
                <span className={styles.icon} aria-hidden="true">
                  <NavIcon type={item.icon} />
                </span>
                <span className={styles.label}>{item.label}</span>
              </button>
            </li>
          ))}
          {trailingContent ? <li className="relative shrink-0">{trailingContent}</li> : null}
          </ul>
        </div>
      </div>
      <ScrollArrow
        className={styles.arrow}
        direction="right"
        disabled={!scrollState.canScrollRight}
        onClick={() => scrollByItem("right")}
      />
    </div>
  );
}

function AccountMenu({ canOpenSettings, isOpen, onLogout, onSettings, onToggle, user }) {
  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ right: 0, top: 0 });
  const initials = (user?.full_name || user?.email || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateMenuPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      setMenuPosition({
        right: Math.max(0, window.innerWidth - buttonRect.right),
        top: buttonRect.bottom,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative z-40 flex h-full items-stretch bg-[#078075] text-white">
      <button
        aria-label="Open user menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1 px-2 pr-3 text-left transition-colors hover:bg-white/10"
        onClick={onToggle}
        ref={buttonRef}
        type="button"
      >
        <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-white text-[8px] font-bold text-[#078075]">
          {initials || "U"}
        </span>
        <span className="flex flex-col">
          <span className="text-[10px] font-semibold leading-none">{user?.full_name || user?.email || "Account"}</span>
          <span className="mt-0.5 text-[9px] uppercase leading-none text-white/70">{user?.role || "user"}</span>
        </span>
      </button>

      {isOpen ? (
        <div
          className="fixed z-50 w-[120px] border-t-2 border-[#078075] bg-white py-1 text-[#2f3a4a] shadow-[0_10px_20px_rgba(16,42,50,0.14)]"
          style={{
            right: `${menuPosition.right}px`,
            top: `${menuPosition.top}px`,
          }}
        >
          {canOpenSettings ? (
            <button
              className="flex h-[34px] w-full items-center gap-2 px-3 text-left text-[11px] transition-colors hover:bg-[#eef3f6]"
              onClick={onSettings}
              type="button"
            >
              <svg aria-hidden="true" className="h-[12px] w-[12px] text-[#738094]" fill="none" viewBox="0 0 16 16">
                <path d="M2 5h8M2 11h8M12 4v2M5 10v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
              </svg>
              <span>Settings</span>
            </button>
          ) : null}
          <button
            className="flex h-[34px] w-full items-center gap-2 px-3 text-left text-[11px] transition-colors hover:bg-[#eef3f6]"
            onClick={onLogout}
            type="button"
          >
            <svg aria-hidden="true" className="h-[12px] w-[12px] text-[#738094]" fill="none" viewBox="0 0 16 16">
              <path d="M6 3H3.5v10H6M9 5l3 3-3 3M12 8H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const currentRole = getStoredRole();
  const canOpenSettings = canAccessPath("/settings", currentRole);
  const visiblePrimaryNavItems = filterNavigationItems(primaryNavItems, currentRole);
  const visibleSecondaryNavItems = filterNavigationItems(secondaryNavItems, currentRole);
  const [openMenuState, setOpenMenuState] = useState(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    apiRequest(`/users/${currentUser.id}/permissions`)
      .then((res) => {
        if (Array.isArray(res?.data)) {
          const list = res.data.map((p) => (typeof p === "string" ? p : p.permission_key)).filter(Boolean);
          localStorage.setItem("userPermissions", JSON.stringify(list));
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMenuState(null);
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const handlePrimaryNavigate = (path) => {
    setOpenMenuState(null);
    setIsAccountMenuOpen(false);
    navigate(path);
  };

  const openSecondaryMenu = (path, element) => {
    if (!secondaryNavMenus[path] || !headerRef.current || !element) {
      setOpenMenuState(null);
      return;
    }

    const headerRect = headerRef.current.getBoundingClientRect();
    const triggerRect = element.getBoundingClientRect();

    setOpenMenuState({
      path,
      left: triggerRect.left - headerRect.left,
    });
  };

  const handleSecondaryHover = (path, element) => {
    openSecondaryMenu(path, element);
  };

  const handleSecondaryNavigate = (path, element) => {
    if (secondaryNavMenus[path]) {
      setOpenMenuState(null);
      navigate(path);
      return;
    }

    setOpenMenuState(null);
    navigate(path);
  };

  const handleMenuItemNavigate = (menuItem) => {
    const path = moduleMenuRoutes[openMenuState?.path]?.[menuItem] ?? menuRoutes[menuItem];

    if (!path) {
      return;
    }

    setOpenMenuState(null);
    setIsAccountMenuOpen(false);
    navigate(path);
  };

  const handleAccountSettings = () => {
    setOpenMenuState(null);
    setIsAccountMenuOpen(false);
    navigate("/settings/user-manage");
  };

  const handleAccountLogout = () => {
    setOpenMenuState(null);
    setIsAccountMenuOpen(false);
    clearAuthSession();
    navigate("/login");
  };

  return (
    <header
      className="sticky top-0 z-20 shadow-[0_8px_30px_rgba(9,52,61,0.1)] backdrop-blur-[14px]"
      onMouseLeave={() => setOpenMenuState(null)}
      ref={headerRef}
    >
      <NavTier
        activePath={location.pathname}
        items={visiblePrimaryNavItems}
        onNavigate={handlePrimaryNavigate}
        trailingContent={
          <AccountMenu
            isOpen={isAccountMenuOpen}
            onLogout={handleAccountLogout}
            onSettings={handleAccountSettings}
            onToggle={() => {
              setOpenMenuState(null);
              setIsAccountMenuOpen((current) => !current);
            }}
            canOpenSettings={canOpenSettings}
            user={currentUser}
          />
        }
        tier="primary"
      />
      <NavTier
        activePath={location.pathname}
        items={visibleSecondaryNavItems}
        onItemHover={handleSecondaryHover}
        onNavigate={handleSecondaryNavigate}
        tier="secondary"
      />
      {openMenuState?.path && secondaryNavMenus[openMenuState.path]?.length ? (
        <div
          className="absolute top-full z-30 mt-1 w-[190px] rounded-[2px] border border-[#d7dde2] bg-white shadow-[0_14px_28px_rgba(16,42,50,0.18)]"
          style={{ left: `${openMenuState.left}px` }}
        >
          <ul className="m-0 list-none py-1">
            {secondaryNavMenus[openMenuState.path].flatMap((section) => section.items).map((menuItem) => (
              <li key={menuItem}>
                <button
                  className="flex w-full items-center gap-2 px-10 py-[6px] text-left text-[12px] leading-[1.2] text-[#60738a] transition-colors duration-150 hover:bg-[#eef3f6] hover:text-[#3d5872]"
                  onClick={() => handleMenuItemNavigate(menuItem)}
                  type="button"
                >
                  <span className="ml-[-12px] text-[10px] text-[#9aaab8]">•</span>
                  <span>{menuItem}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
