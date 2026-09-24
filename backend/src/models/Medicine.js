'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Medicine extends Model {}

  Medicine.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      generic_name: { type: DataTypes.STRING(200), allowNull: true },
      group_name: { type: DataTypes.STRING(100), allowNull: true },
      manufacturer: { type: DataTypes.STRING(200), allowNull: true },
      company: { type: DataTypes.STRING(200), allowNull: true },
      category: { type: DataTypes.STRING(100), allowNull: true },
      unit: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'piece' },
      purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      wholesale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      opening_purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stock_quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      rack_number: { type: DataTypes.STRING(50), allowNull: true },
      tax: { type: DataTypes.STRING(50), allowNull: true },
      tax_type: { type: DataTypes.STRING(50), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Medicine',
      tableName: 'medicines',
      paranoid: true,
      indexes: [
        { fields: ['code'], unique: true },
        { fields: ['name'] },
        { fields: ['category'] },
      ],
    }
  );

  return Medicine;
};
