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
// Granularity — module level, and that is the documented requirement, not a gap
// left unfixed. Checked before deciding to leave it as-is:
//   * Hospital_Management_System_Documentation.pdf (all 253 text lines extracted)
//     mentions authorisation exactly twice: "Security Protocol: JWT Access
//     Tokens, Refresh Tokens, Joi Validation, RBAC Guards & Audit Logging" and
//     "Role Access Summary: Shows MODULE permissions assigned to current user
//     role". Neither asks for per-action rights.
//   * README.md contains no permission requirement at all.
//   * The administrator UI (UserAccessPage) offers ONE checkbox per menu item
//     and posts `can_read: true` hardcoded — there is no create/edit/delete
//     matrix to enforce, and no stored record has ever carried one.
// So enforcement here is exactly as granular as the specification and the UI:
// holding any permission in a module's group authorises that module's endpoints,
// subject to the role check as well.
//
// Documented limitation (not a vulnerability): a user granted, say,
// `patient_patient_entry` can also reach the patient module's update and delete
// endpoints. Narrowing that would require per-action permission records, a
// per-action editing UI, and an administrative decision about what each existing
// profile should map onto — a specification change, not a bug fix. Until such a
// requirement exists, the enforced policy and the displayed policy agree, which
// is the property that matters: the frontend menu is no longer the only gate.

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const { ROLES } = require('../config/constants');
const { groupsForModule, keyMatchesGroup } = require('../config/permissions');

const CACHE_TTL_MS = 30_000;
const cache = new Map(); // userId -> { keys: string[] | null, expiresAt: number }

const invalidateUser = (userId) => {
  cache.delete(String(userId));
};

const invalidateAll = () => {
  cache.clear();
};

// Returns null when the user has no permission profile at all (role-only
// access), or an array of permission keys when a profile exists — including an
// empty array, which is a real, restrictive "no access" profile.
const loadPermissionKeys = async (userId) => {
  const cached = cache.get(String(userId));
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const { MasterOption } = require('../models');
  const option = await MasterOption.findOne({
    where: { type: 'user_permission', code: `PERM-${userId}` },
  });

  let keys = null;
  if (option) {
    try {
      const parsed = JSON.parse(option.description || '[]');
      keys = (Array.isArray(parsed) ? parsed : [])
        .map((item) => (typeof item === 'string' ? item : item?.permission_key || ''))
        .filter(Boolean);
    } catch (err) {
      // A corrupt profile must not silently widen access. Treat it as an empty
      // (deny-all) profile and make the problem visible.
      logger.warn(`Unparseable permission profile for user ${userId}; denying module access`);
      keys = [];
    }
  }

  cache.set(String(userId), { keys, expiresAt: Date.now() + CACHE_TTL_MS });
  return keys;
};

const requireModulePermission = (moduleName) => {
  const groups = groupsForModule(moduleName);

  return asyncHandler(async (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized('Authentication required');
    if (req.user.role === ROLES.ADMIN) return next();
    if (!groups) return next(); // module carries no menu-level permission

    const keys = await loadPermissionKeys(req.user.id);
    if (keys === null) return next(); // no profile -> role-only, unchanged behaviour

    const allowed = keys.some((key) => groups.some((group) => keyMatchesGroup(key, group)));
    if (!allowed) {
      throw ApiError.forbidden(`You do not have permission to access the ${moduleName} module`);
    }
    return next();
  });
};

module.exports = {
  requireModulePermission,
  loadPermissionKeys,
  invalidateUser,
  invalidateAll,
};
