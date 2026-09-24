'use strict';

const { DataTypes, Model } = require('sequelize');
const { INVOICE_ITEM_TYPE_VALUES, INVOICE_ITEM_TYPES } = require('../config/constants');

module.exports = (sequelize) => {
  class InvoiceItem extends Model {}

  InvoiceItem.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      invoice_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      item_type: {
        type: DataTypes.ENUM(...INVOICE_ITEM_TYPE_VALUES),
        allowNull: false,
        defaultValue: INVOICE_ITEM_TYPES.OTHER,
      },
      reference_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'InvoiceItem',
      tableName: 'invoice_items',
      paranoid: false,
      indexes: [{ fields: ['invoice_id'] }, { fields: ['item_type'] }],
    }
  );

  return InvoiceItem;
};
