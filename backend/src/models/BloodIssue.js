'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class BloodIssue extends Model {}

  BloodIssue.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      issue_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      bag_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      patient_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      issued_to: { type: DataTypes.STRING(150), allowNull: true },
      issued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      issued_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'BloodIssue',
      tableName: 'blood_issues',
      paranoid: true,
      indexes: [
        { fields: ['issue_code'], unique: true },
        { fields: ['bag_id'] },
        { fields: ['patient_id'] },
        { fields: ['issued_at'] },
      ],
    }
  );

  return BloodIssue;
};
