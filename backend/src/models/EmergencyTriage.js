'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyTriage extends Model {}
  EmergencyTriage.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    version_no:{type:DataTypes.INTEGER.UNSIGNED,allowNull:false,defaultValue:1},
    triage_level:{type:DataTypes.ENUM('resuscitation','emergent','urgent','less_urgent','non_urgent'),allowNull:false},
    chief_complaint:{type:DataTypes.STRING(1000),allowNull:false},
    pain_score:{type:DataTypes.TINYINT.UNSIGNED,allowNull:true},
    consciousness:{type:DataTypes.ENUM('alert','voice','pain','unresponsive'),allowNull:false,defaultValue:'alert'},
    priority_notes:{type:DataTypes.STRING(1000),allowNull:true},
    triage_notes:{type:DataTypes.TEXT,allowNull:true},
    triage_nurse_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    vital_sign_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    status:{type:DataTypes.ENUM('draft','final','amended'),allowNull:false,defaultValue:'draft'},
    finalized_at:{type:DataTypes.DATE,allowNull:true},
  },{sequelize,modelName:'EmergencyTriage',tableName:'emergency_triages',paranoid:true,indexes:[{fields:['emergency_encounter_id','version_no'],unique:true},{fields:['triage_level','created_at']}]});
  return EmergencyTriage;
};

