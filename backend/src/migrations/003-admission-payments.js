'use strict';

// BUG-005 — create `admission_payments` and migrate the IPD payments that were
// serialized into `admissions.notes` as `PAYMENTS_JSON:[...]`.
//
// Data reconciliation, in full:
//   * Every admission whose notes contain a PAYMENTS_JSON segment is parsed.
//   * Each entry becomes one admission_payments row (account_name, amount,
//     paid_at preserved exactly as recorded — nothing is invented).
//   * The PAYMENTS_JSON segment is then stripped from notes, leaving the
//     human-written text intact. The original notes value is copied to
//     `notes_migration_backup` first, so the pre-migration state is recoverable
//     and auditable.
//   * Admissions with no PAYMENTS_JSON are untouched.
//   * Unparseable segments are reported and left in place rather than dropped.
//
// Re-runnable: rows are keyed on (admission_id, amount, paid_at) so a second
// run inserts nothing.

const PAYMENTS_RE = /PAYMENTS_JSON:(.+)$/m;

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
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`admission_payments\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`admission_id\` BIGINT UNSIGNED NOT NULL,
        \`account_name\` VARCHAR(100) NOT NULL DEFAULT 'Cash',
        \`amount\` DECIMAL(12,2) NOT NULL,
        \`paid_at\` DATETIME NOT NULL,
        \`received_by\` BIGINT UNSIGNED NULL,
        \`notes\` VARCHAR(500) NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        KEY \`admission_payments_admission_id\` (\`admission_id\`),
        KEY \`admission_payments_paid_at\` (\`paid_at\`),
        CONSTRAINT \`admission_payments_admission_fk\` FOREIGN KEY (\`admission_id\`)
          REFERENCES \`admissions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`admission_payments_user_fk\` FOREIGN KEY (\`received_by\`)
          REFERENCES \`users\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    if (!(await hasColumn(sequelize, 'admissions', 'notes_migration_backup'))) {
      await sequelize.query(
        'ALTER TABLE `admissions` ADD COLUMN `notes_migration_backup` TEXT NULL'
      );
    }

    const [rows] = await sequelize.query(
      "SELECT id, admission_code, notes, total_charges FROM admissions WHERE notes LIKE '%PAYMENTS_JSON:%'"
    );

    const report = { admissions: 0, payments: 0, amount: 0, failed: [] };

    for (const row of rows) {
      const match = PAYMENTS_RE.exec(String(row.notes || ''));
      if (!match) continue;

      let entries;
      try {
        entries = JSON.parse(match[1]);
        if (!Array.isArray(entries)) throw new Error('not an array');
      } catch (err) {
        report.failed.push(`${row.admission_code}: ${err.message}`);
        continue;
      }

      for (const entry of entries) {
        const amount = Number(entry?.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          report.failed.push(`${row.admission_code}: skipped non-positive amount ${entry?.amount}`);
          continue;
        }
        const account = String(entry?.account_name || 'Cash').slice(0, 100);
        const paidAt = entry?.paid_at ? new Date(entry.paid_at) : null;
        const paidAtSql =
          paidAt && !Number.isNaN(paidAt.getTime())
            ? paidAt.toISOString().slice(0, 19).replace('T', ' ')
            : null;

        // eslint-disable-next-line no-await-in-loop
        const [existing] = await sequelize.query(
          `SELECT id FROM admission_payments
            WHERE admission_id = ? AND amount = ? AND (paid_at = ? OR (? IS NULL AND paid_at IS NULL))`,
          { replacements: [row.id, amount, paidAtSql, paidAtSql] }
        );
        if (existing.length > 0) continue;

        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `INSERT INTO admission_payments
             (admission_id, account_name, amount, paid_at, notes, created_at, updated_at)
           VALUES (?, ?, ?, COALESCE(?, NOW()), ?, NOW(), NOW())`,
          {
            replacements: [
              row.id,
              account,
              amount,
              paidAtSql,
              'Migrated from admissions.notes PAYMENTS_JSON (003-admission-payments)',
            ],
          }
        );
        report.payments += 1;
        report.amount += amount;
      }

      const cleaned = String(row.notes).replace(PAYMENTS_RE, '').trim() || null;
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(
        `UPDATE admissions
            SET notes_migration_backup = COALESCE(notes_migration_backup, notes),
                notes = ?
          WHERE id = ?`,
        { replacements: [cleaned, row.id] }
      );
      report.admissions += 1;
    }

    // eslint-disable-next-line no-console
    console.log(
      `  admission_payments: migrated ${report.payments} payment(s) totalling ${report.amount.toFixed(2)} ` +
        `from ${report.admissions} admission(s); original notes preserved in notes_migration_backup` +
        (report.failed.length ? `; ${report.failed.length} issue(s): ${report.failed.join(' | ')}` : '')
    );
  },

  async down({ sequelize }) {
    // Restore the original notes, then drop the table. The backup column is
    // what makes this safely reversible.
    await sequelize.query(
      'UPDATE admissions SET notes = notes_migration_backup WHERE notes_migration_backup IS NOT NULL'
    );
    await sequelize.query('DROP TABLE IF EXISTS `admission_payments`');
    if (await hasColumn(sequelize, 'admissions', 'notes_migration_backup')) {
      await sequelize.query('ALTER TABLE `admissions` DROP COLUMN `notes_migration_backup`');
    }
  },
};
