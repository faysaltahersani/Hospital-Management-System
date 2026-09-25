'use strict';

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_encounters (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        encounter_code VARCHAR(40) NOT NULL,
        patient_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        department_id BIGINT UNSIGNED NULL,
        arrival_mode ENUM('walk_in','ambulance','transfer','police','other') NOT NULL DEFAULT 'walk_in',
        arrival_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        chief_complaint VARCHAR(1000) NOT NULL,
        priority ENUM('resuscitation','emergent','urgent','less_urgent','non_urgent') NULL,
        status ENUM('registered','triaged','under_assessment','treatment','observation','discharged','admitted','transferred') NOT NULL DEFAULT 'registered',
        assigned_doctor_id BIGINT UNSIGNED NULL,
        current_bed_id BIGINT UNSIGNED NULL,
        admission_id BIGINT UNSIGNED NULL,
        discharge_at DATETIME NULL,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        active_patient_key BIGINT UNSIGNED GENERATED ALWAYS AS (
          CASE WHEN status IN ('registered','triaged','under_assessment','treatment','observation') THEN patient_id ELSE NULL END
        ) STORED,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_encounter_code (encounter_code),
        UNIQUE KEY uq_emergency_active_patient_branch (branch_id,active_patient_key),
        KEY idx_emergency_queue (branch_id,status,priority,arrival_at),
        KEY idx_emergency_patient (patient_id,arrival_at),
        KEY idx_emergency_doctor (assigned_doctor_id,status),
        CONSTRAINT fk_emergency_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
        CONSTRAINT fk_emergency_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_doctor FOREIGN KEY (assigned_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_bed FOREIGN KEY (current_bed_id) REFERENCES beds(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_admission FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_triages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        version_no INT UNSIGNED NOT NULL DEFAULT 1,
        triage_level ENUM('resuscitation','emergent','urgent','less_urgent','non_urgent') NOT NULL,
        chief_complaint VARCHAR(1000) NOT NULL,
        pain_score TINYINT UNSIGNED NULL,
        consciousness ENUM('alert','voice','pain','unresponsive') NOT NULL DEFAULT 'alert',
        priority_notes VARCHAR(1000) NULL,
        triage_notes TEXT NULL,
        triage_nurse_id BIGINT UNSIGNED NOT NULL,
        vital_sign_id BIGINT UNSIGNED NULL,
        status ENUM('draft','final','amended') NOT NULL DEFAULT 'draft',
        finalized_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_triage_version (emergency_encounter_id,version_no),
        KEY idx_emergency_triage_level (branch_id,triage_level,created_at),
        CONSTRAINT fk_emergency_triage_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_triage_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_triage_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_triage_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_triage_nurse FOREIGN KEY (triage_nurse_id) REFERENCES users(id),
        CONSTRAINT fk_emergency_triage_vital FOREIGN KEY (vital_sign_id) REFERENCES vital_signs(id) ON DELETE SET NULL,
        CONSTRAINT ck_emergency_triage_pain CHECK (pain_score IS NULL OR pain_score BETWEEN 0 AND 10)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_doctor_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        doctor_id BIGINT UNSIGNED NOT NULL,
        assigned_by BIGINT UNSIGNED NOT NULL,
        assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME NULL,
        reason VARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        active_assignment_key TINYINT GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN 1 ELSE NULL END) STORED,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_active_doctor_assignment (emergency_encounter_id,active_assignment_key),
        KEY idx_emergency_assignment_doctor (doctor_id,assigned_at),
        CONSTRAINT fk_emergency_assignment_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_assignment_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_assignment_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_assignment_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_assignment_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
        CONSTRAINT fk_emergency_assignment_user FOREIGN KEY (assigned_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_assessments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        version_no INT UNSIGNED NOT NULL DEFAULT 1,
        chief_complaint TEXT NOT NULL,
        history TEXT NULL,
        examination TEXT NULL,
        diagnosis TEXT NOT NULL,
        differential_diagnosis TEXT NULL,
        clinical_notes TEXT NULL,
        disposition_plan TEXT NULL,
        assessed_by BIGINT UNSIGNED NOT NULL,
        clinical_note_id BIGINT UNSIGNED NULL,
        status ENUM('draft','final','amended') NOT NULL DEFAULT 'draft',
        finalized_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_assessment_version (emergency_encounter_id,version_no),
        KEY idx_emergency_assessment_author (assessed_by,created_at),
        CONSTRAINT fk_emergency_assessment_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_assessment_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_assessment_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_assessment_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_assessment_user FOREIGN KEY (assessed_by) REFERENCES users(id),
        CONSTRAINT fk_emergency_assessment_note FOREIGN KEY (clinical_note_id) REFERENCES clinical_notes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_orders (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        order_type ENUM('laboratory','radiology','medication','procedure','other') NOT NULL,
        reference_type VARCHAR(60) NOT NULL,
        reference_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ordered',
        requested_by BIGINT UNSIGNED NOT NULL,
        requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes VARCHAR(1000) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_order_reference (emergency_encounter_id,reference_type,reference_id),
        KEY idx_emergency_order_type_status (order_type,status,requested_at),
        CONSTRAINT fk_emergency_order_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_order_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_order_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_order_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_order_user FOREIGN KEY (requested_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_procedures (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        service_price_id BIGINT UNSIGNED NULL,
        invoice_id BIGINT UNSIGNED NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        status ENUM('ordered','in_progress','completed','cancelled') NOT NULL DEFAULT 'ordered',
        performed_by BIGINT UNSIGNED NULL,
        performed_at DATETIME NULL,
        notes TEXT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_emergency_procedure_encounter (emergency_encounter_id,status),
        KEY idx_emergency_procedure_service (service_id),
        CONSTRAINT fk_emergency_procedure_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_procedure_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_procedure_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_procedure_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_procedure_service FOREIGN KEY (service_id) REFERENCES services(id),
        CONSTRAINT fk_emergency_procedure_price FOREIGN KEY (service_price_id) REFERENCES service_prices(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_procedure_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_procedure_performer FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_procedure_creator FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT ck_emergency_procedure_quantity CHECK (quantity > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_observations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        bed_id BIGINT UNSIGNED NOT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME NULL,
        status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
        assigned_by BIGINT UNSIGNED NOT NULL,
        ended_by BIGINT UNSIGNED NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        active_bed_key BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status='active' THEN bed_id ELSE NULL END) STORED,
        active_encounter_key BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status='active' THEN emergency_encounter_id ELSE NULL END) STORED,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_observation_active_bed (active_bed_key),
        UNIQUE KEY uq_emergency_observation_active_encounter (active_encounter_key),
        KEY idx_emergency_observation_dates (started_at,ended_at),
        CONSTRAINT fk_emergency_observation_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_observation_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_observation_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_observation_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_observation_bed FOREIGN KEY (bed_id) REFERENCES beds(id),
        CONSTRAINT fk_emergency_observation_assigned FOREIGN KEY (assigned_by) REFERENCES users(id),
        CONSTRAINT fk_emergency_observation_ended FOREIGN KEY (ended_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS emergency_dispositions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        emergency_encounter_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        disposition_type ENUM('discharge','ipd_admission','icu_transfer','referral','transfer') NOT NULL,
        admission_id BIGINT UNSIGNED NULL,
        referral_id BIGINT UNSIGNED NULL,
        workflow_request_id BIGINT UNSIGNED NULL,
        destination VARCHAR(255) NULL,
        reason TEXT NULL,
        instructions TEXT NULL,
        status ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
        disposed_by BIGINT UNSIGNED NOT NULL,
        disposed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_emergency_completed_disposition (emergency_encounter_id,status),
        KEY idx_emergency_disposition_type_date (disposition_type,disposed_at),
        CONSTRAINT fk_emergency_disposition_encounter FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id),
        CONSTRAINT fk_emergency_disposition_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_emergency_disposition_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_emergency_disposition_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_emergency_disposition_admission FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_disposition_referral FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_disposition_workflow FOREIGN KEY (workflow_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL,
        CONSTRAINT fk_emergency_disposition_user FOREIGN KEY (disposed_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const table of ['lab_orders','radiology_orders','prescriptions','invoices']) {
      if (!(await hasColumn(sequelize, table, 'emergency_encounter_id'))) {
        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN emergency_encounter_id BIGINT UNSIGNED NULL, ADD KEY idx_${table}_emergency (emergency_encounter_id), ADD CONSTRAINT fk_${table}_emergency FOREIGN KEY (emergency_encounter_id) REFERENCES emergency_encounters(id) ON DELETE SET NULL`);
      }
    }

    await sequelize.query(`ALTER TABLE wards MODIFY COLUMN type ENUM('general','private','semi_private','icu','hdu','maternity','pediatric','isolation','emergency') NOT NULL DEFAULT 'general'`);
    if (!(await hasColumn(sequelize, 'wards', 'department_id'))) {
      await sequelize.query('ALTER TABLE wards ADD COLUMN department_id BIGINT UNSIGNED NULL, ADD KEY idx_wards_department (department_id), ADD CONSTRAINT fk_wards_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL');
    }

    const [[scope]] = await sequelize.query(`
      SELECT o.id organization_id,h.id hospital_id,b.id branch_id
        FROM organizations o JOIN hospitals h ON h.organization_id=o.id
        JOIN branches b ON b.hospital_id=h.id
       ORDER BY (o.code='ORG-DEFAULT') DESC,b.is_main DESC,o.id,h.id,b.id LIMIT 1
    `);
    const [[emergencyDepartment]] = await sequelize.query("SELECT id FROM departments WHERE code='EMERG' ORDER BY id LIMIT 1");
    if (emergencyDepartment) {
      await sequelize.query("UPDATE wards SET type='emergency',department_id=COALESCE(department_id,?) WHERE deleted_at IS NULL AND (UPPER(code) LIKE 'EMERG%' OR LOWER(name) LIKE '%emergency%')", { replacements: [emergencyDepartment.id] });
    }

    await sequelize.query(`INSERT IGNORE INTO service_types (organization_id,code,name,description,sort_order,is_active,created_at,updated_at) VALUES (?,'EMERGENCY','Emergency','Emergency Department services',9,1,NOW(),NOW())`, { replacements: [scope.organization_id] });
    const [[type]] = await sequelize.query("SELECT id FROM service_types WHERE organization_id=? AND code='EMERGENCY'", { replacements: [scope.organization_id] });
    await sequelize.query(`INSERT IGNORE INTO service_categories (organization_id,service_type_id,code,name,description,sort_order,is_active,created_at,updated_at) VALUES (?,?,'EMERGENCY-GENERAL','Emergency - General','Emergency clinical services',1,1,NOW(),NOW())`, { replacements: [scope.organization_id,type.id] });
    const [[category]] = await sequelize.query("SELECT id FROM service_categories WHERE organization_id=? AND code='EMERGENCY-GENERAL'", { replacements: [scope.organization_id] });
    await sequelize.query(`INSERT IGNORE INTO services (organization_id,hospital_id,branch_id,service_type_id,service_category_id,code,name,description,billing_unit,status,created_at,updated_at) VALUES (?,?,?,?,?,'EMERGENCY-CONSULTATION','Emergency Consultation','Emergency physician assessment; configure an approved price before billing','encounter','active',NOW(),NOW()),(?,?,?,?,?,'EMERGENCY-PROCEDURE','Emergency Procedure','Generic Emergency procedure category; use a specific service where available','procedure','active',NOW(),NOW())`, { replacements: [scope.organization_id,scope.hospital_id,scope.branch_id,type.id,category.id,scope.organization_id,scope.hospital_id,scope.branch_id,type.id,category.id] });
  },

  async down() {
    throw new Error('034-emergency-clinical-operations is not reversible because it contains permanent clinical encounter history');
  },
};
