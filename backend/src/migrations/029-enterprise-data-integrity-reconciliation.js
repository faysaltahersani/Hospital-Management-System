'use strict';

const parse = (value) => { try { return JSON.parse(value || '{}'); } catch { return {}; } };
const dateOnly = (value, fallback) => {
  const parsed = new Date(value || fallback);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

// Re-runs two safe, idempotent reconciliation checks. A database restore or an
// interrupted historical migration can leave the preserved legacy source row
// marked as migrated while its normalized target is absent. Expired blood bags
// must likewise not remain advertised as available.
module.exports = {
  async up({ sequelize }) {
    const [accounts] = await sequelize.query("SELECT id,label FROM master_options WHERE type='payment_account'");
    const [heads] = await sequelize.query("SELECT id,label FROM master_options WHERE type='income_head'");
    const accountByName = new Map(accounts.map((row) => [String(row.label).trim().toLowerCase(), row.id]));
    const headByName = new Map(heads.map((row) => [String(row.label).trim().toLowerCase(), row.id]));
    const resolve = (extra, idKey, nameKey, names) => extra[idKey] ? Number(extra[idKey]) : names.get(String(extra[nameKey] || '').trim().toLowerCase()) || null;

    const [incomeRows] = await sequelize.query("SELECT id,code,description,created_at FROM master_options WHERE type='income_entry'");
    for (const row of incomeRows) {
      const extra = parse(row.description);
      await sequelize.query(
        `INSERT IGNORE INTO income_entries
          (income_code,income_head_id,account_id,amount,income_date,note,created_by,legacy_option_id,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
        { replacements: [
          extra.income_code || row.code,
          resolve(extra, 'income_head_id', 'income_head_name', headByName),
          resolve(extra, 'account_id', 'account_name', accountByName),
          Number(extra.amount || 0),
          dateOnly(extra.income_date, row.created_at),
          extra.note || null,
          extra.created_by || null,
          row.id,
          row.created_at || new Date(),
        ] }
      );
    }
    await sequelize.query(`
      UPDATE income_entries target
      JOIN master_options legacy ON legacy.type='income_entry' AND legacy.code=target.income_code
      SET target.legacy_option_id=legacy.id
      WHERE target.legacy_option_id IS NULL
    `);

    const [contraRows] = await sequelize.query("SELECT id,code,description,created_at FROM master_options WHERE type='contra_entry'");
    for (const row of contraRows) {
      const extra = parse(row.description);
      await sequelize.query(
        `INSERT IGNORE INTO contra_entries
          (contra_code,from_account_id,to_account_id,amount,transaction_date,note,created_by,legacy_option_id,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
        { replacements: [
          extra.contra_code || row.code,
          resolve(extra, 'from_account_id', 'from_account_name', accountByName),
          resolve(extra, 'to_account_id', 'to_account_name', accountByName),
          Number(extra.amount || 0),
          dateOnly(extra.transaction_date, row.created_at),
          extra.note || null,
          extra.created_by || null,
          row.id,
          row.created_at || new Date(),
        ] }
      );
    }
    await sequelize.query(`
      UPDATE contra_entries target
      JOIN master_options legacy ON legacy.type='contra_entry' AND legacy.code=target.contra_code
      SET target.legacy_option_id=legacy.id
      WHERE target.legacy_option_id IS NULL
    `);

    await sequelize.query("UPDATE blood_bags SET status='expired' WHERE status='available' AND expires_at < NOW()");
  },

  async down() {
    throw new Error('029-enterprise-data-integrity-reconciliation is not reversible because it repairs normalized financial records and safety statuses');
  },
};
