'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyEncounter extends Model {}
  EmergencyEncounter.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    encounter_code:{type:DataTypes.STRING(40),allowNull:false,unique:true},
    patient_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    department_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    arrival_mode:{type:DataTypes.ENUM('walk_in','ambulance','transfer','police','other'),allowNull:false,defaultValue:'walk_in'},
    arrival_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
    chief_complaint:{type:DataTypes.STRING(1000),allowNull:false},
    priority:{type:DataTypes.ENUM('resuscitation','emergent','urgent','less_urgent','non_urgent'),allowNull:true},
    status:{type:DataTypes.ENUM('registered','triaged','under_assessment','treatment','observation','discharged','admitted','transferred'),allowNull:false,defaultValue:'registered'},
    assigned_doctor_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    current_bed_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    admission_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    discharge_at:{type:DataTypes.DATE,allowNull:true},
    created_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    updated_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
  },{sequelize,modelName:'EmergencyEncounter',tableName:'emergency_encounters',paranoid:true,indexes:[{fields:['encounter_code'],unique:true},{fields:['patient_id','arrival_at']},{fields:['status','priority','arrival_at']}]});
  return EmergencyEncounter;
};

