'use strict';

// BUG-012 / BUG-026 — there was no batch table at all. `listBatchStock`
// fabricated a batch for every medicine that had no purchase record, inventing
// `current_stock: 50` and `expiry_date: '2027-12-31'`, and defaulted any real
// batch's missing expiry to the same date. Staff could dispense against stock
// that did not exist, and expiry surveillance was meaningless.
//
// Backfill strategy — records what is known, invents nothing:
//   1. Batches reconstructed from the existing pharmacy_purchase records
//      (master_options JSON), preserving batch_no, expiry_date, quantity and
//      purchase price exactly as entered.
//   2. Any remaining quantity in medicines.stock_quantity that purchases do not
//      account for becomes a single batch `OPENING` with expiry_date NULL —
//      an explicit "opening balance, expiry not recorded" marker rather than a
//      made-up date. FEFO consumes dated batches first and treats NULL-expiry
//      stock as last, and the report below lists exactly how much is affected so
//      it can be corrected by a stock take.

const hasTable = async (sequelize, table) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return rows.length > 0;
};

const parseJson = (v) => {
  try { return JSON.parse(v || '{}'); } catch { return {}; }
};

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`medicine_batches\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`medicine_id\` BIGINT UNSIGNED NOT NULL,
        \`batch_no\` VARCHAR(60) NOT NULL,
        \`expiry_date\` DATE NULL,
        \`quantity_in\` INT NOT NULL DEFAULT 0,
        \`quantity_out\` INT NOT NULL DEFAULT 0,
        \`purchase_price\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`sale_price\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`source\` VARCHAR(60) NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        \`deleted_at\` DATETIME NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`medicine_batches_medicine_batch\` (\`medicine_id\`, \`batch_no\`),
        KEY \`medicine_batches_expiry\` (\`expiry_date\`),
        CONSTRAINT \`medicine_batches_medicine_fk\` FOREIGN KEY (\`medicine_id\`)
          REFERENCES \`medicines\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    // Records which batches a sale consumed, so a return goes back to the right
    // batch instead of inflating an arbitrary one.
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS \`medicine_sale_item_batches\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`sale_item_id\` BIGINT UNSIGNED NOT NULL,
        \`batch_id\` BIGINT UNSIGNED NOT NULL,
        \`quantity\` INT NOT NULL,
        \`created_at\` DATETIME NOT NULL,
        \`updated_at\` DATETIME NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`msib_sale_item\` (\`sale_item_id\`),
        KEY \`msib_batch\` (\`batch_id\`),
        CONSTRAINT \`msib_sale_item_fk\` FOREIGN KEY (\`sale_item_id\`)
          REFERENCES \`medicine_sale_items\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`msib_batch_fk\` FOREIGN KEY (\`batch_id\`)
          REFERENCES \`medicine_batches\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
    );

    // ── 1. reconstruct batches from recorded purchases ──────────────────────
    const [purchases] = await sequelize.query(
      "SELECT id, code, description FROM master_options WHERE type = 'pharmacy_purchase'"
    );
    let fromPurchases = 0;
    const perMedicine = new Map();

    for (const purchase of purchases) {
      const extra = parseJson(purchase.description);
      const items = Array.isArray(extra.items) ? extra.items : [];
      for (const item of items) {
        const medicineId = Number(item.medicine_id || 0);
        const qty = Number(item.quantity || 0);
        if (!medicineId || qty <= 0) continue;
        const batchNo = String(item.batch_no || `PUR-${purchase.code}`).slice(0, 60);
        const expiry = item.expiry_date ? String(item.expiry_date).slice(0, 10) : null;

        // eslint-disable-next-line no-await-in-loop
        const [existing] = await sequelize.query(
          'SELECT id FROM medicine_batches WHERE medicine_id = ? AND batch_no = ?',
          { replacements: [medicineId, batchNo] }
        );
        if (existing.length) {
          // eslint-disable-next-line no-await-in-loop
          await sequelize.query(
            'UPDATE medicine_batches SET quantity_in = quantity_in + ?, updated_at = NOW() WHERE id = ?',
            { replacements: [qty, existing[0].id] }
          );
        } else {
          // eslint-disable-next-line no-await-in-loop
          await sequelize.query(
            `INSERT INTO medicine_batches
               (medicine_id, batch_no, expiry_date, quantity_in, quantity_out, purchase_price, sale_price, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                medicineId,
                batchNo,
                expiry,
                qty,
                Number(item.purchase_price || 0),
                Number(item.sale_price || 0),
                `purchase:${purchase.code}`,
              ],
            }
          );
        }
        fromPurchases += 1;
        perMedicine.set(medicineId, (perMedicine.get(medicineId) || 0) + qty);
      }
    }

    // ── 2. opening balance for stock purchases do not explain ───────────────
    const [medicines] = await sequelize.query(
      'SELECT id, code, name, stock_quantity, purchase_price, sale_price FROM medicines WHERE deleted_at IS NULL'
    );
    let openingBatches = 0;
    let openingUnits = 0;
    for (const med of medicines) {
      const accounted = perMedicine.get(Number(med.id)) || 0;
      const remainder = Number(med.stock_quantity || 0) - accounted;
      if (remainder <= 0) continue;
      // eslint-disable-next-line no-await-in-loop
      const [existing] = await sequelize.query(
        "SELECT id FROM medicine_batches WHERE medicine_id = ? AND batch_no = 'OPENING'",
        { replacements: [med.id] }
      );
      if (existing.length) continue;
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(
        `INSERT INTO medicine_batches
           (medicine_id, batch_no, expiry_date, quantity_in, quantity_out, purchase_price, sale_price, source, created_at, updated_at)
         VALUES (?, 'OPENING', NULL, ?, 0, ?, ?, 'opening-balance', NOW(), NOW())`,
        { replacements: [med.id, remainder, Number(med.purchase_price || 0), Number(med.sale_price || 0)] }
      );
      openingBatches += 1;
      openingUnits += remainder;
    }

    const [[totals]] = await sequelize.query(
      'SELECT COUNT(*) AS batches, COALESCE(SUM(quantity_in - quantity_out),0) AS units FROM medicine_batches'
    );
    const [[noExpiry]] = await sequelize.query(
      'SELECT COUNT(*) AS n, COALESCE(SUM(quantity_in - quantity_out),0) AS units FROM medicine_batches WHERE expiry_date IS NULL'
    );

    // eslint-disable-next-line no-console
    console.log(
      `  medicine_batches created: ${totals.batches} batch(es), ${totals.units} unit(s) total. ` +
        `${fromPurchases} line(s) reconstructed from recorded purchases; ` +
        `${openingBatches} OPENING batch(es) for ${openingUnits} unaccounted unit(s). ` +
        `${noExpiry.n} batch(es) holding ${noExpiry.units} unit(s) have NO recorded expiry — ` +
        `these need a stock take; no expiry date has been invented.`
    );
  },

  async down({ sequelize }) {
    if (await hasTable(sequelize, 'medicine_sale_item_batches')) {
      await sequelize.query('DROP TABLE `medicine_sale_item_batches`');
    }
    if (await hasTable(sequelize, 'medicine_batches')) {
      await sequelize.query('DROP TABLE `medicine_batches`');
    }
  },
};
