'use strict';

/**
 * Renders a finalised report version to PDF.
 *
 * The PDF is generated from the stored version snapshot, never from the live study
 * rows. That is the whole point: the snapshot is the signed document, so a PDF
 * produced from it today and one produced in five years are the same document, even
 * if a doctor has since been renamed or a reference range revised.
 *
 * The generated file is stored alongside the study's other attachments, as its own
 * `generated_report` row linked to the version it was rendered from. It does not
 * replace anything: the original uploads keep `is_original = 1` and stay
 * downloadable. Regenerating for the same version returns the file already on disk
 * rather than writing a second copy.
 *
 * Layout is chosen by the report's `template_key`, which `finalise` already
 * resolves from the study's category and modality. Every template renders only the
 * sections the snapshot actually contains — an empty heading on a medical report
 * invites the reader to assume something was missed.
 */

const PDFDocument = require('pdfkit');

const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const storage = require('../../utils/medicalFileStorage');
const { sequelize } = require('../../models');
const repository = require('./diagnostics.repository');
const { ATTACHMENT_KINDS } = require('../../config/diagnostics');

/* ── formatting helpers ────────────────────────────────────────────────────── */

const MARGIN = 42;
const INK = '#1a2126';
const MUTED = '#5d666d';
const RULE = '#c9d3d6';
const ACCENT = '#245e66';

const text = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

/** DECIMAL values arrive as "8.200000"; zero padding is dropped, never rounded. */
const trimNumber = (value) => {
  const raw = text(value);
  if (!/^-?\d+\.\d+$/.test(raw)) return raw;
  return raw.replace(/0+$/, '').replace(/\.$/, '');
};

const dateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().replace('T', ' ').slice(0, 16);
};

const rangeOf = (row) => {
  if (row.ref_range_text) return text(row.ref_range_text);
  const low = row.ref_range_low;
  const high = row.ref_range_high;
  const hasLow = low !== null && low !== undefined && low !== '';
  const hasHigh = high !== null && high !== undefined && high !== '';
  if (hasLow && hasHigh) return `${trimNumber(low)} - ${trimNumber(high)}`;
  if (hasLow) return `> ${trimNumber(low)}`;
  if (hasHigh) return `< ${trimNumber(high)}`;
  // No range on file. Blank is correct; a range must never be implied.
  return '';
};

const valueOf = (row) => {
  if (row.result_value !== null && row.result_value !== undefined && row.result_value !== '') {
    return text(row.result_value);
  }
  return trimNumber(row.result_numeric);
};

const FLAG_LABEL = {
  low: 'Low',
  high: 'High',
  critical_low: 'CRITICAL LOW',
  critical_high: 'CRITICAL HIGH',
  abnormal: 'Abnormal',
  normal: '',
};

/* ── drawing primitives ────────────────────────────────────────────────────── */

const heading = (doc, label) => {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.45);
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold').text(label.toUpperCase(), { characterSpacing: 0.6 });
  doc
    .strokeColor(RULE)
    .lineWidth(0.6)
    .moveTo(MARGIN, doc.y + 1.5)
    .lineTo(doc.page.width - MARGIN, doc.y + 1.5)
    .stroke();
  doc.moveDown(0.35);
  doc.fillColor(INK).font('Helvetica').fontSize(9);
};

const paragraph = (doc, label, body) => {
  if (!body) return;
  if (doc.y > doc.page.height - 100) doc.addPage();
  if (label) doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK).text(label);
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(text(body), { align: 'left', lineGap: 1.5 });
  doc.moveDown(0.35);
};

/**
 * A plain table. Column widths are fractions of the usable width so a layout
 * change cannot silently push a column off the page.
 */
