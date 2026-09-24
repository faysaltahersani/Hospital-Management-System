'use strict';

// Seeds `code_sequences` (migration 015) for the remaining document types.
//
// Migration 015 covered invoices, payments and OPD visits — the paths measured
// first. A 10-concurrent-user booking test then showed the same read-then-write
// race defeating every other module: 9 of 10 simultaneous requests failed with
// HTTP 409 "Resource already exists" for IPD admissions, lab orders, radiology
// bills, blood bags, ambulance calls, pharmacy purchases and referral bills,
// because each derived its code from `COUNT(*) + 1` and all ten computed the same
// number.
//
// Each counter starts one past the highest suffix already issued, so numbering
// continues rather than colliding with existing documents.

const YEARLY = [
  { name: 'appointment', prefix: 'APT', table: 'appointments', column: 'appointment_code' },
  { name: 'admission', prefix: 'ADM', table: 'admissions', column: 'admission_code' },
  { name: 'lab_order', prefix: 'LAB', table: 'lab_orders', column: 'order_code' },
  { name: 'radiology_order', prefix: 'RAD', table: 'radiology_orders', column: 'order_code' },
  { name: 'ambulance_trip', prefix: 'TRIP', table: 'ambulance_trips', column: 'trip_code' },
  { name: 'blood_bag', prefix: 'BB', table: 'blood_bags', column: 'bag_code' },
  { name: 'blood_issue', prefix: 'BI', table: 'blood_issues', column: 'issue_code' },
  { name: 'blood_donor', prefix: 'DN', table: 'blood_donors', column: 'donor_code' },
  { name: 'medicine_sale', prefix: 'MS', table: 'medicine_sales', column: 'sale_code' },
  { name: 'referral', prefix: 'REF', table: 'referrals', column: 'referral_code' },
  { name: 'patient', prefix: 'P', table: 'patients', column: 'patient_code' },
  { name: 'doctor', prefix: 'D', table: 'doctors', column: 'doctor_code' },
  { name: 'prescription', prefix: 'RX', table: 'prescriptions', column: 'prescription_code' },
  { name: 'employee', prefix: 'EMP', table: 'hr_employees', column: 'employee_code' },
];

// Counters that are not year-scoped: `PREFIX-NNNNNN` held in master_options.
const FLAT = [
  { name: 'pharmacy_purchase', prefix: 'PUR-', type: 'pharmacy_purchase', base: 100000 },
  { name: 'pharmacy_sales_return', prefix: 'SR-', type: 'pharmacy_sales_return', base: 100000 },
  { name: 'pharmacy_purchase_return', prefix: 'PR-', type: 'pharmacy_purchase_return', base: 100000 },
  { name: 'referral_bill', prefix: 'REF-BILL-', type: 'referral_bill', base: 1000 },
  { name: 'referral_person', prefix: 'REF-PERSON-', type: 'referral_person', base: 100 },
];

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

const put = (sequelize, name, next) =>
  sequelize.query(
    `INSERT INTO code_sequences (name, next_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE next_value = GREATEST(next_value, VALUES(next_value))`,
    { replacements: [name, next] }
  );

module.exports = {
  async up({ sequelize }) {
    let seeded = 0;

    for (const src of YEARLY) {
      if (!(await tableExists(sequelize, src.table))) continue;
      if (!(await columnExists(sequelize, src.table, src.column))) continue;
      const [rows] = await sequelize.query(
        `SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(\`${src.column}\`, '-', 2), '-', -1) AS yr,
                MAX(CAST(SUBSTRING_INDEX(\`${src.column}\`, '-', -1) AS UNSIGNED)) AS max_seq
           FROM \`${src.table}\`
          WHERE \`${src.column}\` LIKE '${src.prefix}-____-%'
          GROUP BY yr`
      );
      for (const row of rows) {
        const year = String(row.yr);
        if (!/^\d{4}$/.test(year)) continue;
        const next = Number(row.max_seq || 0) + 1;
        await put(sequelize, `${src.name}:${year}`, next);
        seeded += 1;
        // eslint-disable-next-line no-console
        console.log(`  ${src.name}:${year} -> next ${next} (highest issued ${row.max_seq})`);
      }
    }

    if (await tableExists(sequelize, 'master_options')) {
      for (const src of FLAT) {
        const [[row]] = await sequelize.query(
          `SELECT MAX(CAST(SUBSTRING(code, ?) AS UNSIGNED)) AS max_seq
             FROM master_options
            WHERE type = ? AND code LIKE ?`,
          { replacements: [src.prefix.length + 1, src.type, `${src.prefix}%`] }
        );
        const highest = Number(row?.max_seq || 0);
        // Counters are offsets from the module's base (e.g. PUR-100001 is #1).
        const next = highest > src.base ? highest - src.base + 1 : 1;
        await put(sequelize, src.name, next);
        seeded += 1;
        // eslint-disable-next-line no-console
        console.log(`  ${src.name} -> next ${next} (highest issued ${highest || 'none'})`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`  ${seeded} counter(s) seeded`);
  },

  async down({ sequelize }) {
    const names = [...FLAT.map((f) => f.name)];
    const [rows] = await sequelize.query(
      `SELECT name FROM code_sequences WHERE name REGEXP ? OR name IN (${names.map(() => '?').join(',')})`,
      { replacements: [`^(${YEARLY.map((y) => y.name).join('|')}):[0-9]{4}$`, ...names] }
    );
    if (rows.length) {
      await sequelize.query(
        `DELETE FROM code_sequences WHERE name IN (${rows.map(() => '?').join(',')})`,
        { replacements: rows.map((r) => r.name) }
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  removed ${rows.length} seeded counter(s)`);
  },
};
