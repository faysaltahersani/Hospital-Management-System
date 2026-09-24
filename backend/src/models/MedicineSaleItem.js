'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class MedicineSaleItem extends Model {}

  MedicineSaleItem.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      sale_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      medicine_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'MedicineSaleItem',
      tableName: 'medicine_sale_items',
      paranoid: false,
      indexes: [{ fields: ['sale_id'] }, { fields: ['medicine_id'] }],
    }
  );

  return MedicineSaleItem;
};
