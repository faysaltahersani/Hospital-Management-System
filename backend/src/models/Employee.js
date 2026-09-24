'use strict';

const { DataTypes, Model } = require('sequelize');
const { GENDER_VALUES } = require('../config/constants');

module.exports = (sequelize) => {
  class Employee extends Model {}

  Employee.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      employee_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, unique: true },
      department_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      full_name: { type: DataTypes.STRING(150), allowNull: false },
      designation: { type: DataTypes.STRING(150), allowNull: true },
      gender: { type: DataTypes.ENUM(...GENDER_VALUES), allowNull: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.TEXT, allowNull: true },
      joining_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      leaving_date: { type: DataTypes.DATEONLY, allowNull: true },
      basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      bank_account: { type: DataTypes.STRING(100), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Employee',
      tableName: 'employees',
      paranoid: true,
      indexes: [
        { fields: ['employee_code'], unique: true },
        { fields: ['user_id'], unique: true },
        { fields: ['department_id'] },
        { fields: ['full_name'] },
      ],
    }
  );

  return Employee;
};
