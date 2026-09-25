'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Organization extends Model {}

  Organization.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(40), allowNull: false },
      name: { type: DataTypes.STRING(180), allowNull: false },
      legal_name: { type: DataTypes.STRING(220), allowNull: true },
      registration_number: { type: DataTypes.STRING(100), allowNull: true },
      timezone: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'Asia/Dhaka' },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BDT' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Organization',
      tableName: 'organizations',
      paranoid: true,
      indexes: [
        { fields: ['code'], unique: true },
        { fields: ['name'] },
        { fields: ['is_active'] },
      ],
    }
  );

  return Organization;
};