const table = (doc, columns, rows) => {
  if (!rows.length) return;

  const usable = doc.page.width - MARGIN * 2;
  const widths = columns.map((column) => Math.round(usable * column.width));

  const drawRow = (cells, { bold = false, fill = null } = {}) => {
    const height = 14;
    if (doc.y + height > doc.page.height - 70) {
      doc.addPage();
      drawRow(
        columns.map((column) => column.label),
        { bold: true, fill: '#eef3f5' }
      );
    }

    const top = doc.y;
    if (fill) {
      doc.rect(MARGIN, top, usable, height).fill(fill);
    }

    let x = MARGIN;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(INK);
    cells.forEach((cell, index) => {
      doc.text(text(cell), x + 3, top + 4, {
        width: widths[index] - 6,
        height: height - 4,
        ellipsis: true,
        lineBreak: false,
      });
      x += widths[index];
    });

    doc
      .strokeColor(RULE)
      .lineWidth(0.4)
      .moveTo(MARGIN, top + height)
      .lineTo(MARGIN + usable, top + height)
      .stroke();

    doc.y = top + height;
  };

  drawRow(
    columns.map((column) => column.label),
    { bold: true, fill: '#eef3f5' }
  );
  rows.forEach((row) => drawRow(row));
  doc.moveDown(0.4);
};

/** Two-column key/value block for identity fields. */
const identityBlock = (doc, pairs) => {
  const present = pairs.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!present.length) return;

  const usable = doc.page.width - MARGIN * 2;
  const columnWidth = usable / 2;
  const rowHeight = 13;
  let index = 0;

  while (index < present.length) {
    const top = doc.y;
    for (let column = 0; column < 2 && index < present.length; column += 1, index += 1) {
      const [key, value] = present[index];
      const x = MARGIN + column * columnWidth;
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(`${key}`, x, top, { width: 74 });
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(INK)
        .text(text(value), x + 76, top - 1, { width: columnWidth - 82, ellipsis: true, lineBreak: false });
    }
    doc.y = top + rowHeight;
  }
  doc.moveDown(0.3);
};

/* ── templates ─────────────────────────────────────────────────────────────── */

/**
 * Which sections a template shows, and in which order. Every entry is skipped when
 * the snapshot has nothing for it, so the template decides emphasis and ordering
 * rather than inventing content.
 */
const TEMPLATES = {
  laboratory: ['parameters', 'organisms', 'interpretation', 'impression', 'conclusion', 'recommendation'],
  microbiology: ['organisms', 'parameters', 'interpretation', 'impression', 'recommendation'],
  histopathology: ['specimenBlock', 'findings', 'microscopy', 'impression', 'conclusion', 'recommendation'],
  cytology: ['specimenBlock', 'findings', 'impression', 'conclusion', 'recommendation'],
  radiology: ['techniqueBlock', 'findings', 'measurements', 'impression', 'recommendation'],
  // The modality catalogue issues its own template key per imaging type, so each
  // one needs an entry here. Without them CT, MRI, ultrasound, doppler and
  // mammography reports fell through to the generic layout and lost the technique
  // block — which is exactly the part of an imaging report that records how the
  // study was performed.
  ultrasonography: ['techniqueBlock', 'measurements', 'findings', 'impression', 'recommendation'],
  crosssectional: ['techniqueBlock', 'findings', 'measurements', 'impression', 'recommendation'],
  doppler: ['techniqueBlock', 'measurements', 'findings', 'impression', 'recommendation'],
  mammography: ['techniqueBlock', 'findings', 'measurements', 'impression', 'recommendation'],
  cardiology: ['techniqueBlock', 'measurements', 'parameters', 'findings', 'impression', 'recommendation'],
  ophthalmology: ['measurements', 'parameters', 'findings', 'impression', 'recommendation'],
  ent: ['techniqueBlock', 'findings', 'measurements', 'impression', 'recommendation'],
  dental: ['techniqueBlock', 'findings', 'impression', 'recommendation'],
  pulmonary: ['measurements', 'parameters', 'findings', 'impression', 'recommendation'],
  specialized: ['parameters', 'measurements', 'findings', 'impression', 'conclusion', 'recommendation'],
};

/**
 * Falls back to the general layout rather than refusing to produce a report, but
 * says so: a silent fallback is how CT, MRI, ultrasound, doppler and mammography
 * came to be rendered without their technique block. If a new modality is added to
 * the catalogue with a new template key, this line is the warning that its layout
 * is still missing.
 */
