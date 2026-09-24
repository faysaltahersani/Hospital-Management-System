'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Setting extends Model {}

  Setting.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      group_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'general' },
      key: { type: DataTypes.STRING(100), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      data_type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
      is_public: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Setting',
      tableName: 'settings',
      paranoid: false,
      indexes: [
        { fields: ['group_name', 'key'], unique: true },
        { fields: ['is_public'] },
      ],
    }
  );

  return Setting;
};
