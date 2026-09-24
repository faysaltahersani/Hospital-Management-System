'use strict';

const { DataTypes, Model } = require('sequelize');
const { BED_STATUS_VALUES, BED_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Bed extends Model {}

  Bed.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      ward_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      bed_number: { type: DataTypes.STRING(30), allowNull: false },
      room_number: { type: DataTypes.STRING(30), allowNull: true },
      daily_rate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...BED_STATUS_VALUES),
        allowNull: false,
        defaultValue: BED_STATUS.AVAILABLE,
      },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: 'Bed',
      tableName: 'beds',
      paranoid: true,
      indexes: [
        { fields: ['ward_id', 'bed_number'], unique: true },
        { fields: ['status'] },
      ],
    }
  );

  return Bed;
};
