'use strict';

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
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(180) NOT NULL,
        legal_name VARCHAR(220) NULL,
        registration_number VARCHAR(100) NULL,
        timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Dhaka',
        currency_code VARCHAR(3) NOT NULL DEFAULT 'BDT',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_organizations_code (code),
        KEY idx_organizations_name (name),
        KEY idx_organizations_active (is_active),
        CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(180) NOT NULL,
        hospital_type VARCHAR(60) NULL,
        license_number VARCHAR(100) NULL,
        phone VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        address TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_hospitals_org_code (organization_id, code),
        KEY idx_hospitals_org_name (organization_id, name),
        KEY idx_hospitals_active (is_active),
        CONSTRAINT fk_hospitals_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_hospitals_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_hospitals_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        hospital_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(40) NOT NULL,
        name VARCHAR(180) NOT NULL,
        phone VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        address TEXT NULL,
        is_main TINYINT(1) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_branches_hospital_code (hospital_id, code),
        KEY idx_branches_hospital_name (hospital_id, name),
        KEY idx_branches_active (is_active),
        CONSTRAINT fk_branches_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        CONSTRAINT fk_branches_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_branches_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await hasColumn(sequelize, 'users', 'organization_id'))) {
      await sequelize.query('ALTER TABLE users ADD COLUMN organization_id BIGINT UNSIGNED NULL AFTER role');
    }
    if (!(await hasColumn(sequelize, 'users', 'hospital_id'))) {
      await sequelize.query('ALTER TABLE users ADD COLUMN hospital_id BIGINT UNSIGNED NULL AFTER organization_id');
    }
    if (!(await hasColumn(sequelize, 'users', 'branch_id'))) {
      await sequelize.query('ALTER TABLE users ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER hospital_id');
    }
    if (!(await hasIndex(sequelize, 'users', 'idx_users_organization'))) {
      await sequelize.query('ALTER TABLE users ADD INDEX idx_users_organization (organization_id)');
    }
    if (!(await hasIndex(sequelize, 'users', 'idx_users_hospital'))) {
      await sequelize.query('ALTER TABLE users ADD INDEX idx_users_hospital (hospital_id)');
    }
    if (!(await hasIndex(sequelize, 'users', 'idx_users_branch'))) {
      await sequelize.query('ALTER TABLE users ADD INDEX idx_users_branch (branch_id)');
    }

    await sequelize.query(
      `INSERT INTO organizations (code, name, legal_name, timezone, currency_code, is_active, created_at, updated_at)
       SELECT 'ORG-DEFAULT',
              COALESCE((SELECT value FROM settings WHERE \`key\` = 'company_name' LIMIT 1), 'Default Hospital Group'),
              COALESCE((SELECT value FROM settings WHERE \`key\` = 'company_name' LIMIT 1), 'Default Hospital Group'),
              'Asia/Dhaka', 'BDT', 1, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'ORG-DEFAULT')`
    );

    const [[organization]] = await sequelize.query(
      "SELECT id FROM organizations WHERE code = 'ORG-DEFAULT' ORDER BY id LIMIT 1"
    );

    await sequelize.query(
      `INSERT INTO hospitals (organization_id, code, name, hospital_type, is_active, created_at, updated_at)
       SELECT ?, 'HOSP-MAIN', 'Main Hospital', 'general', 1, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM hospitals WHERE organization_id = ? AND code = 'HOSP-MAIN')`,
      { replacements: [organization.id, organization.id] }
    );

    const [[hospital]] = await sequelize.query(
      "SELECT id FROM hospitals WHERE organization_id = ? AND code = 'HOSP-MAIN' ORDER BY id LIMIT 1",
      { replacements: [organization.id] }
    );

    const [legacyBranches] = await sequelize.query(
      `SELECT code, label, description, is_active
         FROM master_options
        WHERE type = 'branch' AND deleted_at IS NULL
        ORDER BY sort_order, id`
    );

    if (legacyBranches.length) {
      for (let index = 0; index < legacyBranches.length; index += 1) {
        const item = legacyBranches[index];
        await sequelize.query(
          `INSERT INTO branches (hospital_id, code, name, address, is_main, is_active, created_at, updated_at)
           SELECT ?, ?, ?, ?, ?, ?, NOW(), NOW()
           WHERE NOT EXISTS (SELECT 1 FROM branches WHERE hospital_id = ? AND code = ?)`,
          {
            replacements: [
              hospital.id,
              String(item.code || `BR-${index + 1}`).slice(0, 40),
              item.label,
              item.description || null,
              index === 0 ? 1 : 0,
              item.is_active ? 1 : 0,
              hospital.id,
              String(item.code || `BR-${index + 1}`).slice(0, 40),
            ],
          }
        );
      }
    } else {
      await sequelize.query(
        `INSERT INTO branches (hospital_id, code, name, is_main, is_active, created_at, updated_at)
         SELECT ?, 'BR-MAIN', 'Main Branch', 1, 1, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM branches WHERE hospital_id = ? AND code = 'BR-MAIN')`,
        { replacements: [hospital.id, hospital.id] }
      );
    }

    const [[branch]] = await sequelize.query(
      'SELECT id FROM branches WHERE hospital_id = ? AND deleted_at IS NULL ORDER BY is_main DESC, id LIMIT 1',
      { replacements: [hospital.id] }
    );

    await sequelize.query(
      `UPDATE users
          SET organization_id = COALESCE(organization_id, ?),
              hospital_id = COALESCE(hospital_id, ?),
              branch_id = COALESCE(branch_id, ?)
        WHERE deleted_at IS NULL`,
      { replacements: [organization.id, hospital.id, branch.id] }
    );
  },

  async down() {
    throw new Error(
      '024-enterprise-organization-hierarchy is not reversible because organization ownership becomes operational master data'
    );
  },
};
