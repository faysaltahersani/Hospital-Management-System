'use strict';
const { DataTypes, Model } = require('sequelize');
module.exports = (sequelize) => {
  class ServiceSourceLink extends Model {}
  ServiceSourceLink.init({
    id:{type:DataTypes.BIGINT.UNSIGNED,primaryKey:true,autoIncrement:true}, organization_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
    service_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false}, source_type:{type:DataTypes.ENUM('doctor','lab_test','radiology_test','bed','ambulance','medicine','blood_bag','legacy_charge'),allowNull:false},
    source_id:{type:DataTypes.BIGINT.UNSIGNED,allowNull:false},
  },{sequelize,modelName:'ServiceSourceLink',tableName:'service_source_links',paranoid:false});
  return ServiceSourceLink;
};
