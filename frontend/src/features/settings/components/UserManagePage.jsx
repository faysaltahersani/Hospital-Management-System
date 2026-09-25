import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../lib/api";
import { confirmDelete, confirmEdit, showError, showSuccess } from "../../../lib/alerts";
import { clearAuthSession, hasStoredToken } from "../../../lib/auth";

const initialForm = {
  username: "",
  email: "",
  password: "",
  role_id: "",
  user_type_ids: [],
  user_type_id: "",
  branch_id: "",
  is_two_factor_enabled: false,
};

const fallbackRoles = [
  { id: 1, name: "SuperAdmin", slug: "super_admin" },
  { id: 2, name: "Admin", slug: "admin" },
  { id: 3, name: "Doctor", slug: "doctor" },
];

const fallbackUserTypes = [
  { id: 1, name: "Reader", slug: "reader" },
  { id: 2, name: "Creator", slug: "creator" },
  { id: 3, name: "Updater", slug: "updater" },
  { id: 4, name: "Deleter", slug: "deleter" },
  { id: 5, name: "Approver", slug: "approver" },
];

const fallbackBranches = [];

function SectionTitle({ children }) {
  return (
    <div className="mb-5 rounded-[4px] bg-[#dff3f7] px-4 py-3 text-[18px] font-medium text-[#1f2c33]">
      {children}
    </div>
  );
}

