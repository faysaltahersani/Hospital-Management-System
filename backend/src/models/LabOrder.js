'use strict';

const { DataTypes, Model } = require('sequelize');
const { LAB_ORDER_STATUS_VALUES, LAB_ORDER_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class LabOrder extends Model {}

  LabOrder.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      emergency_encounter_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      ordered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM(...LAB_ORDER_STATUS_VALUES),
        allowNull: false,
        defaultValue: LAB_ORDER_STATUS.ORDERED,
      },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'LabOrder',
      tableName: 'lab_orders',
      paranoid: true,
      indexes: [
        { fields: ['order_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['doctor_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return LabOrder;
};
