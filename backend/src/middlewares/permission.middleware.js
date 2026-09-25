'use strict';

// BUG-001 — backend enforcement of the dynamic (per-user) permission system.
//
// Before this middleware existed, permissions were read at login and used only
// to filter the frontend menu. Any authenticated user could call any endpoint
// their (often very broad) role group allowed, regardless of the permission
// profile an administrator had configured. Hiding a menu is not authorisation.
//
// Semantics — deliberately identical to the frontend's `canAccessPath`, so
// enforcement matches what administrators see and no existing workflow breaks:
//   * `admin` bypasses permission checks (role remains authoritative).
//   * A user WITHOUT a stored permission profile is governed by role checks
//     alone. 28 of the 30 accounts in the current database are in this state,
//     so their access is unchanged.
//   * A user WITH a stored profile must hold at least one permission in the
//     module's group, in addition to passing the role check.
//
// Enterprise action permissions are enforced from the request method and
// workflow path. Old profiles that only contain `can_read` remain compatible;
// as soon as an administrator saves the new permission matrix, explicit action
// flags become authoritative for that profile.

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const { ROLES } = require('../config/constants');
const { groupsForModule, keyMatchesGroup } = require('../config/permissions');

const CACHE_TTL_MS = 30_000;
const cache = new Map(); // userId -> { entries: object[] | null, expiresAt: number }

const invalidateUser = (userId) => {
  cache.delete(String(userId));
};

const invalidateAll = () => {
  cache.clear();
};

// Returns null when the user has no permission profile at all (role-only
// access), or an array of permission entries when a profile exists — including an
// empty array, which is a real, restrictive "no access" profile.
const loadPermissionEntries = async (userId) => {
  const cached = cache.get(String(userId));
  if (cached && cached.expiresAt > Date.now()) return cached.entries;

  const { MasterOption } = require('../models');
  const option = await MasterOption.findOne({
    where: { type: 'user_permission', code: `PERM-${userId}` },
  });

  let entries = null;
  if (option) {
    try {
      const parsed = JSON.parse(option.description || '[]');
      entries = (Array.isArray(parsed) ? parsed : [])
        .map((item) => (typeof item === 'string' ? { permission_key: item, can_read: true, legacy: true } : item))
        .filter((item) => item?.permission_key);
    } catch (err) {
      // A corrupt profile must not silently widen access. Treat it as an empty
      // (deny-all) profile and make the problem visible.
      logger.warn(`Unparseable permission profile for user ${userId}; denying module access`);
      entries = [];
    }
  }

  cache.set(String(userId), { entries, expiresAt: Date.now() + CACHE_TTL_MS });
  return entries;
};

// Kept as a compatibility export for existing callers and tests that consume
// the historical string-key API. Enforcement uses the richer entry objects.
const loadPermissionKeys = async (userId) => {
  const entries = await loadPermissionEntries(userId);
  return entries === null ? null : entries.map((entry) => entry.permission_key);
};

const actionForRequest = (req) => {
  const path = String(req.originalUrl || req.path || '').toLowerCase();
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (/\/export|\/download/.test(path)) return 'export';
    if (/\/print/.test(path)) return 'print';
    return 'read';
  }
  if (/\/refund|sales-returns?|purchase-returns?/.test(path)) return 'refund';
  if (/\/reject/.test(path)) return 'reject';
  if (/\/approve|\/verify|\/finalize/.test(path)) return 'approve';
  if (req.method === 'POST') return 'create';
  if (req.method === 'PUT' || req.method === 'PATCH') return 'update';
  if (req.method === 'DELETE') return 'delete';
  return 'read';
};

const ACTION_FIELDS = new Set([
  'can_create',
  'can_update',
  'can_delete',
  'can_approve',
  'can_reject',
  'can_print',
  'can_export',
  'can_refund',
  'can_access_sensitive',
]);

const isLegacyEntry = (entry) =>
  entry?.legacy || !Object.keys(entry || {}).some((field) => ACTION_FIELDS.has(field));

const matchingEntries = async (req, moduleName) => {
  const groups = groupsForModule(moduleName);
  if (!groups) return null;
  const entries = await loadPermissionEntries(req.user.id);
  if (entries === null) return null;
  return entries.filter((entry) =>
    groups.some((group) => keyMatchesGroup(entry.permission_key, group))
  );
};

const requireModulePermission = (moduleName) => {
  const groups = groupsForModule(moduleName);

  return asyncHandler(async (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return next();
    if (!groups) return next(); // module carries no menu-level permission

    const matching = await matchingEntries(req, moduleName);
    if (matching === null) return next(); // no profile -> role-only, unchanged behaviour
    if (!matching.length) {
      throw ApiError.forbidden(`You do not have permission to access the ${moduleName} module`);
    }

    const action = actionForRequest(req);
    const field = `can_${action}`;
    const allowed = matching.some((entry) => {
      if (action === 'read') return entry.can_read !== false;
      if (isLegacyEntry(entry)) return entry.can_read !== false;
      return entry[field] === true;
    });
    if (!allowed) {
      throw ApiError.forbidden(`You do not have ${action} permission for the ${moduleName} module`);
    }
    return next();
  });
};

const requireSensitiveDataPermission = (moduleName) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return next();
    const matching = await matchingEntries(req, moduleName);
    if (matching === null || matching.some(isLegacyEntry)) return next();
    if (!matching.some((entry) => entry.can_access_sensitive === true)) {
      throw ApiError.forbidden(`You do not have sensitive-data permission for the ${moduleName} module`);
    }
    return next();
  });

// Route-level permission for clinical workflows that need finer control than
// a whole menu group (for example triage versus doctor assessment). Users with
// no saved profile keep the established role-only behaviour; once a profile is
// saved, the exact permission row and requested action become authoritative.
const requirePermissionKey = (permissionKey, action = null) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return next();
    const entries = await loadPermissionEntries(req.user.id);
    if (entries === null) return next();
    const entry = entries.find((item) => String(item.permission_key).toLowerCase() === String(permissionKey).toLowerCase());
    if (!entry || entry.can_read === false) {
      throw ApiError.forbidden(`You do not have permission for ${permissionKey}`);
    }
    const resolvedAction = action || actionForRequest(req);
    if (resolvedAction !== 'read' && !isLegacyEntry(entry) && entry[`can_${resolvedAction}`] !== true) {
      throw ApiError.forbidden(`You do not have ${resolvedAction} permission for ${permissionKey}`);
    }
    return next();
  });

module.exports = {
  requireModulePermission,
  loadPermissionKeys,
  loadPermissionEntries,
  invalidateUser,
  invalidateAll,
  actionForRequest,
  requireSensitiveDataPermission,
  requirePermissionKey,
};