const sectionsFor = (templateKey) => {
  const sections = TEMPLATES[templateKey];
  if (sections) return sections;
  logger.warn(
    `No report layout for template "${templateKey}"; using the general layout. ` +
      'Add an entry to TEMPLATES in diagnostics.pdf.service.js.'
  );
  return TEMPLATES.specialized;
};

/** Template keys the modality catalogue can issue but this service has no layout for. */
const missingTemplates = () => {
  // eslint-disable-next-line global-require
  const { DIAGNOSTIC_MODALITIES } = require('../../config/diagnostics');
  const keys = [...new Set(DIAGNOSTIC_MODALITIES.map((m) => m.template))];
  return keys.filter((key) => !TEMPLATES[key]);
};

const SECTION_RENDERERS = {
  parameters: (doc, snapshot) => {
    const rows = snapshot.result?.parameters || [];
    if (!rows.length) return;
    heading(doc, 'Results');
    table(
      doc,
      [
        { label: 'Test', width: 0.34 },
        { label: 'Result', width: 0.2 },
        { label: 'Unit', width: 0.12 },
        { label: 'Reference', width: 0.2 },
        { label: 'Flag', width: 0.14 },
      ],
      rows.map((row) => [
        row.group_label ? `${row.group_label} — ${row.parameter_name}` : row.parameter_name,
        valueOf(row),
        row.unit,
        rangeOf(row),
        FLAG_LABEL[row.flag] || '',
      ])
    );
  },

  measurements: (doc, snapshot) => {
    const rows = snapshot.result?.measurements || [];
    if (!rows.length) return;
    heading(doc, 'Measurements');
    table(
      doc,
      [
        { label: 'Measurement', width: 0.32 },
        { label: 'Site', width: 0.18 },
        { label: 'Value', width: 0.16 },
        { label: 'Unit', width: 0.12 },
        { label: 'Normal', width: 0.22 },
      ],
      rows.map((row) => [
        row.label,
        row.site,
        row.value_text || trimNumber(row.value_numeric),
        row.unit,
        row.normal_range,
      ])
    );
  },

  findings: (doc, snapshot) => {
    const rows = snapshot.result?.findings || [];
    if (!rows.length) return;
    heading(doc, 'Findings');
    rows.forEach((row) => paragraph(doc, row.section || null, row.body));
  },

  // Histopathology reports conventionally separate the microscopic description;
  // it is held in the findings list under its own section name, so it is shown
  // only when the recorder actually used that section.
  microscopy: (doc, snapshot) => {
    const rows = (snapshot.result?.findings || []).filter((row) =>
      /microscop/i.test(text(row.section))
    );
    if (!rows.length) return;
    heading(doc, 'Microscopic description');
    rows.forEach((row) => paragraph(doc, null, row.body));
  },

  organisms: (doc, snapshot) => {
    const rows = snapshot.result?.organisms || [];
    if (!rows.length) return;
    heading(doc, 'Culture and sensitivity');
    rows.forEach((organism) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(text(organism.organism_name));
      const detail = [organism.growth, organism.colony_count, organism.culture_medium]
        .filter(Boolean)
        .join('  ·  ');
      if (detail) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(detail);
      if (organism.notes) doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(text(organism.notes));
      doc.moveDown(0.2);

      table(
        doc,
        [
          { label: 'Antibiotic', width: 0.4 },
          { label: 'Interpretation', width: 0.24 },
          { label: 'MIC', width: 0.18 },
          { label: 'Zone (mm)', width: 0.18 },
        ],
        (organism.sensitivities || []).map((s) => [
          s.antibiotic,
          s.interpretation,
          s.mic,
          trimNumber(s.zone_diameter_mm),
        ])
      );
    });
  },

  techniqueBlock: (doc, snapshot) => {
    const study = snapshot.study || {};
    const pairs = [
      ['Body part', study.body_part],
      ['Laterality', study.laterality],
      ['Views', study.views],
      ['Contrast', study.contrast_used ? study.contrast_agent || 'Used' : ''],
      ['Sequences', study.series_or_sequences],
      ['Procedure', study.procedure_note],
    ];
    if (!pairs.some(([, value]) => value)) return;
    heading(doc, 'Technique');
    identityBlock(doc, pairs);
  },

  specimenBlock: (doc, snapshot) => {
    const study = snapshot.study || {};
    const pairs = [
      ['Specimen', study.specimen],
      ['Sample type', study.sample_type],
      ['Collection', study.collection_method],
      ['Adequacy', study.adequacy],
      ['Collected', dateTime(study.sample_collected_at)],
    ];
    if (!pairs.some(([, value]) => value)) return;
    heading(doc, 'Specimen');
    identityBlock(doc, pairs);
  },

  interpretation: (doc, snapshot) => {
    if (!snapshot.narrative?.interpretation) return;
    heading(doc, 'Interpretation');
    paragraph(doc, null, snapshot.narrative.interpretation);
  },

  impression: (doc, snapshot) => {
    if (!snapshot.narrative?.impression) return;
    heading(doc, 'Impression');
    paragraph(doc, null, snapshot.narrative.impression);
  },

  conclusion: (doc, snapshot) => {
    if (!snapshot.narrative?.conclusion) return;
    heading(doc, 'Conclusion');
    paragraph(doc, null, snapshot.narrative.conclusion);
  },

  recommendation: (doc, snapshot) => {
    if (!snapshot.narrative?.recommendation) return;
    heading(doc, 'Recommendation');
    paragraph(doc, null, snapshot.narrative.recommendation);
  },
};

