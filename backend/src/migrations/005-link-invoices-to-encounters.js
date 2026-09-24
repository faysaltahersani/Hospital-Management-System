'use strict';

// BUG-004 / BUG-042 — give invoices an explicit link to the clinical encounter
// that generated them, so OPD and IPD billing can become real invoice/payment
// records instead of fabricated figures.
//
// Also cleans up the `[PayMethod: ...]` prefix that OPD billing wrote into the
// clinical `advice` column. Once payments are real rows the method belongs on
// the Payment record; the original advice text is preserved in
// `advice_migration_backup` so nothing is lost and the change is auditable.
//
// Deliberately NOT done here: inventing invoices for the 11 historical OPD
// visits. There is no payment evidence for them anywhere in the database, so
// creating invoices (or marking them paid) would fabricate financial history.
// They remain unlinked, and the service layer now reports them as unbilled
// rather than as paid in full — which is what the data actually supports.

const PAYMETHOD_RE = /\[PayMethod:\s*([^\]]+)\]\s*/;

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
    if (!(await hasColumn(sequelize, 'invoices', 'opd_visit_id'))) {
      await sequelize.query('ALTER TABLE `invoices` ADD COLUMN `opd_visit_id` BIGINT UNSIGNED NULL');
    }
    if (!(await hasColumn(sequelize, 'invoices', 'admission_id'))) {
      await sequelize.query('ALTER TABLE `invoices` ADD COLUMN `admission_id` BIGINT UNSIGNED NULL');
    }
    if (!(await hasIndex(sequelize, 'invoices', 'invoices_opd_visit_id'))) {
      await sequelize.query('ALTER TABLE `invoices` ADD KEY `invoices_opd_visit_id` (`opd_visit_id`)');
      await sequelize.query(
        'ALTER TABLE `invoices` ADD CONSTRAINT `invoices_opd_visit_fk` ' +
          'FOREIGN KEY (`opd_visit_id`) REFERENCES `opd_visits` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
      );
    }
    if (!(await hasIndex(sequelize, 'invoices', 'invoices_admission_id'))) {
      await sequelize.query('ALTER TABLE `invoices` ADD KEY `invoices_admission_id` (`admission_id`)');
      await sequelize.query(
        'ALTER TABLE `invoices` ADD CONSTRAINT `invoices_admission_fk` ' +
          'FOREIGN KEY (`admission_id`) REFERENCES `admissions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE'
      );
    }

    // Reconstruct the link for any invoice line that already points at an OPD
    // visit through the generic reference_id column.
    const [linked] = await sequelize.query(
      `UPDATE invoices i
         JOIN invoice_items it ON it.invoice_id = i.id AND it.item_type = 'consultation'
         JOIN opd_visits v ON v.id = it.reference_id
          SET i.opd_visit_id = v.id
        WHERE i.opd_visit_id IS NULL`
    );

    // Clean the [PayMethod: ...] marker out of the clinical advice field.
    if (!(await hasColumn(sequelize, 'opd_visits', 'advice_migration_backup'))) {
      await sequelize.query('ALTER TABLE `opd_visits` ADD COLUMN `advice_migration_backup` TEXT NULL');
    }
    const [visits] = await sequelize.query(
      "SELECT id, visit_code, advice FROM opd_visits WHERE advice LIKE '%[PayMethod:%'"
    );
    let cleaned = 0;
    const methods = {};
    for (const v of visits) {
      const match = PAYMETHOD_RE.exec(String(v.advice || ''));
      const method = match ? match[1].trim() : null;
      if (method) methods[method] = (methods[method] || 0) + 1;
      const next = String(v.advice).replace(PAYMETHOD_RE, '').trim() || null;
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(
        `UPDATE opd_visits
            SET advice_migration_backup = COALESCE(advice_migration_backup, advice),
                advice = ?
          WHERE id = ?`,
        { replacements: [next, v.id] }
      );
      cleaned += 1;
    }

    const [[unbilled]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM opd_visits WHERE deleted_at IS NULL AND id NOT IN (SELECT COALESCE(opd_visit_id,0) FROM invoices)'
    );

    // eslint-disable-next-line no-console
    console.log(
      `  invoice<->encounter link added. Back-linked ${linked?.changedRows ?? 0} existing invoice(s) via consultation reference_id. ` +
        `Cleaned [PayMethod:] from ${cleaned} OPD visit(s)` +
        (Object.keys(methods).length ? ` (methods seen: ${Object.entries(methods).map(([m, n]) => `${m} x${n}`).join(', ')})` : '') +
        `; original advice preserved in advice_migration_backup. ` +
        `${unbilled.n} historical OPD visit(s) have no invoice and are now reported as UNBILLED (previously shown as paid in full).`
    );
  },

  async down({ sequelize }) {
    await sequelize.query(
      'UPDATE opd_visits SET advice = advice_migration_backup WHERE advice_migration_backup IS NOT NULL'
    );
    if (await hasColumn(sequelize, 'opd_visits', 'advice_migration_backup')) {
      await sequelize.query('ALTER TABLE `opd_visits` DROP COLUMN `advice_migration_backup`');
    }
    for (const [fk, key, col] of [
      ['invoices_opd_visit_fk', 'invoices_opd_visit_id', 'opd_visit_id'],
      ['invoices_admission_fk', 'invoices_admission_id', 'admission_id'],
    ]) {
      try {
        await sequelize.query(`ALTER TABLE \`invoices\` DROP FOREIGN KEY \`${fk}\``);
      } catch (_) { /* already absent */ }
      try {
        await sequelize.query(`ALTER TABLE \`invoices\` DROP INDEX \`${key}\``);
      } catch (_) { /* already absent */ }
      // eslint-disable-next-line no-await-in-loop
      if (await hasColumn(sequelize, 'invoices', col)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`invoices\` DROP COLUMN \`${col}\``);
      }
    }
  },
};
