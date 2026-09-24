'use strict';

const { Op } = require('sequelize');
const config = require('../config');
const { startInstant, endInstant, calendarDate } = require('./timeRange');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

const currentYear = () => new Date().getFullYear();

const getFromVal = (input) => {
  if (!input) return null;
  if (typeof input === 'string' || input instanceof Date) return input;
  return input.from || input.from_date || input.fromDate || input.start_date || input.startDate || input.start || input.date || null;
};

const getToVal = (input) => {
  if (!input) return null;
  if (typeof input === 'string' || input instanceof Date) return input;
  return input.to || input.to_date || input.toDate || input.end_date || input.endDate || input.end || input.date || null;
};

// BUG-017 — both helpers now resolve boundaries through utils/timeRange, which
// interprets a date-only value as a full calendar day in the hospital timezone
// and converts it to explicit UTC instants. Previously this file applied
// server-local time to string input and, when Joi had already converted the
// value to a Date, skipped the date-only branch entirely.
const dateTimeRange = (input = {}) => {
  const fromVal = getFromVal(input);
  const toVal = getToVal(input);
  if (!fromVal && !toVal) return null;

  const tz = config.timezone;
  const range = {};
  const start = startInstant(fromVal, tz);
  const end = endInstant(toVal, tz);
  if (start) range[Op.gte] = start;
  if (end) range[Op.lte] = end;

  return Object.getOwnPropertySymbols(range).length > 0 ? range : null;
};

// DATEONLY columns carry no timezone, so they are compared as YYYY-MM-DD.
const dateOnlyRange = (input = {}) => {
  const fromVal = getFromVal(input);
  const toVal = getToVal(input);
  if (!fromVal && !toVal) return null;

  const tz = config.timezone;
  const range = {};
  const from = calendarDate(fromVal, tz);
  const to = calendarDate(toVal, tz);
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;

  return Object.getOwnPropertySymbols(range).length > 0 ? range : null;
};

module.exports = {
  startOfDay,
  endOfDay,
  isValidDate,
  currentYear,
  dateTimeRange,
  dateOnlyRange,
};
