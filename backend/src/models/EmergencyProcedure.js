'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyProcedure extends Model {}
  EmergencyProcedure.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    service_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    service_price_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    invoice_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    quantity:{type:DataTypes.DECIMAL(10,2),allowNull:false,defaultValue:1},
    status:{type:DataTypes.ENUM('ordered','in_progress','completed','cancelled'),allowNull:false,defaultValue:'ordered'},
    performed_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:true},
    performed_at:{type:DataTypes.DATE,allowNull:true},
    notes:{type:DataTypes.TEXT,allowNull:true},
    created_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
  },{sequelize,modelName:'EmergencyProcedure',tableName:'emergency_procedures',paranoid:true,indexes:[{fields:['emergency_encounter_id','status']},{fields:['service_id']}]});
  return EmergencyProcedure;
};

