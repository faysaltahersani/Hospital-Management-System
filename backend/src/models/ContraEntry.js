'use strict';

const { DataTypes, Model } = require('sequelize');

// BUG-016 — real table for account-to-account transfers.
module.exports = (sequelize) => {
  class ContraEntry extends Model {}
  ContraEntry.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      contra_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      from_account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      to_account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
      note: { type: DataTypes.STRING(500), allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      legacy_option_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'ContraEntry', tableName: 'contra_entries', paranoid: true }
  );
  return ContraEntry;
};
