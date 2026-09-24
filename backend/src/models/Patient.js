'use strict';

const { DataTypes, Model } = require('sequelize');
const { GENDER_VALUES, BLOOD_GROUPS } = require('../config/constants');

module.exports = (sequelize) => {
  class Patient extends Model {}

  Patient.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      patient_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      age: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM(...GENDER_VALUES),
        allowNull: false,
      },
      blood_group: {
        type: DataTypes.ENUM(...BLOOD_GROUPS),
        allowNull: false,
        defaultValue: 'unknown',
      },
      marital_status: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        validate: { isEmail: true },
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_contact_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      emergency_contact_phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      id_type: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      id_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      registered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Patient',
      tableName: 'patients',
      paranoid: true,
      indexes: [
        { fields: ['patient_code'], unique: true },
        { fields: ['full_name'] },
        { fields: ['phone'] },
      ],
    }
  );

  return Patient;
};
