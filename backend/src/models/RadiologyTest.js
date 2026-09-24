'use strict';

const { DataTypes, Model } = require('sequelize');
const { RADIOLOGY_CATEGORIES } = require('../config/constants');

module.exports = (sequelize) => {
  class RadiologyTest extends Model {}

  RadiologyTest.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      short_name: { type: DataTypes.STRING(100), allowNull: true },
      test_type: { type: DataTypes.STRING(100), allowNull: true },
      method: { type: DataTypes.STRING(100), allowNull: true },
      report_delivery_day: { type: DataTypes.STRING(50), allowNull: true },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'other',
      },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      base_charge: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      final_charge: { type: DataTypes.DECIMAL(12, 2), allowNull: true, defaultValue: 0 },
      tax_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RadiologyTest',
      tableName: 'radiology_tests',
      paranoid: true,
      indexes: [{ fields: ['code'], unique: true }, { fields: ['category'] }],
    }
  );

  return RadiologyTest;
};
