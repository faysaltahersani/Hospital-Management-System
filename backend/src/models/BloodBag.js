'use strict';

const { DataTypes, Model } = require('sequelize');
const { BLOOD_GROUPS, BLOOD_BAG_STATUS_VALUES, BLOOD_BAG_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class BloodBag extends Model {}

  BloodBag.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      bag_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      donor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      blood_group: { type: DataTypes.ENUM(...BLOOD_GROUPS), allowNull: false },
      component: {
        type: DataTypes.ENUM('whole_blood', 'rbc', 'plasma', 'platelets', 'cryo'),
        allowNull: false,
        defaultValue: 'whole_blood',
      },
      volume_ml: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 450 },
      collected_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      // BUG-013 — infectious-disease screening state. A bag may only be issued
      // once screening has been recorded as passed.
      screening_status: {
        type: DataTypes.ENUM('not_recorded', 'pending', 'passed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      screened_at: { type: DataTypes.DATE, allowNull: true },
      screened_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      screening_notes: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.ENUM(...BLOOD_BAG_STATUS_VALUES),
        allowNull: false,
        defaultValue: BLOOD_BAG_STATUS.AVAILABLE,
      },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'BloodBag',
      tableName: 'blood_bags',
      paranoid: true,
      indexes: [
        { fields: ['bag_code'], unique: true },
        { fields: ['donor_id'] },
        { fields: ['blood_group'] },
        { fields: ['status'] },
        { fields: ['expires_at'] },
      ],
    }
  );

  return BloodBag;
};
