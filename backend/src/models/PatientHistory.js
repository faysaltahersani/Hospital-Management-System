'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class PatientHistory extends Model {}
  PatientHistory.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category: {
        type: DataTypes.ENUM('medical', 'surgical', 'family', 'immunization', 'previous_treatment'),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(220), allowNull: false },
      details: { type: DataTypes.TEXT, allowNull: true },
      occurred_on: { type: DataTypes.DATEONLY, allowNull: true },
      recorded_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { sequelize, modelName: 'PatientHistory', tableName: 'patient_histories', paranoid: true,
      indexes: [{ fields: ['patient_id', 'category'] }, { fields: ['occurred_on'] }] }
  );
  return PatientHistory;
};

