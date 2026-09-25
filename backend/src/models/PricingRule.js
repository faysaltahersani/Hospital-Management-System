'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class PricingRule extends Model {}
  PricingRule.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false}, hospital_id:DataTypes.BIGINT.UNSIGNED,
    branch_id:DataTypes.BIGINT.UNSIGNED, service_id:DataTypes.BIGINT.UNSIGNED, service_category_id:DataTypes.BIGINT.UNSIGNED,
    code:{type:DataTypes.STRING(80),allowNull:false}, name:{type:DataTypes.STRING(180),allowNull:false},
    rule_type:{type:DataTypes.ENUM('percentage_discount','flat_discount','surcharge','tax_override'),allowNull:false}, value:{type:DataTypes.DECIMAL(14,4),allowNull:false},
    payer_type:{type:DataTypes.ENUM('self','corporate','insurance','government','all'),allowNull:false,defaultValue:'all'}, payer_reference:DataTypes.STRING(120),
    conditions_json:{type:DataTypes.TEXT,get(){const v=this.getDataValue('conditions_json');try{return v?JSON.parse(v):null;}catch{return null;}},set(v){this.setDataValue('conditions_json',v==null?null:JSON.stringify(v));}},
    priority:{type:DataTypes.INTEGER,allowNull:false,defaultValue:100}, effective_from:{type:DataTypes.DATEONLY,allowNull:false}, effective_to:DataTypes.DATEONLY,
    status:{type:DataTypes.ENUM('draft','pending','approved','rejected','retired'),allowNull:false,defaultValue:'draft'}, approval_request_id:DataTypes.BIGINT.UNSIGNED,
    approved_by:DataTypes.BIGINT.UNSIGNED, approved_at:DataTypes.DATE, rejection_reason:DataTypes.STRING(500), created_by:DataTypes.BIGINT.UNSIGNED, updated_by:DataTypes.BIGINT.UNSIGNED,
  },{sequelize,modelName:'PricingRule',tableName:'pricing_rules',paranoid:true});
  return PricingRule;
};
