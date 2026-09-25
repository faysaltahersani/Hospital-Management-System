'use strict';

// The legacy lab/radiology forms used final_charge=0 as "not configured",
// while price still held the real charge. Zero-rate ambulances/beds likewise
// mean that a per-encounter amount must remain authoritative until a manager
// approves an explicit catalogue price. Repair only the migration-created v1
// source-linked rows; user-authored price versions are never touched.
module.exports = {
  async up({ sequelize }) {
    const updates = [
      ['doctor', 'doctors', 'COALESCE(src.consultation_fee,0)'],
      ['lab_test', 'lab_tests', 'COALESCE(NULLIF(src.final_charge,0),src.price,0)'],
      ['radiology_test', 'radiology_tests', 'COALESCE(NULLIF(src.final_charge,0),src.price,0)'],
      ['bed', 'beds', 'COALESCE(src.daily_rate,0)'],
      ['ambulance', 'ambulances', 'COALESCE(src.base_fare,0)'],
      ['medicine', 'medicines', 'COALESCE(src.sale_price,0)'],
      ['blood_bag', 'blood_bags', 'COALESCE(src.price,0)'],
    ];
    for (const [sourceType, table, amount] of updates) {
      await sequelize.query(`
        UPDATE service_prices p
        JOIN service_source_links l ON l.service_id=p.service_id AND l.source_type=?
        JOIN ${table} src ON src.id=l.source_id
        SET p.amount=${amount},
            p.status=CASE WHEN ${amount}>0 THEN 'approved' ELSE 'draft' END,
            p.approved_at=CASE WHEN ${amount}>0 THEN COALESCE(p.approved_at,NOW()) ELSE NULL END,
            p.updated_at=NOW()
        WHERE p.version_no=1 AND p.payer_type='self'
      `, { replacements: [sourceType] });
    }
  },
  async down() {
    throw new Error('032-catalogue-backfill-price-reconciliation is not reversible because it restores authoritative legacy prices');
  },
};
