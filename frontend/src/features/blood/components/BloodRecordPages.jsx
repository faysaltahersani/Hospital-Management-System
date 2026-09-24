import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { confirmDelete, showError, showSuccess } from "../../../lib/alerts";

const issueFilterOptions = [
  { label: "All", key: "all" },
  { label: "By BloodGroup", key: "bloodGroup" },
  { label: "By Patient", key: "patient" },
  { label: "By Account", key: "account" },
  { label: "By Date", key: "date" },
  { label: "By Search", key: "search" },
];

const componentIssueFilterOptions = [
  { label: "All", key: "all" },
  { label: "By BloodGroup", key: "bloodGroup" },
  { label: "By Patient", key: "patient" },
  { label: "By Date", key: "date" },
  { label: "By Search", key: "search" },
];

const donateFilterOptions = [
  { label: "All", key: "all" },
  { label: "By Donor", key: "donor" },
  { label: "By Account", key: "account" },
  { label: "By Date", key: "date" },
  { label: "By Search", key: "search" },
];

const separationFilterOptions = [
  { label: "All", key: "all" },
  { label: "By Blood Group", key: "bloodGroup" },
  { label: "By Date", key: "date" },
  { label: "By Search", key: "search" },
];

const issueRecords = [
  { id: "ISS-001", patient: "Jishan", bloodGroup: "O-", account: "Cash", date: "2026-04-20", amount: "500" },
  { id: "ISS-002", patient: "Mahim", bloodGroup: "A+", account: "Bank", date: "2026-04-19", amount: "700" },
  { id: "ISS-003", patient: "Rakib", bloodGroup: "B+", account: "Cash", date: "2026-04-18", amount: "650" },
];

const issueFilterSearchOptions = {
  "By BloodGroup": ["Select Blood Group", "O-", "A+", "B+"],
  "By Patient": ["Select Patient", "Jishan", "Mahim", "Rakib"],
  "By Account": ["Select Account", "Cash", "Bank"],
};

const donateFilterSearchOptions = {
  "By Donor": ["Select Donor", "Jishan", "Mahim"],
  "By Account": ["Select Account", "Cash", "Bank"],
};

const formatMoney = (value) => Number(value || 0).toFixed(2);
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return formatDate(date);
};

const COMPONENT_LABELS = {
  whole_blood: "Whole Blood",
  rbc: "RBC",
  plasma: "FFP (Plasma)",
  platelets: "Platelets",
  cryo: "Cryo",
};

function DateField({ label, onChange, value }) {
  return (
    <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-white">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{label}</legend>
      <input
        className="h-[28px] w-full rounded-[3px] border-0 bg-white px-3 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </fieldset>
  );
}

