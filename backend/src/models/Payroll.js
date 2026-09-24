'use strict';

const { DataTypes, Model } = require('sequelize');
const { PAYROLL_STATUS_VALUES, PAYROLL_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Payroll extends Model {}

  Payroll.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      payroll_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      period_year: { type: DataTypes.INTEGER, allowNull: false },
      period_month: { type: DataTypes.INTEGER, allowNull: false },
      basic_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      allowances: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tax: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      net_pay: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      working_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      present_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...PAYROLL_STATUS_VALUES),
        allowNull: false,
        defaultValue: PAYROLL_STATUS.PENDING,
      },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      paid_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Payroll',
      tableName: 'payrolls',
      paranoid: true,
      indexes: [
        { fields: ['payroll_code'], unique: true },
        { fields: ['employee_id', 'period_year', 'period_month'], unique: true },
        { fields: ['status'] },
      ],
    }
  );

  return Payroll;
};
