const ACCESS_TOKEN_KEYS = ["accessToken", "access_token", "token"];
const REFRESH_TOKEN_KEYS = ["refreshToken", "refresh_token"];
const AUTH_USER_KEY = "authUser";
const AUTH_CHANGE_EVENT = "hospital-auth-change";

const ROLE_DEFAULT_PATHS = {
  admin: "/",
  doctor: "/doctor",
  nurse: "/bed",
  receptionist: "/appointment",
  accountant: "/finance",
  pharmacist: "/pharmacy",
  lab_tech: "/pathology",
  patient: "/",
};

const ROLE_ROUTE_RULES = [
  { prefix: "/settings", roles: ["admin"] },
  { prefix: "/hr-payroll", roles: ["admin"] },
  { prefix: "/finance", roles: ["admin", "accountant"] },
  { prefix: "/finance-reports", roles: ["admin", "accountant"] },
  { prefix: "/doctor", roles: ["admin", "doctor"] },
  { prefix: "/pharmacy", roles: ["admin", "pharmacist"] },
  { prefix: "/medicine", roles: ["admin", "pharmacist"] },
  { prefix: "/pathology", roles: ["admin", "lab_tech"] },
  { prefix: "/radiology", roles: ["admin", "lab_tech"] },
  { prefix: "/blood", roles: ["admin", "nurse", "lab_tech"] },
  { prefix: "/ipd", roles: ["admin", "doctor", "nurse"] },
  { prefix: "/opd", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { prefix: "/appointment", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { prefix: "/bed", roles: ["admin", "nurse"] },
  { prefix: "/ambulance", roles: ["admin", "nurse", "receptionist"] },
  { prefix: "/patient", roles: ["admin", "doctor", "nurse", "receptionist"] },
  { prefix: "/referral", roles: ["admin", "doctor", "receptionist"] },
  { prefix: "/reports", roles: ["admin", "doctor", "nurse", "receptionist", "accountant", "pharmacist", "lab_tech"] },
];

function readFirst(keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }
  return "";
}

function dispatchAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getStoredToken() {
  return readFirst(ACCESS_TOKEN_KEYS);
}

export function getStoredRefreshToken() {
  return readFirst(REFRESH_TOKEN_KEYS);
}

export function hasStoredToken() {
  return Boolean(getStoredToken());
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role || "";
}

export function storeAuthSession({ accessToken, refreshToken, user }) {
  if (accessToken) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("token", accessToken);
  }

  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("refresh_token", refreshToken);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    if (Array.isArray(user.permissions)) {
      localStorage.setItem("userPermissions", JSON.stringify(user.permissions));
    }
  }

  dispatchAuthChange();
}

export function clearAuthSession() {
  [...ACCESS_TOKEN_KEYS, ...REFRESH_TOKEN_KEYS, AUTH_USER_KEY, "userPermissions"].forEach((key) => localStorage.removeItem(key));
  dispatchAuthChange();
}

export function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

export function subscribeToAuthChanges(listener) {
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
}

export function getStoredPermissions() {
  const raw = localStorage.getItem("userPermissions");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getDefaultPathForRole(role) {
  return ROLE_DEFAULT_PATHS[role] || "/";
}

export function canAccessPath(pathname, role) {
  if (!pathname || pathname === "/" || pathname === "/login") {
    return true;
  }

  if (role === "admin" || role === "super_admin") {
    return true;
  }

  const permissions = getStoredPermissions();
  if (Array.isArray(permissions) && permissions.length > 0) {
    const groupKeyMap = {
      "/finance": "finance",
      "/finance-reports": "finance",
      "/hr-payroll": "hr_and_payroll",
      "/referral": "referral",
      "/settings": "settings",
      "/doctor": "doctor",
      "/opd": "opd",
      "/ipd": "ipd",
      "/bed": "bed",
      "/patient": "patient",
      "/ambulance": "ambulance",
      "/reports": "reports",
      "/appointment": "appointment",
      "/pathology": "pathology",
      "/radiology": "radiology",
      "/blood": "blood",
      "/pharmacy": "pharmacy",
      "/medicine": "medicine",
    };

    const pathPrefix = Object.keys(groupKeyMap).find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (pathPrefix) {
      const requiredGroup = groupKeyMap[pathPrefix];
      const hasAnyGroupPerm = permissions.some((p) => {
        const keyStr = typeof p === "string" ? p : p?.permission_key || "";
        return keyStr.startsWith(`${requiredGroup}_`) || keyStr.startsWith(`${requiredGroup}.`);
      });
      return hasAnyGroupPerm;
    }
  }

  const matchingRule = ROLE_ROUTE_RULES.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
  if (!matchingRule) {
    return role !== "patient";
  }

  return matchingRule.roles.includes(role);
}

export function filterNavigationItems(items, role) {
  return items.filter((item) => canAccessPath(item.path, role));
}
