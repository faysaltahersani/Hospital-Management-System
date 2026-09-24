'use strict';

// Atomic code allocation.
//
// Every module derived its next document number by reading the existing rows —
// first `COUNT(*) + 1`, later `MAX(code suffix) + 1` — and then inserting. Both
// are read-then-write races, so concurrent writers compute the same number and
// all but one lose the unique index. `withCodeRetry` masked it at low
// concurrency and stopped coping at high concurrency: a 50-simultaneous-user run
// of POST /opd/bills (which allocates three codes in one transaction) recorded
// only 18 of 50 visits, the rest exhausting their retries with HTTP 409 or dying
// on an InnoDB deadlock over the unique index.
//
// `COUNT(*) + 1` was worse than merely racy — it was deterministically broken
// whenever the row count and the issued codes disagreed. With 11 invoices present
// and INV-2026-000012 already issued, every retry recomputed exactly that code, so
// the request could never succeed.
//
// This table replaces the read with a single atomic statement (see
// utils/codeSequence.js). Existing counters are seeded from the codes already
// issued, so numbering continues rather than restarting.

const TABLE = 'code_sequences';

// prefix -> the table and column holding codes shaped `PREFIX-YYYY-NNNNNN`
const SOURCES = [
  { name: 'invoice', prefix: 'INV', table: 'invoices', column: 'invoice_code' },
  { name: 'payment', prefix: 'PAY', table: 'payments', column: 'payment_code' },
  { name: 'opd_visit', prefix: 'OPD', table: 'opd_visits', column: 'visit_code' },
];

const tableExists = async (sequelize, name) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [name] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) {
      await sequelize.query(
        `CREATE TABLE \`${TABLE}\` (
           \`name\` VARCHAR(64) NOT NULL,
           \`next_value\` BIGINT UNSIGNED NOT NULL DEFAULT 1,
           \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
           PRIMARY KEY (\`name\`)
         ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      // eslint-disable-next-line no-console
      console.log(`  created ${TABLE}`);
    }

    let seeded = 0;
    for (const src of SOURCES) {
      if (!(await tableExists(sequelize, src.table))) continue;
      // Highest suffix already issued, per year, so each year's counter continues.
      const [rows] = await sequelize.query(
        `SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(\`${src.column}\`, '-', 2), '-', -1) AS yr,
                MAX(CAST(SUBSTRING_INDEX(\`${src.column}\`, '-', -1) AS UNSIGNED)) AS max_seq
           FROM \`${src.table}\`
          WHERE \`${src.column}\` LIKE '${src.prefix}-____-%'
          GROUP BY yr`
      );
      for (const row of rows) {
        const year = String(row.yr);
        if (!/^\d{4}$/.test(year)) continue;
        const next = Number(row.max_seq || 0) + 1;
        await sequelize.query(
          `INSERT INTO \`${TABLE}\` (name, next_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE next_value = GREATEST(next_value, VALUES(next_value))`,
          { replacements: [`${src.name}:${year}`, next] }
        );
        seeded += 1;
        // eslint-disable-next-line no-console
        console.log(`  seeded ${src.name}:${year} -> next ${next} (highest issued ${row.max_seq})`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`  ${seeded} counter(s) seeded from codes already issued`);
  },

  async down({ sequelize }) {
    if (await tableExists(sequelize, TABLE)) {
      await sequelize.query(`DROP TABLE \`${TABLE}\``);
      // eslint-disable-next-line no-console
      console.log(`  dropped ${TABLE}`);
    }
  },
};
