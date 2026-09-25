'use strict';

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_types (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(160) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_service_types_org_code (organization_id, code),
        KEY idx_service_types_org_active (organization_id, is_active),
        CONSTRAINT fk_service_types_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_service_types_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_types_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        service_type_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(60) NOT NULL,
        name VARCHAR(180) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_service_categories_org_code (organization_id, code),
        KEY idx_service_categories_type (service_type_id, is_active),
        CONSTRAINT fk_service_categories_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_service_categories_type FOREIGN KEY (service_type_id) REFERENCES service_types(id),
        CONSTRAINT fk_service_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS services (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NULL,
        branch_id BIGINT UNSIGNED NULL,
        service_type_id BIGINT UNSIGNED NOT NULL,
        service_category_id BIGINT UNSIGNED NULL,
        code VARCHAR(80) NOT NULL,
        name VARCHAR(220) NOT NULL,
        description TEXT NULL,
        billing_unit VARCHAR(40) NOT NULL DEFAULT 'unit',
        requires_approval TINYINT(1) NOT NULL DEFAULT 0,
        is_taxable TINYINT(1) NOT NULL DEFAULT 0,
        default_duration_minutes INT UNSIGNED NULL,
        status ENUM('draft','active','inactive','retired') NOT NULL DEFAULT 'active',
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_services_org_code (organization_id, code),
        KEY idx_services_scope (organization_id, hospital_id, branch_id),
        KEY idx_services_type_category (service_type_id, service_category_id),
        KEY idx_services_name_status (name, status),
        CONSTRAINT fk_services_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_services_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
        CONSTRAINT fk_services_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        CONSTRAINT fk_services_type FOREIGN KEY (service_type_id) REFERENCES service_types(id),
        CONSTRAINT fk_services_category FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE SET NULL,
        CONSTRAINT fk_services_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_services_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_prices (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        service_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NULL,
        branch_id BIGINT UNSIGNED NULL,
        payer_type ENUM('self','corporate','insurance','government','all') NOT NULL DEFAULT 'self',
        payer_reference VARCHAR(120) NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'BDT',
        amount DECIMAL(14,2) NOT NULL,
        tax_rate DECIMAL(7,4) NOT NULL DEFAULT 0,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        version_no INT UNSIGNED NOT NULL DEFAULT 1,
        hospital_scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(hospital_id,0)) STORED,
        branch_scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(branch_id,0)) STORED,
        payer_reference_key VARCHAR(120) GENERATED ALWAYS AS (COALESCE(payer_reference,'')) STORED,
        status ENUM('draft','pending','approved','rejected','retired') NOT NULL DEFAULT 'draft',
        approval_request_id BIGINT UNSIGNED NULL,
        approved_by BIGINT UNSIGNED NULL,
        approved_at DATETIME NULL,
        rejection_reason VARCHAR(500) NULL,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_service_prices_version (service_id, organization_id, hospital_scope_key, branch_scope_key, payer_type, payer_reference_key, version_no),
        KEY idx_service_prices_resolution (service_id, status, effective_from, effective_to),
        KEY idx_service_prices_scope (organization_id, hospital_id, branch_id, payer_type),
        CONSTRAINT fk_service_prices_service FOREIGN KEY (service_id) REFERENCES services(id),
        CONSTRAINT fk_service_prices_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_service_prices_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_prices_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_prices_approval FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_prices_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_prices_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_service_prices_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_service_prices_nonnegative CHECK (amount >= 0),
        CONSTRAINT ck_service_prices_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NULL,
        branch_id BIGINT UNSIGNED NULL,
        service_id BIGINT UNSIGNED NULL,
        service_category_id BIGINT UNSIGNED NULL,
        code VARCHAR(80) NOT NULL,
        name VARCHAR(180) NOT NULL,
        rule_type ENUM('percentage_discount','flat_discount','surcharge','tax_override') NOT NULL,
        value DECIMAL(14,4) NOT NULL,
        payer_type ENUM('self','corporate','insurance','government','all') NOT NULL DEFAULT 'all',
        payer_reference VARCHAR(120) NULL,
        conditions_json LONGTEXT NULL,
        priority INT NOT NULL DEFAULT 100,
        effective_from DATE NOT NULL,
        effective_to DATE NULL,
        status ENUM('draft','pending','approved','rejected','retired') NOT NULL DEFAULT 'draft',
        approval_request_id BIGINT UNSIGNED NULL,
        approved_by BIGINT UNSIGNED NULL,
        approved_at DATETIME NULL,
        rejection_reason VARCHAR(500) NULL,
        created_by BIGINT UNSIGNED NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pricing_rules_org_code (organization_id, code),
        KEY idx_pricing_rules_resolution (service_id, service_category_id, status, effective_from, effective_to),
        KEY idx_pricing_rules_scope (organization_id, hospital_id, branch_id, payer_type),
        CONSTRAINT fk_pricing_rules_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_pricing_rules_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
        CONSTRAINT fk_pricing_rules_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        CONSTRAINT fk_pricing_rules_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        CONSTRAINT fk_pricing_rules_category FOREIGN KEY (service_category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
        CONSTRAINT fk_pricing_rules_approval FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE SET NULL,
        CONSTRAINT fk_pricing_rules_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_pricing_rules_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_pricing_rules_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_pricing_rules_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_source_links (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        organization_id BIGINT UNSIGNED NOT NULL,
        service_id BIGINT UNSIGNED NOT NULL,
        source_type ENUM('doctor','lab_test','radiology_test','bed','ambulance','medicine','blood_bag','legacy_charge') NOT NULL,
        source_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_service_source_link (organization_id, source_type, source_id),
        KEY idx_service_source_service (service_id),
        CONSTRAINT fk_service_source_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_service_source_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (!(await hasColumn(sequelize, 'invoice_items', 'service_id'))) {
      await sequelize.query('ALTER TABLE invoice_items ADD COLUMN service_id BIGINT UNSIGNED NULL AFTER reference_id, ADD KEY idx_invoice_items_service (service_id), ADD CONSTRAINT fk_invoice_items_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL');
    }
    if (!(await hasColumn(sequelize, 'invoice_items', 'service_price_id'))) {
      await sequelize.query('ALTER TABLE invoice_items ADD COLUMN service_price_id BIGINT UNSIGNED NULL AFTER service_id, ADD KEY idx_invoice_items_service_price (service_price_id), ADD CONSTRAINT fk_invoice_items_service_price FOREIGN KEY (service_price_id) REFERENCES service_prices(id) ON DELETE SET NULL');
    }
    if (!(await hasColumn(sequelize, 'invoice_items', 'pricing_snapshot'))) {
      await sequelize.query('ALTER TABLE invoice_items ADD COLUMN pricing_snapshot LONGTEXT NULL AFTER service_price_id');
    }

    const [[org]] = await sequelize.query("SELECT id FROM organizations WHERE code='ORG-DEFAULT' ORDER BY id LIMIT 1");
    const [[hospital]] = await sequelize.query('SELECT id FROM hospitals WHERE organization_id=? ORDER BY id LIMIT 1', { replacements: [org.id] });

    const types = [
      ['CONSULTATION', 'Consultation'], ['LABORATORY', 'Laboratory'], ['RADIOLOGY', 'Radiology'],
      ['BED', 'Bed & Accommodation'], ['AMBULANCE', 'Ambulance'], ['PHARMACY', 'Pharmacy'],
      ['BLOOD', 'Blood Bank'], ['OTHER', 'Other Charges'],
    ];
    for (let i = 0; i < types.length; i += 1) {
      const [code, name] = types[i];
      await sequelize.query(`INSERT IGNORE INTO service_types (organization_id,code,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,NOW(),NOW())`, { replacements: [org.id, code, name, i + 1] });
      const [[type]] = await sequelize.query('SELECT id FROM service_types WHERE organization_id=? AND code=?', { replacements: [org.id, code] });
      await sequelize.query(`INSERT IGNORE INTO service_categories (organization_id,service_type_id,code,name,sort_order,created_at,updated_at) VALUES (?,?,?,?,1,NOW(),NOW())`, { replacements: [org.id, type.id, `${code}-GENERAL`, `${name} - General`] });
    }

    const [[branch]] = await sequelize.query('SELECT id FROM branches WHERE hospital_id=? ORDER BY is_main DESC,id LIMIT 1', { replacements: [hospital.id] });
    const sourceSpecs = [
      { table: 'doctors', type: 'CONSULTATION', source: 'doctor', code: "CONCAT('CONSULT-', d.id)", name: "CONCAT('Consultation - ', u.full_name)", price: 'd.consultation_fee', joins: 'JOIN users u ON u.id=d.user_id', active: 'd.deleted_at IS NULL' },
      { table: 'lab_tests', type: 'LABORATORY', source: 'lab_test', code: "CONCAT('LAB-', COALESCE(NULLIF(d.code,''), d.id))", name: 'd.name', price: 'COALESCE(NULLIF(d.final_charge,0),d.price,0)', joins: '', active: 'd.deleted_at IS NULL' },
      { table: 'radiology_tests', type: 'RADIOLOGY', source: 'radiology_test', code: "CONCAT('RAD-', COALESCE(NULLIF(d.code,''), d.id))", name: 'd.name', price: 'COALESCE(NULLIF(d.final_charge,0),d.price,0)', joins: '', active: 'd.deleted_at IS NULL' },
      { table: 'beds', type: 'BED', source: 'bed', code: "CONCAT('BED-', d.id)", name: "CONCAT('Bed ', d.bed_number)", price: 'd.daily_rate', joins: '', active: 'd.deleted_at IS NULL' },
      { table: 'ambulances', type: 'AMBULANCE', source: 'ambulance', code: "CONCAT('AMB-', d.id)", name: "CONCAT('Ambulance ', d.vehicle_number)", price: 'd.base_fare', joins: '', active: 'd.deleted_at IS NULL' },
      { table: 'medicines', type: 'PHARMACY', source: 'medicine', code: "CONCAT('MED-', COALESCE(NULLIF(d.code,''), d.id))", name: 'd.name', price: 'd.sale_price', joins: '', active: 'd.deleted_at IS NULL' },
      { table: 'blood_bags', type: 'BLOOD', source: 'blood_bag', code: "CONCAT('BLOOD-', d.id)", name: "CONCAT('Blood ', d.blood_group, ' ', d.component)", price: 'd.price', joins: '', active: 'd.deleted_at IS NULL' },
    ];

    for (const spec of sourceSpecs) {
      const [[type]] = await sequelize.query('SELECT id FROM service_types WHERE organization_id=? AND code=?', { replacements: [org.id, spec.type] });
      const [[category]] = await sequelize.query('SELECT id FROM service_categories WHERE organization_id=? AND code=?', { replacements: [org.id, `${spec.type}-GENERAL`] });
      await sequelize.query(`
        INSERT IGNORE INTO services (organization_id,hospital_id,branch_id,service_type_id,service_category_id,code,name,billing_unit,status,created_at,updated_at)
        SELECT ?,?,?,?, ?, LEFT(${spec.code},80), LEFT(${spec.name},220), ?, 'active', NOW(), NOW()
          FROM ${spec.table} d ${spec.joins} WHERE ${spec.active}
      `, { replacements: [org.id, hospital.id, branch.id, type.id, category.id, spec.type === 'BED' ? 'day' : 'unit'] });
      await sequelize.query(`
        INSERT IGNORE INTO service_source_links (organization_id,service_id,source_type,source_id,created_at,updated_at)
        SELECT ?,s.id,?,d.id,NOW(),NOW()
          FROM ${spec.table} d ${spec.joins}
          JOIN services s ON s.organization_id=? AND BINARY s.code=BINARY LEFT(${spec.code},80)
         WHERE ${spec.active}
      `, { replacements: [org.id, spec.source, org.id] });
      await sequelize.query(`
        INSERT IGNORE INTO service_prices (service_id,organization_id,hospital_id,branch_id,payer_type,currency_code,amount,tax_rate,effective_from,version_no,status,approved_at,created_at,updated_at)
        SELECT s.id,?,?,?,'self','BDT',${spec.price},0,CURDATE(),1,
               CASE WHEN ${spec.price}>0 THEN 'approved' ELSE 'draft' END,
               CASE WHEN ${spec.price}>0 THEN NOW() ELSE NULL END,NOW(),NOW()
          FROM ${spec.table} d ${spec.joins}
          JOIN services s ON s.organization_id=? AND BINARY s.code=BINARY LEFT(${spec.code},80)
         WHERE ${spec.active}
           AND NOT EXISTS (
             SELECT 1 FROM service_prices existing
              WHERE existing.service_id=s.id AND existing.organization_id=?
                AND existing.hospital_scope_key=? AND existing.branch_scope_key=?
                AND existing.payer_type='self' AND existing.payer_reference_key='' AND existing.version_no=1
           )
      `, { replacements: [org.id, hospital.id, branch.id, org.id, org.id, hospital.id, branch.id] });
    }

    await sequelize.query(`
      UPDATE invoice_items ii
      JOIN service_source_links l ON l.source_type=CASE ii.item_type
        WHEN 'lab_test' THEN 'lab_test' WHEN 'radiology' THEN 'radiology_test'
        WHEN 'medicine' THEN 'medicine' WHEN 'ambulance' THEN 'ambulance' ELSE 'legacy_charge' END
        AND l.source_id=ii.reference_id
      LEFT JOIN service_prices p ON p.service_id=l.service_id AND p.status='approved'
      SET ii.service_id=l.service_id,
          ii.service_price_id=p.id,
          ii.pricing_snapshot=JSON_OBJECT('source','phase-a-backfill','amount',ii.unit_price,'currency_code','BDT','captured_at',NOW())
      WHERE ii.service_id IS NULL AND ii.reference_id IS NOT NULL
    `);
  },

  async down() {
    throw new Error('030-enterprise-service-charge-catalogue is not reversible because it normalizes active production prices and invoice evidence');
  },
};
