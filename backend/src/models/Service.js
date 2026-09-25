'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class Service extends Model {}
  Service.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    hospital_id:DataTypes.BIGINT.UNSIGNED, branch_id:DataTypes.BIGINT.UNSIGNED, service_type_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    service_category_id:DataTypes.BIGINT.UNSIGNED, code:{type:DataTypes.STRING(80),allowNull:false}, name:{type:DataTypes.STRING(220),allowNull:false},
    description:DataTypes.TEXT, billing_unit:{type:DataTypes.STRING(40),allowNull:false,defaultValue:'unit'},
    requires_approval:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false}, is_taxable:{type:DataTypes.BOOLEAN,allowNull:false,defaultValue:false},
    default_duration_minutes:DataTypes.INTEGER.UNSIGNED, status:{type:DataTypes.ENUM('draft','active','inactive','retired'),allowNull:false,defaultValue:'active'},
    created_by:DataTypes.BIGINT.UNSIGNED, updated_by:DataTypes.BIGINT.UNSIGNED,
  },{sequelize,modelName:'Service',tableName:'services',paranoid:true});
  return Service;
};
