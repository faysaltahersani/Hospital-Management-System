'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const config = require('../config');
const logger = require('../config/logger');

/**
 * Storage for medical images, original diagnostic files and generated report PDFs.
 *
 * Design rules, each of them a deliberate refusal of an easier option:
 *
 *  * Bytes go on disk, metadata goes in the database. A 40 MB CT series in a BLOB
 *    column would make every backup, replication and query of the diagnostic
 *    tables carry image data it never needs.
 *
 *  * The storage root is NOT served statically and is not inside the web root.
 *    There is no URL that reaches a file directly; the only way out is the
 *    authorised download route, which checks the study and patient first.
 *
 *  * A caller never chooses the path. `storage_key` is derived here from the
 *    patient, the date and a random token. That removes path traversal as a class
 *    of bug — a filename of `../../.env` cannot escape, because the original name
 *    is stored as metadata and never used to build the path.
 *
 *  * Files are content-addressed by SHA-256 so an identical re-upload is
 *    detectable and integrity can be re-verified years later.
 *
 *  * Nothing is ever overwritten. Writing to an occupied key is a programming
 *    error, not a silent replacement, because the thing being overwritten would be
 *    somebody's medical record.
 */

/** Absolute root for stored files. Configurable so deployments can mount a volume. */
const STORAGE_ROOT = path.resolve(
  process.env.MEDICAL_FILE_ROOT || path.join(__dirname, '..', '..', 'storage', 'medical')
);

/**
 * What may be stored, by MIME type, with the extension we will actually write.
 * An allow-list rather than a deny-list: an unrecognised type is refused, so a
 * `.html` or `.svg` carrying script never lands in a directory we later stream.
 */
const ALLOWED_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/tiff': '.tif',
  'application/pdf': '.pdf',
  'application/dicom': '.dcm',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'text/plain': '.txt',
  'text/csv': '.csv',
});

/** Extensions we accept when the browser sends a useless generic MIME type. */
const EXTENSION_FALLBACK = Object.freeze({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.pdf': 'application/pdf',
  '.dcm': 'application/dicom',
  '.dicom': 'application/dicom',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
});

const MAX_FILE_BYTES = Number(process.env.MEDICAL_FILE_MAX_BYTES || 64 * 1024 * 1024);

/**
 * DICOM files are routinely served as `application/octet-stream`, and browsers
 * send that for anything they do not recognise. Resolving by extension as a
 * fallback keeps a genuine .dcm upload working without widening the allow-list to
 * "any binary".
 */
const resolveMimeType = (declaredMime, originalName) => {
  const declared = String(declaredMime || '').toLowerCase().split(';')[0].trim();
  if (ALLOWED_TYPES[declared]) return declared;
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const byExtension = EXTENSION_FALLBACK[ext];
  if (byExtension && ALLOWED_TYPES[byExtension]) return byExtension;
  return null;
};

const isAllowed = (declaredMime, originalName) => Boolean(resolveMimeType(declaredMime, originalName));

/** Human-readable list for error messages, so a rejection explains itself. */
const allowedDescription = () => Object.keys(ALLOWED_TYPES).join(', ');

/**
 * Sanitises a client-supplied name for *display only*. The result is never used to
 * build a path — see buildStorageKey.
 */
const safeDisplayName = (originalName) => {
  const base = path.basename(String(originalName || 'file'));
  const cleaned = base
    // Control characters, escaped so this file stays plain text.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\/:*?"<>|]/g, '_')
    .trim();
  return (cleaned || 'file').slice(0, 255);
};

/**
 * patients/<patientId>/<yyyy>/<mm>/<random>.<ext>
 *
 * Partitioned by patient and month so a directory never accumulates millions of
 * entries, and the random component means a key cannot be guessed from a patient
 * id even if the storage root were ever exposed by accident.
 */
const buildStorageKey = ({ patientId, mimeType, originalName, when = new Date() }) => {
  const resolved = resolveMimeType(mimeType, originalName);
  if (!resolved) {
    throw new Error(`Unsupported file type "${mimeType || path.extname(originalName || '')}"`);
  }
  const year = when.getFullYear();
  const month = String(when.getMonth() + 1).padStart(2, '0');
  const token = crypto.randomBytes(16).toString('hex');
  return path.posix.join('patients', String(patientId), String(year), month, `${token}${ALLOWED_TYPES[resolved]}`);
};

