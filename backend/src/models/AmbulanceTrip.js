'use strict';

const { DataTypes, Model } = require('sequelize');
const { TRIP_STATUS_VALUES, TRIP_STATUS } = require('../config/constants');

module.exports = (sequelize) => {
  class AmbulanceTrip extends Model {}

  AmbulanceTrip.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      trip_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      ambulance_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      requester_name: { type: DataTypes.STRING(150), allowNull: true },
      requester_phone: { type: DataTypes.STRING(30), allowNull: true },
      pickup_address: { type: DataTypes.STRING(255), allowNull: false },
      dropoff_address: { type: DataTypes.STRING(255), allowNull: false },
      distance_km: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      fare: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      dispatched_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM(...TRIP_STATUS_VALUES),
        allowNull: false,
        defaultValue: TRIP_STATUS.DISPATCHED,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'AmbulanceTrip',
      tableName: 'ambulance_trips',
      paranoid: true,
      indexes: [
        { fields: ['trip_code'], unique: true },
        { fields: ['ambulance_id'] },
        { fields: ['patient_id'] },
        { fields: ['status'] },
        { fields: ['dispatched_at'] },
      ],
    }
  );

  return AmbulanceTrip;
};
