'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Doctor extends Model {}

  Doctor.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      doctor_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      specialization: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      qualifications: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      license_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      years_of_experience: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      consultation_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      blood_group: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      appointment_shifts: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      appointment_charge_categories: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Doctor',
      tableName: 'doctors',
      paranoid: true,
      indexes: [
        { fields: ['doctor_code'], unique: true },
        { fields: ['user_id'], unique: true },
        { fields: ['department_id'] },
      ],
    }
  );

  return Doctor;
};
