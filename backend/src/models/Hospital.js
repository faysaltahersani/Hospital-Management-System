'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Hospital extends Model {}

  Hospital.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      organization_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      code: { type: DataTypes.STRING(40), allowNull: false },
      name: { type: DataTypes.STRING(180), allowNull: false },
      hospital_type: { type: DataTypes.STRING(60), allowNull: true },
      license_number: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Hospital',
      tableName: 'hospitals',
      paranoid: true,
      indexes: [
        { fields: ['organization_id', 'code'], unique: true },
        { fields: ['organization_id', 'name'] },
        { fields: ['is_active'] },
      ],
    }
  );

  return Hospital;
};

