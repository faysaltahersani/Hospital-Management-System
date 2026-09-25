'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ApprovalAction extends Model {}

  ApprovalAction.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      approval_request_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      workflow_step_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      step_order: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      action: {
        type: DataTypes.ENUM('submit', 'approve', 'reject', 'comment', 'cancel'),
        allowNull: false,
      },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      comments: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ApprovalAction',
      tableName: 'approval_actions',
      paranoid: false,
      updatedAt: false,
      indexes: [
        { fields: ['approval_request_id', 'created_at'] },
        { fields: ['workflow_step_id', 'action'] },
        { fields: ['user_id'] },
      ],
    }
  );

  return ApprovalAction;
};
