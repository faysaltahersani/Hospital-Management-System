'use strict';

// Atomic document-number allocation, backed by the `code_sequences` table
// (migration 015).
//
// The read-then-write patterns this replaces (`COUNT(*) + 1`, then
// `MAX(suffix) + 1`) let concurrent writers compute the same number, so all but
// one lost the unique index and eventually exhausted their retries. Allocation
// here is a single statement, so two callers can never receive the same value:
// MySQL/MariaDB applies the row update atomically and `LAST_INSERT_ID(expr)`
// hands back the value this session claimed.
//
// The row lock is held until the caller's transaction commits, so writers
// allocating the same counter are serialised. That is the intended trade: brief
// serialisation on one small row instead of a retry storm and lost requests.
// Allocate as late as possible in a transaction to keep that window short.
//
// Numbers may be skipped when a transaction rolls back. That is deliberate — the
// alternative (reusing a number) risks issuing two documents with one code, and a
// gap in an invoice sequence is auditable while a duplicate is not.

const sequelize = require('../config/database');

/**
 * Claims the next number for `name` and returns it.
 *
 * @param {string} name    counter key, e.g. `invoice:2026`
 * @param {object} options `{ transaction }` — pass the caller's transaction so the
 *                         allocation runs on the connection it already holds.
 * @returns {Promise<number>} the claimed value, unique across callers
 */
const claimOn = async (name, transaction) => {
  // Insert path claims 1 and stores 2; update path claims the stored value and
  // stores value + 1. LAST_INSERT_ID(expr) both records and returns the claim.
  await sequelize.query(
    `INSERT INTO code_sequences (name, next_value)
          VALUES (:name, LAST_INSERT_ID(1) + 1)
       ON DUPLICATE KEY UPDATE next_value = LAST_INSERT_ID(next_value) + 1`,
    { replacements: { name }, transaction }
  );

  const [rows] = await sequelize.query('SELECT LAST_INSERT_ID() AS claimed', { transaction });
  const claimed = Number(rows?.[0]?.claimed);
  if (!Number.isFinite(claimed) || claimed < 1) {
    throw new Error(`Could not allocate a sequence number for "${name}"`);
  }
  return claimed;
};

const allocate = async (name, options = {}) => {
  const { transaction } = options;

  // LAST_INSERT_ID() is per-connection session state, so the INSERT and the read
  // of the claim must run on the SAME connection. With a transaction that is
  // guaranteed. Without one, Sequelize is free to take a different connection
  // from the pool for the second statement, which reads a value this session never
  // set — observed as "Could not allocate a sequence number" on 1 of 10 concurrent
  // appointment bookings. Callers with no transaction get one for the two
  // statements; it commits immediately, so the number is claimed even if the
  // caller's own work later fails.
  if (transaction) return claimOn(name, transaction);
  return sequelize.transaction(async (t) => claimOn(name, t));
};

/** Convenience wrapper for the per-year counters the code formats imply. */
const allocateForYear = (name, year, options = {}) => allocate(`${name}:${year}`, options);

module.exports = { allocate, allocateForYear };
