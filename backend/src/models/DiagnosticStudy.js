'use strict';

const { DataTypes, Model } = require('sequelize');
const {
  DIAGNOSTIC_CATEGORY_VALUES,
  DIAGNOSTIC_STATUS_VALUES,
  DIAGNOSTIC_STATUS,
  LATERALITY,
} = require('../config/diagnostics');

// One investigation. Sits alongside the existing lab/radiology order rows rather
// than replacing them: `source_type` + `source_id` point back at the
// `lab_order_items` or `radiology_orders` row that was ordered and billed, so the
// existing modules stay the single ordering path. Categories with no existing
// module use source_type 'standalone'.
module.exports = (sequelize) => {
  class DiagnosticStudy extends Model {}

  DiagnosticStudy.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category: { type: DataTypes.ENUM(...DIAGNOSTIC_CATEGORY_VALUES), allowNull: false },
      modality: { type: DataTypes.STRING(60), allowNull: false },
      test_name: { type: DataTypes.STRING(255), allowNull: false },

      source_type: {
        type: DataTypes.ENUM('lab_order_item', 'radiology_order', 'standalone'),
        allowNull: false,
        defaultValue: 'standalone',
      },
      source_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      invoice_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

      referring_doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      performing_doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      performing_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

      status: {
        type: DataTypes.ENUM(...DIAGNOSTIC_STATUS_VALUES),
        allowNull: false,
        defaultValue: DIAGNOSTIC_STATUS.ORDERED,
      },

      study_datetime: { type: DataTypes.DATE, allowNull: true },
      clinical_history: { type: DataTypes.TEXT, allowNull: true },
      procedure_note: { type: DataTypes.TEXT, allowNull: true },

      body_part: { type: DataTypes.STRING(120), allowNull: true },
      laterality: { type: DataTypes.ENUM(...LATERALITY), allowNull: true },
      views: { type: DataTypes.STRING(255), allowNull: true },
      contrast_used: { type: DataTypes.BOOLEAN, allowNull: true },
      contrast_agent: { type: DataTypes.STRING(180), allowNull: true },
      series_or_sequences: { type: DataTypes.TEXT, allowNull: true },

      specimen: { type: DataTypes.STRING(255), allowNull: true },
      sample_type: { type: DataTypes.STRING(120), allowNull: true },
      collection_method: { type: DataTypes.STRING(180), allowNull: true },
      sample_collected_at: { type: DataTypes.DATE, allowNull: true },
      adequacy: { type: DataTypes.STRING(180), allowNull: true },

      result_at: { type: DataTypes.DATE, allowNull: true },
      interpretation: { type: DataTypes.TEXT, allowNull: true },
      impression: { type: DataTypes.TEXT, allowNull: true },
      conclusion: { type: DataTypes.TEXT, allowNull: true },
      recommendation: { type: DataTypes.TEXT, allowNull: true },

      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      finalized_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      finalized_at: { type: DataTypes.DATE, allowNull: true },
      cancelled_reason: { type: DataTypes.STRING(500), allowNull: true },

      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticStudy',
      tableName: 'diagnostic_studies',
      paranoid: true,
      indexes: [
        { fields: ['patient_id', 'study_datetime'] },
        { fields: ['category', 'modality'] },
        { fields: ['status'] },
        { fields: ['source_type', 'source_id'] },
      ],
    }
  );

  return DiagnosticStudy;
};
