'use strict';

const { DataTypes, Model } = require('sequelize');

// One antibiotic result for one isolate. `not_tested` is a real, recordable
// state so a panel can be reported honestly without implying a result.
module.exports = (sequelize) => {
  class DiagnosticSensitivity extends Model {}

  DiagnosticSensitivity.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      organism_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      antibiotic: { type: DataTypes.STRING(180), allowNull: false },
      interpretation: {
        type: DataTypes.ENUM('sensitive', 'intermediate', 'resistant', 'not_tested'),
        allowNull: true,
      },
      mic: { type: DataTypes.STRING(60), allowNull: true },
      zone_diameter_mm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      notes: { type: DataTypes.STRING(500), allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'DiagnosticSensitivity',
      tableName: 'diagnostic_sensitivities',
      paranoid: false,
      indexes: [{ fields: ['organism_id', 'sort_order'] }],
    }
  );

  return DiagnosticSensitivity;
};
