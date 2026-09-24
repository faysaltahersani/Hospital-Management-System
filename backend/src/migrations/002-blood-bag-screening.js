'use strict';

// BUG-013 — `blood_bags` had no way to record infectious-disease screening, so
// "tested and safe to transfuse" could not be expressed and therefore could not
// be enforced before issue.
//
// Data decision for existing rows (deliberate, documented, non-fabricating):
//   * Bags already issued/expired/discarded  -> 'not_recorded'
//     History is preserved and no clinical claim is invented about them.
//   * Bags still available/reserved          -> 'pending'
//     These are issuable stock, so they fail closed until real screening is
//     recorded. This intentionally blocks issuing un-screened units rather than
//     assuming they passed.

const COLUMNS = {
  screening_status: {
    type: "ENUM('not_recorded','pending','passed','failed')",
    definition: "ENUM('not_recorded','pending','passed','failed') NOT NULL DEFAULT 'pending'",
  },
  screened_at: { definition: 'DATETIME NULL' },
  screened_by: { definition: 'BIGINT UNSIGNED NULL' },
  screening_notes: { definition: 'VARCHAR(500) NULL' },
};

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    for (const [name, spec] of Object.entries(COLUMNS)) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await hasColumn(sequelize, 'blood_bags', name))) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`blood_bags\` ADD COLUMN \`${name}\` ${spec.definition}`);
      }
    }

    const [[historical]] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM blood_bags WHERE status IN ('issued','expired','discarded')`
    );
    const [[issuable]] = await sequelize.query(
      `SELECT COUNT(*) AS n FROM blood_bags WHERE status IN ('available','reserved')`
    );

    await sequelize.query(
      `UPDATE blood_bags SET screening_status = 'not_recorded'
        WHERE status IN ('issued','expired','discarded')`
    );
    await sequelize.query(
      `UPDATE blood_bags SET screening_status = 'pending'
        WHERE status IN ('available','reserved')`
    );

    // eslint-disable-next-line no-console
    console.log(
      `  blood_bags screening: ${historical.n} historical bag(s) marked not_recorded, ` +
        `${issuable.n} issuable bag(s) marked pending (must be screened before issue)`
    );
  },

  async down({ sequelize }) {
    for (const name of Object.keys(COLUMNS)) {
      // eslint-disable-next-line no-await-in-loop
      if (await hasColumn(sequelize, 'blood_bags', name)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`blood_bags\` DROP COLUMN \`${name}\``);
      }
    }
  },
};
