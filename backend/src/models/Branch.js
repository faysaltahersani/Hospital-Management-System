'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Branch extends Model {}

  Branch.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      hospital_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      code: { type: DataTypes.STRING(40), allowNull: false },
      name: { type: DataTypes.STRING(180), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
      address: { type: DataTypes.TEXT, allowNull: true },
      is_main: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Branch',
      tableName: 'branches',
      paranoid: true,
      indexes: [
        { fields: ['hospital_id', 'code'], unique: true },
        { fields: ['hospital_id', 'name'] },
        { fields: ['is_active'] },
      ],
    }
  );

  return Branch;
};

