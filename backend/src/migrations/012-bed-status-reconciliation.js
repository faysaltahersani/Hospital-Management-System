'use strict';

// BUG-027 — `beds.status` was maintained independently of the admissions that
// actually occupy a bed, and `PATCH /beds/:id` let anyone set it freely. The
// database therefore contained two contradictory states at once:
//   * beds marked `occupied` with no active admission (capacity permanently lost)
//   * beds marked `available` while a patient was in them (the availability
//     screen offered an occupied bed, which is how BUG-006 produced double
//     allocation)
//
// Reconciliation rule — derived, not guessed:
//   a bed with >=1 active admission  -> occupied
//   a bed with no active admission   -> available, but ONLY if it was 'occupied'.
//     `maintenance` and `reserved` are deliberate operational states set by
//     staff, so they are left alone; overwriting them would destroy real intent.
//
// The pre-migration value is copied to `status_before_reconciliation` so the
// change is auditable and reversible.

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
    if (!(await hasColumn(sequelize, 'beds', 'status_before_reconciliation'))) {
      await sequelize.query('ALTER TABLE `beds` ADD COLUMN `status_before_reconciliation` VARCHAR(30) NULL');
    }

    const [occupiedButEmpty] = await sequelize.query(
      `SELECT b.id, b.bed_number, b.status FROM beds b
        WHERE b.deleted_at IS NULL AND b.status = 'occupied'
          AND NOT EXISTS (
            SELECT 1 FROM admissions a
             WHERE a.bed_id = b.id AND a.status = 'admitted' AND a.deleted_at IS NULL)`
    );
    const [availableButOccupied] = await sequelize.query(
      `SELECT b.id, b.bed_number, b.status FROM beds b
        WHERE b.deleted_at IS NULL AND b.status <> 'occupied'
          AND EXISTS (
            SELECT 1 FROM admissions a
             WHERE a.bed_id = b.id AND a.status = 'admitted' AND a.deleted_at IS NULL)`
    );

    // Free the beds that were holding phantom occupancy.
    await sequelize.query(
      `UPDATE beds b
          SET b.status_before_reconciliation = COALESCE(b.status_before_reconciliation, b.status),
              b.status = 'available'
        WHERE b.deleted_at IS NULL AND b.status = 'occupied'
          AND NOT EXISTS (
            SELECT 1 FROM admissions a
             WHERE a.bed_id = b.id AND a.status = 'admitted' AND a.deleted_at IS NULL)`
    );

    // Mark the beds that genuinely hold a patient. This one is a safety fix: an
    // occupied bed must never be offered as available.
    await sequelize.query(
      `UPDATE beds b
          SET b.status_before_reconciliation = COALESCE(b.status_before_reconciliation, b.status),
              b.status = 'occupied'
        WHERE b.deleted_at IS NULL AND b.status <> 'occupied'
          AND EXISTS (
            SELECT 1 FROM admissions a
             WHERE a.bed_id = b.id AND a.status = 'admitted' AND a.deleted_at IS NULL)`
    );

    // Also repair the discharge records that had a status without a timestamp.
    const [dischargeFix] = await sequelize.query(
      `UPDATE admissions
          SET discharged_at = updated_at
        WHERE status = 'discharged' AND discharged_at IS NULL AND deleted_at IS NULL`
    );

    const [[remaining]] = await sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM beds b WHERE b.deleted_at IS NULL AND b.status='occupied'
            AND NOT EXISTS (SELECT 1 FROM admissions a WHERE a.bed_id=b.id AND a.status='admitted' AND a.deleted_at IS NULL)) AS phantom,
         (SELECT COUNT(*) FROM beds b WHERE b.deleted_at IS NULL AND b.status<>'occupied'
            AND EXISTS (SELECT 1 FROM admissions a WHERE a.bed_id=b.id AND a.status='admitted' AND a.deleted_at IS NULL)) AS hidden`
    );

    // eslint-disable-next-line no-console
    console.log(
      `  bed reconciliation: freed ${occupiedButEmpty.length} phantom-occupied bed(s) ` +
        `[${occupiedButEmpty.map((b) => b.bed_number).join(', ') || 'none'}]; ` +
        `marked ${availableButOccupied.length} genuinely occupied bed(s) as occupied ` +
        `[${availableButOccupied.map((b) => b.bed_number).join(', ') || 'none'}]; ` +
        `set discharged_at on ${dischargeFix?.changedRows ?? 0} discharge record(s). ` +
        `Remaining contradictions: ${remaining.phantom} phantom, ${remaining.hidden} hidden. ` +
        `Prior values kept in beds.status_before_reconciliation.`
    );

    if (Number(remaining.phantom) !== 0 || Number(remaining.hidden) !== 0) {
      throw new Error('Bed reconciliation did not converge — aborting so the inconsistency is not hidden');
    }
  },

  async down({ sequelize }) {
    await sequelize.query(
      `UPDATE beds SET status = status_before_reconciliation
        WHERE status_before_reconciliation IS NOT NULL`
    );
    if (await hasColumn(sequelize, 'beds', 'status_before_reconciliation')) {
      await sequelize.query('ALTER TABLE `beds` DROP COLUMN `status_before_reconciliation`');
    }
  },
};
