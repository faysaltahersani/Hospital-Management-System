'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ClinicalNote extends Model {}
  ClinicalNote.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      encounter_type: { type: DataTypes.STRING(30), allowNull: true },
      encounter_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      note_type: {
        type: DataTypes.ENUM('doctor', 'nursing', 'progress', 'assessment', 'procedure', 'follow_up', 'discharge'),
        allowNull: false,
        defaultValue: 'progress',
      },
      title: { type: DataTypes.STRING(220), allowNull: false },
      content: { type: DataTypes.TEXT('long'), allowNull: false },
      status: { type: DataTypes.ENUM('draft', 'final', 'amended'), allowNull: false, defaultValue: 'draft' },
      author_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      finalized_at: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: 'ClinicalNote', tableName: 'clinical_notes', paranoid: true,
      indexes: [{ fields: ['patient_id', 'created_at'] }, { fields: ['encounter_type', 'encounter_id'] }, { fields: ['author_id'] }] }
  );
  return ClinicalNote;
};

