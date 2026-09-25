'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class PatientProblem extends Model {}
  PatientProblem.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      code: { type: DataTypes.STRING(30), allowNull: true },
      title: { type: DataTypes.STRING(220), allowNull: false },
      problem_type: { type: DataTypes.ENUM('diagnosis', 'chronic_disease', 'symptom', 'risk'), allowNull: false, defaultValue: 'diagnosis' },
      status: { type: DataTypes.ENUM('active', 'resolved', 'inactive'), allowNull: false, defaultValue: 'active' },
      onset_date: { type: DataTypes.DATEONLY, allowNull: true },
      resolved_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'PatientProblem', tableName: 'patient_problems', paranoid: true,
      indexes: [{ fields: ['patient_id', 'status'] }, { fields: ['code'] }] }
  );
  return PatientProblem;
};

