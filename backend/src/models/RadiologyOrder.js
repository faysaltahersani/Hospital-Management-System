'use strict';

const { DataTypes, Model } = require('sequelize');
const { RADIOLOGY_ORDER_STATUS_VALUES, RADIOLOGY_ORDER_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class RadiologyOrder extends Model {}

  RadiologyOrder.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      test_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      ordered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM(...RADIOLOGY_ORDER_STATUS_VALUES),
        allowNull: false,
        defaultValue: RADIOLOGY_ORDER_STATUS.ORDERED,
      },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      // BUG-038 — findings and impression are clinically distinct and were both
      // collapsed into result_notes, so a radiology report could not present them
      // separately.
      findings: { type: DataTypes.TEXT, allowNull: true },
      impression: { type: DataTypes.TEXT, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      result_notes: { type: DataTypes.TEXT, allowNull: true },
      result_image_url: { type: DataTypes.STRING(500), allowNull: true },
      result_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RadiologyOrder',
      tableName: 'radiology_orders',
      paranoid: true,
      indexes: [
        { fields: ['order_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['test_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return RadiologyOrder;
};
