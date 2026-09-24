'use strict';

// BUG-039 — `invoices.paid_amount` and `invoices.status` were writable directly
// (PATCH /billing/invoices/:id accepted `status`, and paid_amount was maintained
// by hand alongside the payment rows). The service now derives both from the
// `payments` table, which exposed two legacy rows whose claimed settlement is not
// backed by any payment record:
//
//   INV-001  total 1200.00, paid_amount 1200.00, status 'paid'
//            -> payment rows total 1000.00   (200.00 unbacked)
//   INV-002  total 1950.00, paid_amount 1950.00, status 'paid'
//            -> no payment rows at all      (1950.00 unbacked)
//
// Two things this migration deliberately does NOT do:
//   * It does not invent payment rows to justify the claimed amounts. Whether
//     that money was actually received is a question only the hospital's records
//     can answer, and fabricating receipts would make an accounting problem
//     invisible.
//   * It does not delete anything. The claimed figures are copied to
//     `paid_amount_before_reconciliation` / `status_before_reconciliation` first,
//     so the original assertion survives and the change can be reversed.
//
// What it does: brings paid_amount and status into agreement with the payment
// records that actually exist, so the derived-status invariant holds for the whole
// table, and flags the affected invoices in `notes` for finance to investigate.
//
// The reconciled rows are reported by `npm run db:migrate up` so the amounts are
// not lost in a log file.

const hasColumn = async (sequelize, table, column) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return rows.length > 0;
};

const FLAG = '[UNBACKED-PAYMENT-RECONCILED]';

module.exports = {
  async up({ sequelize }) {
    if (!(await hasColumn(sequelize, 'invoices', 'paid_amount_before_reconciliation'))) {
      await sequelize.query(
        'ALTER TABLE `invoices` ADD COLUMN `paid_amount_before_reconciliation` DECIMAL(12,2) NULL'
      );
    }
    if (!(await hasColumn(sequelize, 'invoices', 'status_before_reconciliation'))) {
      await sequelize.query(
        'ALTER TABLE `invoices` ADD COLUMN `status_before_reconciliation` VARCHAR(30) NULL'
      );
    }

    // Every invoice whose claimed paid_amount disagrees with its payment rows.
    const [mismatched] = await sequelize.query(
      `SELECT i.id, i.invoice_code, i.total, i.paid_amount, i.status,
              COALESCE(p.real_paid, 0) AS real_paid
         FROM invoices i
         LEFT JOIN (
              SELECT invoice_id, SUM(amount) AS real_paid
                FROM payments GROUP BY invoice_id
         ) p ON p.invoice_id = i.id
        WHERE i.deleted_at IS NULL
          AND i.status <> 'void'
          AND ABS(i.paid_amount - COALESCE(p.real_paid, 0)) > 0.001`
    );

    if (mismatched.length === 0) {
      console.log('  no invoices with unbacked paid_amount; nothing to reconcile');
      return;
    }

    for (const inv of mismatched) {
      const realPaid = Number(inv.real_paid);
      const total = Number(inv.total);
      // Same derivation the service now uses, on integer minor units.
      const paidMinor = Math.round(realPaid * 100);
      const totalMinor = Math.round(total * 100);
      let derived = 'sent';
      if (paidMinor > 0) derived = paidMinor >= totalMinor ? 'paid' : 'partially_paid';

      const unbacked = (Number(inv.paid_amount) - realPaid).toFixed(2);
      const note =
        `${FLAG} claimed paid_amount ${Number(inv.paid_amount).toFixed(2)} / status '${inv.status}' ` +
        `but payment records total ${realPaid.toFixed(2)} (${unbacked} unbacked). ` +
        'Reconciled to the payment records; original values kept in ' +
        'paid_amount_before_reconciliation / status_before_reconciliation. ' +
        'Finance must confirm whether the missing receipts exist.';

      await sequelize.query(
        `UPDATE invoices
            SET paid_amount_before_reconciliation =
                  COALESCE(paid_amount_before_reconciliation, paid_amount),
                status_before_reconciliation =
                  COALESCE(status_before_reconciliation, status),
                paid_amount = ?,
                status = ?,
                notes = CASE
                          WHEN notes IS NULL OR notes = '' THEN ?
                          WHEN notes LIKE ? THEN notes
                          ELSE CONCAT(notes, '\n', ?)
                        END
          WHERE id = ?`,
        { replacements: [realPaid.toFixed(2), derived, note, `%${FLAG}%`, note, inv.id] }
      );

      console.log(
        `  ${inv.invoice_code}: paid_amount ${Number(inv.paid_amount).toFixed(2)} -> ${realPaid.toFixed(2)}, ` +
          `status '${inv.status}' -> '${derived}' (${unbacked} unbacked, original preserved)`
      );
    }

    console.log(`  reconciled ${mismatched.length} invoice(s) against their payment records`);
  },

  async down({ sequelize }) {
    // Restores the claimed figures from the backup columns. The flag line stays
    // in `notes` on purpose: the discrepancy was real and should remain visible.
    const [rows] = await sequelize.query(
      `SELECT id, invoice_code, paid_amount, paid_amount_before_reconciliation,
              status, status_before_reconciliation
         FROM invoices
        WHERE paid_amount_before_reconciliation IS NOT NULL`
    );
    for (const r of rows) {
      await sequelize.query(
        `UPDATE invoices
            SET paid_amount = paid_amount_before_reconciliation,
                status = COALESCE(status_before_reconciliation, status),
                paid_amount_before_reconciliation = NULL,
                status_before_reconciliation = NULL
          WHERE id = ?`,
        { replacements: [r.id] }
      );
      console.log(`  ${r.invoice_code}: restored claimed paid_amount ${r.paid_amount_before_reconciliation}`);
    }
    console.log(`  reverted ${rows.length} invoice reconciliation(s)`);
  },
};
