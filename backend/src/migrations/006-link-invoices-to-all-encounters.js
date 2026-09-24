'use strict';

// BUG-042 — laboratory, radiology, blood issue and ambulance revenue never
// reached invoices/payments. Each stream now gets an explicit, referentially
// enforced link column, matching the opd_visit_id / admission_id pattern added
// in migration 005.
//
// No invoices are created for historical rows. There is no payment evidence for
// them, so inventing invoices (or marking them paid) would fabricate financial
// history. They stay unlinked and are reported as unbilled, which is what the
// data supports. The counts are printed so the backlog is explicit.

const LINKS = [
  { column: 'lab_order_id', table: 'lab_orders', fk: 'invoices_lab_order_fk', key: 'invoices_lab_order_id' },
  { column: 'radiology_order_id', table: 'radiology_orders', fk: 'invoices_radiology_order_fk', key: 'invoices_radiology_order_id' },
  { column: 'blood_issue_id', table: 'blood_issues', fk: 'invoices_blood_issue_fk', key: 'invoices_blood_issue_id' },
  { column: 'ambulance_trip_id', table: 'ambulance_trips', fk: 'invoices_ambulance_trip_fk', key: 'invoices_ambulance_trip_id' },
];

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

const hasIndex = async (sequelize, table, index) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [table, index] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    for (const link of LINKS) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await hasColumn(sequelize, 'invoices', link.column))) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` ADD COLUMN \`${link.column}\` BIGINT UNSIGNED NULL`);
      }
      // eslint-disable-next-line no-await-in-loop
      if (!(await hasIndex(sequelize, 'invoices', link.key))) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` ADD KEY \`${link.key}\` (\`${link.column}\`)`);
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `ALTER TABLE \`invoices\` ADD CONSTRAINT \`${link.fk}\` FOREIGN KEY (\`${link.column}\`) ` +
            `REFERENCES \`${link.table}\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`
        );
      }
    }

    const backlog = [];
    for (const link of LINKS) {
      // eslint-disable-next-line no-await-in-loop
      const [[row]] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM \`${link.table}\` t
          WHERE t.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.\`${link.column}\` = t.id)`
      );
      backlog.push(`${link.table}: ${row.n}`);
    }

    // eslint-disable-next-line no-console
    console.log(
      `  invoice links added for lab/radiology/blood/ambulance. ` +
        `Historical rows with no invoice (reported as UNBILLED, not fabricated): ${backlog.join(', ')}`
    );
  },

  async down({ sequelize }) {
    for (const link of LINKS) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` DROP FOREIGN KEY \`${link.fk}\``);
      } catch (_) { /* absent */ }
      try {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` DROP INDEX \`${link.key}\``);
      } catch (_) { /* absent */ }
      // eslint-disable-next-line no-await-in-loop
      if (await hasColumn(sequelize, 'invoices', link.column)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` DROP COLUMN \`${link.column}\``);
      }
    }
  },
};