function TextField({ label, name, onChange, type = "text", value }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const actualType = isPasswordField ? (showPassword ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-1 block text-[14px] text-[#5b6470]">{label}</span>
      <div className="relative">
        <input
          className={`flex h-[42px] w-full items-center border-0 border-b border-[#959da3] bg-[#f3f3f3] px-3 ${
            isPasswordField ? "pr-10" : ""
          } text-[15px] text-[#1f2c33] outline-none`}
          name={name}
          onChange={onChange}
          type={actualType}
          value={value}
        />
        {isPasswordField ? (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#6b7280] hover:text-[#1f2c33]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPassword((prev) => !prev);
            }}
            type="button"
          >
            {showPassword ? (
              <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.962 8.962 0 013.682-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </label>
  );
}

function SelectField({ label, name, onChange, options = [], value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[14px] text-[#5b6470]">{label}</span>
      <select
        className="h-[42px] w-full appearance-none border-0 border-b border-[#959da3] bg-[#f3f3f3] bg-right bg-no-repeat px-3 pr-10 text-[15px] text-[#55606a] outline-none"
        name={name}
        onChange={onChange}
        value={value}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23666' d='M5 6 0 .5h10z'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 14px center",
        }}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectField({ label, onChange, options = [], values = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOptions = options.filter((option) => values.includes(option.value));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleValue = (value) => {
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    onChange(nextValues);
  };

  const removeValue = (event, value) => {
    event.stopPropagation();
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className="relative" ref={containerRef}>
      <span className="mb-1 block text-[14px] text-[#5b6470]">{label}</span>
      <button
        className="flex min-h-[42px] w-full items-center border-0 border-b-2 border-[#1976d2] bg-[#f3f3f3] px-3 py-1.5 text-left text-[15px] text-[#1f2c33] outline-none"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selectedOptions.length ? (
            selectedOptions.map((option) => (
              <span
                className="inline-flex h-[24px] items-center gap-1 rounded-full bg-[#d9d9d9] px-2 text-[14px] text-[#1f2c33]"
                key={option.value}
              >
                {option.label}
                <span
                  className="grid h-[16px] w-[16px] place-items-center rounded-full bg-[#a8a8a8] text-[12px] leading-none text-white"
                  onClick={(event) => removeValue(event, option.value)}
                >
                  ×
                </span>
              </span>
            ))
          ) : (
            <span className="py-0.5 text-[#55606a]">{label}</span>
          )}
        </span>
        <span
          className="ml-2 text-[24px] leading-none text-[#6b7280]"
          onClick={(event) => {
            event.stopPropagation();
            onChange([]);
          }}
        >
          ×
        </span>
        <span className="ml-3 text-[12px] text-[#6b7280]">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 max-h-[240px] w-full overflow-y-auto border border-[#d9e1e5] bg-white shadow-[0_8px_18px_rgba(22,36,45,0.12)]">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <button
                className={`block w-full px-3 py-2 text-left text-[16px] text-[#1f2c33] ${
                  checked ? "bg-[#e8f2ff]" : "bg-white"
                } hover:bg-[#eef5ff]`}
                key={option.value}
                onClick={() => toggleValue(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ checked = false, onChange }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input className="peer sr-only" checked={checked} onChange={onChange} type="checkbox" />
      <span className="h-[16px] w-[36px] rounded-full bg-[#b7b7b7] transition-colors peer-checked:bg-[#2f7bd6]" />
      <span className="pointer-events-none absolute left-[1px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform peer-checked:translate-x-[18px]" />
    </label>
  );
}

function ToolbarIcon({ children }) {
  return (
    <button className="text-[#7d7f84]" type="button">
      {children}
    </button>
  );
}

function ActionIcon({ children, onClick, tone }) {
  return (
    <button className={`inline-grid h-7 w-7 place-items-center ${tone}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function ColumnMenuIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-[#c8cdd2]" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4.4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 4.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 4.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

function SortIcons() {
  return (
    <>
      <span className="text-[#d1d5db]">▼</span>
      <span className="text-[#d1d5db]">⇅</span>
    </>
  );
}

function HeaderCell({ children, className = "", sortable = false }) {
  return (
    <th className={`px-2 py-3 font-semibold whitespace-nowrap ${className}`}>
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {sortable ? <SortIcons /> : null}
        <ColumnMenuIcon />
      </div>
    </th>
  );
}

function getPermissionLabels(userTypes) {
  if (!userTypes) {
    return [];
  }

  const normalizedUserTypes = Array.isArray(userTypes) ? userTypes : [userTypes];
  const labels = new Set();

  normalizedUserTypes.forEach((userType) => {
    if (userType?.can_create) labels.add("Creator");
    if (userType?.can_read) labels.add("Reader");
    if (userType?.can_approve) labels.add("Approver");
    if (userType?.can_delete) labels.add("Deleter");
    if (userType?.can_update) labels.add("Updater");
  });

  return [...labels];
}

export function UserManagePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(fallbackRoles);
  const [userTypes, setUserTypes] = useState(fallbackUserTypes);
  const [branches, setBranches] = useState(fallbackBranches);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasStoredToken());

  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.name, value: String(role.id) })),
    [roles]
  );

  const userTypeOptions = useMemo(
    () => userTypes.map((type) => ({ label: type.name, value: String(type.id) })),
    [userTypes]
  );

  const branchOptions = useMemo(
    () => branches.map((branch) => ({ label: `${branch.name}${branch.hospital?.name ? ` — ${branch.hospital.name}` : ""}`, value: String(branch.id) })),
    [branches]
  );

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    const nextIsAuthenticated = hasStoredToken();
    setIsAuthenticated(nextIsAuthenticated);

    try {
      const metaResponse = await apiRequest("/users/meta");
      setRoles(metaResponse.data.roles?.length ? metaResponse.data.roles : fallbackRoles);
      setUserTypes(metaResponse.data.user_types?.length ? metaResponse.data.user_types : fallbackUserTypes);
      setBranches(metaResponse.data.branches?.length ? metaResponse.data.branches : fallbackBranches);
    } catch (err) {
      setRoles(fallbackRoles);
      setUserTypes(fallbackUserTypes);
      setBranches(fallbackBranches);
    }

    if (!nextIsAuthenticated) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      const usersResponse = await apiRequest("/users?limit=100");
      setUsers(usersResponse.data || []);
    } catch (err) {
      setUsers([]);
      if (
        err.message?.includes("Authentication") ||
        err.message?.includes("token") ||
        err.message?.includes("Unauthorized") ||
        err.message?.includes("permissions")
      ) {
        clearAuthSession();
        setIsAuthenticated(false);
        setError("Your session expired or does not have access to the user list. Please log in again.");
        navigate("/login");
        return;
      }
      setError(err.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleUserTypesChange = (userTypeIds) => {
    setForm((current) => ({
      ...current,
      user_type_ids: userTypeIds,
      user_type_id: userTypeIds[0] || "",
    }));
  };

  const handleToggle = (event) => {
    setForm((current) => ({ ...current, is_two_factor_enabled: event.target.checked }));
  };

  const handleReset = () => {
    setForm(initialForm);
    setEditingUserId(null);
    setMessage("");
    setError("");
  };

  const handleEdit = async (user) => {
    const confirmed = await confirmEdit("Edit User", `Do you want to edit user "${user.username || user.full_name}"?`);
    if (!confirmed) return;

    setEditingUserId(user.id);
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role_id: user.role_id ? String(user.role_id) : String(roles.find((role) => role.slug === user.role)?.id || ""),
      user_type_ids: (user.user_types || []).map((type) => String(type.id)),
      user_type_id: user.user_type_id ? String(user.user_type_id) : "",
      branch_id: user.branch_id ? String(user.branch_id) : "",
      is_two_factor_enabled: Boolean(user.is_two_factor_enabled),
    });
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      setError(`Please sign in as an admin before ${editingUserId ? "updating" : "creating"} users.`);
      setMessage("");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const selectedRoleObj = roles.find((r) => String(r.id) === String(form.role_id)) || roles[0];
      const roleSlug = selectedRoleObj?.slug || selectedRoleObj?.name?.toLowerCase() || "doctor";
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        full_name: form.username || form.email,
        role: roleSlug,
        role_id: Number(form.role_id || roleOptions[0]?.value),
        user_type_ids: form.user_type_ids.map(Number),
        user_type_id: Number(form.user_type_id || userTypeOptions[0]?.value),
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        is_two_factor_enabled: form.is_two_factor_enabled,
      };

      if (editingUserId) {
        await apiRequest(`/users/${editingUserId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showSuccess("User Updated!", `User "${form.username || form.email}" updated successfully.`);
      } else {
        await apiRequest("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showSuccess("User Created!", `User "${form.username || form.email}" created successfully.`);
      }
      setForm(initialForm);
      setEditingUserId(null);
      setMessage(editingUserId ? "User updated successfully." : "User created successfully.");
      await loadUsers();
    } catch (err) {
      showError("User Save Failed", err.message || "Failed to save user.");
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };



  const handleDelete = async (user) => {
    if (!isAuthenticated) {
      setError("Please sign in as an admin before managing users.");
      setMessage("");
      return;
    }

    const userName = user.username || user.full_name || `User #${user.id}`;
    const confirmed = await confirmDelete("Delete User?", `Are you sure you want to delete user "${userName}"?`);
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      await apiRequest(`/users/${user.id}`, { method: "DELETE" });
      showSuccess("Deleted!", `User "${userName}" has been deleted.`);
      await loadUsers();
    } catch (err) {
      showError("Delete Failed", err.message || "Failed to delete user");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["SL", "USER NAME", "USER TYPE", "DOCTOR", "BRANCH NAME", "ROLES", "TWO FACTOR(OTP)", "CREATE BY", "UPDATE BY"],
      ...users.map((user, index) => [
        index + 1,
        user.username || user.full_name || "",
        user.user_type_name || "",
        user.doctor_id || "",
        user.branch?.name || "",
        user.role_name || user.role || "",
        user.is_two_factor_enabled ? "Enabled" : "Disabled",
        user.created_by_name || "",
        user.updated_by_name || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-[1280px] rounded-[4px] border border-[#d9e1e5] bg-white p-5 shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
      <div className="grid grid-cols-[370px_minmax(0,1fr)] gap-10 max-lg:grid-cols-1">
        <div>
          <SectionTitle>USER MANAGE</SectionTitle>

          <div className="space-y-3">
            <TextField label="USERNAME" name="username" onChange={handleChange} value={form.username} />
            <TextField label="EMAIL" name="email" onChange={handleChange} type="email" value={form.email} />
            <TextField label="PASSWORD" name="password" onChange={handleChange} type="password" value={form.password} />
            <MultiSelectField
              label="User Type"
              onChange={handleUserTypesChange}
              options={userTypeOptions}
              values={form.user_type_ids}
            />
            <SelectField
              label="ROLES"
              name="role_id"
              onChange={handleChange}
              options={roleOptions}
              value={form.role_id}
            />
            <SelectField
              label="SELECT BRANCH"
              name="branch_id"
              onChange={handleChange}
              options={branchOptions}
              value={form.branch_id}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Toggle checked={form.is_two_factor_enabled} onChange={handleToggle} />
            <span className="text-[14px] text-[#1f2c33]">Is Two Factor(OTP)?</span>
          </div>

          {!isAuthenticated ? (
            <div className="mt-4 rounded-[4px] bg-amber-50 px-3 py-2 text-[13px] text-amber-700">
              Sign in with an admin account to load, create, or delete users.
            </div>
          ) : null}
          {error ? <div className="mt-4 rounded-[4px] bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div> : null}
          {message ? <div className="mt-4 rounded-[4px] bg-green-50 px-3 py-2 text-[13px] text-green-700">{message}</div> : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="h-[32px] rounded-[4px] border border-[#7fb1ff] bg-white text-[12px] font-semibold text-[#119b1c]"
              disabled={isSaving || !isAuthenticated}
              onClick={handleSave}
              type="button"
            >
              {isSaving ? "SAVING..." : editingUserId ? "UPDATE" : "CREATE"}
            </button>
            <button
              className="h-[32px] rounded-[4px] border border-[#ff6767] bg-white text-[12px] font-semibold text-[#ff2f2f]"
              onClick={handleReset}
              type="button"
            >
              RESET
            </button>
          </div>
        </div>

        <div>
          <SectionTitle>USER LIST</SectionTitle>

          <div className="overflow-hidden rounded-[4px] border border-[#d9e1e5] bg-white shadow-[0_8px_22px_rgba(22,36,45,0.08)]">
            <div className="flex items-center justify-between gap-4 px-2.5 py-3 max-md:flex-col max-md:items-start">
              <button
                className="rounded-[4px] border border-[#89b8ff] bg-white px-4 py-2 text-[12px] font-medium text-[#1f73de]"
                onClick={exportCsv}
                type="button"
              >
                Export Data To CSV
              </button>

              <div className="flex items-center gap-5">
                <ToolbarIcon>
                  <svg aria-hidden="true" className="h-[20px] w-[20px]" fill="none" viewBox="0 0 20 20">
                    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="m13 13 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </ToolbarIcon>
                <ToolbarIcon>
                  <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                    <path d="M2 3h4v12H2V3Zm5 0h4v12H7V3Zm5 0h4v12h-4V3Z" />
                  </svg>
                </ToolbarIcon>
                <ToolbarIcon>
                  <svg aria-hidden="true" className="h-[20px] w-[20px]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4h14v2H3V4Zm0 4h14v2H3V8Zm0 4h14v2H3v-2Zm0 4h14v2H3v-2Z" />
                  </svg>
                </ToolbarIcon>
                <ToolbarIcon>
                  <svg aria-hidden="true" className="h-[20px] w-[20px]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4h4v2H6v2H4V4Zm12 0v4h-2V6h-2V4h4ZM4 12h2v2h2v2H4v-4Zm10 2v-2h2v4h-4v-2h2Z" />
                  </svg>
                </ToolbarIcon>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1240px] table-fixed border-collapse text-left text-[11px] text-[#1f2c33]">
                <thead>
                  <tr className="border-t border-b border-[#e0e6ea]">
                    <HeaderCell className="w-[88px]">Permissions</HeaderCell>
                    <HeaderCell className="w-[84px]">ACTIONS</HeaderCell>
                    <HeaderCell className="w-[38px]">SL</HeaderCell>
                    <HeaderCell className="w-[110px]" sortable>
                      USER NAME
                    </HeaderCell>
                    <HeaderCell className="w-[110px]" sortable>
                      USER TYPE
                    </HeaderCell>
                    <HeaderCell className="w-[74px]" sortable>
                      Doctor
                    </HeaderCell>
                    <HeaderCell className="w-[148px]" sortable>
                      BRANCH NAME
                    </HeaderCell>
                    <HeaderCell className="w-[220px]">Roles</HeaderCell>
                    <HeaderCell className="w-[110px]">Two Factor(OTP)</HeaderCell>
                    <HeaderCell className="w-[110px]" sortable>
                      CREATE BY
                    </HeaderCell>
                    <HeaderCell className="w-[110px]" sortable>
                      UPDATE BY
                    </HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-[#51606d]" colSpan={11}>
                        Loading users...
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && !isAuthenticated ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-[#51606d]" colSpan={11}>
                        Sign in as an admin to view the user list.
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && isAuthenticated && users.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-[#51606d]" colSpan={11}>
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && users.map((row, index) => (
                    <tr className="border-b border-[#e0e6ea]" key={row.id}>
                      <td className="px-2 py-2 text-center">
                        <ActionIcon
                          onClick={() => {
                            if (!isAuthenticated) {
                              setError("Please sign in as an admin before managing permissions.");
                              return;
                            }
                            navigate(`/settings/user-access/${row.id}`);
                          }}
                          tone={`${
                            isAuthenticated ? "text-[#b22d2d]" : "cursor-not-allowed text-[#d0d5db]"
                          }`}
                        >
                          <svg
                            aria-hidden="true"
                            className="h-[18px] w-[18px]"
                            fill="none"
                            viewBox="0 0 18 18"
                          >
                            <circle cx="6.2" cy="8.8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                            <path
                              d="M8.5 8.8H16M13.2 8.8v2M11.1 8.8v1.5"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                            />
                          </svg>
                        </ActionIcon>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <ActionIcon
                            onClick={() => handleDelete(row)}
                            tone={`${isAuthenticated ? "text-[#ff1313]" : "cursor-not-allowed text-[#d0d5db]"}`}
                          >
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                              <path d="M5.7 3h6.6l.4 1.4H15V6H3V4.4h2.3L5.7 3Zm.2 4h1.6v5.4H5.9V7Zm4.6 0h1.6v5.4h-1.6V7ZM5.3 7h7.4l-.5 6a1.2 1.2 0 0 1-1.2 1H7a1.2 1.2 0 0 1-1.2-1l-.5-6Z" />
                            </svg>
                          </ActionIcon>
                          <ActionIcon onClick={() => handleEdit(row)} tone="text-[#129b16]">
                            <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 18 18">
                              <path d="m12.7 2.8 2.5 2.5-7.4 7.4-3.1.6.6-3.1 7.4-7.4Zm-8 8.5-.3 1.4 1.4-.3 6.8-6.8-1.1-1.1-6.8 6.8ZM13.2 2.3a1.5 1.5 0 0 1 2.1 0l.4.4a1.5 1.5 0 0 1 0 2.1l-.5.5-2.5-2.5.5-.5Z" />
                            </svg>
                          </ActionIcon>
                        </div>
                      </td>
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.username || row.full_name}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.user_type_name || ""}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.doctor_id || ""}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.branch?.name || ""}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-[10px] leading-[1.35] text-[#294b63]">
                        {row.role_name || row.role || ""}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {row.is_two_factor_enabled ? "Enabled" : "Disabled"}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.created_by_name || ""}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{row.updated_by_name || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-5 border-t border-[#d7edf3] px-4 py-3 text-[13px] text-[#51606d] max-md:flex-wrap">
              <span>
                Rows per page <strong>10</strong>
              </span>
              <svg aria-hidden="true" className="h-3 w-3 text-[#707780]" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 11 3 5h10L8 11Z" />
              </svg>
              <button className="text-[#9ea7af]" type="button">
                ‹
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f1ee] text-[18px] text-[#37474f]"
                type="button"
              >
                1
              </button>
              <button className="text-[#9ea7af]" type="button">
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
