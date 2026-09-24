'use strict';

// A doctor's time slot could be booked any number of times.
//
// `createAppointment` did check for a clash first, but a check followed by an
// insert is a race: with ten simultaneous requests all ten read "slot free" and
// all ten inserted. Measured — ten patients booked the same doctor at 11:30 on the
// same date, and the database accepted every one.
//
// A pre-check cannot fix this; only a constraint can. `active_slot_key` is a
// stored generated column holding `doctor|date|time` while the appointment is
// live, and NULL once it is cancelled, marked no-show, completed or soft-deleted.
// A unique index over it therefore blocks a second live booking of the same slot
// while still allowing:
//   * re-booking a slot after the original was cancelled (NULL keys do not clash
//     in a MySQL/MariaDB unique index), and
//   * a historical record of every past booking, including completed ones.
//
// 'completed' releases the key deliberately: a finished consultation must not
// reserve that slot for the rest of time.
//
// Existing duplicates are reported and left alone rather than deleted — a real
// double-booking is a scheduling fact the clinic has to resolve, not something a
// migration should silently discard. The migration stops if any remain, so the
// constraint is never added on top of data that violates it.

const LIVE_STATUSES = ['scheduled', 'confirmed', 'in_progress'];

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

const liveList = LIVE_STATUSES.map((s) => `'${s}'`).join(', ');

module.exports = {
  async up({ sequelize }) {
    // Any live slot already holding more than one appointment must be resolved
    // by a human before a unique index can exist.
    const [dupes] = await sequelize.query(
      `SELECT doctor_id, appointment_date, appointment_time, COUNT(*) n,
              GROUP_CONCAT(appointment_code ORDER BY id) codes
         FROM appointments
        WHERE deleted_at IS NULL AND status IN (${liveList})
        GROUP BY doctor_id, appointment_date, appointment_time
        HAVING n > 1`
    );
    if (dupes.length) {
      // eslint-disable-next-line no-console
      console.log(`  ${dupes.length} slot(s) are already double-booked:`);
      dupes.forEach((d) => {
        // eslint-disable-next-line no-console
        console.log(
          `    doctor ${d.doctor_id} on ${d.appointment_date} at ${d.appointment_time}: ${d.n} appointments (${d.codes})`
        );
      });
      throw new Error(
        'Cannot add the appointment slot constraint while double-booked slots exist. ' +
          'Cancel or move the surplus appointments listed above, then re-run this migration. ' +
          'They are left untouched deliberately — which patient keeps the slot is a clinical decision.'
      );
    }

    if (!(await hasColumn(sequelize, 'appointments', 'active_slot_key'))) {
      await sequelize.query(
        `ALTER TABLE \`appointments\`
           ADD COLUMN \`active_slot_key\` VARCHAR(64)
             GENERATED ALWAYS AS (
               CASE
                 WHEN \`deleted_at\` IS NULL AND \`status\` IN (${liveList})
                 THEN CONCAT(\`doctor_id\`, '|', \`appointment_date\`, '|', \`appointment_time\`)
                 ELSE NULL
               END
             ) STORED`
      );
      // eslint-disable-next-line no-console
      console.log('  added appointments.active_slot_key (generated, NULL once the slot is released)');
    }

    if (!(await hasIndex(sequelize, 'appointments', 'uk_appointments_active_slot'))) {
      await sequelize.query(
        'ALTER TABLE `appointments` ADD UNIQUE KEY `uk_appointments_active_slot` (`active_slot_key`)'
      );
      // eslint-disable-next-line no-console
      console.log('  added unique key uk_appointments_active_slot — a live slot can now hold one appointment');
    }

    const [[count]] = await sequelize.query(
      'SELECT COUNT(*) n FROM appointments WHERE active_slot_key IS NOT NULL'
    );
    // eslint-disable-next-line no-console
    console.log(`  ${count.n} live appointment(s) now hold a reserved slot key`);
  },

  async down({ sequelize }) {
    if (await hasIndex(sequelize, 'appointments', 'uk_appointments_active_slot')) {
      await sequelize.query('ALTER TABLE `appointments` DROP INDEX `uk_appointments_active_slot`');
    }
    if (await hasColumn(sequelize, 'appointments', 'active_slot_key')) {
      await sequelize.query('ALTER TABLE `appointments` DROP COLUMN `active_slot_key`');
    }
    // eslint-disable-next-line no-console
    console.log('  removed the appointment slot constraint');
  },
};
