'use strict';

const { DataTypes, Model } = require('sequelize');
const { WARD_TYPES } = require('../config/constants');

module.exports = (sequelize) => {
  class Ward extends Model {}

  Ward.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      type: { type: DataTypes.ENUM(...WARD_TYPES), allowNull: false, defaultValue: 'general' },
      // Legacy free-text floor label, kept so existing rows and older callers
      // still read correctly.
      floor: { type: DataTypes.STRING(30), allowNull: true },
      // Migration 019 — the real placement. Null means the ward has not been
      // assigned to a building/floor yet, which is a valid state: such wards stay
      // selectable on the Bed Entry screen instead of disappearing.
      building_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      floor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      department_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Ward',
      tableName: 'wards',
      paranoid: true,
      indexes: [
        { fields: ['name'], unique: true },
        { fields: ['code'], unique: true },
        { fields: ['type'] },
      ],
    }
  );

  return Ward;
};
