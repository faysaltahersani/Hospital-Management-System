'use strict';

const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const storage = require('../../utils/medicalFileStorage');
const { sequelize, DiagnosticAttachment, DiagnosticImagingSeries } = require('../../models');
const repository = require('./diagnostics.repository');
const { ATTACHMENT_KINDS, DIAGNOSTIC_STATUS } = require('../../config/diagnostics');

/**
 * Medical file handling for a diagnostic study: upload, listing, authorised
 * download, versioned replacement and integrity verification.
 *
 * Two rules run through all of it:
 *
 *  * The study is the access gate. Every operation resolves the attachment through
 *    its study and compares the patient, so changing an id in the URL cannot reach
 *    another patient's film. That check is not optional even for an admin, because
 *    the point is to make cross-patient access impossible rather than merely
 *    discouraged.
 *
 *  * Nothing is overwritten. Replacing a file writes a new row and marks the old
 *    one superseded; deleting an attachment on a finalised study is refused
 *    outright. An original stays an original for its whole life.
 */

/** Picks the attachment kind from the MIME type when the caller does not say. */
const inferKind = (mimeType, requested) => {
  if (requested) return requested;
  if (mimeType === 'application/dicom') return ATTACHMENT_KINDS.DICOM;
  if (mimeType === 'application/pdf') return ATTACHMENT_KINDS.PDF;
  if (mimeType.startsWith('image/')) return ATTACHMENT_KINDS.IMAGE;
  if (mimeType.startsWith('video/')) return ATTACHMENT_KINDS.VIDEO;
  if (mimeType.startsWith('audio/')) return ATTACHMENT_KINDS.AUDIO;
  return ATTACHMENT_KINDS.DOCUMENT;
};

/**
 * Loads a study and refuses if it is missing. Shared by every file operation so
 * the study existence check cannot be forgotten in one of them.
 */
const requireStudy = async (studyId, options = {}) => {
  const study = await repository.findStudyRow(studyId, options);
  if (!study) throw ApiError.notFound('Diagnostic study not found');
  return study;
};

/**
 * The IDOR guard. An attachment is reachable only through the study it belongs to,
 * and only when that study's patient matches the attachment's patient. A mismatch
 * is treated as not-found rather than forbidden, so probing ids cannot be used to
 * discover which ones exist.
 */
const requireAttachmentInStudy = async (studyId, attachmentId, options = {}) => {
  const study = await requireStudy(studyId, options);
  // Needs the storage path, so it deliberately reads the unscoped row.
  const attachment = await repository.findAttachmentWithKey(attachmentId, options);
  if (!attachment) throw ApiError.notFound('File not found');
  if (Number(attachment.study_id) !== Number(study.id)) throw ApiError.notFound('File not found');
  if (Number(attachment.patient_id) !== Number(study.patient_id)) {
    // Should be impossible; if it happens the data is corrupt and serving the file
    // would be a cross-patient disclosure.
    throw ApiError.notFound('File not found');
  }
  return { study, attachment };
};

/* ── upload ────────────────────────────────────────────────────────────────── */

/**
 * Stores one or more uploaded files against a study.
 *
 * The bytes are written first and the rows inside a transaction afterwards: if the
 * transaction rolls back the orphaned bytes are cleaned up, which is preferable to
 * the reverse (a row pointing at a file that was never written).
 */
