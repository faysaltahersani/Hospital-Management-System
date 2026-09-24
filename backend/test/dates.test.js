'use strict';

// BUG-017 regression tests. Asia/Dhaka is UTC+6 with no DST, so a local
// calendar day spans 18:00 (previous UTC day) to 17:59:59.999 UTC.

const assert = require('node:assert/strict');
const test = require('node:test');
const { Op } = require('sequelize');

const { startInstant, endInstant, calendarDate, zonedWallTimeToUtc } = require('../src/utils/timeRange');
const { dateTimeRange, dateOnlyRange } = require('../src/utils/dateUtils');

const TZ = 'Asia/Dhaka';

test('date-only string resolves to the local day boundaries in UTC', () => {
  assert.equal(startInstant('2026-08-01', TZ).toISOString(), '2026-07-31T18:00:00.000Z');
  assert.equal(endInstant('2026-08-01', TZ).toISOString(), '2026-08-01T17:59:59.999Z');
});

test('a Joi-converted Date (UTC midnight) is treated as that calendar day', () => {
  const joiValue = new Date('2026-08-01T00:00:00.000Z');
  assert.equal(startInstant(joiValue, TZ).toISOString(), '2026-07-31T18:00:00.000Z');
  assert.equal(endInstant(joiValue, TZ).toISOString(), '2026-08-01T17:59:59.999Z');
});

test('an explicit datetime is preserved exactly', () => {
  const iso = '2026-08-01T09:30:00.000Z';
  assert.equal(startInstant(iso, TZ).toISOString(), iso);
  assert.equal(endInstant(iso, TZ).toISOString(), iso);
});

test('the previous Invalid-Date path is gone', () => {
  // Reproduces the exact old expression: new Date(dateObject + 'T23:59:59.999Z')
  const legacy = new Date(new Date('2026-08-01T00:00:00.000Z') + 'T23:59:59.999Z');
  assert.ok(Number.isNaN(legacy.getTime()), 'the old code really did produce Invalid Date');
  assert.ok(!Number.isNaN(endInstant(new Date('2026-08-01T00:00:00.000Z'), TZ).getTime()));
});

test('same start and end date covers the whole day', () => {
  const range = dateTimeRange({ from: '2026-08-01', to: '2026-08-01' });
  assert.equal(range[Op.gte].toISOString(), '2026-07-31T18:00:00.000Z');
  assert.equal(range[Op.lte].toISOString(), '2026-08-01T17:59:59.999Z');
});

test('a record stored at the local-midnight boundary falls inside its own day', () => {
  // The dump stores admissions created on 1 Aug local as 2026-07-31 18:00:00.
  const stored = new Date('2026-07-31T18:00:00.000Z');
  const range = dateTimeRange({ from: '2026-08-01', to: '2026-08-01' });
  assert.ok(stored >= range[Op.gte], 'boundary record must not be excluded');
  assert.ok(stored <= range[Op.lte]);
  // And it must NOT be counted on 31 July.
  const july = dateTimeRange({ from: '2026-07-31', to: '2026-07-31' });
  assert.ok(stored > july[Op.lte], 'must not leak into the previous day');
});

test('a record at the last local second of the day is included', () => {
  const lastSecond = new Date('2026-08-01T17:59:59.000Z'); // 23:59:59 local
  const range = dateTimeRange({ from: '2026-08-01', to: '2026-08-01' });
  assert.ok(lastSecond <= range[Op.lte]);
});

test('from-only and to-only ranges build a single-sided bound', () => {
  const fromOnly = dateTimeRange({ from: '2026-08-01' });
  assert.ok(fromOnly[Op.gte]);
  assert.equal(fromOnly[Op.lte], undefined);

  const toOnly = dateTimeRange({ to: '2026-08-01' });
  assert.ok(toOnly[Op.lte]);
  assert.equal(toOnly[Op.gte], undefined);
});

test('no range yields null so no filter is applied', () => {
  assert.equal(dateTimeRange({}), null);
  assert.equal(dateOnlyRange({}), null);
  assert.equal(dateTimeRange({ from: '', to: null }), null);
});

test('invalid input is ignored rather than producing a poisoned bound', () => {
  assert.equal(dateTimeRange({ from: 'not-a-date' }), null);
  assert.equal(dateTimeRange({ to: 'garbage' }), null);
});

test('DATEONLY columns compare as plain calendar dates', () => {
  const range = dateOnlyRange({ from: '2026-08-01', to: '2026-08-31' });
  assert.equal(range[Op.gte], '2026-08-01');
  assert.equal(range[Op.lte], '2026-08-31');
});

test('DATEONLY conversion of a timestamp uses the local day', () => {
  // 2026-07-31T18:30:00Z is already 1 Aug in Dhaka.
  assert.equal(calendarDate('2026-07-31T18:30:00.000Z', TZ), '2026-08-01');
});

test('alternate parameter names are still honoured', () => {
  const a = dateTimeRange({ from_date: '2026-08-01', to_date: '2026-08-01' });
  assert.ok(a[Op.gte] && a[Op.lte]);
  const b = dateTimeRange({ start_date: '2026-08-01', end_date: '2026-08-02' });
  assert.ok(b[Op.gte] && b[Op.lte]);
});

test('month and year ranges span correctly', () => {
  const month = dateTimeRange({ from: '2026-02-01', to: '2026-02-28' });
  assert.equal(month[Op.gte].toISOString(), '2026-01-31T18:00:00.000Z');
  assert.equal(month[Op.lte].toISOString(), '2026-02-28T17:59:59.999Z');

  const year = dateTimeRange({ from: '2026-01-01', to: '2026-12-31' });
  assert.equal(year[Op.gte].toISOString(), '2025-12-31T18:00:00.000Z');
  assert.equal(year[Op.lte].toISOString(), '2026-12-31T17:59:59.999Z');
});

test('leap day is handled', () => {
  const d = dateTimeRange({ from: '2028-02-29', to: '2028-02-29' });
  assert.equal(d[Op.gte].toISOString(), '2028-02-28T18:00:00.000Z');
  assert.equal(d[Op.lte].toISOString(), '2028-02-29T17:59:59.999Z');
});

test('a DST-observing zone resolves without drift', () => {
  // New York: 2026-03-08 is the spring-forward date (EST -> EDT).
  const start = zonedWallTimeToUtc({ year: 2026, month: 3, day: 8, hour: 0 }, 'America/New_York');
  assert.equal(start.toISOString(), '2026-03-08T05:00:00.000Z');
  const end = zonedWallTimeToUtc(
    { year: 2026, month: 3, day: 8, hour: 23, minute: 59, second: 59, ms: 999 },
    'America/New_York'
  );
  assert.equal(end.toISOString(), '2026-03-09T03:59:59.999Z');
});
