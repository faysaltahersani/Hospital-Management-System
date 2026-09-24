'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Attendance extends Model {}

  Attendance.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      attendance_date: { type: DataTypes.DATEONLY, allowNull: false },
      check_in: { type: DataTypes.DATE, allowNull: true },
      check_out: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM('present', 'absent', 'leave', 'half_day', 'holiday'),
        allowNull: false,
        defaultValue: 'present',
      },
      hours_worked: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: 'Attendance',
      tableName: 'attendance',
      paranoid: false,
      indexes: [
        { fields: ['employee_id', 'attendance_date'], unique: true },
        { fields: ['attendance_date'] },
        { fields: ['status'] },
      ],
    }
  );

  return Attendance;
};
