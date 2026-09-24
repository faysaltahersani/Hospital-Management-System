'use strict';

const { DataTypes, Model } = require('sequelize');
const { PRESCRIPTION_STATUS_VALUES, PRESCRIPTION_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Prescription extends Model {}

  Prescription.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      prescription_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      appointment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      prescribed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      diagnosis: { type: DataTypes.TEXT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...PRESCRIPTION_STATUS_VALUES),
        allowNull: false,
        defaultValue: PRESCRIPTION_STATUS.DRAFT,
      },
    },
    {
      sequelize,
      modelName: 'Prescription',
      tableName: 'prescriptions',
      paranoid: true,
      indexes: [
        { fields: ['prescription_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['doctor_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return Prescription;
};
