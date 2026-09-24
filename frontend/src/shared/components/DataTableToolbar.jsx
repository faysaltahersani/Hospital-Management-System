import { useState } from "react";

export function DataTableToolbar({
  searchValue = "",
  onSearchChange,
  filterOptions = [],
  filterValue = "",
  onFilterChange,
  columns = [],
  visibleColumns = {},
  onToggleColumn,
  density = "normal",
  onDensityChange,
  isFullscreen = false,
  onToggleFullscreen,
  onExportCsv,
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDensityMenu, setShowDensityMenu] = useState(false);

  return (
    <div className="relative border-b border-[#e2e8ec] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {onExportCsv ? (
            <button
              className="rounded-[8px] border border-[#7fb0ff] bg-white px-5 py-1.5 text-[13px] font-semibold text-[#1976d2] transition hover:bg-[#f4f8ff]"
              onClick={onExportCsv}
              type="button"
            >
              Export CSV
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-[#5c6770]">
          {/* 1. Search Toggle */}
          {onSearchChange ? (
            <button
              aria-label="Search table"
              className={`rounded-[6px] p-2 transition ${showSearch ? "bg-[#eef6fc] text-[#1976d2]" : "hover:bg-[#f0f4f7]"}`}
              onClick={() => {
                setShowSearch(!showSearch);
                setShowFilterMenu(false);
                setShowColumnMenu(false);
                setShowDensityMenu(false);
              }}
              title="Search Table"
              type="button"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18">
                <path d="M11.75 11.75 15 15M13.5 8.25a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          ) : null}

          {/* 2. Filter Toggle */}
          {onFilterChange ? (
            <button
              aria-label="Filter table"
              className={`rounded-[6px] p-2 transition ${showFilterMenu || filterValue ? "bg-[#eef6fc] text-[#1976d2]" : "hover:bg-[#f0f4f7]"}`}
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowSearch(false);
                setShowColumnMenu(false);
                setShowDensityMenu(false);
              }}
              title="Filter List"
              type="button"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18">
                <path d="M3 4.5h12M6 9h6M8 13.5h2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          ) : null}

          {/* 3. Column Visibility */}
          {columns.length && onToggleColumn ? (
            <button
              aria-label="Choose visible columns"
              className={`rounded-[6px] p-2 transition ${showColumnMenu ? "bg-[#eef6fc] text-[#1976d2]" : "hover:bg-[#f0f4f7]"}`}
              onClick={() => {
                setShowColumnMenu(!showColumnMenu);
                setShowSearch(false);
                setShowFilterMenu(false);
                setShowDensityMenu(false);
              }}
              title="Columns Visibility"
              type="button"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18">
                <path d="M3.75 4h2.5v10h-2.5V4Zm4 0h2.5v10h-2.5V4Zm4 0h2.5v10h-2.5V4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          ) : null}

          {/* 4. Density Toggle */}
          {onDensityChange ? (
            <button
              aria-label="Change row density"
              className={`rounded-[6px] p-2 transition ${showDensityMenu ? "bg-[#eef6fc] text-[#1976d2]" : "hover:bg-[#f0f4f7]"}`}
              onClick={() => {
                setShowDensityMenu(!showDensityMenu);
                setShowSearch(false);
                setShowFilterMenu(false);
                setShowColumnMenu(false);
              }}
              title="Row Density"
              type="button"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18">
                <path d="M4 4h10M4 9h10M4 14h10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          ) : null}

          {/* 5. Fullscreen Toggle */}
          {onToggleFullscreen ? (
            <button
              aria-label={isFullscreen ? "Exit fullscreen table" : "Show table fullscreen"}
              className={`rounded-[6px] p-2 transition ${isFullscreen ? "bg-[#eef6fc] text-[#1976d2]" : "hover:bg-[#f0f4f7]"}`}
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Table"}
              type="button"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 18 18">
                <path d="M4 7V4h3M11 4h3v3M14 11v3h-3M7 14H4v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Expanded Controls Panels */}
      {showSearch && onSearchChange ? (
        <div className="mt-3 flex items-center gap-2 rounded-[6px] border border-[#bcd6ed] bg-[#f8fbfe] p-2">
          <svg className="h-4 w-4 text-[#608bb0]" fill="none" viewBox="0 0 18 18">
            <path d="M11.75 11.75 15 15M13.5 8.25a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <input
            autoFocus
            className="h-[32px] w-full bg-transparent text-[13px] text-[#1f2c33] outline-none placeholder:text-[#8095a5]"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Type to search table rows..."
            type="text"
            value={searchValue}
          />
          {searchValue ? (
            <button className="text-[12px] text-[#e55656]" onClick={() => onSearchChange("")} type="button">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {showFilterMenu && onFilterChange ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[6px] border border-[#bcd6ed] bg-[#f8fbfe] p-2 text-[13px]">
          <span className="font-medium text-[#3b5266]">Filter:</span>
          {filterOptions.length ? (
            <select
              className="h-[32px] rounded-[4px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#293842] outline-none"
              onChange={(e) => onFilterChange(e.target.value)}
              value={filterValue}
            >
              <option value="">All</option>
              {filterOptions.map((opt) => (
                <option key={opt.value || opt} value={opt.value || opt}>
                  {opt.label || opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="h-[32px] rounded-[4px] border border-[#cfd9de] bg-white px-3 text-[13px] text-[#293842] outline-none"
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Filter by keyword..."
              type="text"
              value={filterValue}
            />
          )}
          {filterValue ? (
            <button className="text-[12px] font-semibold text-[#e55656]" onClick={() => onFilterChange("")} type="button">
              Reset Filter
            </button>
          ) : null}
        </div>
      ) : null}

      {showColumnMenu && columns.length && onToggleColumn ? (
        <div className="absolute right-4 z-40 mt-2 w-[220px] rounded-[8px] border border-[#cfd9de] bg-white p-3 shadow-[0_10px_25px_rgba(0,0,0,0.12)]">
          <div className="mb-2 text-[12px] font-semibold text-[#3b5266]">Toggle Columns</div>
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
            {columns.map((col) => (
              <label className="flex items-center gap-2 text-[13px] text-[#293842] cursor-pointer hover:bg-[#f4f7f9] p-1 rounded" key={col.key}>
                <input
                  checked={visibleColumns[col.key] !== false}
                  onChange={() => onToggleColumn(col.key)}
                  type="checkbox"
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {showDensityMenu && onDensityChange ? (
        <div className="absolute right-4 z-40 mt-2 w-[160px] rounded-[8px] border border-[#cfd9de] bg-white p-2 shadow-[0_10px_25px_rgba(0,0,0,0.12)] text-[13px]">
          <div className="px-2 py-1 text-[11px] font-semibold text-[#667586]">Row Spacing</div>
          <button
            className={`w-full text-left px-2 py-1.5 rounded ${density === "compact" ? "bg-[#eef6fc] font-semibold text-[#1976d2]" : "hover:bg-[#f4f7f9]"}`}
            onClick={() => {
              onDensityChange("compact");
              setShowDensityMenu(false);
            }}
            type="button"
          >
            Compact
          </button>
          <button
            className={`w-full text-left px-2 py-1.5 rounded ${density === "normal" ? "bg-[#eef6fc] font-semibold text-[#1976d2]" : "hover:bg-[#f4f7f9]"}`}
            onClick={() => {
              onDensityChange("normal");
              setShowDensityMenu(false);
            }}
            type="button"
          >
            Normal
          </button>
          <button
            className={`w-full text-left px-2 py-1.5 rounded ${density === "comfortable" ? "bg-[#eef6fc] font-semibold text-[#1976d2]" : "hover:bg-[#f4f7f9]"}`}
            onClick={() => {
              onDensityChange("comfortable");
              setShowDensityMenu(false);
            }}
            type="button"
          >
            Comfortable
          </button>
        </div>
      ) : null}
    </div>
  );
}
