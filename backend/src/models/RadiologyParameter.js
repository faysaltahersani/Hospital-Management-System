'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class RadiologyParameter extends Model {}

  RadiologyParameter.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      ref_range_from: { type: DataTypes.STRING(100), allowNull: true },
      ref_range_to: { type: DataTypes.STRING(100), allowNull: true },
      unit_option_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'RadiologyParameter',
      tableName: 'radiology_parameters',
      paranoid: true,
    }
  );

  return RadiologyParameter;
};
