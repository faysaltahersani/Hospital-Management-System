'use strict';

const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ApprovalRequest extends Model {}

  ApprovalRequest.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      workflow_definition_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      organization_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      hospital_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      branch_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      request_code: { type: DataTypes.STRING(70), allowNull: false, unique: true },
      entity_type: { type: DataTypes.STRING(80), allowNull: false },
      entity_id: { type: DataTypes.STRING(80), allowNull: true },
      title: { type: DataTypes.STRING(220), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BDT' },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'in_review', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      current_step_order: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      payload: { type: DataTypes.JSON, allowNull: true },
      requested_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ApprovalRequest',
      tableName: 'approval_requests',
      paranoid: true,
      indexes: [
        { fields: ['request_code'], unique: true },
        { fields: ['organization_id', 'status'] },
        { fields: ['branch_id', 'status'] },
        { fields: ['workflow_definition_id'] },
        { fields: ['entity_type', 'entity_id'] },
        { fields: ['requested_by'] },
      ],
    }
  );

  return ApprovalRequest;
};
