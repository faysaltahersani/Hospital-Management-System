'use strict';

const { DataTypes, Model } = require('sequelize');
const { SALE_STATUS_VALUES, SALE_STATUS, PAYMENT_METHOD_VALUES } = require('../config/constants');

module.exports = (sequelize) => {
  class MedicineSale extends Model {}

  MedicineSale.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      sale_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      prescription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      sold_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      discount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_method: { type: DataTypes.ENUM(...PAYMENT_METHOD_VALUES), allowNull: false, defaultValue: 'cash' },
      status: { type: DataTypes.ENUM(...SALE_STATUS_VALUES), allowNull: false, defaultValue: SALE_STATUS.COMPLETED },
      sold_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'MedicineSale',
      tableName: 'medicine_sales',
      paranoid: true,
      indexes: [
        { fields: ['sale_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['sold_at'] },
      ],
    }
  );

  return MedicineSale;
};
