'use strict';

// Makes a finalised diagnostic report a permanent, immutable medical record.
//
// Migration 018 gave a study its results, findings and attachments, and the
// service enforces that FINAL is reachable only from VERIFIED. Two things were
// still missing for the record to be *permanent*:
//
// 1. Nothing captured what the report said at the moment it was finalised. The
//    report row pointed at live child rows, so a later edit — or a corrected
//    result — would silently change history. A finalised report has to keep its
//    own copy.
//
// 2. There was no way to amend a report without destroying the original. A
//    correction is a clinical event in its own right: who corrected it, when, why,
//    and what changed all have to survive, and the superseded version has to stay
//    readable.
//
// So:
//   diagnostic_report_versions  — one immutable row per issued version, carrying a
//                                 complete JSON snapshot of the report content and,
//                                 for an amendment, the reason and the diff.
//   diagnostic_imaging_series   — the Patient -> Study -> Series -> Image layer the
//                                 radiology/PACS model needs. Attachments may hang
//                                 off a series or directly off the study, because a
//                                 single uploaded JPEG has no series.
//   diagnostic_attachments      — version/is_original/is_final/superseded_by, so
//                                 replacing a file preserves the one it replaced,
//                                 and the generated PDF of each version is
//                                 identifiable.
//
// Nothing is deleted by this migration and no existing column changes meaning.

const tableExists = async (sequelize, name) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [name] }
  );
  return rows.length > 0;
};

const columnExists = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

const indexExists = async (sequelize, table, index) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [table, index] }
  );
  return rows.length > 0;
};

const log = (m) => {
  // eslint-disable-next-line no-console
  console.log(m);
};

