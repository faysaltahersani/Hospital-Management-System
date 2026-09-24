'use strict';

// BUG-016 — income and contra entries were stored as `master_options` rows with
// their real data inside a TEXT `description` JSON blob. Nothing was indexable,
// so the services fetched ONE PAGE from the database and then filtered that page
// in JavaScript, reporting `total: filteredItems.length`. Any record beyond page
// one was unreachable by search or date filter, and the pager was wrong.
//
// Real tables make the columns filterable, sortable and indexable, so filtering
// happens in SQL before pagination.
//
// Reversible and non-destructive: the original `master_options` rows are left in
// place (marked as migrated in their JSON) so `down` can simply drop the new
// tables without any data loss.

const hasTable = async (sequelize, table) => {
  const [rows] = await sequelize.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    { replacements: [table] }
  );
  return rows.length > 0;
};

const parse = (v) => { try { return JSON.parse(v || '{}'); } catch { return {}; } };

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`income_entries\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`income_code\` VARCHAR(30) NOT NULL,
        \`income_head_id\` BIGINT UNSIGNED NULL,
        \`account_id\` BIGINT UNSIGNED NULL,
        \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`income_date\` DATE NOT NULL,
        \`note\` VARCHAR(500) NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`legacy_option_id\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`income_entries_code\` (\`income_code\`),
        KEY \`income_entries_date\` (\`income_date\`),
        KEY \`income_entries_head\` (\`income_head_id\`),
        KEY \`income_entries_account\` (\`account_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`contra_entries\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`contra_code\` VARCHAR(30) NOT NULL,
        \`from_account_id\` BIGINT UNSIGNED NULL,
        \`to_account_id\` BIGINT UNSIGNED NULL,
        \`amount\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`transaction_date\` DATE NOT NULL,
        \`note\` VARCHAR(500) NULL,
        \`created_by\` BIGINT UNSIGNED NULL,
        \`legacy_option_id\` BIGINT UNSIGNED NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`contra_entries_code\` (\`contra_code\`),
        KEY \`contra_entries_date\` (\`transaction_date\`),
        KEY \`contra_entries_from\` (\`from_account_id\`),
        KEY \`contra_entries_to\` (\`to_account_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    // Resolve legacy account/head references, which were sometimes stored as a
    // name string rather than an id.
    const [accounts] = await sequelize.query(
      "SELECT id, label FROM master_options WHERE type = 'payment_account'"
    );
    const accountByName = new Map(accounts.map((a) => [String(a.label).toLowerCase().trim(), a.id]));
    const [heads] = await sequelize.query(
      "SELECT id, label FROM master_options WHERE type = 'income_head'"
    );
    const headByName = new Map(heads.map((h) => [String(h.label).toLowerCase().trim(), h.id]));

    const resolveAccount = (extra, idKey, nameKey) => {
      if (extra[idKey]) return Number(extra[idKey]);
      const name = extra[nameKey];
      if (name) return accountByName.get(String(name).toLowerCase().trim()) || null;
      return null;
    };

    // ── income ────────────────────────────────────────────────────────────────
    const [incomeRows] = await sequelize.query(
      "SELECT id, code, label, description, created_at FROM master_options WHERE type = 'income_entry'"
    );
    let incomeMigrated = 0;
    let incomeAmount = 0;
    for (const row of incomeRows) {
      const extra = parse(row.description);
      const [existing] = await sequelize.query(
        'SELECT id FROM income_entries WHERE legacy_option_id = ? OR income_code = ?',
        { replacements: [row.id, extra.income_code || row.code] }
      );
      if (existing.length) continue;

      const amount = Number(extra.amount || 0);
      const headId = extra.income_head_id
        ? Number(extra.income_head_id)
        : (extra.income_head_name ? headByName.get(String(extra.income_head_name).toLowerCase().trim()) || null : null);

      await sequelize.query(
        `INSERT INTO income_entries
           (income_code, income_head_id, account_id, amount, income_date, note, created_by, legacy_option_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        {
          replacements: [
            extra.income_code || row.code,
            headId,
            resolveAccount(extra, 'account_id', 'account_name'),
            amount,
            toDate(extra.income_date) || toDate(row.created_at),
            extra.note || null,
            extra.created_by || null,
            row.id,
            row.created_at,
          ],
        }
      );
      incomeMigrated += 1;
      incomeAmount += amount;
    }

    // ── contra ────────────────────────────────────────────────────────────────
    const [contraRows] = await sequelize.query(
      "SELECT id, code, description, created_at FROM master_options WHERE type = 'contra_entry'"
    );
    let contraMigrated = 0;
    let contraAmount = 0;
    for (const row of contraRows) {
      const extra = parse(row.description);
      const [existing] = await sequelize.query(
        'SELECT id FROM contra_entries WHERE legacy_option_id = ? OR contra_code = ?',
        { replacements: [row.id, extra.contra_code || row.code] }
      );
      if (existing.length) continue;

      const amount = Number(extra.amount || 0);
      await sequelize.query(
        `INSERT INTO contra_entries
           (contra_code, from_account_id, to_account_id, amount, transaction_date, note, created_by, legacy_option_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        {
          replacements: [
            extra.contra_code || row.code,
            resolveAccount(extra, 'from_account_id', 'from_account_name'),
            resolveAccount(extra, 'to_account_id', 'to_account_name'),
            amount,
            toDate(extra.transaction_date) || toDate(row.created_at),
            extra.note || null,
            extra.created_by || null,
            row.id,
            row.created_at,
          ],
        }
      );
      contraMigrated += 1;
      contraAmount += amount;
    }

    // Mark the legacy rows so it is obvious they are superseded, without
    // deleting them.
    await sequelize.query(
      `UPDATE master_options
          SET description = JSON_SET(COALESCE(NULLIF(description,''),'{}'), '$.migrated_to_table', true)
        WHERE type IN ('income_entry','contra_entry')
          AND JSON_VALID(COALESCE(NULLIF(description,''),'{}'))`
    );

    const [[incCheck]] = await sequelize.query('SELECT COUNT(*) n, COALESCE(SUM(amount),0) amt FROM income_entries');
    const [[conCheck]] = await sequelize.query('SELECT COUNT(*) n, COALESCE(SUM(amount),0) amt FROM contra_entries');

    // eslint-disable-next-line no-console
    console.log(
      `  income_entries: migrated ${incomeMigrated} row(s) totalling ${incomeAmount.toFixed(2)} ` +
        `(table now holds ${incCheck.n} / ${Number(incCheck.amt).toFixed(2)}). ` +
        `contra_entries: migrated ${contraMigrated} row(s) totalling ${contraAmount.toFixed(2)} ` +
        `(table now holds ${conCheck.n} / ${Number(conCheck.amt).toFixed(2)}). ` +
        `Legacy master_options rows preserved.`
    );
  },

  async down({ sequelize }) {
    if (await hasTable(sequelize, 'income_entries')) await sequelize.query('DROP TABLE `income_entries`');
    if (await hasTable(sequelize, 'contra_entries')) await sequelize.query('DROP TABLE `contra_entries`');
    await sequelize.query(
      `UPDATE master_options
          SET description = JSON_REMOVE(description, '$.migrated_to_table')
        WHERE type IN ('income_entry','contra_entry') AND JSON_VALID(COALESCE(NULLIF(description,''),'{}'))`
    );
  },
};
