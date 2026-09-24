'use strict';

const { DataTypes, Model } = require('sequelize');

// A microbiology isolate. Separate from the study because a single culture can
// grow more than one organism, each with its own sensitivity panel.
module.exports = (sequelize) => {
  class DiagnosticOrganism extends Model {}

  DiagnosticOrganism.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      study_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      organism_name: { type: DataTypes.STRING(200), allowNull: false },
      culture_medium: { type: DataTypes.STRING(180), allowNull: true },
      colony_count: { type: DataTypes.STRING(120), allowNull: true },
      growth: { type: DataTypes.STRING(120), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'DiagnosticOrganism',
      tableName: 'diagnostic_organisms',
      paranoid: false,
      indexes: [{ fields: ['study_id', 'sort_order'] }],
    }
  );

  return DiagnosticOrganism;
};
