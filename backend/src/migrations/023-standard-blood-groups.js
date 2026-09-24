'use strict';

// Blood-group selectors are backed by master_options. Some installations were
// left with only the single group entered manually, which made every donor and
// donation form appear to support just that group. Keep the eight standard ABO
// and Rh combinations present with stable, non-colliding codes.

const GROUPS = [
  ['a_positive', 'A+'],
  ['a_negative', 'A-'],
  ['b_positive', 'B+'],
  ['b_negative', 'B-'],
  ['ab_positive', 'AB+'],
  ['ab_negative', 'AB-'],
  ['o_positive', 'O+'],
  ['o_negative', 'O-'],
];

module.exports = {
  async up({ sequelize }) {
    // Older UI code generated the same code for + and - (for example both A+
    // and A- became "a"). Move those ambiguous legacy codes out of the way
    // before assigning the canonical codes below.
    await sequelize.query(
      `UPDATE master_options
          SET code = CONCAT('legacy_blood_group_', id), updated_at = NOW()
        WHERE type = 'blood_group'
          AND code IN ('a', 'b', 'ab', 'o')`
    );

    let added = 0;
    let updated = 0;

    for (let index = 0; index < GROUPS.length; index += 1) {
      const [code, label] = GROUPS[index];
      // Include soft-deleted rows so a previously deleted standard group is
      // restored instead of colliding with its unique (type, code) key.
      // eslint-disable-next-line no-await-in-loop
      const [rows] = await sequelize.query(
        `SELECT id
           FROM master_options
          WHERE type = 'blood_group' AND (label = ? OR code = ?)
          ORDER BY (deleted_at IS NULL) DESC, id ASC
          LIMIT 1`,
        { replacements: [label, code] }
      );

      if (rows.length) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `UPDATE master_options
              SET code = ?, label = ?, sort_order = ?, is_active = 1,
                  deleted_at = NULL, updated_at = NOW()
            WHERE id = ?`,
          { replacements: [code, label, index + 1, rows[0].id] }
        );
        updated += 1;
      } else {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `INSERT INTO master_options
             (type, code, label, description, sort_order, is_active, created_at, updated_at)
           VALUES ('blood_group', ?, ?, NULL, ?, 1, NOW(), NOW())`,
          { replacements: [code, label, index + 1] }
        );
        added += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(`  standard blood groups: ${added} added, ${updated} normalized/restored`);
  },

  async down() {
    throw new Error('023-standard-blood-groups is not reversible because blood groups may be referenced by clinical records');
  },
};
