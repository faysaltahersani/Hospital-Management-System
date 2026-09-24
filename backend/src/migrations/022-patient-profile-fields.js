'use strict';

// Patient Entry exposes these optional profile fields in the UI. Persist them
// so a record created from the screen is not rejected or silently truncated.
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
    const additions = [
      ['marital_status', 'VARCHAR(30) NULL AFTER `blood_group`'],
      ['id_type', 'VARCHAR(40) NULL AFTER `emergency_contact_phone`'],
      ['id_number', 'VARCHAR(100) NULL AFTER `id_type`'],
      ['remarks', 'TEXT NULL AFTER `address`'],
    ];

    for (const [column, definition] of additions) {
      if (!(await hasColumn(sequelize, 'patients', column))) {
        // Column names and definitions are constants declared above.
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`patients\` ADD COLUMN \`${column}\` ${definition}`);
      }
    }
  },

  async down({ sequelize }) {
    for (const column of ['remarks', 'id_number', 'id_type', 'marital_status']) {
      if (await hasColumn(sequelize, 'patients', column)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`patients\` DROP COLUMN \`${column}\``);
      }
    }
  },
};
