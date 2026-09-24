'use strict';

const { DataTypes, Model } = require('sequelize');

// BUG-016 — real table so income can be filtered, searched and sorted in SQL
// before pagination, instead of a JSON blob in master_options.
module.exports = (sequelize) => {
  class IncomeEntry extends Model {}
  IncomeEntry.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      income_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      income_head_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      income_date: { type: DataTypes.DATEONLY, allowNull: false },
      note: { type: DataTypes.STRING(500), allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      legacy_option_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'IncomeEntry', tableName: 'income_entries', paranoid: true }
  );
  return IncomeEntry;
};
