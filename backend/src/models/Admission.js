'use strict';

const { DataTypes, Model } = require('sequelize');
const { ADMISSION_STATUS_VALUES, ADMISSION_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Admission extends Model {}

  Admission.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      admission_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      ward_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      bed_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      admitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      discharged_at: { type: DataTypes.DATE, allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      diagnosis: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...ADMISSION_STATUS_VALUES),
        allowNull: false,
        defaultValue: ADMISSION_STATUS.ADMITTED,
      },
      total_charges: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Admission',
      tableName: 'admissions',
      paranoid: true,
      indexes: [
        { fields: ['admission_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['doctor_id'] },
        { fields: ['bed_id'] },
        { fields: ['status'] },
        { fields: ['admitted_at'] },
      ],
    }
  );

  return Admission;
};