/**
 * Resolves a storage key to an absolute path and refuses anything that escapes the
 * root. Called on every read as well as every write: even though keys are
 * generated here, a key read back from the database is still treated as untrusted
 * input, because that is the assumption that survives a future bug elsewhere.
 */
const resolvePath = (storageKey) => {
  if (!storageKey || typeof storageKey !== 'string') throw new Error('A storage key is required');
  const absolute = path.resolve(STORAGE_ROOT, storageKey);
  const rootWithSep = STORAGE_ROOT.endsWith(path.sep) ? STORAGE_ROOT : STORAGE_ROOT + path.sep;
  if (absolute !== STORAGE_ROOT && !absolute.startsWith(rootWithSep)) {
    throw new Error('Refusing to resolve a storage key outside the medical file root');
  }
  return absolute;
};

const ensureRoot = async () => {
  await fsp.mkdir(STORAGE_ROOT, { recursive: true });
  // A stray index or directory listing must not be servable even if someone later
  // points a static handler at this tree by mistake.
  const guard = path.join(STORAGE_ROOT, 'README.txt');
  try {
    await fsp.access(guard);
  } catch (err) {
    await fsp.writeFile(
      guard,
      'Medical file storage. Not web-served. Files are streamed only through the\n' +
        'authorised diagnostics download endpoint after an access check.\n',
      'utf8'
    );
  }
};

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/**
 * Writes a buffer and returns everything the database row needs.
 * Refuses to clobber an existing key.
 */
const saveBuffer = async ({ patientId, buffer, mimeType, originalName, when = new Date() }) => {
  if (!Buffer.isBuffer(buffer)) throw new Error('A file buffer is required');
  if (!buffer.length) throw new Error('Refusing to store an empty file');
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB limit`);
  }

  const resolvedMime = resolveMimeType(mimeType, originalName);
  if (!resolvedMime) throw new Error(`Unsupported file type. Allowed: ${allowedDescription()}`);

  await ensureRoot();
  const storageKey = buildStorageKey({ patientId, mimeType: resolvedMime, originalName, when });
  const absolute = resolvePath(storageKey);
  await fsp.mkdir(path.dirname(absolute), { recursive: true });

  // 'wx' fails if the path exists rather than truncating it.
  await fsp.writeFile(absolute, buffer, { flag: 'wx' });

  return {
    storage_key: storageKey,
    file_name: path.basename(storageKey),
    original_name: safeDisplayName(originalName),
    mime_type: resolvedMime,
    file_size: buffer.length,
    checksum_sha256: sha256(buffer),
  };
};

const readBuffer = async (storageKey) => fsp.readFile(resolvePath(storageKey));

/** Stat without throwing, for integrity checks that must report rather than fail. */
const stat = async (storageKey) => {
  try {
    return await fsp.stat(resolvePath(storageKey));
  } catch (err) {
    return null;
  }
};

const exists = async (storageKey) => Boolean(await stat(storageKey));

/** Read stream for the download route, so a large study is not buffered in memory. */
const createReadStream = (storageKey) => fs.createReadStream(resolvePath(storageKey));

/**
 * Re-computes the checksum and compares it with what was recorded. This is how a
 * silently corrupted or swapped file is detected years later.
 */
const verifyChecksum = async (storageKey, expected) => {
  if (!expected) return { verified: false, reason: 'no checksum recorded' };
  try {
    const buffer = await readBuffer(storageKey);
    const actual = sha256(buffer);
    return { verified: actual === expected, actual, expected };
  } catch (err) {
    return { verified: false, reason: err.message };
  }
};

/**
 * Deliberately NOT a delete of medical content: it moves the bytes into an
 * `archive/` subtree so a mistaken call cannot destroy a record. Retention policy
 * decides what eventually happens there, not application code.
 */
const archive = async (storageKey) => {
  const source = resolvePath(storageKey);
  const target = resolvePath(path.posix.join('archive', storageKey));
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.rename(source, target);
  logger.info(`Archived medical file ${storageKey}`);
  return path.posix.join('archive', storageKey);
};

module.exports = {
  STORAGE_ROOT,
  ALLOWED_TYPES,
  MAX_FILE_BYTES,
  allowedDescription,
  isAllowed,
  resolveMimeType,
  safeDisplayName,
  buildStorageKey,
  resolvePath,
  ensureRoot,
  sha256,
  saveBuffer,
  readBuffer,
  createReadStream,
  stat,
  exists,
  verifyChecksum,
  archive,
};
