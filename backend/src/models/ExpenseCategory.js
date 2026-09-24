'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ExpenseCategory extends Model {}

  ExpenseCategory.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ExpenseCategory',
      tableName: 'expense_categories',
      paranoid: true,
      indexes: [{ fields: ['name'], unique: true }],
    }
  );

  return ExpenseCategory;
};
