'use strict';

const { DataTypes, Model } = require('sequelize');
const { RESULT_FLAG_VALUES } = require('../config/diagnostics');

// One reported parameter of a result. This is what turns a CBC into
// Haemoglobin / WBC / Platelet rows, each with its own unit, reference range and
// abnormal flag, instead of a single opaque string or a scanned image.
module.exports = (sequelize) => {
  class DiagnosticResultParameter extends Model {}

  DiagnosticResultParameter.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      group_label: { type: DataTypes.STRING(180), allowNull: true },
      parameter_name: { type: DataTypes.STRING(200), allowNull: false },
      result_value: { type: DataTypes.STRING(255), allowNull: true },
      // Numeric copy of result_value when it parses as a number, for trending.
      // Left NULL for textual results; never a guessed value.
      result_numeric: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      unit: { type: DataTypes.STRING(60), allowNull: true },
      ref_range_low: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      ref_range_high: { type: DataTypes.DECIMAL(18, 6), allowNull: true },
      ref_range_text: { type: DataTypes.STRING(255), allowNull: true },
      flag: { type: DataTypes.ENUM(...RESULT_FLAG_VALUES), allowNull: true },
      method: { type: DataTypes.STRING(180), allowNull: true },
      comments: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticResultParameter',
      tableName: 'diagnostic_result_parameters',
      paranoid: false,
      indexes: [{ fields: ['study_id', 'sort_order'] }],
    }
  );

  return DiagnosticResultParameter;
};
