'use strict';

// BUG-019 — eleven read endpoints used to create rows when they found none, so a
// GET mutated the database. The worst case was `GET /beds?status=occupied`: the
// *filtered* count was zero, so four phantom beds were inserted into real wards.
//
// Legitimate configuration defaults move here, where they are applied once,
// idempotently, and only on an explicit `npm run db:migrate`.
//
// Deliberately NOT seeded: income entries, contra entries, referral bills and
// referral persons. Those are transactions and identities; the old code invented
// them (₹25,000 contra, ₹10,000/₹15,000 income, ₹5,000/₹12,000 referral bills
// with commissions, two named doctors). Absent data must read as absent.

const upsertOption = async (sequelize, { type, code, label, description }) => {
  const [rows] = await sequelize.query(
    'SELECT id FROM master_options WHERE type = ? AND code = ?',
    { replacements: [type, code] }
  );
  if (rows.length) return false;
  await sequelize.query(
    `INSERT INTO master_options (type, code, label, description, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 1, NOW(), NOW())`,
    { replacements: [type, code, label, description || null] }
  );
  return true;
};

module.exports = {
  async up({ sequelize }) {
    let added = 0;
    const j = (o) => JSON.stringify(o);

    const accounts = [
      ['ACC-1001', 'Cash Account', { name: 'Cash Account', type: 'Cash', opening_balance: 0 }],
      ['ACC-1002', 'Main Bank Account', { name: 'Main Bank Account', type: 'Bank Account', opening_balance: 0 }],
      ['ACC-1003', 'Mobile Banking', { name: 'Mobile Banking', type: 'Mobile Banking', opening_balance: 0 }],
    ];
    for (const [code, label, extra] of accounts) {
      // eslint-disable-next-line no-await-in-loop
      if (await upsertOption(sequelize, { type: 'payment_account', code, label, description: j(extra) })) added += 1;
    }

    const taxRates = [
      ['TR-1001', 'Standard VAT 5%', { name: 'Standard VAT 5%', code: 'TR-1001', rate: 5, type: 'Percentage' }],
      ['TR-1002', 'Service Tax 10%', { name: 'Service Tax 10%', code: 'TR-1002', rate: 10, type: 'Percentage' }],
      ['TR-1003', 'Exempt 0%', { name: 'Exempt 0%', code: 'TR-1003', rate: 0, type: 'Percentage' }],
    ];
    for (const [code, label, extra] of taxRates) {
      // eslint-disable-next-line no-await-in-loop
      if (await upsertOption(sequelize, { type: 'tax_rate', code, label, description: j(extra) })) added += 1;
    }

    const incomeHeads = [
      'Consultation Fee', 'Lab / Pathology Service', 'Radiology / Imaging',
      'Pharmacy Sales', 'Ambulance Charge', 'Other Income',
    ];
    for (let i = 0; i < incomeHeads.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await upsertOption(sequelize, {
        type: 'income_head',
        code: `INC-HEAD-${101 + i}`,
        label: incomeHeads[i],
        description: j({ title: incomeHeads[i] }),
      })) added += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    if (await upsertOption(sequelize, {
      type: 'building', code: 'BLD_MAIN', label: 'Main Hospital Building',
    })) added += 1;

    const floors = ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];
    for (let i = 0; i < floors.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      if (await upsertOption(sequelize, {
        type: 'floor',
        code: `FLR_${i + 1}`,
        label: floors[i],
        description: j({ building_id: 1 }),
      })) added += 1;
    }

    const bedTypes = [
      ['BTYPE_GENERAL', 'General Bed', 500], ['BTYPE_VIP', 'VIP Bed', 2500],
      ['BTYPE_ICU', 'ICU Bed', 5000], ['BTYPE_CCU', 'CCU Bed', 5000],
      ['BTYPE_CABIN', 'Cabin Bed', 3500],
    ];
    for (const [code, label, rate] of bedTypes) {
      // eslint-disable-next-line no-await-in-loop
      if (await upsertOption(sequelize, {
        type: 'bed_type', code, label, description: j({ daily_rate: rate }),
      })) added += 1;
    }

    const [[cats]] = await sequelize.query('SELECT COUNT(*) AS n FROM expense_categories');
    let catsAdded = 0;
    if (Number(cats.n) === 0) {
      for (const name of ['Utility Bill', 'Office Supplies', 'Staff Salary', 'Equipment Maintenance', 'Medical Supplies', 'Miscellaneous']) {
        // eslint-disable-next-line no-await-in-loop
        await sequelize.query(
          `INSERT INTO expense_categories (name, description, is_active, created_at, updated_at)
           VALUES (?, 'Default category', 1, NOW(), NOW())`,
          { replacements: [name] }
        );
        catsAdded += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `  configuration defaults: ${added} master option(s) and ${catsAdded} expense category/ies added ` +
        `(idempotent). No transactions or identities were seeded.`
    );
  },

  async down() {
    // Not reversible: these defaults may have been edited or referenced by
    // real records, so removing them could break live data.
    throw new Error('008-configuration-defaults is not reversible by design');
  },
};
