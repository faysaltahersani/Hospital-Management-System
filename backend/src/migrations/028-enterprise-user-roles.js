'use strict';

const ROLE_SQL = [
  'super_admin', 'admin', 'hospital_admin', 'branch_admin', 'ceo', 'management',
  'doctor', 'nurse', 'receptionist', 'cashier', 'accountant', 'finance_manager',
  'pharmacist', 'lab_tech', 'pathologist', 'radiologist', 'ot_staff', 'anesthetist',
  'icu_staff', 'blood_bank_staff', 'procurement_officer', 'store_manager', 'hr_manager',
  'housekeeping', 'dietician', 'ambulance_staff', 'insurance_officer', 'patient',
].map((role) => `'${role}'`).join(',');

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`ALTER TABLE users MODIFY COLUMN role ENUM(${ROLE_SQL}) NOT NULL DEFAULT 'receptionist'`);
  },

  async down() {
    throw new Error('028-enterprise-user-roles is not reversible because users may already hold enterprise roles');
  },
};
