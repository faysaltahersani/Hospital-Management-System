'use strict';

const { DataTypes, Model } = require('sequelize');
const { PAYMENT_METHOD_VALUES } = require('../config/constants');

module.exports = (sequelize) => {
  class Expense extends Model {}

  Expense.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      expense_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      payment_method: {
        type: DataTypes.ENUM(...PAYMENT_METHOD_VALUES),
        allowNull: false,
        defaultValue: 'cash',
      },
      reference: { type: DataTypes.STRING(150), allowNull: true },
      paid_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Expense',
      tableName: 'expenses',
      paranoid: true,
      indexes: [
        { fields: ['category_id'] },
        { fields: ['expense_date'] },
      ],
    }
  );

  return Expense;
};
