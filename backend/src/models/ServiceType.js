'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class ServiceType extends Model {}
  ServiceType.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    code:{type:DataTypes.STRING(50),allowNull:false}, name:{type:DataTypes.STRING(160),allowNull:false}, description:DataTypes.TEXT,
    is_active:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:true}, sort_order:{type:DataTypes.INTEGER,allowNull:false,defaultValue:0},
    created_by:DataTypes.BIGINT.UNSIGNED, updated_by:DataTypes.BIGINT.UNSIGNED,
  },{sequelize,modelName:'ServiceType',tableName:'service_types',paranoid:true});
  return ServiceType;
};
