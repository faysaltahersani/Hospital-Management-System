'use strict';

const { DataTypes, Model } = require('sequelize');
const { LAB_ORDER_STATUS_VALUES, LAB_ORDER_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class LabOrderItem extends Model {}

  LabOrderItem.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      order_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      test_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      result_value: { type: DataTypes.STRING(255), allowNull: true },
      result_notes: { type: DataTypes.TEXT, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      result_at: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM(...LAB_ORDER_STATUS_VALUES),
        allowNull: false,
        defaultValue: LAB_ORDER_STATUS.ORDERED,
      },
    },
    {
      sequelize,
      modelName: 'LabOrderItem',
      tableName: 'lab_order_items',
      paranoid: false,
      indexes: [{ fields: ['order_id'] }, { fields: ['test_id'] }],
    }
  );

  return LabOrderItem;
};
