'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class VitalSign extends Model {}
  VitalSign.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      encounter_type: { type: DataTypes.STRING(30), allowNull: true },
      encounter_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      captured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      temperature_c: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
      pulse_bpm: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      respiratory_rate: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      systolic_bp: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      diastolic_bp: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      spo2_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      height_cm: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      weight_kg: { type: DataTypes.DECIMAL(7, 2), allowNull: true },
      bmi: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      pain_score: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.STRING(500), allowNull: true },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'VitalSign', tableName: 'vital_signs', paranoid: true,
      indexes: [{ fields: ['patient_id', 'captured_at'] }, { fields: ['encounter_type', 'encounter_id'] }] }
  );
  return VitalSign;
};

