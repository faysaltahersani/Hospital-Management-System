'use strict';

const { DataTypes, Model } = require('sequelize');
const { AMBULANCE_STATUS_VALUES, AMBULANCE_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class Ambulance extends Model {}

  Ambulance.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      vehicle_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      model: { type: DataTypes.STRING(150), allowNull: true },
      driver_name: { type: DataTypes.STRING(150), allowNull: true },
      driver_phone: { type: DataTypes.STRING(30), allowNull: true },
      driver_license: { type: DataTypes.STRING(100), allowNull: true },
      capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      base_fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      per_km_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM(...AMBULANCE_STATUS_VALUES),
        allowNull: false,
        defaultValue: AMBULANCE_STATUS.AVAILABLE,
      },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: 'Ambulance',
      tableName: 'ambulances',
      paranoid: true,
      indexes: [
        { fields: ['vehicle_number'], unique: true },
        { fields: ['status'] },
      ],
    }
  );

  return Ambulance;
};
