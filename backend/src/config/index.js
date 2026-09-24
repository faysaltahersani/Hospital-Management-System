'use strict';

require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = process.env.NODE_ENV || 'development';

// BUG-003 — this guard used to be gated on `env === 'production'`, but NODE_ENV
// itself comes from .env. With no .env file the app fell back to
// 'development' and signed tokens with a hardcoded string, so anyone could
// forge an admin token. Secrets are now mandatory in EVERY environment: there
// is no code path that produces a usable token from a default value.
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PREFIXES = ['change-me', 'replace-with-', 'dev-only-', 'secret', 'changeme'];

const requireSecret = (name, value) => {
  const raw = (value || '').trim();
  if (!raw) {
    throw new Error(
      `${name} is not set. Generate one with:\n` +
        `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"\n` +
        'and add it to your .env file (see .env.example).'
    );
  }
  if (PLACEHOLDER_PREFIXES.some((p) => raw.toLowerCase().startsWith(p))) {
    throw new Error(`${name} still holds a placeholder value. Set a strong random secret.`);
  }
  if (raw.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters (got ${raw.length}).`);
  }
  return raw;
};

const config = {
  env,
  port: toInt(process.env.PORT, 5000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  // BUG-S10 — default to a closed origin rather than reflecting any caller.
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // BUG-023 — `trust proxy` was hardcoded to 1, so a client-supplied
  // X-Forwarded-For became req.ip and defeated per-IP rate limiting. Only
  // enable this when a trusted reverse proxy actually fronts the API.
  trustProxy: toBool(process.env.TRUST_PROXY, false),
  // BUG-015 — restore/import payloads exceed the old hardcoded 1mb ceiling.
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '1mb',
  // BUG-017 — all date-range filtering resolves against this zone instead of
  // the server's local time or UTC.
  timezone: process.env.HOSPITAL_TIMEZONE || 'Asia/Dhaka',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'hospital_management',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: toBool(process.env.DB_LOGGING, false),
    pool: {
      max: toInt(process.env.DB_POOL_MAX, 10),
      min: toInt(process.env.DB_POOL_MIN, 0),
      idle: toInt(process.env.DB_POOL_IDLE, 10000),
    },
  },

  jwt: {
    accessSecret: requireSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '8h',
    refreshSecret: requireSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'hospital-management',
    audience: process.env.JWT_AUDIENCE || 'hospital-management-client',
  },

  security: {
    bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
    rateLimit: {
      windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toInt(process.env.RATE_LIMIT_MAX, 300),
    },
  },
};

// Reusing one secret for both token types lets an access token be replayed as
// a refresh token (and vice versa), collapsing the two-token design.
if (config.jwt.accessSecret === config.jwt.refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
}

module.exports = config;
