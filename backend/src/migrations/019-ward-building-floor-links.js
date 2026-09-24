'use strict';

// Bed Entry could not be used for most buildings.
//
// Two defects, both about a relationship that was never actually stored:
//
// 1. `wards` had no building or floor column at all — only a free-text `floor`
//    varchar. `listWards` filled the gap by inventing one: it took whatever row
//    `MasterOption.findOne({type:'building'})` happened to return first and
//    stamped EVERY ward with that building's id. Measured on the live data, all
//    20 wards claimed building 73 ("building 1"). So on the Bed Entry screen:
//      building 22  "Main Building"          ->  0 wards offered
//      building 148 "Main Hospital Building" ->  0 wards offered
//      building 73  "building 1"             -> 20 wards offered
//    Selecting either of the other two buildings emptied the ward list and no bed
//    could be created.
//
// 2. Migration 008 created the building 'BLD_MAIN' and five floors, but wrote
//    `description: {building_id: 1}` on the floors — a literal 1 rather than the
//    id the building actually received (148 here). Building 1 does not exist, so
//    those five floors belonged to nothing and vanished from the floor dropdown
//    whenever a real building was selected.
//
// This migration stores the relationship properly instead of guessing it at read
// time. Where a ward's floor cannot be resolved, building_id and floor_id are left
// NULL — an unassigned ward, which is the truth. Nothing is invented.

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
    /* ── 1. repair the floors that point at a building which does not exist ── */
    const [[mainBuilding]] = await sequelize.query(
      `SELECT id, label FROM master_options WHERE type = 'building' AND code = 'BLD_MAIN' LIMIT 1`
    );

    const [orphanFloors] = await sequelize.query(
      `SELECT f.id, f.label, f.description
         FROM master_options f
        WHERE f.type = 'floor'
          AND JSON_EXTRACT(f.description, '$.building_id') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM master_options b
             WHERE b.type = 'building'
               AND b.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(f.description, '$.building_id')) AS UNSIGNED)
          )`
    );

    if (orphanFloors.length) {
      if (!mainBuilding) {
        // eslint-disable-next-line no-console
        console.log(
          `  ${orphanFloors.length} floor(s) reference a missing building, but the 'BLD_MAIN' building ` +
            'is absent so the correct parent cannot be determined. Left unchanged for manual repair: ' +
            orphanFloors.map((f) => `${f.id} (${f.label})`).join(', ')
        );
      } else {
        for (const f of orphanFloors) {
          await sequelize.query(
            `UPDATE master_options
                SET description = JSON_SET(COALESCE(description, '{}'), '$.building_id', ?)
              WHERE id = ?`,
            { replacements: [mainBuilding.id, f.id] }
          );
          // eslint-disable-next-line no-console
          console.log(`  floor ${f.id} (${f.label}) -> building ${mainBuilding.id} (${mainBuilding.label})`);
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('  no floors with a dangling building reference');
    }

    /* ── 2. give wards a real building and floor ───────────────────────────── */
    if (!(await hasColumn(sequelize, 'wards', 'building_id'))) {
      await sequelize.query('ALTER TABLE `wards` ADD COLUMN `building_id` BIGINT UNSIGNED NULL AFTER `floor`');
    }
    if (!(await hasColumn(sequelize, 'wards', 'floor_id'))) {
      await sequelize.query('ALTER TABLE `wards` ADD COLUMN `floor_id` BIGINT UNSIGNED NULL AFTER `building_id`');
    }
    if (!(await hasIndex(sequelize, 'wards', 'idx_wards_building'))) {
      await sequelize.query('ALTER TABLE `wards` ADD INDEX `idx_wards_building` (`building_id`)');
    }
    if (!(await hasIndex(sequelize, 'wards', 'idx_wards_floor'))) {
      await sequelize.query('ALTER TABLE `wards` ADD INDEX `idx_wards_floor` (`floor_id`)');
    }

    // The legacy `floor` varchar sometimes holds a floor option id as text
    // (e.g. '24', '74'). Where it resolves to a real floor, adopt it and take that
    // floor's building. Anything else stays NULL rather than being guessed.
    const [resolved] = await sequelize.query(
      `UPDATE wards w
         JOIN master_options f
           ON f.type = 'floor'
          AND f.id = CAST(w.floor AS UNSIGNED)
          SET w.floor_id = f.id,
              w.building_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(f.description, '$.building_id')) AS UNSIGNED)
        WHERE w.floor REGEXP '^[0-9]+$'
          AND w.floor_id IS NULL`
    );

    const [[counts]] = await sequelize.query(
      `SELECT COUNT(*) total,
              SUM(building_id IS NOT NULL) assigned,
              SUM(building_id IS NULL) unassigned
         FROM wards WHERE deleted_at IS NULL`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  wards: ${resolved?.changedRows ?? 0} linked from the legacy floor value; ` +
        `${counts.assigned} of ${counts.total} now have a building, ${counts.unassigned} remain unassigned. ` +
        'Unassigned wards stay selectable on the Bed Entry screen until an admin assigns them.'
    );

    /* ── 3. report the ward names that need a human decision ───────────────── */
    const [oddNames] = await sequelize.query(
      `SELECT id, name, code FROM wards WHERE deleted_at IS NULL AND name REGEXP '^[0-9]+$'`
    );
    if (oddNames.length) {
      // eslint-disable-next-line no-console
      console.log(
        `  NOTE: ${oddNames.length} ward(s) are named with only digits, which looks like mistaken data entry: ` +
          oddNames.map((w) => `#${w.id} "${w.name}" (${w.code})`).join(', ') +
          '. Left untouched — renaming or removing a ward is an operational decision, and beds may reference them.'
      );
    }
  },

  async down({ sequelize }) {
    for (const [index, column] of [
      ['idx_wards_building', 'building_id'],
      ['idx_wards_floor', 'floor_id'],
    ]) {
      if (await hasIndex(sequelize, 'wards', index)) {
        await sequelize.query(`ALTER TABLE \`wards\` DROP INDEX \`${index}\``);
      }
      if (await hasColumn(sequelize, 'wards', column)) {
        await sequelize.query(`ALTER TABLE \`wards\` DROP COLUMN \`${column}\``);
      }
    }
    // The floor -> building repair is deliberately NOT reverted: restoring a
    // reference to a building that does not exist would only reinstate the bug.
    // eslint-disable-next-line no-console
    console.log('  dropped wards.building_id / wards.floor_id (floor repairs kept)');
  },
};
