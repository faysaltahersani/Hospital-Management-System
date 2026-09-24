'use strict';

const ApiError = require('../../utils/ApiError');
const { hashPassword } = require('../../utils/password');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const { ROLE_VALUES } = require('../../config/constants');
const repository = require('./users.repository');

const list = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.role) filters.role = query.role;
  if (query.is_active !== undefined) filters.is_active = query.is_active;

  const { rows, count } = await repository.findAndCount({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return {
    items: rows.map((u) => u.toJSON()),
    meta: buildMeta({ total: count, page, limit }),
  };
};

const getById = async (id) => {
  const user = await repository.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
};

const create = async (input) => {
  const exists = await repository.findByEmail(input.email);
  if (exists) throw ApiError.conflict('Email is already registered');

  const fullName = (input.full_name || input.username || input.email.split('@')[0]).trim();
  const roleValue = (input.role || 'receptionist').toLowerCase().trim();
  const password_hash = await hashPassword(input.password);

  const user = await repository.create({
    email: input.email,
    password_hash,
    full_name: fullName,
    role: ['admin', 'doctor', 'nurse', 'receptionist', 'accountant', 'pharmacist', 'lab_tech', 'patient'].includes(roleValue)
      ? roleValue
      : 'receptionist',
    phone: input.phone || null,
    is_active: input.is_active !== false,
  });
  return user.toJSON();
};

const update = async (id, changes) => {
  const user = await repository.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const payload = { ...changes };
  let passwordWasReset = false;

  if (changes.password) {
    payload.password_hash = await hashPassword(changes.password);
    delete payload.password;
    // BUG-040 — an admin reset used to leave existing sessions valid, so a
    // compromised session survived the very action meant to end it. The user
    // must also rotate the admin-chosen password themselves.
    payload.must_change_password = true;
    payload.password_changed_at = new Date();
    passwordWasReset = true;
  }
  if (!payload.full_name && changes.username) {
    payload.full_name = changes.username;
  }
  // BUG-040 — `role` had no enum validation on update (unlike create), so an
  // arbitrary string reached the ENUM column and could store '' in non-strict
  // MySQL, locking the account out of every authorize() check.
  if (payload.role !== undefined && payload.role !== null && payload.role !== '') {
    const role = String(payload.role).toLowerCase().trim();
    if (!ROLE_VALUES.includes(role)) {
      throw ApiError.badRequest(`Invalid role "${payload.role}". Allowed: ${ROLE_VALUES.join(', ')}`);
    }
    payload.role = role;
  } else {
    delete payload.role;
  }

  await repository.update(user, payload);

  if (passwordWasReset) {
    await repository.revokeAllTokensForUser(user.id);
  }
  // A role change alters effective authorization, so drop any cached profile.
  require('../../middlewares/permission.middleware').invalidateUser(user.id);

  return user.toJSON();
};

const remove = async (id, currentUserId) => {
  if (Number(id) === Number(currentUserId)) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await repository.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  await repository.destroy(user);
  return { message: 'User deleted' };
};

const getUserPermissions = async (userId) => {
  const { MasterOption } = require('../../models');
  const opt = await MasterOption.findOne({
    where: { type: 'user_permission', code: `PERM-${userId}` },
  });
  if (!opt) return [];
  try {
    const list = JSON.parse(opt.description || '[]');
    return (Array.isArray(list) ? list : [])
      .map((item) => (typeof item === 'string' ? item : item?.permission_key || ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

// BUG-001 — the previous implementation collapsed each entry to its
// `permission_key`, discarding the `can_read`/`can_create`/`can_update`/
// `can_delete` flags the UI sends. Records are now stored in a single
// normalised object form so per-action enforcement can build on them, and the
// permission cache is invalidated so a change takes effect immediately rather
// than after the next login.
const normalizePermissionEntry = (item) => {
  if (typeof item === 'string') {
    return item ? { permission_key: item, can_read: true } : null;
  }
  const key = item?.permission_key || '';
  if (!key) return null;
  const entry = { permission_key: key, can_read: item.can_read !== false };
  if (item.can_create !== undefined) entry.can_create = Boolean(item.can_create);
  if (item.can_update !== undefined) entry.can_update = Boolean(item.can_update);
  if (item.can_delete !== undefined) entry.can_delete = Boolean(item.can_delete);
  return entry;
};

const setUserPermissions = async (userId, permissions = []) => {
  const { MasterOption } = require('../../models');
  const { invalidateUser } = require('../../middlewares/permission.middleware');

  const user = await repository.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const seen = new Set();
  const cleanList = (Array.isArray(permissions) ? permissions : [])
    .map(normalizePermissionEntry)
    .filter((entry) => {
      if (!entry || seen.has(entry.permission_key)) return false;
      seen.add(entry.permission_key);
      return true;
    });

  const [opt] = await MasterOption.findOrCreate({
    where: { type: 'user_permission', code: `PERM-${userId}` },
    defaults: {
      type: 'user_permission',
      code: `PERM-${userId}`,
      label: `User #${userId} Permissions`,
      description: JSON.stringify(cleanList),
      is_active: true,
    },
  });

  await opt.update({ description: JSON.stringify(cleanList) });
  invalidateUser(userId);

  return cleanList;
};

module.exports = { list, getById, create, update, remove, getUserPermissions, setUserPermissions };
