'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class PatientAllergy extends Model {}
  PatientAllergy.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      allergen: { type: DataTypes.STRING(180), allowNull: false },
      reaction: { type: DataTypes.STRING(255), allowNull: true },
      severity: { type: DataTypes.ENUM('mild', 'moderate', 'severe', 'life_threatening', 'unknown'), allowNull: false, defaultValue: 'unknown' },
      status: { type: DataTypes.ENUM('active', 'inactive', 'resolved'), allowNull: false, defaultValue: 'active' },
      onset_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      verified_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'PatientAllergy', tableName: 'patient_allergies', paranoid: true,
      indexes: [{ fields: ['patient_id', 'status'] }, { fields: ['allergen'] }] }
  );
  return PatientAllergy;
};

