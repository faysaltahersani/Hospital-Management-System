'use strict';

const { DataTypes, Model } = require('sequelize');
const { OPD_VISIT_STATUS_VALUES, OPD_VISIT_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class OpdVisit extends Model {}

  OpdVisit.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      visit_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      department_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      appointment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      visit_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      chief_complaint: { type: DataTypes.STRING(255), allowNull: true },
      vitals: { type: DataTypes.TEXT, allowNull: true },
      diagnosis: { type: DataTypes.TEXT, allowNull: true },
      advice: { type: DataTypes.TEXT, allowNull: true },
      consultation_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      follow_up_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM(...OPD_VISIT_STATUS_VALUES),
        allowNull: false,
        defaultValue: OPD_VISIT_STATUS.IN_CONSULTATION,
      },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'OpdVisit',
      tableName: 'opd_visits',
      paranoid: true,
      indexes: [
        { fields: ['visit_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['doctor_id'] },
        { fields: ['visit_date'] },
        { fields: ['status'] },
      ],
    }
  );

  return OpdVisit;
};