/* ── images ────────────────────────────────────────────────────────────────── */

/**
 * pdfkit decodes JPEG and PNG. Anything else — TIFF, WebP, DICOM, video — is
 * recorded in the file table but not drawn, because there is no honest way to show
 * it. A placeholder rectangle standing in for an unrendered scan would be worse
 * than saying plainly that the image is attached and must be opened in the viewer.
 */
const EMBEDDABLE = new Set(['image/jpeg', 'image/png']);

const IMAGES_PER_ROW = 2;
const PLATE_GAP = 10;
const CAPTION_HEIGHT = 22;

/**
 * Loads the bytes of the images that belonged to this version.
 *
 * Resolved by attachment id from the *snapshot*, not from the study's current
 * files, and each one is checked against the checksum recorded at signing time. An
 * issued report must show the image it was issued with: if a file has since been
 * replaced or its bytes no longer match, the mismatch is reported on the page
 * rather than a different picture being printed under the same report number.
 */
const loadVersionImages = async (studyId, snapshot) => {
  // Every picture is considered, not only the drawable ones: a scan that cannot be
  // reproduced in a PDF still has to be named on the report, or a reader would have
  // no way to know it exists.
  const pictures = (snapshot.attachments || []).filter(
    (a) => typeof a.mime_type === 'string' && a.mime_type.startsWith('image/')
  );
  if (!pictures.length) return [];

  const undrawable = pictures
    .filter((a) => !EMBEDDABLE.has(a.mime_type))
    .map((a) => ({
      ...a,
      problem: 'this format cannot be reproduced in a PDF; open it in the diagnostic history',
    }));

  const wanted = pictures.filter((a) => EMBEDDABLE.has(a.mime_type));
  if (!wanted.length) return undrawable;

  const rows = await repository.findAttachmentsWithKeys(studyId);
  const byId = new Map(rows.map((row) => [Number(row.id), row]));

  const loaded = [...undrawable];
  for (const entry of wanted) {
    const row = byId.get(Number(entry.id));
    if (!row) {
      loaded.push({ ...entry, problem: 'the stored file for this image is no longer on record' });
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const buffer = await storage.readBuffer(row.storage_key);
      // eslint-disable-next-line no-await-in-loop
      const checksum = storage.sha256 ? storage.sha256(buffer) : null;

      if (entry.checksum_sha256 && checksum && checksum !== entry.checksum_sha256) {
        logger.warn(
          `Attachment ${entry.id} no longer matches the checksum recorded in report ` +
            `version ${snapshot.report?.report_number}. It was not embedded.`
        );
        loaded.push({
          ...entry,
          problem: 'this image no longer matches the copy recorded when the report was issued',
        });
        continue;
      }

      loaded.push({ ...entry, buffer });
    } catch (error) {
      logger.warn(`Could not read attachment ${entry.id} for the report PDF: ${error.message}`);
      loaded.push({ ...entry, problem: 'the image file could not be read' });
    }
  }

  return loaded;
};

