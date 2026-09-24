'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class LabTest extends Model {}

  LabTest.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      short_name: { type: DataTypes.STRING(100), allowNull: true },
      category: { type: DataTypes.STRING(100), allowNull: true },
      test_type: { type: DataTypes.STRING(100), allowNull: true },
      method: { type: DataTypes.STRING(100), allowNull: true },
      sample_type: { type: DataTypes.STRING(100), allowNull: true },
      normal_range: { type: DataTypes.STRING(255), allowNull: true },
      unit: { type: DataTypes.STRING(50), allowNull: true },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      base_charge: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      final_charge: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
      report_delivery_day: { type: DataTypes.STRING(50), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'LabTest',
      tableName: 'lab_tests',
      paranoid: true,
      indexes: [{ fields: ['code'], unique: true }, { fields: ['category'] }],
    }
  );

  return LabTest;
};
