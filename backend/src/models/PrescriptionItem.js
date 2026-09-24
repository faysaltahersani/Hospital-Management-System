'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class PrescriptionItem extends Model {}

  PrescriptionItem.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      prescription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      medicine_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      medicine_name: { type: DataTypes.STRING(200), allowNull: false },
      dosage: { type: DataTypes.STRING(100), allowNull: true },
      frequency: { type: DataTypes.STRING(100), allowNull: true },
      duration: { type: DataTypes.STRING(100), allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      instructions: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PrescriptionItem',
      tableName: 'prescription_items',
      paranoid: false,
      indexes: [{ fields: ['prescription_id'] }, { fields: ['medicine_id'] }],
    }
  );

  return PrescriptionItem;
};
