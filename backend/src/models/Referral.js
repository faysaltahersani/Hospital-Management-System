'use strict';

const { DataTypes, Model } = require('sequelize');
const { REFERRAL_STATUS_VALUES, REFERRAL_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Referral extends Model {}

  Referral.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      referral_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      from_doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      to_doctor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      external_doctor_name: { type: DataTypes.STRING(150), allowNull: true },
      external_facility: { type: DataTypes.STRING(200), allowNull: true },
      external_phone: { type: DataTypes.STRING(30), allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      referred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM(...REFERRAL_STATUS_VALUES),
        allowNull: false,
        defaultValue: REFERRAL_STATUS.PENDING,
      },
    },
    {
      sequelize,
      modelName: 'Referral',
      tableName: 'referrals',
      paranoid: true,
      indexes: [
        { fields: ['referral_code'], unique: true },
        { fields: ['patient_id'] },
        { fields: ['from_doctor_id'] },
        { fields: ['to_doctor_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return Referral;
};
