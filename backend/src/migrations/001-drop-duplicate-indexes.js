'use strict';

// BUG-018 — `sequelize.sync({ alter: true })` re-added every model-declared
// unique index on each run. `doctors` reached 43 indexes against MySQL's hard
// limit of 64, so the next few runs would have failed with ER_TOO_MANY_KEYS
// and blocked all further schema change.
//
// Strategy: group indexes by their exact column list and keep exactly one per
// group, so uniqueness semantics and foreign-key index requirements are
// preserved. PRIMARY is never touched. Keeping one index per column set is
// what MySQL needs for the FKs that reference those columns.
//
// The canonical survivor is chosen deterministically: prefer a name without a
// numeric `_N` suffix (those are the copies Sequelize generated), then the
// shortest name, then alphabetical. This is idempotent — re-running finds no
// duplicate groups.

const SUFFIX_COPY = /_\d+$/;

const pickSurvivor = (names) =>
  [...names].sort((a, b) => {
    const aCopy = SUFFIX_COPY.test(a) ? 1 : 0;
    const bCopy = SUFFIX_COPY.test(b) ? 1 : 0;
    if (aCopy !== bCopy) return aCopy - bCopy;
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  })[0];

const collectDuplicates = async (sequelize) => {
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME AS t, INDEX_NAME AS i, NON_UNIQUE AS nu,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND INDEX_NAME <> 'PRIMARY'
      GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE`
  );

  // key = table | unique-flag | column-list  ->  [index names]
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.t}|${r.nu}|${r.cols}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r.i);
  }

  const drops = [];
  for (const [key, names] of groups) {
    if (names.length < 2) continue;
    const [table] = key.split('|');
    const keep = pickSurvivor(names);
    for (const name of names) {
      if (name !== keep) drops.push({ table, index: name, keep });
    }
  }
  return drops;
};

module.exports = {
  async up({ sequelize }) {
    const drops = await collectDuplicates(sequelize);
    if (drops.length === 0) return;

    const before = new Map();
    for (const { table } of drops) {
      if (before.has(table)) continue;
      const [[row]] = await sequelize.query(
        `SELECT COUNT(DISTINCT INDEX_NAME) AS n FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        { replacements: [table] }
      );
      before.set(table, Number(row.n));
    }

    for (const { table, index } of drops) {
      // Guarded individually: an index that a foreign key still requires will
      // refuse to drop, and that must not abort the whole migration.
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` DROP INDEX \`${index}\``);
      } catch (err) {
        if (!/needed in a foreign key constraint/i.test(err.message)) throw err;
      }
    }

    const summary = [];
    for (const [table, n] of before) {
      const [[row]] = await sequelize.query(
        `SELECT COUNT(DISTINCT INDEX_NAME) AS n FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        { replacements: [table] }
      );
      summary.push(`${table}: ${n} -> ${row.n}`);
    }
    // eslint-disable-next-line no-console
    console.log('  index cleanup: ' + summary.join(', '));
  },

  async down() {
    // Intentionally irreversible: the dropped indexes were exact duplicates
    // with generated names. Re-creating them would restore the defect.
    throw new Error('001-drop-duplicate-indexes is not reversible by design');
  },
};