/**
 * Draws the image plate: the pictures themselves, laid out two to a row with their
 * captions, followed by any that could not be drawn and why.
 */
const drawImages = (doc, images) => {
  if (!images.length) return;

  const drawable = images.filter((image) => image.buffer);
  const undrawable = images.filter((image) => !image.buffer);

  if (drawable.length) {
    heading(doc, drawable.length === 1 ? 'Image' : 'Images');

    const usable = doc.page.width - MARGIN * 2;
    const cellWidth = (usable - PLATE_GAP * (IMAGES_PER_ROW - 1)) / IMAGES_PER_ROW;
    // Tall enough to be diagnostically useful, short enough that two rows fit a page.
    const cellHeight = Math.min(cellWidth, 210);

    for (let index = 0; index < drawable.length; index += IMAGES_PER_ROW) {
      const row = drawable.slice(index, index + IMAGES_PER_ROW);
      const rowHeight = cellHeight + CAPTION_HEIGHT;

      if (doc.y + rowHeight > doc.page.height - 70) doc.addPage();
      const top = doc.y;

      row.forEach((image, column) => {
        const x = MARGIN + column * (cellWidth + PLATE_GAP);
        try {
          // `fit` preserves the aspect ratio, so a scan is never stretched — a
          // distorted medical image is a misleading one.
          doc.image(image.buffer, x, top, {
            fit: [cellWidth, cellHeight],
            align: 'center',
            valign: 'center',
          });
        } catch (error) {
          logger.warn(`pdfkit could not draw attachment ${image.id}: ${error.message}`);
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(MUTED)
            .text('[image could not be rendered]', x, top + cellHeight / 2, {
              width: cellWidth,
              align: 'center',
            });
        }

        const label = [image.caption, image.original_name].filter(Boolean).join(' — ');
        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(MUTED)
          .text(text(label), x, top + cellHeight + 3, {
            width: cellWidth,
            align: 'center',
            height: CAPTION_HEIGHT - 6,
            ellipsis: true,
          });
      });

      doc.y = top + rowHeight + 4;
    }

    doc
      .font('Helvetica')
      .fontSize(6.5)
      .fillColor(MUTED)
      .text(
        'Images are reproduced at reduced size for reference. View them at full resolution ' +
          'in the diagnostic history.',
        { align: 'left' }
      );
    doc.moveDown(0.3);
  }

  if (undrawable.length) {
    heading(doc, 'Images not reproduced here');
    undrawable.forEach((image) => {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(INK)
        .text(
          `${text(image.original_name)} (${text(image.mime_type)}) — ` +
            `${image.problem || 'this format cannot be reproduced in a PDF; open it in the viewer'}.`
        );
    });
    doc.moveDown(0.3);
  }
};

/* ── document ──────────────────────────────────────────────────────────────── */

/**
 * Renders the PDF and resolves with a Buffer.
 *
 * `company` carries the hospital identity from Settings. Nothing is substituted
 * when it is empty: printing an invented or borrowed clinic name on a medical
 * report would misattribute the document.
 *
 * `images` are pre-loaded buffers, because pdfkit draws synchronously and the bytes
 * have to be in hand before the document starts.
 */
