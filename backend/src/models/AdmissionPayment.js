'use strict';

const { DataTypes, Model } = require('sequelize');

// BUG-005 — IPD payments were serialized into `admissions.notes` as a
// `PAYMENTS_JSON:[...]` blob, which the discharge endpoint then overwrote,
// destroying the payment history. They are real rows now.
module.exports = (sequelize) => {
  class AdmissionPayment extends Model {}

  AdmissionPayment.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      admission_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      account_name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Cash' },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      paid_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      received_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      sequelize,
      modelName: 'AdmissionPayment',
      tableName: 'admission_payments',
      paranoid: true,
      indexes: [{ fields: ['admission_id'] }, { fields: ['paid_at'] }],
    }
  );

  return AdmissionPayment;
};
