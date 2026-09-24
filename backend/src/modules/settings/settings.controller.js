'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./settings.service');

const listPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await service.listPublicSettings();
  return ApiResponse.success(res, settings, 'OK');
});

const listSettings = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSettings(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getSetting = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getSetting(req.params.id), 'OK'));

const createSetting = asyncHandler(async (req, res) => {
  const setting = await service.createSetting(req.body);
  return ApiResponse.created(res, setting, 'Setting created');
});

const updateSetting = asyncHandler(async (req, res) => {
  const setting = await service.updateSetting(req.params.id, req.body);
  return ApiResponse.success(res, setting, 'Setting updated');
});

const removeSetting = asyncHandler(async (req, res) => {
  const result = await service.removeSetting(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const listOptions = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOptions(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getOption = asyncHandler(async (req, res) => ApiResponse.success(res, await service.getOption(req.params.id), 'OK'));

const createOption = asyncHandler(async (req, res) => {
  const option = await service.createOption(req.body);
  return ApiResponse.created(res, option, 'Master option created');
});

const updateOption = asyncHandler(async (req, res) => {
  const option = await service.updateOption(req.params.id, req.body);
  return ApiResponse.success(res, option, 'Master option updated');
});

const removeOption = asyncHandler(async (req, res) => {
  const result = await service.removeOption(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const getCompanyProfile = asyncHandler(async (_req, res) => {
  const data = await service.getCompanyProfile();
  return ApiResponse.success(res, data, 'Company profile retrieved');
});

const updateCompanyProfile = asyncHandler(async (req, res) => {
  const data = await service.updateCompanyProfile(req.body);
  return ApiResponse.success(res, data, 'Company profile updated');
});

const getBackupMeta = asyncHandler(async (_req, res) => {
  const data = await service.getBackupMeta();
  return ApiResponse.success(res, data, 'Backup meta retrieved');
});

const downloadBackup = asyncHandler(async (_req, res) => {
  const { backupData, filename, manifest } = await service.generateBackupData();
  res.setHeader('Content-Type', 'application/sql; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-HMS-Backup-Tables', String(Object.keys(manifest.tables).length));
  res.setHeader('X-HMS-Backup-Rows', String(manifest.total_rows));
  return res.status(200).send(backupData);
});

const restoreBackup = asyncHandler(async (req, res) => {
  // BUG-015 — the message no longer claims success unconditionally; a failed or
  // unverifiable restore throws and is reported as an error.
  const result = await service.restoreBackupData(req.body);
  return ApiResponse.success(
    res,
    result,
    `Restore verified: ${result.verification.tables_present}/${result.verification.tables_expected} tables, ` +
      `${result.verification.total_rows_expected} rows, ${result.verification.foreign_keys.actual} foreign keys.`
  );
});

const importData = asyncHandler(async (req, res) => {
  const { entity, records } = req.body || {};
  const result = await service.importData(entity, records);
  return ApiResponse.success(res, result, `Successfully imported ${result.created_count} ${result.entity} record(s).`);
});

module.exports = {
  listPublicSettings,
  listSettings,
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
  downloadBackup,
  restoreBackup,
  importData,
};
