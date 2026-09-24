'use strict';

const { DataTypes, Model } = require('sequelize');
const { GENDER_VALUES, BLOOD_GROUPS } = require('../config/constants');

module.exports = (sequelize) => {
  class BloodDonor extends Model {}

  BloodDonor.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      donor_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      full_name: { type: DataTypes.STRING(150), allowNull: false },
      gender: { type: DataTypes.ENUM(...GENDER_VALUES), allowNull: false },
      blood_group: { type: DataTypes.ENUM(...BLOOD_GROUPS), allowNull: false },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      guardian_contact_no: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.TEXT, allowNull: true },
      last_donation_at: { type: DataTypes.DATE, allowNull: true },
      total_donations: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'BloodDonor',
      tableName: 'blood_donors',
      paranoid: true,
      indexes: [
        { fields: ['donor_code'], unique: true },
        { fields: ['full_name'] },
        { fields: ['blood_group'] },
        { fields: ['phone'] },
      ],
    }
  );

  return BloodDonor;
};
