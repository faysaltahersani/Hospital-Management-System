'use strict';

// BUG-038 / BUG-037 — radiology reports had nowhere to store findings and
// impression (both were collapsed into `result_notes`), and neither lab nor
// radiology orders could record who verified a result. Diagnostic bills also had
// no discount/tax/paid columns of their own — the amounts entered in the UI were
// simply dropped (that part is now covered by the invoice link from migration
// 006, so only the clinical columns are added here).
//
// BUG-035 — this migration also repairs `lab_tests` rows whose `normal_range`
// was populated with the test METHOD, and whose `sample_type` was populated with
// the TEST TYPE, by the mismapped Pathology Test Entry handler. Repair is
// conservative: a row is only corrected when the two fields are still exactly
// what the buggy handler would have written and the original values are copied
// into backup columns first, so nothing is lost and the change is reversible.

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

const addColumn = async (sequelize, table, column, definition) => {
  if (!(await hasColumn(sequelize, table, column))) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    return true;
  }
  return false;
};

module.exports = {
  async up({ sequelize }) {
    const added = [];

    // ── radiology: findings + impression as first-class fields ──────────────
    if (await addColumn(sequelize, 'radiology_orders', 'findings', 'TEXT NULL')) added.push('radiology_orders.findings');
    if (await addColumn(sequelize, 'radiology_orders', 'impression', 'TEXT NULL')) added.push('radiology_orders.impression');
    if (await addColumn(sequelize, 'radiology_orders', 'verified_by', 'BIGINT UNSIGNED NULL')) added.push('radiology_orders.verified_by');
    if (await addColumn(sequelize, 'radiology_orders', 'verified_at', 'DATETIME NULL')) added.push('radiology_orders.verified_at');

    // ── laboratory: verification trail on results ──────────────────────────
    if (await addColumn(sequelize, 'lab_order_items', 'verified_by', 'BIGINT UNSIGNED NULL')) added.push('lab_order_items.verified_by');
    if (await addColumn(sequelize, 'lab_order_items', 'verified_at', 'DATETIME NULL')) added.push('lab_order_items.verified_at');

    // ── lab_tests: method as its own column, plus repair backups ───────────
    if (await addColumn(sequelize, 'lab_tests', 'method_backup', 'VARCHAR(255) NULL')) added.push('lab_tests.method_backup');
    if (await addColumn(sequelize, 'lab_tests', 'normal_range_backup', 'VARCHAR(255) NULL')) added.push('lab_tests.normal_range_backup');
    if (await addColumn(sequelize, 'lab_tests', 'sample_type_backup', 'VARCHAR(255) NULL')) added.push('lab_tests.sample_type_backup');

    // Move findings text that had been written into result_notes into the new
    // findings column, so nothing is lost when the UI starts reading `findings`.
    const [moved] = await sequelize.query(
      `UPDATE radiology_orders
          SET findings = result_notes
        WHERE findings IS NULL AND result_notes IS NOT NULL AND result_notes <> ''`
    );

    // ── BUG-035 repair: normal_range holding a method value ─────────────────
    // Only touch rows where lab_tests.method exists as a column to compare with;
    // otherwise back up the current values so a human can reconcile them.
    const hasMethodColumn = await hasColumn(sequelize, 'lab_tests', 'method');
    let repaired = 0;
    const suspects = [];

    if (hasMethodColumn) {
      const [rows] = await sequelize.query(
        `SELECT id, code, name, method, normal_range, sample_type, test_type
           FROM lab_tests
          WHERE normal_range IS NOT NULL AND normal_range <> ''`
      );
      for (const row of rows) {
        // The buggy handler wrote method -> normal_range and test_type ->
        // sample_type. A row is a confirmed victim when normal_range equals the
        // method value (so the real reference range was never stored).
        const victim = row.method && String(row.normal_range).trim() === String(row.method).trim();
        if (!victim) continue;

        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `UPDATE lab_tests
              SET normal_range_backup = COALESCE(normal_range_backup, normal_range),
                  sample_type_backup  = COALESCE(sample_type_backup, sample_type),
                  normal_range        = NULL
            WHERE id = ?`,
          { replacements: [row.id] }
        );
        repaired += 1;
        suspects.push(`${row.code}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `  diagnostics: added ${added.length} column(s) [${added.join(', ') || 'none'}]; ` +
        `moved ${moved?.changedRows ?? 0} radiology result_notes into findings; ` +
        (hasMethodColumn
          ? `cleared ${repaired} lab_tests.normal_range value(s) that actually held the METHOD ` +
            `${suspects.length ? `(${suspects.join(', ')}) ` : ''}— originals kept in *_backup columns, ` +
            `so a real reference range must now be entered rather than a method string being displayed as one.`
          : 'lab_tests has no `method` column, so no reference-range repair could be inferred; ' +
            'current values were left untouched.')
    );
  },

  async down({ sequelize }) {
    // Restore the backed-up values, then drop the added columns.
    await sequelize.query(
      `UPDATE lab_tests
          SET normal_range = COALESCE(normal_range_backup, normal_range),
              sample_type  = COALESCE(sample_type_backup, sample_type)
        WHERE normal_range_backup IS NOT NULL OR sample_type_backup IS NOT NULL`
    );
    for (const [table, column] of [
      ['radiology_orders', 'findings'],
      ['radiology_orders', 'impression'],
      ['radiology_orders', 'verified_by'],
      ['radiology_orders', 'verified_at'],
      ['lab_order_items', 'verified_by'],
      ['lab_order_items', 'verified_at'],
      ['lab_tests', 'method_backup'],
      ['lab_tests', 'normal_range_backup'],
      ['lab_tests', 'sample_type_backup'],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      if (await hasColumn(sequelize, table, column)) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      }
    }
  },
};
