'use strict';

const { Op, Sequelize, UniqueConstraintError } = require('sequelize');

// Counts records created within a given calendar year. Kept for compatibility,
// but new code should prefer `nextSequenceForYear`, which is robust to
// soft-deletes and to gaps caused by failed inserts.
const countForYear = async (model, year) =>
  model.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
  });

// Derives the next sequence number for codes shaped `${prefix}-${year}-NNNNNN`
// by reading the largest existing suffix from the code column. This is still
// not strictly atomic (two concurrent transactions can read the same MAX), so
// the caller MUST wrap the resulting `model.create({ code, ... })` with
// `withCodeRetry` to recover from the unique-constraint race.
const nextSequenceForYear = async (model, codeColumn, prefix, year, options = {}) => {
  const like = `${prefix}-${year}-%`;
  const last = await model.findOne({
    attributes: [codeColumn],
    where: { [codeColumn]: { [Op.like]: like } },
    order: [[codeColumn, 'DESC']],
    paranoid: false,
    ...options,
  });
  if (!last) return 1;
  const value = last.get ? last.get(codeColumn) : last[codeColumn];
  const tail = String(value).split('-').pop();
  const num = parseInt(tail, 10);
  return Number.isFinite(num) ? num + 1 : 1;
};

// Retries an operation that failed for a reason which is transient by nature:
//
//   * a unique-constraint violation on a generated code (two writers derived the
//     same sequence number), and
//   * an InnoDB deadlock or lock-wait timeout.
//
// The second case was previously not retried, so it surfaced as HTTP 500. That is
// wrong: a deadlock is a normal outcome of concurrent transactions — InnoDB picks
// a victim and rolls it back precisely so the loser can try again, which is why
// the server's own message says "try restarting transaction". The rolled-back
// transaction leaves nothing behind, so re-running it is safe. Measured on a
// 50-concurrent-user run, POST /opd/bills failed 38 times out of 50 with
// ER_LOCK_DEADLOCK before this retry existed.
//
// Retrying is not a substitute for correct locking. The two structural causes
// found alongside it — a `SELECT ... FOR UPDATE` that joined the payments table,
// and count queries issued outside their transaction which starved the connection
// pool — were fixed at source, not papered over here.
const TRANSIENT_DB_CODES = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const TRANSIENT_DB_ERRNOS = new Set([1213, 1205]);

const isTransientConflict = (err) => {
  if (!err) return false;
  if (err instanceof UniqueConstraintError || err.name === 'SequelizeUniqueConstraintError') return true;
  const parent = err.parent || err.original || err;
  return TRANSIENT_DB_CODES.has(parent.code) || TRANSIENT_DB_ERRNOS.has(parent.errno);
};

// Backoff with jitter, so two transactions that just deadlocked do not retry in
// lockstep and deadlock again.
const backoff = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, Math.round((2 ** attempt) * 10 * (0.5 + Math.random()))));

const withCodeRetry = async (operation, { attempts = 8 } = {}) => {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      // Each attempt re-runs `operation`, which is expected to recompute the
      // sequence number, so a fresh code is tried after a collision.
      // eslint-disable-next-line no-await-in-loop
      return await operation(i);
    } catch (err) {
      if (!isTransientConflict(err) || i === attempts - 1) throw err;
      lastErr = err;
      // eslint-disable-next-line no-await-in-loop
      await backoff(i);
    }
  }
  throw lastErr;
};

module.exports = { countForYear, nextSequenceForYear, withCodeRetry, isTransientConflict };
