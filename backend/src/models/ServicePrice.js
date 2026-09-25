'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class ServicePrice extends Model {}
  ServicePrice.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, service_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false}, hospital_id:DataTypes.BIGINT.UNSIGNED, branch_id:DataTypes.BIGINT.UNSIGNED,
    payer_type:{type:DataTypes.ENUM('self','corporate','insurance','government','all'),allowNull:false,defaultValue:'self'}, payer_reference:DataTypes.STRING(120),
    currency_code:{type:DataTypes.CHAR(3),allowNull:false,defaultValue:'BDT'}, amount:{type:DataTypes.DECIMAL(14,2),allowNull:false}, tax_rate:{type:DataTypes.DECIMAL(7,4),allowNull:false,defaultValue:0},
    effective_from:{type:DataTypes.DATEONLY,allowNull:false}, effective_to:DataTypes.DATEONLY, version_no:{type:DataTypes.INTEGER.UNSIGNED,allowNull:false,defaultValue:1},
    status:{type:DataTypes.ENUM('draft','pending','approved','rejected','retired'),allowNull:false,defaultValue:'draft'}, approval_request_id:DataTypes.BIGINT.UNSIGNED,
    approved_by:DataTypes.BIGINT.UNSIGNED, approved_at:DataTypes.DATE, rejection_reason:DataTypes.STRING(500), created_by:DataTypes.BIGINT.UNSIGNED, updated_by:DataTypes.BIGINT.UNSIGNED,
  },{sequelize,modelName:'ServicePrice',tableName:'service_prices',paranoid:true});
  return ServicePrice;
};
