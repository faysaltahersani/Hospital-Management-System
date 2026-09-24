'use strict';

// BUG-054 — monetary arithmetic must not depend on binary floating point.
//
// The database stores money as DECIMAL(12,2), but every service did its sums in
// JavaScript `Number`, where 0.1 + 0.2 === 0.30000000000000004 and
// 1000 * 1.05 === 1050.0000000000001. Consequences that actually mattered:
//   * a final payment could be rejected as an overpayment because
//     paid + amount came out a fraction above total
//   * a discount/tax chain could leave total !== subtotal - discount + tax by a
//     cent, which the DB integrity check flags as an invoice math error
//   * summed report columns drifted from the DECIMAL values they came from
//
// Contract — deliberately uniform, because mixing scales is what makes money
// helpers dangerous:
//   * EVERY exported function takes money in MAJOR units (what the DECIMAL
//     column holds: 1234.56, "1234.56", or null).
//   * Arithmetic functions RETURN major units, already rounded to 2dp and safe
//     to write straight back to DECIMAL(12,2).
//   * All intermediate maths happens on integer minor units (paisa/cents).
//   * `toMinor`/`toMajor` are exposed only for tests and for callers that
//     genuinely need the integer form.
//
// The stored column type is unchanged, so historical rows read and write exactly
// as before. Only the intermediate arithmetic changed.

const SCALE = 100; // 2 decimal places

/**
 * Parses a major-unit money value into integer minor units.
 * Strings are parsed digit-by-digit so a DECIMAL like "1234567890.05" never
 * passes through a float. Returns 0 for null/undefined/empty/unparseable.
 */
const toMinor = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    // Round half away from zero at the cent, matching DECIMAL(12,2) storage.
    return Math.sign(value) * Math.round(Math.abs(value) * SCALE);
  }

  const str = String(value).trim();
  if (str === '') return 0;

  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(str);
  if (!match) {
    const parsed = Number(str);
    return Number.isFinite(parsed) ? Math.sign(parsed) * Math.round(Math.abs(parsed) * SCALE) : 0;
  }

  const [, sign, whole = '0', frac = ''] = match;
  const cents = `${frac}00`.slice(0, 2);
  const thirdDigit = frac.length > 2 ? Number(frac[2]) : 0;
  let minor = Number(whole || '0') * SCALE + Number(cents || '0');
  if (thirdDigit >= 5) minor += 1; // round half up on the discarded digits
  return sign === '-' ? -minor : minor;
};

/** Converts integer minor units to a 2-dp major-unit number. */
const toMajor = (minor) => Number((Math.trunc(minor) / SCALE).toFixed(2));

/* ── arithmetic: major in, major out ─────────────────────────────────────── */

/** Exact sum of any number of major-unit values. */
const add = (...values) => toMajor(values.reduce((sum, v) => sum + toMinor(v), 0));

/** a - b. */
const sub = (a, b) => toMajor(toMinor(a) - toMinor(b));

/** amount x quantity, where quantity may be fractional (e.g. 2.5 units). */
const mulQty = (amount, quantity) => {
  const qtyMinor = toMinor(quantity);
  const product = toMinor(amount) * qtyMinor; // scaled by SCALE^2
  return toMajor(Math.round(product / SCALE));
};

/** `percent` % of `amount`, rounded half-up to the cent. */
const percentOf = (amount, percent) => {
  const product = toMinor(amount) * toMinor(percent); // scaled by SCALE^2
  return toMajor(Math.round(product / (SCALE * 100)));
};

/** Never-negative subtraction, for balances that must floor at zero. */
const subFloor = (a, b) => {
  const diff = toMinor(a) - toMinor(b);
  return toMajor(diff > 0 ? diff : 0);
};

/* ── comparisons: exact, no epsilon required ─────────────────────────────── */

const gt = (a, b) => toMinor(a) > toMinor(b);
const gte = (a, b) => toMinor(a) >= toMinor(b);
const lt = (a, b) => toMinor(a) < toMinor(b);
const lte = (a, b) => toMinor(a) <= toMinor(b);
const eq = (a, b) => toMinor(a) === toMinor(b);
const isZero = (a) => toMinor(a) === 0;
const isNegative = (a) => toMinor(a) < 0;
const isPositive = (a) => toMinor(a) > 0;

/** Formats for display/printing without float artefacts. */
const format = (value) => (toMinor(value) / SCALE).toFixed(2);

module.exports = {
  SCALE,
  toMinor,
  toMajor,
  add,
  sub,
  subFloor,
  mulQty,
  percentOf,
  gt,
  gte,
  lt,
  lte,
  eq,
  isZero,
  isNegative,
  isPositive,
  format,
};
