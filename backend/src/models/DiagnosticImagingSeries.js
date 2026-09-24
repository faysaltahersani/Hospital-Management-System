'use strict';

const { DataTypes, Model } = require('sequelize');

// The series layer of Patient -> Study -> Series -> Image.
//
// A DICOM study is organised into series, and a real PACS ingest needs somewhere
// to put that grouping. A plain JPEG upload has no series, so `series_id` on an
// attachment stays nullable and images may hang directly off the study — the
// abstraction is there for imaging without being imposed on a photograph.
//
// `series_uid` is unique when present so the same series cannot be ingested twice.
module.exports = (sequelize) => {
  class DiagnosticImagingSeries extends Model {}

  DiagnosticImagingSeries.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      series_number: { type: DataTypes.INTEGER, allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      modality: { type: DataTypes.STRING(16), allowNull: true },
      body_part: { type: DataTypes.STRING(120), allowNull: true },
      series_uid: { type: DataTypes.STRING(128), allowNull: true, unique: true },
      instance_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DiagnosticImagingSeries',
      tableName: 'diagnostic_imaging_series',
      paranoid: true,
      indexes: [{ fields: ['study_id'] }, { fields: ['series_uid'], unique: true }],
    }
  );

  return DiagnosticImagingSeries;
};
