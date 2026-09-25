'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyAssessment extends Model {}
  EmergencyAssessment.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    version_no:{type:DataTypes.INTEGER.UNSIGNED,allowNull:false,defaultValue:1},
    chief_complaint:{type:DataTypes.TEXT,allowNull:false},
    history:{type:DataTypes.TEXT,allowNull:true},
    examination:{type:DataTypes.TEXT,allowNull:true},
    diagnosis:{type:DataTypes.TEXT,allowNull:false},
    differential_diagnosis:{type:DataTypes.TEXT,allowNull:true},
    clinical_notes:{type:DataTypes.TEXT,allowNull:true},
    disposition_plan:{type:DataTypes.TEXT,allowNull:true},
    assessed_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    clinical_note_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    status:{type:DataTypes.ENUM('draft','final','amended'),allowNull:false,defaultValue:'draft'},
    finalized_at:{type:DataTypes.DATE,allowNull:true},
  },{sequelize,modelName:'EmergencyAssessment',tableName:'emergency_assessments',paranoid:true,indexes:[{fields:['emergency_encounter_id','version_no'],unique:true},{fields:['assessed_by','created_at']}]});
  return EmergencyAssessment;
};

