'use strict';

const { DataTypes, Model } = require('sequelize');
const { DIAGNOSTIC_STATUS_VALUES, DIAGNOSTIC_STATUS } = require('../config/diagnostics');

// The report record for a study: which template renders it, where the generated
// PDF lives, and the verification and printing trail. Separate from the study so
// a report can be regenerated without touching clinical data.
module.exports = (sequelize) => {
  class DiagnosticReport extends Model {}

  DiagnosticReport.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      report_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      template_key: { type: DataTypes.STRING(60), allowNull: false },
      status: {
        type: DataTypes.ENUM(...DIAGNOSTIC_STATUS_VALUES),
        allowNull: false,
        defaultValue: DIAGNOSTIC_STATUS.RESULT_ENTERED,
      },
      pdf_attachment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Points at the version currently in force. Earlier versions stay readable
      // through the versions collection; this is only the shortcut to "latest".
      current_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      version_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_amended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      generated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      generated_at: { type: DataTypes.DATE, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      print_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      last_printed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      last_printed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticReport',
      tableName: 'diagnostic_reports',
      paranoid: false,
    }
  );

  return DiagnosticReport;
};
