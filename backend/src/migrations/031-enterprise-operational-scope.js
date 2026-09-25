'use strict';

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, { replacements: [table, column] });
  return rows.length > 0;
};
const hasIndex = async (sequelize, table, index) => {
  const [rows] = await sequelize.query(`SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?`, { replacements: [table, index] });
  return rows.length > 0;
};

const ROOT_TABLES = [
  'patients','patient_allergies','patient_problems','patient_histories','vital_signs','clinical_notes',
  'doctors','appointments','opd_visits','admissions','prescriptions','diagnostic_studies',
  'departments','wards','beds','lab_tests','lab_orders','radiology_tests','radiology_orders',
  'medicines','medicine_batches','medicine_sales','invoices','payments','expense_categories','expenses',
  'income_entries','contra_entries','blood_donors','blood_bags','blood_issues','ambulances','ambulance_trips',
  'referrals','employees','attendance','payrolls'
];
const DEPARTMENT_TABLES = ['users','admissions','lab_orders','radiology_orders','diagnostic_studies','invoices'];

module.exports = {
  async up({ sequelize }) {
    const [[scope]] = await sequelize.query(`
      SELECT o.id organization_id,h.id hospital_id,b.id branch_id
        FROM organizations o JOIN hospitals h ON h.organization_id=o.id
        JOIN branches b ON b.hospital_id=h.id
       ORDER BY (o.code='ORG-DEFAULT') DESC,b.is_main DESC,o.id,h.id,b.id LIMIT 1
    `);
    for (const table of ROOT_TABLES) {
      for (const column of ['organization_id','hospital_id','branch_id']) {
        if (!(await hasColumn(sequelize, table, column))) {
          await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` BIGINT UNSIGNED NULL`);
        }
      }
      await sequelize.query(`UPDATE \`${table}\` SET organization_id=COALESCE(organization_id,?), hospital_id=COALESCE(hospital_id,?), branch_id=COALESCE(branch_id,?)`, { replacements: [scope.organization_id, scope.hospital_id, scope.branch_id] });
      const index = `idx_${table.slice(0, 44)}_scope`;
      if (!(await hasIndex(sequelize, table, index))) await sequelize.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` (organization_id,hospital_id,branch_id)`);
      for (const [column, target] of [['organization_id','organizations'],['hospital_id','hospitals'],['branch_id','branches']]) {
        const fk = `fk_${table.slice(0, 43)}_${column.replace('_id','')}`;
        const [existing] = await sequelize.query(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?`, { replacements: [table, fk] });
        if (!existing.length) await sequelize.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${target}\`(id) ON DELETE RESTRICT`);
      }
    }
    for (const table of DEPARTMENT_TABLES) {
      if (!(await hasColumn(sequelize, table, 'department_id'))) await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN department_id BIGINT UNSIGNED NULL`);
      const index = `idx_${table.slice(0, 48)}_department`;
      if (!(await hasIndex(sequelize, table, index))) await sequelize.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` (department_id)`);
      const fk = `fk_${table.slice(0, 47)}_department`;
      const [existing] = await sequelize.query(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?`, { replacements: [table, fk] });
      if (!existing.length) await sequelize.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`);
    }
    await sequelize.query(`UPDATE users u JOIN doctors d ON d.user_id=u.id SET u.department_id=COALESCE(u.department_id,d.department_id)`);
    await sequelize.query(`UPDATE admissions a LEFT JOIN doctors d ON d.id=a.doctor_id SET a.department_id=COALESCE(a.department_id,d.department_id)`);
    await sequelize.query(`UPDATE lab_orders o LEFT JOIN doctors d ON d.id=o.doctor_id SET o.department_id=COALESCE(o.department_id,d.department_id)`);
    await sequelize.query(`UPDATE radiology_orders o LEFT JOIN doctors d ON d.id=o.doctor_id SET o.department_id=COALESCE(o.department_id,d.department_id)`);
    await sequelize.query(`UPDATE diagnostic_studies s LEFT JOIN doctors d ON d.id=s.referring_doctor_id SET s.department_id=COALESCE(s.department_id,d.department_id)`);
    await sequelize.query(`UPDATE invoices i LEFT JOIN appointments a ON a.id=i.appointment_id LEFT JOIN opd_visits o ON o.id=i.opd_visit_id SET i.department_id=COALESCE(i.department_id,a.department_id,o.department_id)`);
  },
  async down() {
    throw new Error('031-enterprise-operational-scope is not reversible because tenant ownership is now part of production data integrity');
  },
};
