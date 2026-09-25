'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class WorkflowStep extends Model {}

  WorkflowStep.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      workflow_definition_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      step_order: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(160), allowNull: false },
      approver_role: { type: DataTypes.STRING(60), allowNull: true },
      approver_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      min_approvals: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 1 },
      can_reject: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      due_hours: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      sequelize,
      modelName: 'WorkflowStep',
      tableName: 'workflow_steps',
      paranoid: false,
      indexes: [
        { fields: ['workflow_definition_id', 'step_order'], unique: true },
        { fields: ['approver_role'] },
        { fields: ['approver_user_id'] },
      ],
    }
  );

  return WorkflowStep;
};
