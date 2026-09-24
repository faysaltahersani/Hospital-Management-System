'use strict';

const { DataTypes, Model } = require('sequelize');
const { APPOINTMENT_STATUS_VALUES, APPOINTMENT_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Appointment extends Model {}

  Appointment.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      appointment_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      patient_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      department_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      appointment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      appointment_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...APPOINTMENT_STATUS_VALUES),
        allowNull: false,
        defaultValue: APPOINTMENT_STATUS.SCHEDULED,
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      consultation_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'appointments',
      paranoid: true,
      indexes: [
        { fields: ['appointment_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['doctor_id'] },
        { fields: ['appointment_date'] },
        { fields: ['status'] },
      ],
    }
  );

  return Appointment;
};
