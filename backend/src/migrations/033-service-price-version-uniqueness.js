'use strict';

const hasColumn = async (sequelize, column) => {
  const [rows] = await sequelize.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_prices' AND COLUMN_NAME=?`, { replacements: [column] });
  return rows.length > 0;
};
const hasIndex = async (sequelize, index) => {
  const [rows] = await sequelize.query(`SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='service_prices' AND INDEX_NAME=?`, { replacements: [index] });
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    // Point any invoice evidence at the canonical earliest version before the
    // accidental duplicate rows are removed.
    await sequelize.query(`
      UPDATE invoice_items ii
      JOIN service_prices duplicate ON duplicate.id=ii.service_price_id
      JOIN (
        SELECT MIN(id) keep_id,service_id,organization_id,COALESCE(hospital_id,0) hospital_key,
               COALESCE(branch_id,0) branch_key,payer_type,COALESCE(payer_reference,'') payer_key,version_no
          FROM service_prices
         GROUP BY service_id,organization_id,COALESCE(hospital_id,0),COALESCE(branch_id,0),payer_type,COALESCE(payer_reference,''),version_no
      ) canonical ON canonical.service_id=duplicate.service_id AND canonical.organization_id=duplicate.organization_id
        AND canonical.hospital_key=COALESCE(duplicate.hospital_id,0) AND canonical.branch_key=COALESCE(duplicate.branch_id,0)
        AND canonical.payer_type=duplicate.payer_type AND canonical.payer_key=COALESCE(duplicate.payer_reference,'')
        AND canonical.version_no=duplicate.version_no
      SET ii.service_price_id=canonical.keep_id
      WHERE ii.service_price_id<>canonical.keep_id
    `);
    await sequelize.query(`
      DELETE duplicate FROM service_prices duplicate
      JOIN service_prices canonical ON canonical.service_id=duplicate.service_id
        AND canonical.organization_id=duplicate.organization_id
        AND COALESCE(canonical.hospital_id,0)=COALESCE(duplicate.hospital_id,0)
        AND COALESCE(canonical.branch_id,0)=COALESCE(duplicate.branch_id,0)
        AND canonical.payer_type=duplicate.payer_type
        AND COALESCE(canonical.payer_reference,'')=COALESCE(duplicate.payer_reference,'')
        AND canonical.version_no=duplicate.version_no AND canonical.id<duplicate.id
    `);
    if (!(await hasColumn(sequelize, 'hospital_scope_key'))) await sequelize.query(`ALTER TABLE service_prices ADD COLUMN hospital_scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(hospital_id,0)) STORED`);
    if (!(await hasColumn(sequelize, 'branch_scope_key'))) await sequelize.query(`ALTER TABLE service_prices ADD COLUMN branch_scope_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(branch_id,0)) STORED`);
    if (!(await hasColumn(sequelize, 'payer_reference_key'))) await sequelize.query(`ALTER TABLE service_prices ADD COLUMN payer_reference_key VARCHAR(120) GENERATED ALWAYS AS (COALESCE(payer_reference,'')) STORED`);
    if (await hasIndex(sequelize, 'uq_service_prices_version')) await sequelize.query('ALTER TABLE service_prices DROP INDEX uq_service_prices_version');
    await sequelize.query(`ALTER TABLE service_prices ADD UNIQUE KEY uq_service_prices_version (service_id,organization_id,hospital_scope_key,branch_scope_key,payer_type,payer_reference_key,version_no)`);
  },
  async down() {
    throw new Error('033-service-price-version-uniqueness is not reversible because duplicate price versions were reconciled');
  },
};
