'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class WorkflowDefinition extends Model {}

  WorkflowDefinition.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      organization_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      hospital_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      branch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      code: { type: DataTypes.STRING(60), allowNull: false },
      name: { type: DataTypes.STRING(180), allowNull: false },
      workflow_type: { type: DataTypes.STRING(60), allowNull: false },
      entity_type: { type: DataTypes.STRING(80), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      min_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      max_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BDT' },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'WorkflowDefinition',
      tableName: 'workflow_definitions',
      paranoid: true,
      indexes: [
        { fields: ['organization_id', 'code'], unique: true },
        { fields: ['workflow_type', 'is_active'] },
        { fields: ['hospital_id'] },
        { fields: ['branch_id'] },
      ],
    }
  );

  return WorkflowDefinition;
};
