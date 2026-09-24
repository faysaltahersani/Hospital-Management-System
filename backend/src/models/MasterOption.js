'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class MasterOption extends Model {}

  MasterOption.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      type: { type: DataTypes.STRING(80), allowNull: false },
      code: { type: DataTypes.STRING(100), allowNull: false },
      label: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'MasterOption',
      tableName: 'master_options',
      paranoid: true,
      indexes: [
        { fields: ['type', 'code'], unique: true },
        { fields: ['type'] },
      ],
    }
  );

  return MasterOption;
};
