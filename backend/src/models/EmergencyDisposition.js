'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyDisposition extends Model {}
  EmergencyDisposition.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    disposition_type:{type:DataTypes.ENUM('discharge','ipd_admission','icu_transfer','referral','transfer'),allowNull:false},
    admission_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    referral_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    workflow_request_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    destination:{type:DataTypes.STRING(255),allowNull:true},
    reason:{type:DataTypes.TEXT,allowNull:true},
    instructions:{type:DataTypes.TEXT,allowNull:true},
    status:{type:DataTypes.ENUM('completed','cancelled'),allowNull:false,defaultValue:'completed'},
    disposed_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    disposed_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
  },{sequelize,modelName:'EmergencyDisposition',tableName:'emergency_dispositions',paranoid:false,indexes:[{fields:['emergency_encounter_id','status']},{fields:['disposition_type','disposed_at']}]});
  return EmergencyDisposition;
};