module.exports = {
  async up({ sequelize }) {
    /* ── 1. imaging series ─────────────────────────────────────────────────── */
    if (!(await tableExists(sequelize, 'diagnostic_imaging_series'))) {
      await sequelize.query(`
        CREATE TABLE \`diagnostic_imaging_series\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`study_id\` BIGINT UNSIGNED NOT NULL,
          \`series_number\` INT NULL,
          \`description\` VARCHAR(255) NULL,
          \`modality\` VARCHAR(16) NULL,
          \`body_part\` VARCHAR(120) NULL,
          -- DICOM identity. Unique when present so the same series cannot be
          -- ingested twice, but nullable because a plain image upload has none.
          \`series_uid\` VARCHAR(128) NULL,
          \`instance_count\` INT NOT NULL DEFAULT 0,
          \`created_by\` BIGINT UNSIGNED NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`deleted_at\` DATETIME NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uk_dis_series_uid\` (\`series_uid\`),
          KEY \`ix_dis_study\` (\`study_id\`),
          CONSTRAINT \`fk_dis_study\` FOREIGN KEY (\`study_id\`)
            REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_dis_creator\` FOREIGN KEY (\`created_by\`)
            REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      log('  created diagnostic_imaging_series');
    } else {
      log('  diagnostic_imaging_series already present');
    }

    /* ── 2. report versions ────────────────────────────────────────────────── */
    if (!(await tableExists(sequelize, 'diagnostic_report_versions'))) {
      await sequelize.query(`
        CREATE TABLE \`diagnostic_report_versions\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`report_id\` BIGINT UNSIGNED NOT NULL,
          \`study_id\` BIGINT UNSIGNED NOT NULL,
          \`patient_id\` BIGINT UNSIGNED NOT NULL,
          \`version_no\` INT NOT NULL,
          -- 'final' is the first issued version; 'amended' supersedes an earlier
          -- one; 'cancelled' withdraws a version without erasing it.
          \`version_status\` ENUM('final','amended','cancelled') NOT NULL DEFAULT 'final',
          -- The complete report content as issued. This is what makes the record
          -- permanent: it does not follow later edits to the live child rows.
          \`snapshot\` LONGTEXT NOT NULL,
          \`pdf_attachment_id\` BIGINT UNSIGNED NULL,
          -- Amendment trail. Null on the first version.
          \`amends_version_id\` BIGINT UNSIGNED NULL,
          \`amendment_reason\` VARCHAR(1000) NULL,
          \`changed_fields\` TEXT NULL,
          \`superseded_at\` DATETIME NULL,
          \`superseded_by_id\` BIGINT UNSIGNED NULL,
          \`verified_by\` BIGINT UNSIGNED NULL,
          \`verified_at\` DATETIME NULL,
          \`issued_by\` BIGINT UNSIGNED NULL,
          \`issued_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          -- One row per version number per report; the sequence cannot be reused.
          UNIQUE KEY \`uk_drv_report_version\` (\`report_id\`, \`version_no\`),
          KEY \`ix_drv_study\` (\`study_id\`),
          KEY \`ix_drv_patient\` (\`patient_id\`),
          KEY \`ix_drv_status\` (\`version_status\`),
          KEY \`ix_drv_issued\` (\`issued_at\`),
          CONSTRAINT \`fk_drv_report\` FOREIGN KEY (\`report_id\`)
            REFERENCES \`diagnostic_reports\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_drv_study\` FOREIGN KEY (\`study_id\`)
            REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
          -- RESTRICT, not CASCADE: a patient carrying finalised reports must not be
          -- hard-deletable out from under their own medical history.
          CONSTRAINT \`fk_drv_patient\` FOREIGN KEY (\`patient_id\`)
            REFERENCES \`patients\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_drv_amends\` FOREIGN KEY (\`amends_version_id\`)
            REFERENCES \`diagnostic_report_versions\` (\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_drv_superseded_by\` FOREIGN KEY (\`superseded_by_id\`)
            REFERENCES \`diagnostic_report_versions\` (\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_drv_pdf\` FOREIGN KEY (\`pdf_attachment_id\`)
            REFERENCES \`diagnostic_attachments\` (\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_drv_verifier\` FOREIGN KEY (\`verified_by\`)
            REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_drv_issuer\` FOREIGN KEY (\`issued_by\`)
            REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      log('  created diagnostic_report_versions');
    } else {
      log('  diagnostic_report_versions already present');
    }

    /* ── 3. attachment versioning + series link ────────────────────────────── */
    const additions = [
      ['series_id', 'BIGINT UNSIGNED NULL AFTER `study_id`'],
      ['report_version_id', 'BIGINT UNSIGNED NULL AFTER `series_id`'],
      ['version', 'INT NOT NULL DEFAULT 1'],
      // An original is what the department produced or uploaded. It is never
      // overwritten; a replacement becomes a new row and this one is superseded.
      ['is_original', 'TINYINT(1) NOT NULL DEFAULT 1'],
      // False once superseded, so the current file of a lineage is selectable
      // without walking the chain.
      ['is_current', 'TINYINT(1) NOT NULL DEFAULT 1'],
      ['superseded_by_id', 'BIGINT UNSIGNED NULL'],
      ['superseded_at', 'DATETIME NULL'],
      ['metadata', 'TEXT NULL'],
    ];
    for (const [column, definition] of additions) {
      if (!(await columnExists(sequelize, 'diagnostic_attachments', column))) {
        await sequelize.query(`ALTER TABLE \`diagnostic_attachments\` ADD COLUMN \`${column}\` ${definition}`);
        log(`  diagnostic_attachments.${column} added`);
      }
    }

    const attachmentKeys = [
      ['ix_da_series', '(`series_id`)'],
      ['ix_da_current', '(`study_id`, `is_current`)'],
      ['ix_da_report_version', '(`report_version_id`)'],
    ];
    for (const [name, cols] of attachmentKeys) {
      if (!(await indexExists(sequelize, 'diagnostic_attachments', name))) {
        await sequelize.query(`ALTER TABLE \`diagnostic_attachments\` ADD INDEX \`${name}\` ${cols}`);
      }
    }

    const attachmentFks = [
      ['fk_da_series', 'FOREIGN KEY (`series_id`) REFERENCES `diagnostic_imaging_series` (`id`) ON DELETE SET NULL'],
      ['fk_da_superseded_by', 'FOREIGN KEY (`superseded_by_id`) REFERENCES `diagnostic_attachments` (`id`) ON DELETE SET NULL'],
      ['fk_da_report_version', 'FOREIGN KEY (`report_version_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL'],
    ];
    for (const [name, definition] of attachmentFks) {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diagnostic_attachments' AND CONSTRAINT_NAME = ?`,
        { replacements: [name] }
      );
      if (!rows.length) {
        await sequelize.query(`ALTER TABLE \`diagnostic_attachments\` ADD CONSTRAINT \`${name}\` ${definition}`);
        log(`  diagnostic_attachments constraint ${name} added`);
      }
    }

    /* ── 4. report: current version pointer + amendment count ──────────────── */
    for (const [column, definition] of [
      ['current_version_id', 'BIGINT UNSIGNED NULL'],
      ['version_count', 'INT NOT NULL DEFAULT 0'],
      ['is_amended', 'TINYINT(1) NOT NULL DEFAULT 0'],
    ]) {
      if (!(await columnExists(sequelize, 'diagnostic_reports', column))) {
        await sequelize.query(`ALTER TABLE \`diagnostic_reports\` ADD COLUMN \`${column}\` ${definition}`);
        log(`  diagnostic_reports.${column} added`);
      }
    }
    {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diagnostic_reports'
            AND CONSTRAINT_NAME = 'fk_dr_current_version'`
      );
      if (!rows.length) {
        await sequelize.query(
          'ALTER TABLE `diagnostic_reports` ADD CONSTRAINT `fk_dr_current_version` ' +
            'FOREIGN KEY (`current_version_id`) REFERENCES `diagnostic_report_versions` (`id`) ON DELETE SET NULL'
        );
        log('  diagnostic_reports constraint fk_dr_current_version added');
      }
    }

    /* ── 5. history query index on the study itself ────────────────────────── */
    // The patient history screen filters by patient + status and orders by date;
    // without this it is a filesort over every study the patient ever had.
    if (!(await indexExists(sequelize, 'diagnostic_studies', 'ix_ds_patient_status_date'))) {
      await sequelize.query(
        'ALTER TABLE `diagnostic_studies` ADD INDEX `ix_ds_patient_status_date` ' +
          '(`patient_id`, `status`, `study_datetime`)'
      );
      log('  diagnostic_studies index ix_ds_patient_status_date added');
    }

    const [[counts]] = await sequelize.query(
      `SELECT
         (SELECT COUNT(*) FROM information_schema.TABLES
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'diagnostic%') AS diagnostic_tables,
         (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'diagnostic%'
             AND REFERENCED_TABLE_NAME IS NOT NULL) AS diagnostic_fks`
    );
    log(`  diagnostic schema now: ${counts.diagnostic_tables} tables, ${counts.diagnostic_fks} foreign keys`);
  },

  async down({ sequelize }) {
    // Reverse order: drop the pointers before the tables they point at.
    const dropConstraint = async (table, name) => {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        { replacements: [table, name] }
      );
      if (rows.length) await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``);
    };
    const dropColumn = async (table, column) => {
      if (await columnExists(sequelize, table, column)) {
        await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
      }
    };

    await dropConstraint('diagnostic_reports', 'fk_dr_current_version');
    for (const c of ['current_version_id', 'version_count', 'is_amended']) {
      await dropColumn('diagnostic_reports', c);
    }

    for (const name of ['fk_da_series', 'fk_da_superseded_by', 'fk_da_report_version']) {
      await dropConstraint('diagnostic_attachments', name);
    }
    for (const c of [
      'series_id',
      'report_version_id',
      'version',
      'is_original',
      'is_current',
      'superseded_by_id',
      'superseded_at',
      'metadata',
    ]) {
      await dropColumn('diagnostic_attachments', c);
    }

    if (await indexExists(sequelize, 'diagnostic_studies', 'ix_ds_patient_status_date')) {
      await sequelize.query('ALTER TABLE `diagnostic_studies` DROP INDEX `ix_ds_patient_status_date`');
    }

    for (const t of ['diagnostic_report_versions', 'diagnostic_imaging_series']) {
      if (await tableExists(sequelize, t)) {
        await sequelize.query(`DROP TABLE \`${t}\``);
        log(`  dropped ${t}`);
      }
    }
  },
};
