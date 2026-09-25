'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const config = require('./index');
const logger = require('./logger');
const { installTenantHooks } = require('../utils/tenantContext');

const TENANT_TABLES = new Set([
  'users','patients','patient_allergies','patient_problems','patient_histories','vital_signs','clinical_notes',
  'doctors','appointments','opd_visits','admissions','prescriptions','diagnostic_studies','departments','wards','beds',
  'lab_tests','lab_orders','radiology_tests','radiology_orders','medicines','medicine_batches','medicine_sales','invoices',
  'payments','expense_categories','expenses','income_entries','contra_entries','blood_donors','blood_bags','blood_issues',
  'ambulances','ambulance_trips','referrals','employees','attendance','payrolls',
  'emergency_encounters','emergency_triages','emergency_doctor_assignments','emergency_assessments',
  'emergency_orders','emergency_procedures','emergency_observations','emergency_dispositions',
]);
const DEPARTMENT_TABLES = new Set(['users','admissions','lab_orders','radiology_orders','diagnostic_studies','invoices','wards','emergency_encounters']);

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  logging: config.db.logging ? (msg) => logger.debug(msg) : false,
  pool: {
    max: config.db.pool.max,
    min: config.db.pool.min,
    idle: config.db.pool.idle,
  },
  define: {
    underscored: true,
    freezeTableName: false,
    timestamps: true,
    paranoid: false,
  },
  timezone: '+00:00',
  hooks: {
    beforeDefine(attributes, options) {
      const table = options.tableName;
      if (TENANT_TABLES.has(table)) {
        for (const field of ['organization_id','hospital_id','branch_id']) {
          if (!attributes[field]) attributes[field] = { type: DataTypes.BIGINT.UNSIGNED, allowNull: true };
        }
      }
      if (DEPARTMENT_TABLES.has(table) && !attributes.department_id) {
        attributes.department_id = { type: DataTypes.BIGINT.UNSIGNED, allowNull: true };
      }
    },
    afterDefine(model) {
      if (TENANT_TABLES.has(model.tableName)) installTenantHooks(model);
    },
  },
});

module.exports = sequelize;
