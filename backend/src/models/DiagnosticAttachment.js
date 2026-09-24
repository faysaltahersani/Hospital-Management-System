'use strict';

const { DataTypes, Model } = require('sequelize');
const { ATTACHMENT_KIND_VALUES, ATTACHMENT_KINDS } = require('../config/diagnostics');

// File METADATA. The bytes live on disk under a directory that is deliberately
// not served statically, and `storage_key` is never sent to a client — files are
// streamed through an authorized endpoint that checks study/patient access first.
// The DICOM columns stay NULL unless a DICOM file is ingested; they exist so PACS
// can be added later without a schema change.
module.exports = (sequelize) => {
  class DiagnosticAttachment extends Model {}

  DiagnosticAttachment.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Null for a file that is not part of an imaging series (a single uploaded
      // photograph, a scanned report). Set when a DICOM series is ingested.
      series_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Set on a generated PDF, tying it to the exact report version it renders.
      report_version_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      kind: {
        type: DataTypes.ENUM(...ATTACHMENT_KIND_VALUES),
        allowNull: false,
        defaultValue: ATTACHMENT_KINDS.DOCUMENT,
      },
      file_name: { type: DataTypes.STRING(255), allowNull: false },
      original_name: { type: DataTypes.STRING(255), allowNull: false },
      mime_type: { type: DataTypes.STRING(180), allowNull: false },
      file_size: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      storage_key: { type: DataTypes.STRING(500), allowNull: false },
      checksum_sha256: { type: DataTypes.CHAR(64), allowNull: true },
      caption: { type: DataTypes.STRING(500), allowNull: true },
      // Replacing a file never overwrites it: the old row stays, is_current goes
      // false, superseded_by_id points at its replacement, and the version
      // increments. The original upload keeps is_original true for its lifetime.
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      is_original: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      superseded_by_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      superseded_at: { type: DataTypes.DATE, allowNull: true },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

      dicom_study_uid: { type: DataTypes.STRING(128), allowNull: true },
      dicom_series_uid: { type: DataTypes.STRING(128), allowNull: true },
      dicom_instance_uid: { type: DataTypes.STRING(128), allowNull: true },
      dicom_modality: { type: DataTypes.STRING(16), allowNull: true },

      uploaded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      uploaded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'DiagnosticAttachment',
      tableName: 'diagnostic_attachments',
      paranoid: true,
      defaultScope: {
        // storage_key is an internal filesystem path. Excluding it by default
        // means an accidental `toJSON()` in a response cannot leak the layout of
        // the medical file store.
        attributes: { exclude: ['storage_key'] },
      },
      scopes: {
        withStorage: { attributes: { include: ['storage_key'] } },
      },
      indexes: [
        { fields: ['study_id', 'sort_order'] },
        { fields: ['patient_id'] },
        { fields: ['kind'] },
      ],
    }
  );

  return DiagnosticAttachment;
};
