'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyDoctorAssignment extends Model {}
  EmergencyDoctorAssignment.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    doctor_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    assigned_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    assigned_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
    ended_at:{type:DataTypes.DATE,allowNull:true},
    reason:{type:DataTypes.STRING(500),allowNull:true},
  },{sequelize,modelName:'EmergencyDoctorAssignment',tableName:'emergency_doctor_assignments',paranoid:false,indexes:[{fields:['emergency_encounter_id','ended_at']},{fields:['doctor_id','assigned_at']}]});
  return EmergencyDoctorAssignment;
};