const renderPdf = (version, snapshot, company = {}, images = []) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const study = snapshot.study || {};
    const patient = snapshot.patient || {};
    const doctors = snapshot.doctors || {};
    const signatories = snapshot.signatories || {};
    const report = snapshot.report || {};

    /* letterhead */
    if (company.title) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(text(company.title), { align: 'center' });
      const line = [company.address, company.mobile, company.email].filter(Boolean).join('  ·  ');
      if (line) doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(line, { align: 'center' });
      doc.moveDown(0.4);
    }

    /* title */
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(INK)
      .text(text(study.test_name) || 'Investigation report', { align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        [study.category, study.modality, study.study_code, report.report_number]
          .filter(Boolean)
          .join('  ·  '),
        { align: 'center' }
      );

    /* amendment notice: an amended report must announce itself */
    if (version.version_status === 'amended') {
      doc.moveDown(0.5);
      const top = doc.y;
      const usable = doc.page.width - MARGIN * 2;
      doc.rect(MARGIN, top, usable, 34).fillAndStroke('#fdf4f4', '#d9b3b3');
      doc
        .fillColor('#7b3b3b')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(`AMENDED REPORT — VERSION ${version.version_no}`, MARGIN + 6, top + 5, {
          width: usable - 12,
        });
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Reason: ${text(version.amendment_reason)}  ·  Issued ${dateTime(version.issued_at)}. ` +
            'The previously issued version remains on record.',
          MARGIN + 6,
          top + 16,
          { width: usable - 12 }
        );
      doc.y = top + 40;
      doc.fillColor(INK);
    } else if (version.version_no > 1) {
      doc.moveDown(0.4);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`Version ${version.version_no}`, { align: 'center' });
    }

    doc.moveDown(0.5);

    /* identity */
    heading(doc, 'Patient');
    identityBlock(doc, [
      ['Name', patient.name],
      ['UHID', patient.uhid],
      ['Age', patient.age_at_study !== null && patient.age_at_study !== undefined ? `${patient.age_at_study} y` : ''],
      ['Sex', patient.gender],
      ['Blood group', patient.blood_group],
      ['Phone', patient.phone],
      ['Study date', dateTime(study.study_datetime)],
      ['Reported', dateTime(study.result_at)],
      ['Referred by', doctors.referring?.name || doctors.referring?.doctor_code],
      ['Reported by', doctors.performing?.name || doctors.performing?.doctor_code],
    ]);

    if (study.clinical_history) {
      heading(doc, 'Clinical history');
      paragraph(doc, null, study.clinical_history);
    }

    /* category-specific body */
    sectionsFor(report.template_key).forEach((section) => {
      const renderer = SECTION_RENDERERS[section];
      if (renderer) renderer(doc, snapshot);
    });

    /* the pictures themselves */
    drawImages(doc, images);

    /* every attached file, including the ones drawn above, with its checksum */
    const attachments = snapshot.attachments || [];
    if (attachments.length) {
      heading(doc, 'Attached files');
      table(
        doc,
        [
          { label: 'File', width: 0.4 },
          { label: 'Type', width: 0.2 },
          { label: 'Caption', width: 0.26 },
          { label: 'Checksum', width: 0.14 },
        ],
        attachments.map((a) => [
          a.original_name,
          a.kind,
          a.caption,
          text(a.checksum_sha256).slice(0, 10),
        ])
      );
    }

    /* sign-off */
    heading(doc, 'Sign-off');
    identityBlock(doc, [
      [
        'Verified by',
        [signatories.verified_by?.name, dateTime(signatories.verified_at)].filter(Boolean).join('  ·  '),
      ],
      [
        'Issued by',
        [signatories.finalized_by?.name, dateTime(signatories.finalized_at)].filter(Boolean).join('  ·  '),
      ],
    ]);

    /* footer on every page */
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(MUTED)
        .text(
          `${text(report.report_number) || text(study.study_code)}  ·  version ${version.version_no}  ·  ` +
            `page ${index - range.start + 1} of ${range.count}`,
          MARGIN,
          doc.page.height - 32,
          { width: doc.page.width - MARGIN * 2, align: 'center' }
        );
    }

    doc.end();
  });

/* ── persistence ───────────────────────────────────────────────────────────── */

/**
 * Hospital identity for the letterhead, from the same Settings -> Company Profile
 * record every other document in the app uses. Required lazily because the settings
 * module also reaches into shared services, and a top-level require would make the
 * two modules load each other.
 *
 * An unconfigured profile means no letterhead. Nothing is substituted: printing an
 * invented or borrowed clinic name on a medical report would misattribute it.
 */
const fetchCompanyProfile = async () => {
  try {
    // eslint-disable-next-line global-require
    const settings = require('../settings/settings.service');
    return (await settings.getCompanyProfile()) || {};
  } catch (error) {
    logger.warn(`Company profile unavailable for the report letterhead: ${error.message}`);
    return {};
  }
};

/**
 * Produces (or returns) the PDF for a version.
 *
 * Idempotent per version: if a generated report already exists for it, the stored
 * file is returned untouched. A signed document must not change because someone
 * pressed a button twice.
 */
const generateForVersion = async (studyId, versionNo) => {
  const study = await repository.findStudyById(studyId);
  if (!study) throw ApiError.notFound('Diagnostic study not found');

  const versions = await repository.findVersionsByStudy(studyId);
  if (!versions.length) {
    throw ApiError.badRequest(
      `Study ${study.study_code} has no finalised report version, so there is nothing to render.`
    );
  }

  const version =
    versionNo === undefined || versionNo === null || versionNo === 'current'
      ? versions.find((v) => !v.superseded_at) || versions[versions.length - 1]
      : versions.find((v) => v.version_no === Number(versionNo));

  if (!version) throw ApiError.notFound(`Version ${versionNo} not found for ${study.study_code}`);

  const existing = await repository.findGeneratedReport(version.id);
  if (existing) {
    const buffer = await storage.readBuffer(existing.storage_key);
    return { attachment: existing, buffer, regenerated: false };
  }

  const snapshot = version.content;
  if (!snapshot) {
    throw ApiError.badRequest(`Version ${version.version_no} has no readable snapshot.`);
  }

  const company = await fetchCompanyProfile();
  // Loaded before rendering: pdfkit draws synchronously, so the bytes must be in
  // hand first.
  const images = await loadVersionImages(study.id, snapshot);
  const buffer = await renderPdf(version, snapshot, company, images);

  const reportNumber = snapshot.report?.report_number || study.study_code;
  const saved = await storage.saveBuffer({
    patientId: study.patient_id,
    buffer,
    originalName: `${reportNumber}-v${version.version_no}.pdf`,
    mimeType: 'application/pdf',
  });

  // Bytes are on disk before the row exists, so a failed insert leaves an orphan
  // file rather than a row pointing at nothing. The file is archived on rollback.
  const t = await sequelize.transaction();
  try {
    const attachment = await repository.createAttachment(
      {
        study_id: study.id,
        patient_id: study.patient_id,
        report_version_id: version.id,
        kind: ATTACHMENT_KINDS.GENERATED_REPORT,
        file_name: saved.file_name,
        original_name: saved.original_name,
        storage_key: saved.storage_key,
        mime_type: saved.mime_type,
        file_size: saved.file_size,
        checksum_sha256: saved.checksum_sha256,
        caption: `Generated report, version ${version.version_no}`,
        version: 1,
        // A generated document is not one of the originals a technician uploaded.
        is_original: false,
        is_current: true,
        uploaded_at: new Date(),
      },
      { transaction: t }
    );

    await repository.updateVersion(version, { pdf_attachment_id: attachment.id }, { transaction: t });

    // The report's shortcut points at the version in force only.
    if (!version.superseded_at) {
      const report = await repository.findReportByStudy(study.id, { transaction: t });
      if (report) {
        await repository.updateReport(report, { pdf_attachment_id: attachment.id }, { transaction: t });
      }
    }

    await t.commit();
    return { attachment, buffer, regenerated: true };
  } catch (error) {
    await t.rollback();
    try {
      await storage.archive(saved.storage_key);
    } catch (archiveError) {
      logger.warn(
        `Could not archive ${saved.storage_key} after a failed PDF insert: ${archiveError.message}`
      );
    }
    throw error;
  }
};

module.exports = {
  generateForVersion,
  renderPdf,
  loadVersionImages,
  sectionsFor,
  missingTemplates,
  EMBEDDABLE,
  TEMPLATES,
};
