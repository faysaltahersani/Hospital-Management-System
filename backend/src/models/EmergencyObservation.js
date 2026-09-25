'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyObservation extends Model {}
  EmergencyObservation.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    bed_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    started_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
    ended_at:{type:DataTypes.DATE,allowNull:true},
    status:{type:DataTypes.ENUM('active','completed','cancelled'),allowNull:false,defaultValue:'active'},
    assigned_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    ended_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    notes:{type:DataTypes.TEXT,allowNull:true},
  },{sequelize,modelName:'EmergencyObservation',tableName:'emergency_observations',paranoid:false,indexes:[{fields:['emergency_encounter_id','status']},{fields:['bed_id','status']}]});
  return EmergencyObservation;
};

