'use strict';

const crypto = require('crypto');
const ApiError = require('../../utils/ApiError');
const { hashPassword, comparePassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const config = require('../../config');
const repository = require('./auth.repository');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseDurationToMs = (duration) => {
  const match = String(duration).match(/^(\d+)([smhdw])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return n * (factors[unit] || 1000);
};

const buildTokens = async (user) => {
  const payload = { sub: user.id, role: user.role, email: user.email, jti: crypto.randomUUID() };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + parseDurationToMs(config.jwt.refreshExpiresIn));

  await repository.createRefreshToken({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt,
  });

  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => {
  const json = user.toJSON ? user.toJSON() : user;
  return {
    id: json.id,
    email: json.email,
    full_name: json.full_name,
    role: json.role,
    phone: json.phone,
    is_active: json.is_active,
    last_login_at: json.last_login_at,
    created_at: json.created_at,
    // BUG-002 — surfaced so the client can force a rotation before proceeding.
    must_change_password: Boolean(json.must_change_password),
  };
};

const getUserPermissionsList = async (userId) => {
  const { MasterOption } = require('../../models');
  const opt = await MasterOption.findOne({
    where: { type: 'user_permission', code: `PERM-${userId}` },
  });
  if (!opt) return [];
  try {
    const list = JSON.parse(opt.description || '[]');
    return list.map((item) => (typeof item === 'string' ? item : item.permission_key)).filter(Boolean);
  } catch {
    return [];
  }
};

const register = async (input) => {
  const existing = await repository.findUserByEmail(input.email);
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }
  const password_hash = await hashPassword(input.password);
  const user = await repository.createUser({
    email: input.email,
    password_hash,
    full_name: input.full_name,
    role: input.role,
    phone: input.phone || null,
  });

  const tokens = await buildTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

const login = async (input) => {
  const email = (input.email || input.identifier || '').toLowerCase();
  const password = input.password;
  const { recordLoginFailure, recordLoginSuccess } = require('../../middlewares/rateLimit.middleware');

  const user = await repository.findUserByEmail(email);
  if (!user) {
    recordLoginFailure(email);
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('User account is disabled');
  }
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    recordLoginFailure(email);
    throw ApiError.unauthorized('Invalid email or password');
  }
  recordLoginSuccess(email);

  // BUG-002 - the flag used to be returned but never enforced. A password that
  // is known-shared or was set by an administrator must be rotated before the
  // session can be used for anything else. The access token is deliberately
  // short-lived and the client is told exactly what it must do.
  if (user.must_change_password) {
    const restricted = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      jti: crypto.randomUUID(),
      pwd_reset_required: true,
    });
    return {
      user: { ...sanitizeUser(user), permissions: [] },
      accessToken: restricted,
      refreshToken: null,
      must_change_password: true,
      message: 'Your password must be changed before you can continue.',
    };
  }

  const tokens = await buildTokens(user);
  await repository.updateUser(user, { last_login_at: new Date() });
  const permissions = await getUserPermissionsList(user.id);
  return { user: { ...sanitizeUser(user), permissions }, ...tokens };
};

const refresh = async ({ refresh_token }) => {
  let payload;
  try {
    payload = verifyRefreshToken(refresh_token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refresh_token);
  const stored = await repository.findActiveRefreshToken(tokenHash);
  if (!stored) {
    throw ApiError.unauthorized('Refresh token has been revoked or expired');
  }

  await repository.revokeRefreshToken(stored);

  const user = await repository.findUserById(payload.sub);
  if (!user || !user.is_active) {
    throw ApiError.unauthorized('User no longer valid');
  }

  const tokens = await buildTokens(user);
  return { user: sanitizeUser(user), ...tokens };
};

const logout = async ({ refresh_token }) => {
  const tokenHash = hashToken(refresh_token);
  const stored = await repository.findActiveRefreshToken(tokenHash);
  if (stored) await repository.revokeRefreshToken(stored);
  return { message: 'Logged out' };
};

const me = async (userId) => {
  const user = await repository.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return sanitizeUser(user);
};

const changePassword = async (userId, { current_password, new_password }) => {
  const user = await repository.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const ok = await comparePassword(current_password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Current password is incorrect');

  if (current_password === new_password) {
    throw ApiError.badRequest('New password must differ from the current password');
  }

  const password_hash = await hashPassword(new_password);
  await repository.updateUser(user, {
    password_hash,
    must_change_password: false,
    password_changed_at: new Date(),
  });
  await repository.revokeAllUserTokens(userId);
  return { message: 'Password changed' };
};

module.exports = { register, login, refresh, logout, me, changePassword };
