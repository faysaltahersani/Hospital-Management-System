'use strict';

const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const { runWithTenant, currentTenant } = require('../utils/tenantContext');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return null;
};

const authenticate = asyncHandler(async (req, _res, next) => {
  // Idempotent: module routers call this too, and permission enforcement needs
  // req.user populated at the mount point. Re-verifying would double the
  // per-request user lookup for no benefit.
  if (req.user) return currentTenant() ? next() : runWithTenant(req.user, next);

  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Authentication token missing');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }
  if (!user.is_active) {
    throw ApiError.forbidden('User account is disabled');
  }

  // BUG-002 - a token minted for a user who must rotate their password may only
  // be used to rotate it. Everything else is refused, so the flag is a real gate
  // rather than a hint the client could ignore.
  const isPasswordChangeRoute =
    req.method === 'POST' && /\/auth\/change-password$/.test(req.originalUrl.split('?')[0]);
  if ((payload.pwd_reset_required || user.must_change_password) && !isPasswordChangeRoute) {
    throw new ApiError(
      403,
      'Your password must be changed before you can use the system.',
      null,
      { isOperational: true }
    );
  }

  req.user = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    organization_id: user.organization_id,
    hospital_id: user.hospital_id,
    branch_id: user.branch_id,
    department_id: user.department_id,
    must_change_password: Boolean(user.must_change_password),
  };
  req.token = token;
  return runWithTenant(req.user, next);
});

module.exports = { authenticate };