function SelectField({ label, onChange, options, value }) {
  return (
    <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">{label}</legend>
      <select
        className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onChange(event.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 9px center",
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

function FilterMenu({ activeFilter, onSelect, options }) {
  return (
    <fieldset className="min-w-[192px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
      <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Filter Type</legend>
      <select
        className="h-[28px] w-full appearance-none rounded-[3px] border-0 bg-right bg-no-repeat px-3 pr-8 text-[13px] text-[#25333b] outline-none"
        onChange={(event) => onSelect(event.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='6' viewBox='0 0 9 6'%3E%3Cpath fill='%23666' d='M4.5 6 0 .5h9z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 9px center",
        }}
        value={activeFilter}
      >
        {options.map((option) => (
          <option key={option.key} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </fieldset>
  );
}

function ResultTable({ columns, rows }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[4px] border border-dashed border-[#cdd8de] bg-white px-4 py-8 text-center text-[14px] text-[#66737b]">
        No records found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_3px_8px_rgba(22,36,45,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[13px] text-[#1f2c33]">
          <thead className="border-b border-[#d9e1e5] bg-[#f8fbfc]">
            <tr>
              {columns.map((column) => (
                <th className="px-3 py-3 font-semibold" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[#e7edf0]" key={row.id}>
                {columns.map((column) => (
                  <td className="px-3 py-2" key={column.key}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function filterRows(rows, activeFilter, fromDate, searchValue, toDate) {
  const normalizedSearch = searchValue.trim().toLowerCase();

  return rows.filter((row) => {
    const rowDate = row.date ?? "";
    const matchesDateRange = (!fromDate || rowDate >= fromDate) && (!toDate || rowDate <= toDate);

    if (!matchesDateRange) {
      return false;
    }

    if (activeFilter === "All" || !normalizedSearch) {
      return true;
    }

    if (activeFilter === "By BloodGroup" || activeFilter === "By Blood Group") {
      return (row.bloodGroup ?? "").toLowerCase().includes(normalizedSearch);
    }

    if (activeFilter === "By Patient") {
      return (row.patient ?? "").toLowerCase().includes(normalizedSearch);
    }

    if (activeFilter === "By Donor") {
      return (row.donor ?? "").toLowerCase().includes(normalizedSearch);
    }

    if (activeFilter === "By Account") {
      return (row.account ?? "").toLowerCase().includes(normalizedSearch);
    }

    if (activeFilter === "By Date") {
      return rowDate.includes(normalizedSearch);
    }

    if (activeFilter === "By Search") {
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(normalizedSearch),
      );
    }

    return true;
  });
}

function RecordShell({
  columns,
  defaultRows,
  extraField = null,
  filterOptions,
  filterSearchOptions = {},
  title,
}) {
  const [activeFilter, setActiveFilter] = useState(filterOptions[0].label);
  const [fromDate, setFromDate] = useState("2026-04-20");
  const [toDate, setToDate] = useState("2026-04-20");
  const [query, setQuery] = useState("");
  const [reportRows, setReportRows] = useState(defaultRows);

  const activeFilterKey = useMemo(
    () => filterOptions.find((option) => option.label === activeFilter)?.key ?? "all",
    [activeFilter, filterOptions],
  );

  const searchOptions = filterSearchOptions[activeFilter] ?? null;
  const showSearchInput = activeFilterKey === "search";
  const handleFilterSelect = (nextFilter) => {
    setActiveFilter(nextFilter);
    setQuery("");
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-4 text-[16px] font-medium text-[#1f2c33]">{title}</h1>

        <div className="flex flex-wrap items-start gap-4">
          <FilterMenu
            activeFilter={activeFilter}
            onSelect={handleFilterSelect}
            options={filterOptions}
          />

          {searchOptions ? (
            <SelectField
              label={searchOptions[0]}
              onChange={setQuery}
              options={searchOptions}
              value={query || searchOptions[0]}
            />
          ) : null}

          {showSearchInput ? (
            <fieldset className="min-w-[200px] rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Search</legend>
              <input
                className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}

          {extraField}
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <button
            className="h-[30px] self-start rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
            onClick={() =>
              setReportRows(filterRows(defaultRows, activeFilter, fromDate, query, toDate))
            }
            type="button"
          >
            REPORT
          </button>
        </div>

        <div className="mt-5">
          <ResultTable columns={columns} rows={reportRows} />
        </div>
      </div>
    </section>
  );
}

export function BloodIssueRecordPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const showSearchInput = activeFilter !== "All" && activeFilter !== "By Date";

  useEffect(() => {
    setQuery("");
  }, [activeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadIssues = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          limit: "100",
          from: fromDate,
          to: toDate,
        });

        const response = await apiRequest(`/blood-bank/issues?${params.toString()}`);
        if (!isMounted) return;
        setIssues(response.data || []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood issue records");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadIssues();
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate, reloadKey]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return issues
      .filter((issue) => {
        const issuedDate = formatDate(issue.issued_at);
        if (fromDate && issuedDate < fromDate) return false;
        if (toDate && issuedDate > toDate) return false;

        if (!normalizedQuery) return true;

        const patientName = issue.patient?.full_name?.toLowerCase() || "";
        const patientCode = issue.patient?.patient_code?.toLowerCase() || "";
        const bloodGroup = issue.bag?.blood_group?.toLowerCase() || "";
        const bagCode = issue.bag?.bag_code?.toLowerCase() || "";
        const issueCode = issue.issue_code?.toLowerCase() || "";
        const note = issue.notes?.toLowerCase() || "";
        const issuedTo = issue.issued_to?.toLowerCase() || "";

        if (activeFilter === "By BloodGroup") {
          return bloodGroup.includes(normalizedQuery);
        }

        if (activeFilter === "By Patient") {
          return patientName.includes(normalizedQuery) || patientCode.includes(normalizedQuery);
        }

        if (activeFilter === "By Account") {
          return false;
        }

        if (activeFilter === "By Date") {
          return issuedDate.includes(normalizedQuery);
        }

        if (activeFilter === "By Search") {
          return [issueCode, patientName, patientCode, bloodGroup, bagCode, note, issuedTo]
            .filter(Boolean)
            .some((value) => value.includes(normalizedQuery));
        }

        return true;
      })
      .map((issue, index) => ({
        id: issue.id,
        sl: index + 1,
        date: formatDate(issue.issued_at),
        patient: issue.patient?.full_name || issue.patient?.patient_code || issue.issued_to || "Walk-in",
        bloodGroup: issue.bag?.blood_group || "-",
        bag: issue.bag?.bag_code || "-",
        charge: formatMoney(issue.price),
        paid: formatMoney(0),
        due: formatMoney(0),
        note: issue.notes || "-",
        createdBy: "-",
        updatedBy: "-",
      }));
  }, [activeFilter, fromDate, issues, query, toDate]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          charge: sum.charge + Number(row.charge || 0),
          paid: sum.paid + Number(row.paid || 0),
          due: sum.due + Number(row.due || 0),
        }),
        { charge: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  const handleDelete = async (issueId) => {
    const confirmed = await confirmDelete("Revert Blood Issue?", "Are you sure you want to delete / revert this blood issue?");
    if (!confirmed) return;

    setDeletingId(issueId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/blood-bank/issues/${issueId}`, {
        method: "DELETE",
      });
      showSuccess("Reverted!", "Blood issue reverted successfully.");
      setReloadKey((current) => current + 1);
    } catch (error) {
      showError("Action Failed", error.message || "Failed to revert blood issue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">BLOOD ISSUE</h1>

        <div className="grid grid-cols-[180px_180px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={setActiveFilter}
            options={issueFilterOptions.map((option) => option.label)}
            value={activeFilter}
          />
          {showSearchInput ? (
            <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">
                {activeFilter === "By BloodGroup"
                  ? "Blood Group"
                  : activeFilter === "By Patient"
                    ? "Patient"
                    : activeFilter === "By Account"
                      ? "Account"
                      : "Search"}
              </legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => setReloadKey((current) => current + 1)}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
            {successMessage}
          </div>
        ) : null}
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Patient</th>
              <th className="border border-black px-1.5 py-1 font-normal">Blood Group</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bag</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Charge</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Note</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-1.5 py-1">{row.sl}</td>
                  <td className="border border-black px-1.5 py-1">{row.date}</td>
                  <td className="border border-black px-1.5 py-1">{row.patient}</td>
                  <td className="border border-black px-1.5 py-1">{row.bloodGroup}</td>
                  <td className="border border-black px-1.5 py-1">{row.bag}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.charge}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.paid}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.due}</td>
                  <td className="border border-black px-1.5 py-1">{row.note}</td>
                  <td className="border border-black px-1.5 py-1">{row.createdBy}</td>
                  <td className="border border-black px-1.5 py-1">{row.updatedBy}</td>
                  <td className="border border-black px-1.5 py-1 text-center">
                    <button
                      className="text-[#ff3f34] disabled:opacity-50"
                      disabled={deletingId === row.id}
                      onClick={() => handleDelete(row.id)}
                      type="button"
                    >
                      {deletingId === row.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1.5 py-3 text-center" colSpan={12}>
                  {isLoading ? "Loading records..." : "No blood issue records found"}
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right">Grand Total</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.charge)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paid)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.due)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BloodComponentIssueRecordPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const showSearchInput = activeFilter !== "All" && activeFilter !== "By Date";

  useEffect(() => {
    setQuery("");
  }, [activeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadIssues = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          limit: "100",
          from: fromDate,
          to: toDate,
        });

        const response = await apiRequest(`/blood-bank/issues?${params.toString()}`);
        const allIssues = response.data || [];
        const compIssues = allIssues.filter((issue) => issue.bag?.component && issue.bag.component !== "whole_blood");
        setIssues(compIssues.length > 0 ? compIssues : allIssues);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood component issue records");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadIssues();
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate, reloadKey]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return issues
      .filter((issue) => {
        const issuedDate = formatDate(issue.issued_at);
        if (fromDate && issuedDate < fromDate) return false;
        if (toDate && issuedDate > toDate) return false;

        if (!normalizedQuery) return true;

        const patientName = issue.patient?.full_name?.toLowerCase() || "";
        const patientCode = issue.patient?.patient_code?.toLowerCase() || "";
        const bloodGroup = issue.bag?.blood_group?.toLowerCase() || "";
        const component = (COMPONENT_LABELS[issue.bag?.component] || issue.bag?.component || "").toLowerCase();
        const bagCode = issue.bag?.bag_code?.toLowerCase() || "";
        const issueCode = issue.issue_code?.toLowerCase() || "";
        const note = issue.notes?.toLowerCase() || "";
        const issuedTo = issue.issued_to?.toLowerCase() || "";

        if (activeFilter === "By BloodGroup") {
          return bloodGroup.includes(normalizedQuery);
        }

        if (activeFilter === "By Patient") {
          return patientName.includes(normalizedQuery) || patientCode.includes(normalizedQuery);
        }

        if (activeFilter === "By Date") {
          return issuedDate.includes(normalizedQuery);
        }

        if (activeFilter === "By Search") {
          return [issueCode, patientName, patientCode, bloodGroup, component, bagCode, note, issuedTo]
            .filter(Boolean)
            .some((value) => value.includes(normalizedQuery));
        }

        return true;
      })
      .map((issue, index) => ({
        id: issue.id,
        sl: index + 1,
        date: formatDate(issue.issued_at),
        patient: issue.patient?.full_name || issue.patient?.patient_code || issue.issued_to || "Walk-in",
        bloodGroup: issue.bag?.blood_group || "-",
        component: COMPONENT_LABELS[issue.bag?.component] || issue.bag?.component || "-",
        bag: issue.bag?.bag_code || "-",
        charge: formatMoney(issue.price),
        paid: formatMoney(0),
        due: formatMoney(0),
        note: issue.notes || "-",
        createdBy: "-",
        updatedBy: "-",
      }));
  }, [activeFilter, fromDate, issues, query, toDate]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          charge: sum.charge + Number(row.charge || 0),
          paid: sum.paid + Number(row.paid || 0),
          due: sum.due + Number(row.due || 0),
        }),
        { charge: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  const handleDelete = async (issueId) => {
    const confirmed = await confirmDelete("Revert Component Issue?", "Are you sure you want to delete / revert this blood component issue?");
    if (!confirmed) return;

    setDeletingId(issueId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiRequest(`/blood-bank/issues/${issueId}`, {
        method: "DELETE",
      });
      showSuccess("Reverted!", "Blood component issue reverted successfully.");
      setReloadKey((current) => current + 1);
    } catch (error) {
      showError("Action Failed", error.message || "Failed to revert blood component issue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">BLOOD COMPONENT ISSUE</h1>

        <div className="grid grid-cols-[180px_180px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={setActiveFilter}
            options={componentIssueFilterOptions.map((option) => option.label)}
            value={activeFilter}
          />
          {showSearchInput ? (
            <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">
                {activeFilter === "By BloodGroup" ? "Blood Group" : activeFilter === "By Patient" ? "Patient" : "Search"}
              </legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => setReloadKey((current) => current + 1)}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#b7dfc7] bg-[#f3fff7] px-3 py-2 text-[13px] text-[#1d7a46]">
            {successMessage}
          </div>
        ) : null}
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Patient</th>
              <th className="border border-black px-1.5 py-1 font-normal">Blood Group</th>
              <th className="border border-black px-1.5 py-1 font-normal">Component</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bag</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Charge</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Note</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-1.5 py-1">{row.sl}</td>
                  <td className="border border-black px-1.5 py-1">{row.date}</td>
                  <td className="border border-black px-1.5 py-1">{row.patient}</td>
                  <td className="border border-black px-1.5 py-1">{row.bloodGroup}</td>
                  <td className="border border-black px-1.5 py-1">{row.component}</td>
                  <td className="border border-black px-1.5 py-1">{row.bag}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.charge}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.paid}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.due}</td>
                  <td className="border border-black px-1.5 py-1">{row.note}</td>
                  <td className="border border-black px-1.5 py-1">{row.createdBy}</td>
                  <td className="border border-black px-1.5 py-1">{row.updatedBy}</td>
                  <td className="border border-black px-1.5 py-1 text-center">
                    <button
                      className="text-[#ff3f34] disabled:opacity-50"
                      disabled={deletingId === row.id}
                      onClick={() => handleDelete(row.id)}
                      type="button"
                    >
                      {deletingId === row.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1.5 py-3 text-center" colSpan={13}>
                  {isLoading ? "Loading records..." : "No blood component issue records found"}
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right">Grand Total</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.charge)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paid)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.due)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BloodDonateRecordPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [query, setQuery] = useState("");
  const [bags, setBags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const searchOptions = donateFilterSearchOptions[activeFilter] ?? null;
  const showSearchInput = activeFilter === "By Search";

  useEffect(() => {
    setQuery("");
  }, [activeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadBags = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          limit: "100",
          from: fromDate,
          to: toDate,
        });

        if (activeFilter === "By Search" && query.trim()) {
          params.set("search", query.trim());
        }

        const response = await apiRequest(`/blood-bank/bags?${params.toString()}`);
        if (!isMounted) return;
        setBags(response.data || []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood donation records");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBags();
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate, activeFilter, query, reloadKey]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bags
      .filter((bag) => {
        const collectedDate = formatDate(bag.collected_at);
        if (fromDate && collectedDate < fromDate) return false;
        if (toDate && collectedDate > toDate) return false;

        if (!normalizedQuery) return true;

        const donorName = bag.donor?.full_name?.toLowerCase() || "";
        const donorCode = bag.donor?.donor_code?.toLowerCase() || "";
        const paymentAccounts = Array.isArray(bag.payment_details)
          ? bag.payment_details.map((payment) => String(payment.account_name || "").toLowerCase())
          : [];

        if (activeFilter === "By Donor") {
          return donorName.includes(normalizedQuery) || donorCode.includes(normalizedQuery);
        }

        if (activeFilter === "By Account") {
          return paymentAccounts.some((account) => account.includes(normalizedQuery));
        }

        if (activeFilter === "By Date") {
          return collectedDate.includes(normalizedQuery);
        }

        if (activeFilter === "By Search") {
          return [
            bag.bag_code,
            bag.blood_group,
            bag.institution,
            bag.lot_no,
            bag.notes,
            bag.donor?.full_name,
            bag.donor?.donor_code,
            ...(Array.isArray(bag.payment_details) ? bag.payment_details.map((payment) => payment.account_name) : []),
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        }

        return true;
      })
      .map((bag, index) => ({
        id: bag.id,
        sl: index + 1,
        date: formatDate(bag.collected_at),
        donor: bag.donor?.full_name || bag.donor?.donor_code || "Walk-in",
        bag: bag.bag_code || "-",
        charge: formatMoney(bag.charge),
        tax: formatMoney(bag.tax_amount),
        paid: formatMoney(bag.paid_amount),
        due: formatMoney(bag.due_amount),
        note: bag.notes || "-",
        createdBy: "-",
        updatedBy: "-",
      }));
  }, [activeFilter, bags, fromDate, query, toDate]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          charge: sum.charge + Number(row.charge || 0),
          tax: sum.tax + Number(row.tax || 0),
          paid: sum.paid + Number(row.paid || 0),
          due: sum.due + Number(row.due || 0),
        }),
        { charge: 0, tax: 0, paid: 0, due: 0 }
      ),
    [rows]
  );

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">BLOOD DONATE RECORD</h1>

        <div className="grid grid-cols-[180px_180px_190px_190px_minmax(160px,1fr)] gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={setActiveFilter}
            options={donateFilterOptions.map((option) => option.label)}
            value={activeFilter}
          />
          {searchOptions ? (
            <SelectField
              label={searchOptions[0]}
              onChange={setQuery}
              options={searchOptions}
              value={query || searchOptions[0]}
            />
          ) : null}
          {showSearchInput ? (
            <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">Search</legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => setReloadKey((current) => current + 1)}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        <table className="min-w-full border-collapse text-left text-[12px] text-[#1f2c33]">
          <thead>
            <tr className="bg-[#dfdfdf]">
              <th className="border border-black px-1.5 py-1 font-normal">SL</th>
              <th className="border border-black px-1.5 py-1 font-normal">Date</th>
              <th className="border border-black px-1.5 py-1 font-normal">Donor</th>
              <th className="border border-black px-1.5 py-1 font-normal">Bag</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Charge</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Tax</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Paid</th>
              <th className="border border-black px-1.5 py-1 text-right font-normal">Due</th>
              <th className="border border-black px-1.5 py-1 font-normal">Note</th>
              <th className="border border-black px-1.5 py-1 font-normal">Created By</th>
              <th className="border border-black px-1.5 py-1 font-normal">Updated By</th>
              <th className="border border-black px-1.5 py-1 text-center font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-1.5 py-1">{row.sl}</td>
                  <td className="border border-black px-1.5 py-1">{row.date}</td>
                  <td className="border border-black px-1.5 py-1">{row.donor}</td>
                  <td className="border border-black px-1.5 py-1">{row.bag}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.charge}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.tax}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.paid}</td>
                  <td className="border border-black px-1.5 py-1 text-right">{row.due}</td>
                  <td className="border border-black px-1.5 py-1">{row.note}</td>
                  <td className="border border-black px-1.5 py-1">{row.createdBy}</td>
                  <td className="border border-black px-1.5 py-1">{row.updatedBy}</td>
                  <td className="border border-black px-1.5 py-1 text-center">-</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black px-1.5 py-3 text-center" colSpan={12}>
                  {isLoading ? "Loading records..." : "No blood donation records found"}
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1 text-right">Grand Total</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.charge)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.tax)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.paid)}</td>
              <td className="border border-black px-1.5 py-1 text-right">{formatMoney(totals.due)}</td>
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
              <td className="border border-black px-1.5 py-1" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BloodComponentSeparationRecordPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [recordType, setRecordType] = useState("All");
  const [fromDate, setFromDate] = useState(getDefaultFromDate());
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [query, setQuery] = useState("");
  const [bags, setBags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const showSearchInput = activeFilter !== "All" && activeFilter !== "By Date";

  useEffect(() => {
    setQuery("");
  }, [activeFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadSeparatedBags = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({
          limit: "100",
          from: fromDate,
          to: toDate,
        });
        const response = await apiRequest(`/blood-bank/bags?${params.toString()}`);
        if (!isMounted) return;

        const allBags = response.data || [];
        const sepBags = allBags.filter(
          (bag) => (bag.component && bag.component !== "whole_blood") || String(bag.notes || "").toLowerCase().includes("separated")
        );
        setBags(sepBags.length > 0 ? sepBags : allBags);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load blood component separation records");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSeparatedBags();
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate, reloadKey]);

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bags
      .map((bag) => {
        return {
          id: bag.id,
          separationNo: `SEP-${String(bag.id).padStart(4, "0")}`,
          bloodGroup: bag.blood_group || "-",
          bagNo: bag.bag_code || "-",
          // Separated component bags are stored as individual detail records.
          recordType: "With Detail",
          date: formatDate(bag.collected_at),
          component: COMPONENT_LABELS[bag.component] || bag.component || "-",
          note: bag.notes || "-",
        };
      })
      .filter((row) => {
        if (recordType !== "All" && row.recordType !== recordType) return false;
        if (fromDate && row.date < fromDate) return false;
        if (toDate && row.date > toDate) return false;

        if (!normalizedQuery) return true;

        if (activeFilter === "By Blood Group") {
          return row.bloodGroup.toLowerCase().includes(normalizedQuery);
        }

        if (activeFilter === "By Date") {
          return row.date.includes(normalizedQuery);
        }

        if (activeFilter === "By Search") {
          return [row.separationNo, row.bloodGroup, row.bagNo, row.recordType, row.component, row.note]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        }

        return true;
      });
  }, [activeFilter, bags, fromDate, query, recordType, toDate]);

  return (
    <section className="mx-auto max-w-[1280px] pt-[2px]">
      <div className="rounded-[4px] border border-[#d9e1e5] bg-white p-4 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
        <h1 className="mb-5 text-[16px] font-medium text-[#1f2c33]">BLOOD COMPONENT SEPARATION RECORD</h1>

        <div className="grid grid-cols-[180px_180px_180px_180px_minmax(140px,1fr)] gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
          <SelectField
            label="Filter Type"
            onChange={setActiveFilter}
            options={separationFilterOptions.map((option) => option.label)}
            value={activeFilter}
          />
          <SelectField
            label="Record Type"
            onChange={setRecordType}
            options={["All", "With Detail", "Without Detail"]}
            value={recordType}
          />
          {showSearchInput ? (
            <fieldset className="min-w-0 rounded-[3px] border border-[#c7d0d5] bg-[#f3f3f3]">
              <legend className="mx-2 px-1 text-[10px] leading-none text-[#7f8990]">
                {activeFilter === "By Blood Group" ? "Blood Group" : "Search"}
              </legend>
              <input
                autoFocus
                className="h-[28px] w-full rounded-[3px] border-0 bg-[#f3f3f3] px-3 text-[13px] text-[#25333b] outline-none placeholder:text-[#6f7b84]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Here"
                type="text"
                value={query}
              />
            </fieldset>
          ) : null}
          <DateField label="From Date" onChange={setFromDate} value={fromDate} />
          <DateField label="To Date" onChange={setToDate} value={toDate} />
          <div className="flex items-end">
            <button
              className="h-[32px] w-full rounded-[2px] bg-black px-8 text-[11px] font-medium tracking-[0.02em] text-white"
              onClick={() => setReloadKey((current) => current + 1)}
              type="button"
            >
              {isLoading ? "LOADING..." : "REPORT"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {errorMessage ? (
          <div className="mb-4 rounded-[4px] border border-[#f2b2b2] bg-[#fff5f5] px-3 py-2 text-[13px] text-[#b94a48]">
            {errorMessage}
          </div>
        ) : null}
        <ResultTable
          columns={[
            { key: "separationNo", label: "Separation No" },
            { key: "bloodGroup", label: "Blood Group" },
            { key: "bagNo", label: "Bag No" },
            { key: "recordType", label: "Record Type" },
            { key: "date", label: "Date" },
          ]}
          rows={rows}
        />
      </div>
    </section>
  );
}
