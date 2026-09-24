'use strict';

// BUG-002 / BUG-040 — support for credential hygiene.
//
// `must_change_password` lets the API force a rotation at next login instead of
// relying on a shared default password. Accounts that currently share a
// password hash are flagged here, which is a deterministic, evidence-based
// repair: identical bcrypt hashes across users can only mean one hash was
// generated once and copied, so those credentials are known-compromised.
//
// Passwords are NOT changed by this migration — doing so silently would lock
// staff out with no way to tell them. The flag makes the state explicit and
// enforceable, and the report lists exactly which accounts are affected.

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
    if (!(await hasColumn(sequelize, 'users', 'must_change_password'))) {
      await sequelize.query(
        'ALTER TABLE `users` ADD COLUMN `must_change_password` TINYINT(1) NOT NULL DEFAULT 0'
      );
    }
    if (!(await hasColumn(sequelize, 'users', 'password_changed_at'))) {
      await sequelize.query('ALTER TABLE `users` ADD COLUMN `password_changed_at` DATETIME NULL');
    }

    // Flag every account whose password hash is shared with another account.
    const [shared] = await sequelize.query(
      `SELECT password_hash, COUNT(*) AS n, GROUP_CONCAT(email ORDER BY id) AS emails
         FROM users
        WHERE deleted_at IS NULL
        GROUP BY password_hash
       HAVING COUNT(*) > 1`
    );

    let flagged = 0;
    for (const group of shared) {
      // eslint-disable-next-line no-await-in-loop
      const [result] = await sequelize.query(
        'UPDATE users SET must_change_password = 1 WHERE password_hash = ? AND deleted_at IS NULL',
        { replacements: [group.password_hash] }
      );
      flagged += Number(group.n);
    }

    // eslint-disable-next-line no-console
    console.log(
      `  password policy: ${shared.length} shared-hash group(s) found; ` +
        `${flagged} account(s) flagged must_change_password. ` +
        (shared.length
          ? `Groups: ${shared.map((g) => `${g.n} accounts`).join(', ')}. Passwords unchanged — rotate via user management.`
          : 'No shared credentials.')
    );
  },

  async down({ sequelize }) {
    for (const col of ['must_change_password', 'password_changed_at']) {
      // eslint-disable-next-line no-await-in-loop
      if (await hasColumn(sequelize, 'users', col)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`users\` DROP COLUMN \`${col}\``);
      }
    }
  },
};
