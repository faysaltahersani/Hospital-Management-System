'use strict';

const { DataTypes, Model } = require('sequelize');

// A sectioned narrative finding. Sections carry the structure an ultrasound
// report needs (Liver, Gall Bladder, CBD, Pancreas, Spleen, Kidneys, Urinary
// Bladder) and equally a histopathology report (Gross description, Microscopic
// findings).
module.exports = (sequelize) => {
  class DiagnosticFinding extends Model {}

  DiagnosticFinding.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      section: { type: DataTypes.STRING(180), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: true },
      is_abnormal: { type: DataTypes.BOOLEAN, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticFinding',
      tableName: 'diagnostic_findings',
      paranoid: false,
      indexes: [{ fields: ['study_id', 'sort_order'] }],
    }
  );

  return DiagnosticFinding;
};
