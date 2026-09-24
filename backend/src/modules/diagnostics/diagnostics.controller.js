'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./diagnostics.service');
const versions = require('./diagnostics.versions.service');
const pdf = require('./diagnostics.pdf.service');
const fileService = require('./diagnostics.files.service');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query);
  return ApiResponse.success(res, items, 'OK', meta);
});

const getMeta = asyncHandler(async (_req, res) => {
  return ApiResponse.success(res, await service.getMeta(), 'OK');
});

const patientHistory = asyncHandler(async (req, res) => {
  const { patient, items, meta } = await service.historyForPatient(req.params.patientId, req.query);
  return ApiResponse.success(res, items, 'OK', { ...meta, patient });
});

const getById = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await service.getById(req.params.id), 'OK');
});

const create = asyncHandler(async (req, res) => {
  const study = await service.create(req.body, req.user?.id);
  return ApiResponse.created(res, study, 'Diagnostic study created');
});

const update = asyncHandler(async (req, res) => {
  const study = await service.update(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, study, 'Diagnostic study updated');
});

const remove = asyncHandler(async (req, res) => {
  const result = await service.remove(req.params.id);
  return ApiResponse.success(res, null, result.message);
});

const saveResult = asyncHandler(async (req, res) => {
  const study = await service.saveResult(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, study, 'Result saved');
});

const changeStatus = asyncHandler(async (req, res) => {
  const study = await service.changeStatus(req.params.id, req.body, req.user?.id);
  return ApiResponse.success(res, study, `Study moved to ${req.body.status}`);
});

const verify = asyncHandler(async (req, res) => {
  const study = await service.verify(req.params.id, req.user?.id);
  return ApiResponse.success(res, study, 'Study verified');
});

const finalise = asyncHandler(async (req, res) => {
  const study = await service.finalise(req.params.id, req.user?.id);
  return ApiResponse.success(res, study, 'Report finalised');
});

/* ── report versions ───────────────────────────────────────────────────────── */

/**
 * Corrects a finalised report. The response reports which version was created and
 * what changed, so the caller can show the correction rather than silently
 * replacing what was on screen.
 */
const amend = asyncHandler(async (req, res) => {
  const result = await versions.amend(req.params.id, req.body, req.user?.id);
  return ApiResponse.created(
    res,
    result,
    `Amended report issued as version ${result.version.version_no}`
  );
});

const listVersions = asyncHandler(async (req, res) => {
  const data = await versions.listVersions(req.params.id);
  return ApiResponse.success(res, data, 'OK');
});

const getVersion = asyncHandler(async (req, res) => {
  const data = await versions.getVersion(req.params.id, req.params.versionNo);
  return ApiResponse.success(res, data, 'OK');
});

/**
 * Streams the PDF of a finalised report version, rendering it the first time and
 * serving the stored file every time after. `?download=true` saves rather than
 * displays.
 */
const reportPdf = asyncHandler(async (req, res) => {
  const { attachment, buffer } = await pdf.generateForVersion(req.params.id, req.params.versionNo);

  const disposition = req.query.download === 'true' || req.query.download === true ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${encodeURIComponent(attachment.original_name)}"`
  );
  // A patient's report must not be cached by a proxy or sniffed into another type.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(buffer.length));
  return res.end(buffer);
});

/* ── files ─────────────────────────────────────────────────────────────────── */

const uploadFiles = asyncHandler(async (req, res) => {
  const created = await fileService.uploadFiles(req.params.id, req.files, req.body, req.user?.id);
  return ApiResponse.created(res, created, `${created.length} file(s) uploaded`);
});

const listFiles = asyncHandler(async (req, res) => {
  const files = await fileService.listFiles(req.params.id, req.query);
  return ApiResponse.success(res, files, 'OK');
});

/**
 * Streams a stored file. This is the only way bytes leave the server: the storage
 * directory is not web-served, so there is no URL that bypasses the access check
 * performed inside the service.
 */
const downloadFile = asyncHandler(async (req, res) => {
  const { attachment, stream } = await fileService.openFile(req.params.id, req.params.fileId, {
    verify: req.query.verify === 'true',
  });

  const inline = req.query.download !== 'true';
  res.setHeader('Content-Type', attachment.mime_type);
  res.setHeader('Content-Length', String(attachment.file_size));
  // The filename is quoted and control characters were stripped at upload time, so
  // it cannot break out of the header.
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${attachment.original_name.replace(/"/g, '')}"`
  );
  // Patient data must not be cached by an intermediary.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const body = stream();
  body.on('error', (err) => {
    if (!res.headersSent) res.status(500);
    res.end();
    // eslint-disable-next-line no-underscore-dangle
    req.app?.locals?.logger?.error?.(`Stream failed for attachment ${attachment.id}: ${err.message}`);
  });
  body.pipe(res);
});

const replaceFile = asyncHandler(async (req, res) => {
  const result = await fileService.replaceFile(
    req.params.id,
    req.params.fileId,
    req.file,
    req.body,
    req.user?.id
  );
  return ApiResponse.success(res, result, 'File replaced; the previous version is preserved');
});

const removeFile = asyncHandler(async (req, res) => {
  const result = await fileService.removeFile(req.params.id, req.params.fileId, req.user?.id);
  return ApiResponse.success(res, null, result.message);
});

const verifyFiles = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await fileService.verifyStudyFiles(req.params.id), 'OK');
});

module.exports = {
  list,
  getMeta,
  patientHistory,
  getById,
  create,
  update,
  remove,
  saveResult,
  changeStatus,
  verify,
  finalise,
  amend,
  listVersions,
  getVersion,
  reportPdf,
  uploadFiles,
  listFiles,
  downloadFile,
  replaceFile,
  removeFile,
  verifyFiles,
};
