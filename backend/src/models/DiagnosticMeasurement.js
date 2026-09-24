'use strict';

const { DataTypes, Model } = require('sequelize');
const { LATERALITY } = require('../config/diagnostics');

// A measured quantity: ultrasound organ size, Doppler velocity, spirometry FEV1,
// echo dimension, intraocular pressure, mammographic lesion size.
module.exports = (sequelize) => {
  class DiagnosticMeasurement extends Model {}

  DiagnosticMeasurement.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      site: { type: DataTypes.STRING(180), allowNull: true },
      label: { type: DataTypes.STRING(200), allowNull: false },
      value_numeric: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      value_text: { type: DataTypes.STRING(255), allowNull: true },
      unit: { type: DataTypes.STRING(60), allowNull: true },
      normal_range: { type: DataTypes.STRING(180), allowNull: true },
      laterality: { type: DataTypes.ENUM(...LATERALITY), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticMeasurement',
      tableName: 'diagnostic_measurements',
      paranoid: false,
      indexes: [{ fields: ['study_id', 'sort_order'] }],
    }
  );

  return DiagnosticMeasurement;
};