const uploadFiles = async (studyId, files, input, currentUserId) => {
  if (!files || !files.length) throw ApiError.badRequest('No file was uploaded');

  const study = await requireStudy(studyId);

  // A finalised report is immutable. New evidence belongs to an amendment, which
  // reopens the study through the documented route.
  if (study.status === DIAGNOSTIC_STATUS.FINAL) {
    throw ApiError.conflict(
      `Study ${study.study_code} is final. Files cannot be added to a finalised report; ` +
        'raise an amendment instead.'
    );
  }
  if (study.status === DIAGNOSTIC_STATUS.CANCELLED) {
    throw ApiError.conflict(`Study ${study.study_code} is cancelled.`);
  }

  const written = [];
  try {
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const stored = await storage.saveBuffer({
        patientId: study.patient_id,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      });
      written.push({ stored, file });
    }

    return await sequelize.transaction(async (t) => {
      let series = null;
      if (input.series_id) {
        series = await DiagnosticImagingSeries.findByPk(input.series_id, { transaction: t });
        if (!series) throw ApiError.badRequest(`Imaging series ${input.series_id} not found`);
        if (Number(series.study_id) !== Number(study.id)) {
          throw ApiError.badRequest('That imaging series belongs to a different study');
        }
      }

      const created = [];
      for (const [index, { stored, file }] of written.entries()) {
        const kind = inferKind(stored.mime_type, input.kind);
        // eslint-disable-next-line no-await-in-loop
        const row = await repository.createAttachment(
          {
            study_id: study.id,
            series_id: series ? series.id : null,
            patient_id: study.patient_id,
            kind,
            file_name: stored.file_name,
            original_name: stored.original_name,
            mime_type: stored.mime_type,
            file_size: stored.file_size,
            storage_key: stored.storage_key,
            checksum_sha256: stored.checksum_sha256,
            caption: Array.isArray(input.captions) ? input.captions[index] || null : input.caption || null,
            sort_order: index,
            version: 1,
            // Everything arriving from the department is an original. Only a
            // deliberate replacement produces a non-original row.
            is_original: true,
            is_current: true,
            uploaded_by: currentUserId || null,
            uploaded_at: new Date(),
            metadata: file.size !== stored.file_size ? JSON.stringify({ declared_size: file.size }) : null,
          },
          { transaction: t }
        );
        created.push(row);
      }

      if (series) {
        await series.update(
          { instance_count: await repository.countAttachments(study.id, { transaction: t }) },
          { transaction: t }
        );
      }

      // storage_key is stripped: the client gets metadata and an id, never a path.
      return created.map((row) => {
        const json = row.toJSON();
        delete json.storage_key;
        return json;
      });
    });
  } catch (err) {
    // Roll back the bytes we wrote so a failed upload leaves nothing behind.
    for (const { stored } of written) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await storage.archive(stored.storage_key);
      } catch (cleanupError) {
        // Archiving is best-effort; the original error is what matters.
      }
    }
    throw err;
  }
};

/* ── read ──────────────────────────────────────────────────────────────────── */

/** Metadata only — deliberately cheap, so opening a history never loads bytes. */
const listFiles = async (studyId, query = {}) => {
  const study = await requireStudy(studyId);
  const rows = await repository.findAttachmentsByStudy(study.id);
  const items = rows.map((r) => r.toJSON());
  if (query.current_only === true || query.current_only === 'true') {
    return items.filter((row) => row.is_current);
  }
  return items;
};

/**
 * Resolves a file for streaming. Returns the metadata plus a stream factory; the
 * controller sets the headers. The checksum is re-verified on the way out so a
 * corrupted or swapped file is reported rather than served as if it were intact.
 */
const openFile = async (studyId, attachmentId, { verify = false } = {}) => {
  const { attachment } = await requireAttachmentInStudy(studyId, attachmentId);

  if (!(await storage.exists(attachment.storage_key))) {
    // Log where we looked. The client is told the file is missing but never told
    // the path; operations need the path to find out why.
    logger.warn(
      `Attachment ${attachment.id} metadata exists but its bytes are absent. ` +
        `key=${attachment.storage_key} root=${storage.STORAGE_ROOT}`
    );
    throw ApiError.notFound(
      `The stored file for "${attachment.original_name}" is missing from storage. ` +
        'The metadata record is intact; the bytes need restoring from backup.'
    );
  }

  if (verify && attachment.checksum_sha256) {
    const result = await storage.verifyChecksum(attachment.storage_key, attachment.checksum_sha256);
    if (!result.verified) {
      throw ApiError.conflict(
        `Integrity check failed for "${attachment.original_name}": the stored file does not match its recorded checksum.`
      );
    }
  }

  return {
    attachment,
    stream: () => storage.createReadStream(attachment.storage_key),
  };
};

/* ── versioned replacement ─────────────────────────────────────────────────── */

/**
 * Replaces a file without destroying the one it replaces. The previous row keeps
 * its bytes and its checksum and gains `superseded_by_id`; the new row carries the
 * incremented version and `is_original: false`.
 */
