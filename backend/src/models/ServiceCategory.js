'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class ServiceCategory extends Model {}
  ServiceCategory.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    service_type_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false}, code:{type:DataTypes.STRING(60),allowNull:false}, name:{type:DataTypes.STRING(180),allowNull:false},
    description:DataTypes.TEXT, is_active:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:true}, sort_order:{type:DataTypes.INTEGER,allowNull:false,defaultValue:0},
    created_by:DataTypes.BIGINT.UNSIGNED, updated_by:DataTypes.BIGINT.UNSIGNED,
  },{sequelize,modelName:'ServiceCategory',tableName:'service_categories',paranoid:true});
  return ServiceCategory;
};
