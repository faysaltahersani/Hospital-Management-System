'use strict';

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS patient_allergies (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL,
        allergen VARCHAR(180) NOT NULL, reaction VARCHAR(255) NULL,
        severity ENUM('mild','moderate','severe','life_threatening','unknown') NOT NULL DEFAULT 'unknown',
        status ENUM('active','inactive','resolved') NOT NULL DEFAULT 'active', onset_date DATE NULL,
        notes TEXT NULL, recorded_by BIGINT UNSIGNED NULL, verified_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), KEY idx_patient_allergies_patient_status (patient_id,status), KEY idx_patient_allergies_allergen (allergen),
        CONSTRAINT fk_patient_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_patient_allergies_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_patient_allergies_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS patient_problems (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(30) NULL, title VARCHAR(220) NOT NULL,
        problem_type ENUM('diagnosis','chronic_disease','symptom','risk') NOT NULL DEFAULT 'diagnosis',
        status ENUM('active','resolved','inactive') NOT NULL DEFAULT 'active', onset_date DATE NULL, resolved_date DATE NULL,
        notes TEXT NULL, recorded_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), KEY idx_patient_problems_patient_status (patient_id,status), KEY idx_patient_problems_code (code),
        CONSTRAINT fk_patient_problems_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_patient_problems_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS patient_histories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL,
        category ENUM('medical','surgical','family','immunization','previous_treatment') NOT NULL,
        title VARCHAR(220) NOT NULL, details TEXT NULL, occurred_on DATE NULL, recorded_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), KEY idx_patient_histories_patient_category (patient_id,category), KEY idx_patient_histories_date (occurred_on),
        CONSTRAINT fk_patient_histories_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_patient_histories_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS vital_signs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL,
        encounter_type VARCHAR(30) NULL, encounter_id BIGINT UNSIGNED NULL, captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        temperature_c DECIMAL(4,1) NULL, pulse_bpm SMALLINT UNSIGNED NULL, respiratory_rate SMALLINT UNSIGNED NULL,
        systolic_bp SMALLINT UNSIGNED NULL, diastolic_bp SMALLINT UNSIGNED NULL, spo2_percent DECIMAL(5,2) NULL,
        height_cm DECIMAL(6,2) NULL, weight_kg DECIMAL(7,2) NULL, bmi DECIMAL(5,2) NULL, pain_score TINYINT UNSIGNED NULL,
        notes VARCHAR(500) NULL, recorded_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), KEY idx_vitals_patient_time (patient_id,captured_at), KEY idx_vitals_encounter (encounter_type,encounter_id),
        CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_vitals_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS clinical_notes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, patient_id BIGINT UNSIGNED NOT NULL,
        encounter_type VARCHAR(30) NULL, encounter_id BIGINT UNSIGNED NULL,
        note_type ENUM('doctor','nursing','progress','assessment','procedure','follow_up','discharge') NOT NULL DEFAULT 'progress',
        title VARCHAR(220) NOT NULL, content LONGTEXT NOT NULL,
        status ENUM('draft','final','amended') NOT NULL DEFAULT 'draft', author_id BIGINT UNSIGNED NOT NULL, finalized_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), KEY idx_clinical_notes_patient_time (patient_id,created_at),
        KEY idx_clinical_notes_encounter (encounter_type,encounter_id), KEY idx_clinical_notes_author (author_id),
        CONSTRAINT fk_clinical_notes_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        CONSTRAINT fk_clinical_notes_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },

  async down() {
    throw new Error('026-central-emr-clinical-profile is not reversible because it stores permanent clinical records');
  },
};

