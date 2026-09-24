'use strict';

// BUG-017 — deterministic date-range resolution in the hospital's timezone.
//
// Two separate defects lived in the old code:
//
//  1. Validated endpoints declared `from`/`to` as `Joi.date().iso()`, so the
//     middleware replaced the query string with a Date object. Downstream,
//     `reports.repository` did `new Date(to + 'T23:59:59.999Z')` — string
//     concatenation on a Date — which produced an Invalid Date, and MySQL then
//     matched no rows at all. Supplying a `to` silently emptied the report.
//
//  2. Unvalidated endpoints received the raw string and built boundaries with
//     the *server's* local time or a bare UTC midnight. Because DATETIME
//     columns store UTC while the hospital operates at UTC+6, every range was
//     shifted six hours: transactions between 00:00 and 06:00 local were filed
//     under the previous day. The dump shows this directly — admissions created
//     on 1 Aug local are stored as `2026-07-31 18:00:00`.
//
// The fix: interpret a date-only input as a full calendar day *in the hospital
// timezone*, then convert both edges to explicit UTC instants for comparison
// against the UTC-stored DATETIME columns. Date-only (DATEONLY) columns are
// compared as plain `YYYY-MM-DD` strings, which carry no timezone at all.

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Milliseconds to add to a UTC instant to obtain wall-clock time in `timeZone`. */
const zoneOffsetMs = (date, timeZone) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === '24' ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  // `formatToParts` has no millisecond field, so `asUtc` is truncated to whole
  // seconds. Strip the milliseconds from the reference instant too, otherwise
  // the difference absorbs them and the offset comes out ~1s short — which
  // shifted end-of-day boundaries past midnight.
  const wholeSeconds = date.getTime() - date.getUTCMilliseconds();
  return asUtc - wholeSeconds;
};

/** The UTC instant at which the given wall-clock time occurs in `timeZone`. */
const zonedWallTimeToUtc = ({ year, month, day, hour = 0, minute = 0, second = 0, ms = 0 }, timeZone) => {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const firstOffset = zoneOffsetMs(new Date(naive), timeZone);
  let utc = naive - firstOffset;
  // One refinement handles DST transitions, where the offset that applies
  // depends on the instant we are still resolving. Asia/Dhaka has no DST, but
  // this keeps the helper correct for zones that do.
  const secondOffset = zoneOffsetMs(new Date(utc), timeZone);
  if (secondOffset !== firstOffset) utc = naive - secondOffset;
  return new Date(utc);
};

/**
 * Normalises any accepted input into `{ dateOnly, y, m, d, instant }`.
 * Accepts `YYYY-MM-DD`, a full ISO datetime string, or a Date instance.
 * Returns null when the value is absent or unparseable.
 */
const describe = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_ONLY_RE.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return { dateOnly: true, y, m, d };
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return { dateOnly: false, instant: parsed };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // A Date whose UTC time-of-day is exactly midnight almost always came from
    // Joi converting a `YYYY-MM-DD` query parameter. Treat it as the calendar
    // day it names so that `to=2026-01-31` still covers the whole 31st.
    const isUtcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    if (isUtcMidnight) {
      return {
        dateOnly: true,
        y: value.getUTCFullYear(),
        m: value.getUTCMonth() + 1,
        d: value.getUTCDate(),
      };
    }
    return { dateOnly: false, instant: value };
  }

  return null;
};

/** Inclusive lower bound as a UTC instant. */
const startInstant = (value, timeZone) => {
  const info = describe(value);
  if (!info) return null;
  if (!info.dateOnly) return info.instant;
  return zonedWallTimeToUtc({ year: info.y, month: info.m, day: info.d, hour: 0, minute: 0, second: 0, ms: 0 }, timeZone);
};

/** Inclusive upper bound as a UTC instant (end of the named day, when date-only). */
const endInstant = (value, timeZone) => {
  const info = describe(value);
  if (!info) return null;
  if (!info.dateOnly) return info.instant;
  return zonedWallTimeToUtc(
    { year: info.y, month: info.m, day: info.d, hour: 23, minute: 59, second: 59, ms: 999 },
    timeZone
  );
};

/** `YYYY-MM-DD` for comparison against DATEONLY columns (no timezone applied). */
const calendarDate = (value, timeZone) => {
  const info = describe(value);
  if (!info) return null;
  if (info.dateOnly) {
    return `${String(info.y).padStart(4, '0')}-${String(info.m).padStart(2, '0')}-${String(info.d).padStart(2, '0')}`;
  }
  // A full timestamp is reduced to the calendar day it falls on *locally*.
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(info.instant);
};

module.exports = { startInstant, endInstant, calendarDate, zonedWallTimeToUtc, zoneOffsetMs, DATE_ONLY_RE };
