'use strict';

// The diagnostic / investigation spine.
//
// What already existed: `lab_orders` + `lab_order_items` + `lab_tests`, and
// `radiology_orders` + `radiology_tests`. Between them they could record ONE
// result string per lab test, plus findings/impression and a single image URL on
// a radiology order. There was no structured multi-parameter result (a CBC could
// not hold Haemoglobin, WBC and Platelet as separate lines), no measurements, no
// attachments beyond one URL string, no report record, and no category outside
// laboratory and radiology.
//
// What this migration does NOT do: replace or duplicate those tables. Ordering,
// pricing, invoicing and the existing bill-record screens keep working exactly as
// they do today. A `diagnostic_studies` row points BACK at the `lab_order_items`
// or `radiology_orders` row it came from via (source_type, source_id), so the
// clinical layer is additive. The nine categories with no existing module
// (cardiology, histopathology, microbiology, cytology, ophthalmology, ENT,
// dental, pulmonary, specialized) create standalone studies.
//
// Normalization: everything that REPEATS per study gets its own table — result
// parameters, measurements, findings, attachments, organisms and their antibiotic
// sensitivities. Attributes that are 1:1 with a study and merely sparse (body
// part, contrast, specimen) stay on the study row, because they are functionally
// dependent on its key; splitting those into side tables would add joins without
// removing redundancy.
//
// The legacy `lab_orders.status` / `radiology_orders.status` enums are left
// alone. The eight-state report lifecycle lives on the study, so existing rows,
// queries and screens are unaffected; the service keeps the legacy status in step
// where the two overlap.

const {
  DIAGNOSTIC_CATEGORY_VALUES,
  DIAGNOSTIC_STATUS_VALUES,
  RESULT_FLAG_VALUES,
  ATTACHMENT_KIND_VALUES,
  LATERALITY,
} = require('../config/diagnostics');

const enumList = (values) => values.map((v) => `'${v}'`).join(', ');

const tableExists = async (sequelize, name) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [name] }
  );
  return rows.length > 0;
};

const create = async (sequelize, name, ddl, log) => {
  if (await tableExists(sequelize, name)) {
    log(`  ${name} already present, left as is`);
    return false;
  }
  await sequelize.query(ddl);
  log(`  created ${name}`);
  return true;
};

