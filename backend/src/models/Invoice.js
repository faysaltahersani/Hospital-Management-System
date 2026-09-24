'use strict';

const { DataTypes, Model } = require('sequelize');
const { INVOICE_STATUS_VALUES, INVOICE_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Invoice extends Model {}

  Invoice.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      appointment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // BUG-004 / BUG-042 - explicit link to the encounter being billed, so OPD
      // and IPD revenue lands in invoices/payments instead of being fabricated.
      opd_visit_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      admission_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      lab_order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      radiology_order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      blood_issue_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      ambulance_trip_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      due_at: { type: DataTypes.DATE, allowNull: true },
      subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      discount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      paid_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...INVOICE_STATUS_VALUES),
        allowNull: false,
        defaultValue: INVOICE_STATUS.DRAFT,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Invoice',
      tableName: 'invoices',
      paranoid: true,
      indexes: [
        { fields: ['invoice_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['status'] },
        { fields: ['issued_at'] },
      ],
    }
  );

  return Invoice;
};
