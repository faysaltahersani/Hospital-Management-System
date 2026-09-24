'use strict';

const { DataTypes, Model } = require('sequelize');

// An issued version of a diagnostic report — the unit of permanence.
//
// `snapshot` holds the complete report content as it read at the moment it was
// issued. That is deliberate duplication: the live child rows (parameters,
// findings, measurements) can legitimately change if a study is reopened and
// amended, but what was already handed to a clinician must not change with them.
// Reading history therefore reads the snapshot, not the current rows.
//
// A version is never updated in place except to mark it superseded. A correction
// creates a new row with `amends_version_id`, the reason and the changed fields.
module.exports = (sequelize) => {
  class DiagnosticReportVersion extends Model {
    /** The report content as issued, parsed. Never throws on bad JSON. */
    get content() {
      try {
        return JSON.parse(this.snapshot);
      } catch (err) {
        return null;
      }
    }

    /** Field names that differ from the version this one amends. */
    get changedFieldList() {
      if (!this.changed_fields) return [];
      try {
        const parsed = JSON.parse(this.changed_fields);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }
  }

  DiagnosticReportVersion.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      report_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      // Denormalised on purpose: the patient is the permanent parent of the
      // history, so a version can be found for a patient without joining through
      // the study, and the RESTRICT foreign key stops a patient with finalised
      // reports being hard-deleted.
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      version_no: { type: DataTypes.INTEGER, allowNull: false },
      version_status: {
        type: DataTypes.ENUM('final', 'amended', 'cancelled'),
        allowNull: false,
        defaultValue: 'final',
      },
      snapshot: { type: DataTypes.TEXT('long'), allowNull: false },
      pdf_attachment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      amends_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      amendment_reason: { type: DataTypes.STRING(1000), allowNull: true },
      changed_fields: { type: DataTypes.TEXT, allowNull: true },
      superseded_at: { type: DataTypes.DATE, allowNull: true },
      superseded_by_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      issued_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'DiagnosticReportVersion',
      tableName: 'diagnostic_report_versions',
      // No paranoid flag and no destroy path: a finalised medical record is not
      // deletable through the application. Withdrawal is version_status.
      paranoid: false,
      indexes: [
        { fields: ['report_id', 'version_no'], unique: true },
        { fields: ['study_id'] },
        { fields: ['patient_id'] },
        { fields: ['version_status'] },
        { fields: ['issued_at'] },
      ],
    }
  );

  return DiagnosticReportVersion;
};