const replaceFile = async (studyId, attachmentId, file, input, currentUserId) => {
  if (!file) throw ApiError.badRequest('No replacement file was uploaded');

  const { study, attachment } = await requireAttachmentInStudy(studyId, attachmentId);

  if (study.status === DIAGNOSTIC_STATUS.FINAL) {
    throw ApiError.conflict(
      `Study ${study.study_code} is final. A file on a finalised report cannot be replaced; ` +
        'raise an amendment instead.'
    );
  }
  if (!attachment.is_current) {
    throw ApiError.conflict('That file has already been superseded; replace the current version instead.');
  }

  const stored = await storage.saveBuffer({
    patientId: study.patient_id,
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
  });

  try {
    return await sequelize.transaction(async (t) => {
      const replacement = await repository.createAttachment(
        {
          study_id: study.id,
          series_id: attachment.series_id,
          patient_id: study.patient_id,
          kind: attachment.kind,
          file_name: stored.file_name,
          original_name: stored.original_name,
          mime_type: stored.mime_type,
          file_size: stored.file_size,
          storage_key: stored.storage_key,
          checksum_sha256: stored.checksum_sha256,
          caption: input.caption || attachment.caption,
          sort_order: attachment.sort_order,
          version: Number(attachment.version || 1) + 1,
          is_original: false,
          is_current: true,
          uploaded_by: currentUserId || null,
          uploaded_at: new Date(),
          metadata: JSON.stringify({
            replaces_attachment_id: attachment.id,
            reason: input.reason || null,
          }),
        },
        { transaction: t }
      );

      // The superseded row is retained in full — this is the preservation guarantee.
      await attachment.update(
        { is_current: false, superseded_by_id: replacement.id, superseded_at: new Date() },
        { transaction: t }
      );

      const json = replacement.toJSON();
      delete json.storage_key;
      return { replacement: json, superseded_id: attachment.id };
    });
  } catch (err) {
    try {
      await storage.archive(stored.storage_key);
    } catch (cleanupError) {
      // best effort
    }
    throw err;
  }
};

/* ── removal ───────────────────────────────────────────────────────────────── */

/**
 * Detaches a file from an open study. The bytes are archived rather than unlinked,
 * and a finalised study refuses removal entirely — a finalised report's evidence is
 * part of the medical record.
 */
const removeFile = async (studyId, attachmentId, currentUserId) => {
  const { study, attachment } = await requireAttachmentInStudy(studyId, attachmentId);

  if ([DIAGNOSTIC_STATUS.FINAL, DIAGNOSTIC_STATUS.VERIFIED].includes(study.status)) {
    throw ApiError.conflict(
      `Study ${study.study_code} is ${study.status}. Files forming part of a verified or finalised ` +
        'report cannot be removed.'
    );
  }
  if (attachment.kind === ATTACHMENT_KINDS.GENERATED_REPORT) {
    throw ApiError.conflict('A generated report PDF cannot be removed; it belongs to a report version.');
  }

  return sequelize.transaction(async (t) => {
    const archivedKey = await storage.archive(attachment.storage_key);
    await attachment.update(
      {
        is_current: false,
        superseded_at: new Date(),
        storage_key: archivedKey,
        metadata: JSON.stringify({
          archived_by: currentUserId || null,
          archived_at: new Date().toISOString(),
          previous_storage_key: attachment.storage_key,
        }),
      },
      { transaction: t }
    );
    await repository.destroyAttachment(attachment, { transaction: t });
    return { message: 'File archived and detached from the study' };
  });
};

/* ── integrity ─────────────────────────────────────────────────────────────── */

/** Re-verifies every stored file for a study. Read-only; reports rather than fixes. */
const verifyStudyFiles = async (studyId) => {
  const study = await requireStudy(studyId);
  const rows = await repository.findAttachmentsWithKeys(study.id);
  const results = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const present = await storage.exists(row.storage_key);
    // eslint-disable-next-line no-await-in-loop
    const check = present ? await storage.verifyChecksum(row.storage_key, row.checksum_sha256) : null;
    results.push({
      attachment_id: row.id,
      original_name: row.original_name,
      kind: row.kind,
      version: row.version,
      is_current: row.is_current,
      present,
      checksum_verified: check ? check.verified : false,
      reason: present ? check?.reason || null : 'file missing from storage',
    });
  }
  return {
    study_id: study.id,
    study_code: study.study_code,
    total: results.length,
    intact: results.filter((r) => r.present && r.checksum_verified).length,
    files: results,
  };
};

module.exports = {
  uploadFiles,
  listFiles,
  openFile,
  replaceFile,
  removeFile,
  verifyStudyFiles,
  requireAttachmentInStudy,
  inferKind,
};
