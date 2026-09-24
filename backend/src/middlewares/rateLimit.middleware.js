'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiRateLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  // Healthchecks fire frequently from infrastructure (load balancers, k8s
  // probes) and would otherwise burn through the per-IP quota.
  skip: (req) => req.path === '/health',
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
});

// BUG-023 - per-IP limiting alone was bypassable by rotating X-Forwarded-For
// (and trust proxy is now off by default). Throttling the ACCOUNT as well means a
// distributed guessing attack against one login still gets locked out.
const ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAX_FAILURES = 10;
const accountAttempts = new Map(); // key -> { failures, firstAt, lockedUntil }

const accountKey = (req) =>
  String(req.body?.email || req.body?.identifier || '').toLowerCase().trim();

const pruneAccountAttempts = (now) => {
  for (const [key, entry] of accountAttempts) {
    const expired = now - entry.firstAt > ACCOUNT_WINDOW_MS;
    const unlocked = !entry.lockedUntil || entry.lockedUntil < now;
    if (expired && unlocked) accountAttempts.delete(key);
  }
};

/** Rejects further attempts on an account that has failed too often. */
const accountThrottle = (req, res, next) => {
  const key = accountKey(req);
  if (!key) return next();
  const now = Date.now();
  pruneAccountAttempts(now);

  const entry = accountAttempts.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > now) {
    const seconds = Math.ceil((entry.lockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(seconds));
    return res.status(429).json({
      success: false,
      message: `Too many failed sign-in attempts for this account. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
    });
  }
  return next();
};

const recordLoginFailure = (identifier) => {
  const key = String(identifier || '').toLowerCase().trim();
  if (!key) return;
  const now = Date.now();
  const entry = accountAttempts.get(key) || { failures: 0, firstAt: now, lockedUntil: null };
  if (now - entry.firstAt > ACCOUNT_WINDOW_MS) {
    entry.failures = 0;
    entry.firstAt = now;
    entry.lockedUntil = null;
  }
  entry.failures += 1;
  if (entry.failures >= ACCOUNT_MAX_FAILURES) entry.lockedUntil = now + ACCOUNT_WINDOW_MS;
  accountAttempts.set(key, entry);
};

const recordLoginSuccess = (identifier) => {
  const key = String(identifier || '').toLowerCase().trim();
  if (key) accountAttempts.delete(key);
};

const resetAccountThrottle = () => accountAttempts.clear();

module.exports = {
  apiRateLimiter,
  authRateLimiter,
  accountThrottle,
  recordLoginFailure,
  recordLoginSuccess,
  resetAccountThrottle,
  ACCOUNT_MAX_FAILURES,
};