module.exports = {
  async up({ sequelize }) {
    // eslint-disable-next-line no-console
    const log = (m) => console.log(m);

    // ── the spine ───────────────────────────────────────────────────────────
    await create(sequelize, 'diagnostic_studies', `
      CREATE TABLE \`diagnostic_studies\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_code\` VARCHAR(40) NOT NULL,
        \`patient_id\` BIGINT UNSIGNED NOT NULL,
        \`category\` ENUM(${enumList(DIAGNOSTIC_CATEGORY_VALUES)}) NOT NULL,
        \`modality\` VARCHAR(60) NOT NULL,
        \`test_name\` VARCHAR(255) NOT NULL,

        -- Link back to the module that ordered and billed this study, so the
        -- existing pathology/radiology flows remain the single ordering path.
        \`source_type\` ENUM('lab_order_item','radiology_order','standalone') NOT NULL DEFAULT 'standalone',
        \`source_id\` BIGINT UNSIGNED NULL,
        \`invoice_id\` BIGINT UNSIGNED NULL,

        \`referring_doctor_id\` BIGINT UNSIGNED NULL,
        \`performing_doctor_id\` BIGINT UNSIGNED NULL,
        \`performing_user_id\` BIGINT UNSIGNED NULL,

        \`status\` ENUM(${enumList(DIAGNOSTIC_STATUS_VALUES)}) NOT NULL DEFAULT 'ordered',

        \`study_datetime\` DATETIME NULL,
        \`clinical_history\` TEXT NULL,
        \`procedure_note\` TEXT NULL,

        -- imaging attributes
        \`body_part\` VARCHAR(120) NULL,
        \`laterality\` ENUM(${enumList(LATERALITY)}) NULL,
        \`views\` VARCHAR(255) NULL,
        \`contrast_used\` TINYINT(1) NULL,
        \`contrast_agent\` VARCHAR(180) NULL,
        \`series_or_sequences\` TEXT NULL,

        -- specimen attributes
        \`specimen\` VARCHAR(255) NULL,
        \`sample_type\` VARCHAR(120) NULL,
        \`collection_method\` VARCHAR(180) NULL,
        \`sample_collected_at\` DATETIME NULL,
        \`adequacy\` VARCHAR(180) NULL,

        \`result_at\` DATETIME NULL,
        \`interpretation\` TEXT NULL,
        \`impression\` TEXT NULL,
        \`conclusion\` TEXT NULL,
        \`recommendation\` TEXT NULL,

        \`verified_by\` BIGINT UNSIGNED NULL,
        \`verified_at\` DATETIME NULL,
        \`finalized_by\` BIGINT UNSIGNED NULL,
        \`finalized_at\` DATETIME NULL,
        \`cancelled_reason\` VARCHAR(500) NULL,

        \`created_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,

        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_diagnostic_studies_code\` (\`study_code\`),
        KEY \`ix_ds_patient\` (\`patient_id\`, \`study_datetime\`),
        KEY \`ix_ds_category\` (\`category\`, \`modality\`),
        KEY \`ix_ds_status\` (\`status\`),
        KEY \`ix_ds_source\` (\`source_type\`, \`source_id\`),
        KEY \`ix_ds_invoice\` (\`invoice_id\`),
        CONSTRAINT \`fk_ds_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\` (\`id\`),
        CONSTRAINT \`fk_ds_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\` (\`id\`),
        CONSTRAINT \`fk_ds_referring\` FOREIGN KEY (\`referring_doctor_id\`) REFERENCES \`doctors\` (\`id\`),
        CONSTRAINT \`fk_ds_performing\` FOREIGN KEY (\`performing_doctor_id\`) REFERENCES \`doctors\` (\`id\`),
        CONSTRAINT \`fk_ds_perf_user\` FOREIGN KEY (\`performing_user_id\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`fk_ds_verified_by\` FOREIGN KEY (\`verified_by\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`fk_ds_finalized_by\` FOREIGN KEY (\`finalized_by\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`fk_ds_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── structured results: one row per reported parameter ──────────────────
    // This is what lets a CBC hold Haemoglobin / WBC / Platelet as separate
    // lines with their own units, reference ranges and abnormal flags, instead
    // of one opaque result string or a scanned image.
    await create(sequelize, 'diagnostic_result_parameters', `
      CREATE TABLE \`diagnostic_result_parameters\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NOT NULL,
        \`group_label\` VARCHAR(180) NULL,
        \`parameter_name\` VARCHAR(200) NOT NULL,
        \`result_value\` VARCHAR(255) NULL,
        -- Parsed copy of result_value when it is numeric, for trending. NULL
        -- when the result is textual ("Not detected"), never a guessed number.
        \`result_numeric\` DECIMAL(18,6) NULL,
        \`unit\` VARCHAR(60) NULL,
        \`ref_range_low\` DECIMAL(18,6) NULL,
        \`ref_range_high\` DECIMAL(18,6) NULL,
        \`ref_range_text\` VARCHAR(255) NULL,
        \`flag\` ENUM(${enumList(RESULT_FLAG_VALUES)}) NULL,
        \`method\` VARCHAR(180) NULL,
        \`comments\` TEXT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`recorded_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_drp_study\` (\`study_id\`, \`sort_order\`),
        CONSTRAINT \`fk_drp_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_drp_recorded_by\` FOREIGN KEY (\`recorded_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── measurements: ultrasound organ sizes, Doppler velocities, spirometry,
    //    echo dimensions, IOP, lesion size ─────────────────────────────────
    await create(sequelize, 'diagnostic_measurements', `
      CREATE TABLE \`diagnostic_measurements\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NOT NULL,
        \`site\` VARCHAR(180) NULL,
        \`label\` VARCHAR(200) NOT NULL,
        \`value_numeric\` DECIMAL(18,6) NULL,
        \`value_text\` VARCHAR(255) NULL,
        \`unit\` VARCHAR(60) NULL,
        \`normal_range\` VARCHAR(180) NULL,
        \`laterality\` ENUM(${enumList(LATERALITY)}) NULL,
        \`notes\` TEXT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`recorded_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_dm_study\` (\`study_id\`, \`sort_order\`),
        CONSTRAINT \`fk_dm_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_dm_recorded_by\` FOREIGN KEY (\`recorded_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── findings: sectioned narrative (Liver / Gall Bladder / CBD ..., or
    //    Gross description / Microscopic findings) ─────────────────────────
    await create(sequelize, 'diagnostic_findings', `
      CREATE TABLE \`diagnostic_findings\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NOT NULL,
        \`section\` VARCHAR(180) NULL,
        \`body\` TEXT NULL,
        \`is_abnormal\` TINYINT(1) NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`recorded_by\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_df_study\` (\`study_id\`, \`sort_order\`),
        CONSTRAINT \`fk_df_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_df_recorded_by\` FOREIGN KEY (\`recorded_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── microbiology: organisms and their antibiotic sensitivities ──────────
    await create(sequelize, 'diagnostic_organisms', `
      CREATE TABLE \`diagnostic_organisms\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NOT NULL,
        \`organism_name\` VARCHAR(200) NOT NULL,
        \`culture_medium\` VARCHAR(180) NULL,
        \`colony_count\` VARCHAR(120) NULL,
        \`growth\` VARCHAR(120) NULL,
        \`notes\` TEXT NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_do_study\` (\`study_id\`, \`sort_order\`),
        CONSTRAINT \`fk_do_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    await create(sequelize, 'diagnostic_sensitivities', `
      CREATE TABLE \`diagnostic_sensitivities\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`organism_id\` BIGINT UNSIGNED NOT NULL,
        \`antibiotic\` VARCHAR(180) NOT NULL,
        \`interpretation\` ENUM('sensitive','intermediate','resistant','not_tested') NULL,
        \`mic\` VARCHAR(60) NULL,
        \`zone_diameter_mm\` DECIMAL(8,2) NULL,
        \`notes\` VARCHAR(500) NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_dsen_organism\` (\`organism_id\`, \`sort_order\`),
        CONSTRAINT \`fk_dsen_organism\` FOREIGN KEY (\`organism_id\`) REFERENCES \`diagnostic_organisms\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── attachments: file METADATA only. Bytes live on disk under a directory
    //    that is not served statically; see utils/diagnosticStorage.js. Nothing
    //    here is a public URL, and `storage_key` is never handed to a client.
    //    The DICOM columns are populated only when a DICOM file is uploaded and
    //    stay NULL otherwise — the schema is ready for PACS without forcing it.
    await create(sequelize, 'diagnostic_attachments', `
      CREATE TABLE \`diagnostic_attachments\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NULL,
        \`patient_id\` BIGINT UNSIGNED NOT NULL,
        \`kind\` ENUM(${enumList(ATTACHMENT_KIND_VALUES)}) NOT NULL DEFAULT 'document',
        \`file_name\` VARCHAR(255) NOT NULL,
        \`original_name\` VARCHAR(255) NOT NULL,
        \`mime_type\` VARCHAR(180) NOT NULL,
        \`file_size\` BIGINT UNSIGNED NOT NULL,
        \`storage_key\` VARCHAR(500) NOT NULL,
        \`checksum_sha256\` CHAR(64) NULL,
        \`caption\` VARCHAR(500) NULL,
        \`sort_order\` INT NOT NULL DEFAULT 0,

        -- DICOM / PACS readiness. Unused until a DICOM file is ingested.
        \`dicom_study_uid\` VARCHAR(128) NULL,
        \`dicom_series_uid\` VARCHAR(128) NULL,
        \`dicom_instance_uid\` VARCHAR(128) NULL,
        \`dicom_modality\` VARCHAR(16) NULL,

        \`uploaded_by\` BIGINT UNSIGNED NULL,
        \`uploaded_at\` DATETIME NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        KEY \`ix_da_study\` (\`study_id\`, \`sort_order\`),
        KEY \`ix_da_patient\` (\`patient_id\`),
        KEY \`ix_da_kind\` (\`kind\`),
        KEY \`ix_da_dicom_study\` (\`dicom_study_uid\`),
        CONSTRAINT \`fk_da_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_da_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\` (\`id\`),
        CONSTRAINT \`fk_da_uploaded_by\` FOREIGN KEY (\`uploaded_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // ── the report record: one per study, carrying the rendered PDF reference
    //    and the verification trail. Kept separate from the study so a report
    //    can be regenerated without rewriting clinical data.
    await create(sequelize, 'diagnostic_reports', `
      CREATE TABLE \`diagnostic_reports\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`study_id\` BIGINT UNSIGNED NOT NULL,
        \`report_number\` VARCHAR(40) NOT NULL,
        \`template_key\` VARCHAR(60) NOT NULL,
        \`status\` ENUM(${enumList(DIAGNOSTIC_STATUS_VALUES)}) NOT NULL DEFAULT 'result_entered',
        \`pdf_attachment_id\` BIGINT UNSIGNED NULL,
        \`generated_by\` BIGINT UNSIGNED NULL,
        \`generated_at\` DATETIME NULL,
        \`verified_by\` BIGINT UNSIGNED NULL,
        \`verified_at\` DATETIME NULL,
        \`print_count\` INT NOT NULL DEFAULT 0,
        \`last_printed_by\` BIGINT UNSIGNED NULL,
        \`last_printed_at\` DATETIME NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_dr_report_number\` (\`report_number\`),
        UNIQUE KEY \`uk_dr_study\` (\`study_id\`),
        CONSTRAINT \`fk_dr_study\` FOREIGN KEY (\`study_id\`) REFERENCES \`diagnostic_studies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_dr_pdf\` FOREIGN KEY (\`pdf_attachment_id\`) REFERENCES \`diagnostic_attachments\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`fk_dr_generated_by\` FOREIGN KEY (\`generated_by\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`fk_dr_verified_by\` FOREIGN KEY (\`verified_by\`) REFERENCES \`users\` (\`id\`),
        CONSTRAINT \`fk_dr_printed_by\` FOREIGN KEY (\`last_printed_by\`) REFERENCES \`users\` (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, log);

    // Study and report numbering joins the atomic allocator (migration 015), so
    // concurrent result entry cannot mint the same code.
    // Year is read from the database clock rather than hardcoded, so the
    // migration does not bake in the year it happened to be written.
    const [[{ yr }]] = await sequelize.query('SELECT YEAR(NOW()) AS yr');
    await sequelize.query(
      `INSERT INTO code_sequences (name, next_value)
            VALUES (:study, 1), (:report, 1)
         ON DUPLICATE KEY UPDATE next_value = next_value`,
      { replacements: { study: `diagnostic_study:${yr}`, report: `diagnostic_report:${yr}` } }
    );
    log('  registered diagnostic_study / diagnostic_report counters');
  },

  async down({ sequelize }) {
    // eslint-disable-next-line no-console
    const log = (m) => console.log(m);
    // Children first: the FKs are ON DELETE CASCADE but the tables still depend
    // on each other's existence.
    for (const t of [
      'diagnostic_reports',
      'diagnostic_sensitivities',
      'diagnostic_organisms',
      'diagnostic_findings',
      'diagnostic_measurements',
      'diagnostic_result_parameters',
      'diagnostic_attachments',
      'diagnostic_studies',
    ]) {
      if (await tableExists(sequelize, t)) {
        await sequelize.query(`DROP TABLE \`${t}\``);
        log(`  dropped ${t}`);
      }
    }
    await sequelize.query(
      `DELETE FROM code_sequences WHERE name LIKE 'diagnostic_study:%' OR name LIKE 'diagnostic_report:%'`
    );
    log('  removed diagnostic counters');
  },
};
