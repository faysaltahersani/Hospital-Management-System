'use strict';

const { DataTypes, Model } = require('sequelize');
const { PAYMENT_METHOD_VALUES } = require('../config/constants');

module.exports = (sequelize) => {
  class Payment extends Model {}

  Payment.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      payment_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      invoice_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      method: {
        type: DataTypes.ENUM(...PAYMENT_METHOD_VALUES),
        allowNull: false,
      },
      reference: { type: DataTypes.STRING(150), allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      received_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Payment',
      tableName: 'payments',
      paranoid: true,
      indexes: [
        { fields: ['payment_code'], unique: true },
        { fields: ['invoice_id'] },
        { fields: ['paid_at'] },
      ],
    }
  );

  return Payment;
};
