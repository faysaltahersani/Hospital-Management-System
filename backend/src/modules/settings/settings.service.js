'use strict';

const ApiError = require('../../utils/ApiError');
const { parsePaging, buildMeta } = require('../../utils/pagination');
const repository = require('./settings.repository');

const listSettings = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.group_name) filters.group_name = query.group_name;
  if (query.is_public !== undefined) filters.is_public = query.is_public;
  const { rows, count } = await repository.findAndCountSettings({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((s) => s.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const listPublicSettings = async () => {
  const rows = await repository.findPublicSettings();
  return rows.map((s) => s.toJSON());
};

const getSetting = async (id) => {
  const setting = await repository.findSettingById(id);
  if (!setting) throw ApiError.notFound('Setting not found');
  return setting.toJSON();
};

const createSetting = async (input) => {
  const exists = await repository.findSettingByKey(input.group_name || 'general', input.key);
  if (exists) throw ApiError.conflict('Setting already exists');
  const setting = await repository.createSetting(input);
  return setting.toJSON();
};

const updateSetting = async (id, changes) => {
  const setting = await repository.findSettingById(id);
  if (!setting) throw ApiError.notFound('Setting not found');
  const groupName = changes.group_name || setting.group_name;
  const key = changes.key || setting.key;
  if (groupName !== setting.group_name || key !== setting.key) {
    const exists = await repository.findSettingByKey(groupName, key);
    if (exists) throw ApiError.conflict('Setting already exists');
  }
  await repository.updateSetting(setting, changes);
  return setting.toJSON();
};

const removeSetting = async (id) => {
  const setting = await repository.findSettingById(id);
  if (!setting) throw ApiError.notFound('Setting not found');
  await repository.destroySetting(setting);
  return { message: 'Setting deleted' };
};

const listOptions = async (query) => {
  const { page, limit, offset } = parsePaging(query);
  const filters = {};
  if (query.type) filters.type = query.type;
  if (query.is_active !== undefined) filters.is_active = query.is_active;
  const { rows, count } = await repository.findAndCountOptions({
    filters,
    search: query.search,
    limit,
    offset,
  });
  return { items: rows.map((o) => o.toJSON()), meta: buildMeta({ total: count, page, limit }) };
};

const getOption = async (id) => {
  const option = await repository.findOptionById(id);
  if (!option) throw ApiError.notFound('Master option not found');
  return option.toJSON();
};

const createOption = async (input) => {
  const exists = await repository.findOptionByTypeCode(input.type, input.code);
  if (exists) throw ApiError.conflict('Master option already exists');
  const option = await repository.createOption(input);
  return option.toJSON();
};

const updateOption = async (id, changes) => {
  const option = await repository.findOptionById(id);
  if (!option) throw ApiError.notFound('Master option not found');
  const type = changes.type || option.type;
  const code = changes.code || option.code;
  if (type !== option.type || code !== option.code) {
    const exists = await repository.findOptionByTypeCode(type, code);
    if (exists) throw ApiError.conflict('Master option already exists');
  }
  await repository.updateOption(option, changes);
  return option.toJSON();
};

const removeOption = async (id) => {
  const option = await repository.findOptionById(id);
  if (!option) throw ApiError.notFound('Master option not found');
  await repository.destroyOption(option);
  return { message: 'Master option deleted' };
};

const defaultCompanyProfile = {
  title: "Hospital Management System",
  address: "Dhaka, Bangladesh",
  currency: "TK",
  barcode_prefix: "HMS",
  logo_url: "",
  use_invoice_pad: true,
  barcode_generate_automatically: false,
  default_bill_status: "Pending",
  default_delivery_status: "Delivered",
  default_finance_transaction_status: "Pending",
  tax_calculation: "General",
  allow_minus_stock_sale: false,
  enable_product_tax: false,
  previous_balance_due_show_on_invoice: false,
  direct_serial_scan: false,
  invoice_footer_branding_mark: false,
  sales_and_challan_employee_required: false,
  project_wise_expense: false,
  is_custom_pad_print: true,
  is_receipt_on_vat_and_ait: false,
  finance_voucher_signature_default: false,
  invoice_product_on_additional_note: false,
};

const getCompanyProfile = async () => {
  const opt = await repository.findOptionByTypeCode('company_profile', 'COMPANY-PROFILE');
  if (!opt) return defaultCompanyProfile;
  try {
    return { ...defaultCompanyProfile, ...JSON.parse(opt.description || '{}') };
  } catch {
    return defaultCompanyProfile;
  }
};

const updateCompanyProfile = async (input) => {
  const { MasterOption } = require('../../models');
  const [opt] = await MasterOption.findOrCreate({
    where: { type: 'company_profile', code: 'COMPANY-PROFILE' },
    defaults: {
      type: 'company_profile',
      code: 'COMPANY-PROFILE',
      label: input.title || 'Company Profile',
      description: JSON.stringify(input),
      is_active: true,
    },
  });

  await opt.update({
    label: input.title || 'Company Profile',
    description: JSON.stringify(input),
  });

  return { ...defaultCompanyProfile, ...input };
};

const getBackupMeta = async () => {
  const opt = await repository.findOptionByTypeCode('system_backup', 'LATEST-BACKUP');
  if (!opt) {
    return {
      has_backup: false,
      last_backup_at: null,
      last_backup_filename: null,
    };
  }
  try {
    const meta = JSON.parse(opt.description || '{}');
    return {
      has_backup: true,
      last_backup_at: meta.last_backup_at || opt.updatedAt,
      last_backup_filename: meta.last_backup_filename || 'hospital-backup.sql',
    };
  } catch {
    return { has_backup: false, last_backup_at: null, last_backup_filename: null };
  }
};

// BUG-015 — real, verifiable backup/restore. See utils/sqlBackup for the full
// account of what was wrong before (format mismatch, swallowed errors, silent
// truncation, hand-rolled escaping, doctors that could never restore).
const generateBackupData = async () => {
  const { sequelize, MasterOption } = require('../../models');
  const { createBackup } = require('../../utils/sqlBackup');

  // Any failure propagates: a backup that cannot be trusted must not be offered
  // to the operator as though it succeeded.
  const { sql, manifest, filename } = await createBackup(sequelize);

  await MasterOption.upsert({
    type: 'system_backup',
    code: 'LATEST-BACKUP',
    label: 'Latest System Backup',
    description: JSON.stringify({
      last_backup_at: manifest.generated_at,
      last_backup_filename: filename,
      tables: Object.keys(manifest.tables).length,
      total_rows: manifest.total_rows,
      foreign_keys: manifest.foreign_keys,
      format_version: manifest.format_version,
    }),
    is_active: true,
  });

  return { backupData: sql, filename, manifest };
};

const restoreBackupData = async (payload) => {
  const { sequelize } = require('../../models');
  const { restoreBackup } = require('../../utils/sqlBackup');

  // Accept the exact artefact the export produces: raw SQL text, or a JSON
  // envelope carrying it. Anything else is refused rather than half-applied.
  let sql = null;
  if (typeof payload === 'string') sql = payload;
  else if (payload && typeof payload.sql === 'string') sql = payload.sql;
  else if (payload && typeof payload.backupData === 'string') sql = payload.backupData;

  if (!sql) {
    throw ApiError.badRequest(
      'Restore requires the .sql file produced by GET /settings/backup/download, ' +
        'sent as text/plain or as {"sql": "..."}. The previous JSON entity format is no longer accepted ' +
        'because it could not represent a full database.'
    );
  }

  const result = await restoreBackup(sequelize, sql);
  return {
    restored: true,
    database: result.manifest.database,
    backup_generated_at: result.manifest.generated_at,
    statements_executed: result.executed,
    verification: result.verification,
  };
};

const importData = async (entity, records = []) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw ApiError.badRequest('No valid records provided for import.');
  }

  const { Patient, Employee, LabTest, RadiologyTest, Medicine, MasterOption } = require('../../models');

  let createdCount = 0;
  let skippedCount = 0;

  if (entity === 'patients') {
    for (const record of records) {
      const full_name = (record.full_name || record.name || '').trim();
      if (!full_name) {
        skippedCount++;
        continue;
      }
      const rawGender = (record.gender || 'male').toLowerCase().trim();
      const gender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : 'male';
      const rawBlood = (record.blood_group || 'unknown').trim();
      const validBlood = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'].includes(rawBlood) ? rawBlood : 'unknown';
      const patient_code = (record.patient_code || record.code || `PAT-${Date.now().toString().slice(-4)}-${createdCount + 1}`).trim();

      try {
        const existing = await Patient.findOne({ where: { patient_code } });
        if (existing) {
          await existing.update({
            full_name,
            phone: record.phone || record.contact || existing.phone,
            email: record.email || existing.email,
            gender,
            blood_group: validBlood,
            address: record.address || existing.address,
            emergency_contact_name: record.emergency_contact_name || record.guardian_name || existing.emergency_contact_name,
            emergency_contact_phone: record.emergency_contact_phone || existing.emergency_contact_phone,
          });
        } else {
          await Patient.create({
            patient_code,
            full_name,
            phone: record.phone || record.contact || null,
            email: record.email || null,
            gender,
            blood_group: validBlood,
            address: record.address || null,
            emergency_contact_name: record.emergency_contact_name || record.guardian_name || null,
            emergency_contact_phone: record.emergency_contact_phone || null,
          });
        }
        createdCount++;
      } catch (_err) {
        skippedCount++;
      }
    }
  } else if (entity === 'pathology_tests') {
    for (const record of records) {
      const name = (record.name || '').trim();
      if (!name) {
        skippedCount++;
        continue;
      }
      const code = (record.code || `PATH-${createdCount + 1}`).trim().toUpperCase();
      const price = Number(record.price || record.charge || record.base_charge || record.final_charge || 0);
      const base_charge = Number(record.base_charge || record.price || record.charge || 0);
      const final_charge = Number(record.final_charge || record.price || record.charge || 0);

      try {
        const [test] = await LabTest.findOrCreate({
          where: { code },
          defaults: {
            code,
            name,
            short_name: record.short_name || null,
            category: record.category || 'General',
            test_type: record.test_type || null,
            method: record.method || null,
            sample_type: record.sample_type || 'Blood',
            normal_range: record.normal_range || null,
            unit: record.unit || null,
            price,
            base_charge,
            final_charge,
            tax_rate: Number(record.tax_rate || 0),
            report_delivery_day: record.report_delivery_day || null,
            is_active: true,
          },
        });
        if (test) await test.update({ name, price, base_charge, final_charge, short_name: record.short_name || test.short_name, test_type: record.test_type || test.test_type, method: record.method || test.method }).catch(() => {});

        const [opt] = await MasterOption.findOrCreate({
          where: { type: 'pathology_test', code },
          defaults: {
            type: 'pathology_test',
            code,
            label: name,
            description: JSON.stringify({
              price,
              base_charge,
              final_charge,
              short_name: record.short_name || null,
              category: record.category || 'General',
              test_type: record.test_type || null,
              method: record.method || null,
              sample_type: record.sample_type || 'Blood',
              normal_range: record.normal_range || null,
              unit: record.unit || null,
            }),
            is_active: true,
          },
        });
        if (opt) await opt.update({ label: name }).catch(() => {});
        createdCount++;
      } catch (_err) {
        skippedCount++;
      }
    }
  } else if (entity === 'radiology_tests') {
    for (const record of records) {
      const name = (record.name || '').trim();
      if (!name) {
        skippedCount++;
        continue;
      }
      const code = (record.code || `RAD-${createdCount + 1}`).trim().toUpperCase();
      const price = Number(record.price || record.charge || 0);

      try {
        const [test] = await RadiologyTest.findOrCreate({
          where: { code },
          defaults: {
            code,
            name,
            short_name: record.short_name || null,
            category: record.category || 'other',
            test_type: record.test_type || null,
            method: record.method || null,
            price,
            base_charge: price,
            final_charge: price,
            tax_rate: Number(record.tax_rate || 0),
            description: record.description || null,
            is_active: true,
          },
        });
        if (test) await test.update({ name, price }).catch(() => {});

        const [opt] = await MasterOption.findOrCreate({
          where: { type: 'radiology_test', code },
          defaults: {
            type: 'radiology_test',
            code,
            label: name,
            description: JSON.stringify({
              price,
              category: record.category || 'other',
              tax_rate: Number(record.tax_rate || 0),
              description: record.description || null,
            }),
            is_active: true,
          },
        });
        if (opt) await opt.update({ label: name }).catch(() => {});
        createdCount++;
      } catch (_err) {
        skippedCount++;
      }
    }
  } else if (entity === 'employees') {
    for (const record of records) {
      const full_name = (record.full_name || record.name || '').trim();
      if (!full_name) {
        skippedCount++;
        continue;
      }
      const code = (record.employee_code || record.code || `EMP-${Date.now().toString().slice(-4)}-${createdCount + 1}`).trim();
      const rawGender = (record.gender || 'male').toLowerCase().trim();
      const gender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : 'male';

      try {
        const [emp] = await Employee.findOrCreate({
          where: { employee_code: code },
          defaults: {
            employee_code: code,
            full_name,
            designation: record.designation || 'Staff',
            gender,
            phone: record.phone || null,
            email: record.email || null,
            address: record.address || null,
            joining_date: record.joining_date || new Date().toISOString().split('T')[0],
            basic_salary: Number(record.basic_salary || record.salary || 0),
            bank_account: record.bank_account || null,
            is_active: true,
          },
        });
        if (emp) await emp.update({ full_name }).catch(() => {});

        const [opt] = await MasterOption.findOrCreate({
          where: { type: 'employee', code },
          defaults: {
            type: 'employee',
            code,
            label: full_name,
            description: JSON.stringify({
              email: record.email || null,
              phone: record.phone || null,
              designation: record.designation || 'Staff',
              basic_salary: Number(record.basic_salary || record.salary || 0),
              joining_date: record.joining_date || new Date().toISOString().split('T')[0],
            }),
            is_active: true,
          },
        });
        if (opt) await opt.update({ label: full_name }).catch(() => {});
        createdCount++;
      } catch (_err) {
        skippedCount++;
      }
    }
  } else if (entity === 'medicines') {
    for (const record of records) {
      const name = (record.name || '').trim();
      if (!name) {
        skippedCount++;
        continue;
      }
      const code = (record.code || record.medicine_code || `MED-${createdCount + 1}`).trim().toUpperCase();

      try {
        const [med] = await Medicine.findOrCreate({
          where: { code },
          defaults: {
            code,
            name,
            generic_name: record.generic_name || null,
            company: record.company || record.manufacturer || null,
            manufacturer: record.manufacturer || record.company || null,
            category: record.category || 'General',
            unit: record.unit || 'piece',
            purchase_price: Number(record.purchase_price || record.buying_price || 0),
            sale_price: Number(record.sale_price || record.selling_price || record.price || 0),
            stock_quantity: Number(record.stock_quantity || record.stock || 0),
            description: record.description || null,
            is_active: true,
          },
        });
        if (med) await med.update({ name }).catch(() => {});

        const [opt] = await MasterOption.findOrCreate({
          where: { type: 'medicine', code },
          defaults: {
            type: 'medicine',
            code,
            label: name,
            description: JSON.stringify({
              buying_price: Number(record.purchase_price || record.buying_price || 0),
              selling_price: Number(record.sale_price || record.selling_price || record.price || 0),
              stock: Number(record.stock_quantity || record.stock || 0),
              unit: record.unit || 'piece',
            }),
            is_active: true,
          },
        });
        if (opt) await opt.update({ label: name }).catch(() => {});
        createdCount++;
      } catch (_err) {
        skippedCount++;
      }
    }
  } else {
    throw ApiError.badRequest(`Unsupported entity type: ${entity}`);
  }

  return {
    entity,
    created_count: createdCount,
    skipped_count: skippedCount,
    total_processed: records.length,
  };
};

module.exports = {
  listSettings,
  listPublicSettings,
  getSetting,
  createSetting,
  updateSetting,
  removeSetting,
  listOptions,
  getOption,
  createOption,
  updateOption,
  removeOption,
  getCompanyProfile,
  updateCompanyProfile,
  getBackupMeta,
  generateBackupData,
  restoreBackupData,
  importData,
};
