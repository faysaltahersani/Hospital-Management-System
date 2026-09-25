'use strict';
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class EmergencyOrder extends Model {}
  EmergencyOrder.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true},
    emergency_encounter_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    order_type:{type:DataTypes.ENUM('laboratory','radiology','medication','procedure','other'),allowNull:false},
    reference_type:{type:DataTypes.STRING(60),allowNull:false},
    reference_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    status:{type:DataTypes.STRING(30),allowNull:false,defaultValue:'ordered'},
    requested_by:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    requested_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW},
    notes:{type:DataTypes.STRING(1000),allowNull:true},
  },{sequelize,modelName:'EmergencyOrder',tableName:'emergency_orders',paranoid:false,indexes:[{fields:['emergency_encounter_id','order_type']},{fields:['order_type','status','requested_at']}]});
  return EmergencyOrder;
};

