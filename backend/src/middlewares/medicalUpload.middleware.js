'use strict';

const multer = require('multer');

const ApiError = require('../utils/ApiError');
const storage = require('../utils/medicalFileStorage');

/**
 * Multipart handling for medical files.
 *
 * memoryStorage, not diskStorage, on purpose: the file must be checksummed and
 * type-checked *before* anything is written, and multer's disk storage would have
 * already put an unvalidated file on disk under a name it chose. The buffer goes
 * to utils/medicalFileStorage, which decides the path.
 *
 * The size cap is enforced here so an oversized upload is rejected while streaming
 * rather than after the whole body has been buffered.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storage.MAX_FILE_BYTES,
    files: 20,
    // Keeps a malicious client from exhausting memory with thousands of fields.
    fields: 40,
  },
  fileFilter: (_req, file, cb) => {
    if (!storage.isAllowed(file.mimetype, file.originalname)) {
      cb(
        ApiError.badRequest(
          `"${file.originalname}" is not an accepted medical file type. Allowed: ${storage.allowedDescription()}`
        )
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * Translates multer's own errors into the API's error shape. Without this a file
 * that is too large surfaces as an unhandled 500 rather than a 400 the client can
 * act on.
 */
const handleUploadErrors = (handler) => (req, res, next) =>
  handler(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `File exceeds the ${Math.floor(storage.MAX_FILE_BYTES / (1024 * 1024))} MB limit`,
        LIMIT_FILE_COUNT: 'Too many files in one request',
        LIMIT_UNEXPECTED_FILE: `Unexpected field "${err.field}"; files must be sent as "files"`,
      };
      return next(ApiError.badRequest(messages[err.code] || `Upload rejected: ${err.code}`));
    }
    return next(err);
  });

/** Accepts up to 20 files under the field name `files`. */
const uploadMedicalFiles = handleUploadErrors(upload.array('files', 20));

/** Accepts exactly one file under `file`, for a report PDF or a replacement. */
const uploadSingleMedicalFile = handleUploadErrors(upload.single('file'));

module.exports = { uploadMedicalFiles, uploadSingleMedicalFile };
