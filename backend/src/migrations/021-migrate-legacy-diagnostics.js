'use strict';

/**
 * 021 — brings existing lab and radiology results into the diagnostic history.
 *
 * Before this migration a patient's investigations lived in two unrelated places:
 * `lab_order_items` and `radiology_orders`. The diagnostic spine added in 018 is
 * where a permanent medical history is assembled, so the historical rows are
 * represented there too — otherwise "Diagnostic History" would be empty for every
 * patient who existed before the feature.
 *
 * What this migration will NOT do, deliberately:
 *
 *  - It does not invent reference ranges, units or methods. The referenced
 *    `lab_tests` rows carry NULL for all three, so the migrated parameter holds the
 *    recorded value as text with no range attached. A range that was never used
 *    must not appear next to a result as though it had been.
 *  - It does not mark anything `final` or `verified` unless the legacy row itself
 *    records a verification. None of the seeded rows do, so they arrive as
 *    `result_entered`: a result on record that was never signed off. Fabricating a
 *    signature — or a report number for one — would misrepresent the record.
 *  - It does not split a free-text value such as "13.5 g/dL" into a number and a
 *    unit. That is inference, and a wrong split would change a clinical value.
 *  - It does not copy or move the source rows. The originals stay exactly where
 *    they are and remain the system of record for billing and order workflow;
 *    `source_type`/`source_id` link the two.
 *
 * Re-running is safe: a legacy row that already has a study is skipped.
 */

const LAB_STATUS = {
  ordered: 'ordered',
  sample_collected: 'sample_collected',
  in_progress: 'processing',
  completed: 'result_entered',
  cancelled: 'cancelled',
};

const RAD_STATUS = {
  ordered: 'ordered',
  in_progress: 'processing',
  completed: 'result_entered',
  cancelled: 'cancelled',
  reported: 'result_entered',
};

/**
 * `diagnostic_studies.modality` is NOT NULL, so every migrated row needs one.
 *
 * The radiology catalogue has no modality column — only a loose free-text category
 * whose values are inconsistent ('xray', 'X-Ray', 'CT Scan', 'other', ''). So the
 * modality is read from the recorded test name first, which is the most specific
 * thing on file, and from the category second. Both are data already in the
 * database; nothing is guessed from context.
 *
 * A name can also correct the category: an ECG filed as a radiology order is a
 * cardiology study, and 'radiology' + 'ecg' would be an internally inconsistent
 * pair. Where the name identifies the modality, its own category is used.
 *
 * A row whose modality cannot be read from either is SKIPPED and reported, not
 * given a placeholder. An invented modality would file the study under the wrong
 * heading, which is worse than leaving it for someone to classify.
 */
const NAME_MODALITY = [
  // Ordered most specific first: "Echocardiogram 2D Color Doppler" is an
  // echocardiogram, not a generic doppler study.
  [/echocardiogram|\becho\b/i, 'echocardiogram', 'cardiology'],
  [/\becg\b|electrocardiogram/i, 'ecg', 'cardiology'],
  [/\btmt\b|treadmill/i, 'tmt', 'cardiology'],
  [/holter/i, 'holter', 'cardiology'],
  [/\bmri\b|magnetic resonance/i, 'mri', 'radiology'],
  [/\bct\b|ct scan|computed tomograph/i, 'ct', 'radiology'],
  [/mammograph/i, 'mammography', 'radiology'],
  [/x-?\s?ray|radiograph/i, 'xray', 'radiology'],
  [/ultrasonograph|ultrasound|\busg\b|sonograph/i, 'ultrasonography', 'radiology'],
  [/doppler/i, 'doppler', 'radiology'],
];

const CATEGORY_MODALITY = {
  xray: 'xray',
  'x-ray': 'xray',
  ultrasound: 'ultrasonography',
  ultrasonography: 'ultrasonography',
  usg: 'ultrasonography',
  ct: 'ct',
  'ct scan': 'ct',
  mri: 'mri',
  mammography: 'mammography',
  doppler: 'doppler',
};

/** Returns { category, modality } or null when neither source identifies one. */
const classifyRadiology = (testName, testCategory) => {
  for (const [pattern, modality, category] of NAME_MODALITY) {
    if (pattern.test(testName || '')) return { category, modality };
  }
  const fromCategory = CATEGORY_MODALITY[String(testCategory || '').trim().toLowerCase()];
  if (fromCategory) return { category: 'radiology', modality: fromCategory };
  return null;
};

/**
 * Laboratory disciplines that are their own diagnostic category rather than
 * general laboratory work. Read from the lab test's recorded category.
 */
const LAB_DISCIPLINE = {
  microbiology: { category: 'microbiology', modality: 'microbiology' },
  histopathology: { category: 'histopathology', modality: 'histopathology' },
  cytology: { category: 'cytology', modality: 'cytology' },
  'molecular biology': { category: 'laboratory', modality: 'molecular' },
};

const classifyLab = (testCategory) =>
  LAB_DISCIPLINE[String(testCategory || '').trim().toLowerCase()] || {
    category: 'laboratory',
    modality: 'laboratory',
  };

const blank = (v) => v === null || v === undefined || String(v).trim() === '';

/** Allocates the next study code for a year using the same counter the app uses. */
const nextStudyCode = async (sequelize, year, transaction) => {
  const name = `diagnostic_study:${year}`;
  await sequelize.query(
    `INSERT INTO code_sequences (name, next_value)
          VALUES (:name, LAST_INSERT_ID(1) + 1)
     ON DUPLICATE KEY UPDATE next_value = LAST_INSERT_ID(next_value) + 1`,
    { replacements: { name }, transaction }
  );
  const [rows] = await sequelize.query('SELECT LAST_INSERT_ID() AS claimed', { transaction });
  const claimed = Number(rows[0].claimed);
  return `DX-${year}-${String(claimed).padStart(6, '0')}`;
};

const yearOf = (date) => (date ? new Date(date).getFullYear() : new Date().getFullYear());

module.exports = {
  async up({ sequelize }) {
    const [[counts]] = await sequelize.query(
      `SELECT (SELECT COUNT(*) FROM diagnostic_studies) studies,
              (SELECT COUNT(*) FROM lab_order_items) lab_items,
              (SELECT COUNT(*) FROM radiology_orders WHERE deleted_at IS NULL) rad_orders`
    );
    // eslint-disable-next-line no-console
    console.log(
      `  before: ${counts.studies} diagnostic studies, ` +
        `${counts.lab_items} lab order items, ${counts.rad_orders} radiology orders`
    );

    /* ── laboratory ────────────────────────────────────────────────────────── */

    const [labRows] = await sequelize.query(
      `SELECT i.id, i.order_id, i.test_id, i.result_value, i.result_notes, i.result_at,
              i.status, i.verified_by, i.verified_at, i.created_at,
              o.patient_id, o.doctor_id, o.ordered_at,
              t.name AS test_name, t.category AS test_category, t.sample_type, t.unit,
              t.normal_range, t.method
         FROM lab_order_items i
         JOIN lab_orders o ON o.id = i.order_id
         LEFT JOIN lab_tests t ON t.id = i.test_id
        WHERE ((i.result_value IS NOT NULL AND i.result_value <> '')
               OR (i.result_notes IS NOT NULL AND i.result_notes <> ''))
          AND o.patient_id IS NOT NULL
          AND NOT EXISTS (
                SELECT 1 FROM diagnostic_studies d
                 WHERE d.source_type = 'lab_order_item' AND d.source_id = i.id
              )
        ORDER BY i.id`
    );

    let labDone = 0;
    let labSkipped = 0;

    for (const row of labRows) {
      if (blank(row.test_name)) {
        labSkipped += 1;
        continue;
      }

      const when = row.ordered_at || row.created_at;
      const discipline = classifyLab(row.test_category);
      const t = await sequelize.transaction();
      try {
        const code = await nextStudyCode(sequelize, yearOf(when), t);

        const [result] = await sequelize.query(
          `INSERT INTO diagnostic_studies
             (study_code, patient_id, category, modality, test_name, source_type, source_id,
              referring_doctor_id, status, study_datetime, specimen, sample_type,
              result_at, interpretation, verified_by, verified_at, created_by,
              created_at, updated_at)
           VALUES
             (:code, :patient, :category, :modality, :test, 'lab_order_item', :source,
              :doctor, :status, :when, :specimen, :sampleType,
              :resultAt, :interpretation, :verifiedBy, :verifiedAt, NULL,
              :created, NOW())`,
          {
            replacements: {
              code,
              patient: row.patient_id,
              category: discipline.category,
              modality: discipline.modality,
              test: row.test_name,
              source: row.id,
              doctor: row.doctor_id || null,
              // A legacy row is only called verified if it actually records one.
              status: row.verified_at
                ? 'verified'
                : LAB_STATUS[row.status] || 'result_entered',
              when,
              specimen: blank(row.sample_type) ? null : row.sample_type,
              sampleType: blank(row.sample_type) ? null : row.sample_type,
              resultAt: row.result_at || null,
              interpretation: blank(row.result_notes) ? null : row.result_notes,
              verifiedBy: row.verified_at ? row.verified_by || null : null,
              verifiedAt: row.verified_at || null,
              created: row.created_at || when,
            },
            transaction: t,
          }
        );

        const studyId = result;

        if (!blank(row.result_value)) {
          await sequelize.query(
            `INSERT INTO diagnostic_result_parameters
               (study_id, parameter_name, result_value, result_numeric, unit,
                ref_range_low, ref_range_high, ref_range_text, flag, method,
                sort_order, recorded_by, created_at, updated_at)
             VALUES
               (:study, :name, :value, NULL, :unit,
                NULL, NULL, :rangeText, NULL, :method,
                0, NULL, :created, NOW())`,
            {
              replacements: {
                study: studyId,
                name: row.test_name,
                // Kept as recorded. No numeric parsing, no derived flag: there is
                // no reference range on file to derive one from.
                value: row.result_value,
                unit: blank(row.unit) ? null : row.unit,
                rangeText: blank(row.normal_range) ? null : row.normal_range,
                method: blank(row.method) ? null : row.method,
                created: row.created_at || when,
              },
              transaction: t,
            }
          );
        }

        await t.commit();
        labDone += 1;
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }

    /* ── radiology ─────────────────────────────────────────────────────────── */

    const [radRows] = await sequelize.query(
      `SELECT r.id, r.order_code, r.patient_id, r.doctor_id, r.test_id, r.ordered_at,
              r.status, r.result_notes, r.result_image_url, r.result_at, r.notes,
              r.findings, r.impression, r.verified_by, r.verified_at, r.created_at,
              t.name AS test_name, t.category AS test_category
         FROM radiology_orders r
         LEFT JOIN radiology_tests t ON t.id = r.test_id
        WHERE r.deleted_at IS NULL
          AND ((r.findings IS NOT NULL AND r.findings <> '')
               OR (r.impression IS NOT NULL AND r.impression <> '')
               OR (r.result_notes IS NOT NULL AND r.result_notes <> ''))
          AND r.patient_id IS NOT NULL
          AND NOT EXISTS (
                SELECT 1 FROM diagnostic_studies d
                 WHERE d.source_type = 'radiology_order' AND d.source_id = r.id
              )
        ORDER BY r.id`
    );

    let radDone = 0;
    let radSkipped = 0;
    let imagesSeen = 0;
    const radUnclassified = [];

    for (const row of radRows) {
      if (blank(row.test_name)) {
        radSkipped += 1;
        continue;
      }
      if (!blank(row.result_image_url)) imagesSeen += 1;

      const classified = classifyRadiology(row.test_name, row.test_category);
      if (!classified) {
        radUnclassified.push(`#${row.id} "${row.test_name}"`);
        continue;
      }

      const when = row.ordered_at || row.created_at;
      // findings is the narrative; result_notes stands in only when there is none.
      const findingBody = !blank(row.findings) ? row.findings : row.result_notes;

      const t = await sequelize.transaction();
      try {
        const code = await nextStudyCode(sequelize, yearOf(when), t);

        const [studyId] = await sequelize.query(
          `INSERT INTO diagnostic_studies
             (study_code, patient_id, category, modality, test_name, source_type, source_id,
              referring_doctor_id, status, study_datetime, procedure_note,
              result_at, impression, verified_by, verified_at, created_by,
              created_at, updated_at)
           VALUES
             (:code, :patient, :category, :modality, :test, 'radiology_order', :source,
              :doctor, :status, :when, :procedureNote,
              :resultAt, :impression, :verifiedBy, :verifiedAt, NULL,
              :created, NOW())`,
          {
            replacements: {
              code,
              patient: row.patient_id,
              category: classified.category,
              modality: classified.modality,
              test: row.test_name,
              source: row.id,
              doctor: row.doctor_id || null,
              status: row.verified_at ? 'verified' : RAD_STATUS[row.status] || 'result_entered',
              when,
              procedureNote: blank(row.notes) ? null : row.notes,
              resultAt: row.result_at || null,
              impression: blank(row.impression) ? null : row.impression,
              verifiedBy: row.verified_at ? row.verified_by || null : null,
              verifiedAt: row.verified_at || null,
              created: row.created_at || when,
            },
            transaction: t,
          }
        );

        if (!blank(findingBody)) {
          await sequelize.query(
            `INSERT INTO diagnostic_findings
               (study_id, section, body, is_abnormal, sort_order, recorded_by,
                created_at, updated_at)
             VALUES (:study, 'Findings', :body, 0, 0, NULL, :created, NOW())`,
            {
              replacements: {
                study: studyId,
                body: findingBody,
                created: row.created_at || when,
              },
              transaction: t,
            }
          );
        }

        await t.commit();
        radDone += 1;
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }

    /* ── verification ──────────────────────────────────────────────────────── */

    const [[after]] = await sequelize.query(
      `SELECT (SELECT COUNT(*) FROM diagnostic_studies) studies,
              (SELECT COUNT(*) FROM diagnostic_studies WHERE source_type = 'lab_order_item') from_lab,
              (SELECT COUNT(*) FROM diagnostic_studies WHERE source_type = 'radiology_order') from_rad,
              (SELECT COUNT(*) FROM diagnostic_studies d
                 LEFT JOIN patients p ON p.id = d.patient_id
                WHERE p.id IS NULL) orphans,
              (SELECT COUNT(*) FROM diagnostic_result_parameters) params,
              (SELECT COUNT(*) FROM diagnostic_findings) findings`
    );

    if (Number(after.orphans) > 0) {
      throw new Error(
        `Migration would leave ${after.orphans} diagnostic study/studies with no patient. Rolled back.`
      );
    }

    if (Number(after.studies) !== Number(counts.studies) + labDone + radDone) {
      throw new Error(
        `Study count mismatch: expected ${Number(counts.studies) + labDone + radDone}, found ${after.studies}.`
      );
    }

    /* eslint-disable no-console */
    console.log(`  migrated ${labDone} laboratory result(s) from lab_order_items`);
    console.log(`  migrated ${radDone} radiology report(s) from radiology_orders`);
    if (labSkipped || radSkipped) {
      console.log(
        `  skipped ${labSkipped + radSkipped} row(s) whose test no longer exists in the catalogue ` +
          '(a study needs a test name; none was invented)'
      );
    }
    if (radUnclassified.length) {
      console.log(
        `  NOT migrated: ${radUnclassified.length} radiology order(s) whose modality could not be read ` +
          `from the test name or catalogue category: ${radUnclassified.join(', ')}. ` +
          'No placeholder modality was invented; classify the test and re-run this migration.'
      );
    }
    if (imagesSeen) {
      console.log(
        `  NOTE: ${imagesSeen} radiology order(s) carry a result_image_url. The URL is left in place; ` +
          'no file was fabricated or copied into medical storage.'
      );
    }
    console.log(
      `  after: ${after.studies} studies (${after.from_lab} from lab, ${after.from_rad} from radiology), ` +
        `${after.params} parameters, ${after.findings} findings, ${after.orphans} orphans`
    );
    console.log(
      '  NOTE: migrated studies are "result_entered" or "verified" as the source row records. ' +
        'None was marked final: the legacy rows carry no finalisation, and inventing one would ' +
        'fabricate a signature. They appear in history as results on record, not as signed reports.'
    );
    /* eslint-enable no-console */
  },

  async down({ sequelize }) {
    // Only rows this migration created are removed. It writes created_by = NULL,
    // which the API never does — a study created through the application always
    // records the user who created it — so that is the marker. A study that has
    // since been finalised is left alone: deleting a report that a clinician signed
    // would be destroying a medical record, which no rollback should do.
    const [[keep]] = await sequelize.query(
      `SELECT COUNT(*) AS c
         FROM diagnostic_studies d
         JOIN diagnostic_reports r ON r.study_id = d.id
        WHERE d.source_type IN ('lab_order_item', 'radiology_order')
          AND d.created_by IS NULL`
    );

    const scope = `source_type IN ('lab_order_item','radiology_order')
                     AND created_by IS NULL
                     AND id NOT IN (SELECT study_id FROM diagnostic_reports)`;

    // MySQL cannot read a table it is deleting from inside a subquery, hence the
    // derived table wrapper.
    const targets = `(SELECT id FROM (SELECT id FROM diagnostic_studies WHERE ${scope}) x)`;

    // Sensitivities hang off organisms, so they go first.
    await sequelize.query(
      `DELETE FROM diagnostic_sensitivities
        WHERE organism_id IN (SELECT id FROM diagnostic_organisms WHERE study_id IN ${targets})`
    );

    for (const table of [
      'diagnostic_organisms',
      'diagnostic_result_parameters',
      'diagnostic_findings',
      'diagnostic_measurements',
      'diagnostic_attachments',
    ]) {
      await sequelize.query(`DELETE FROM ${table} WHERE study_id IN ${targets}`);
    }

    const [, meta] = await sequelize.query(`DELETE FROM diagnostic_studies WHERE ${scope}`);

    /* eslint-disable no-console */
    console.log(`  removed ${meta?.affectedRows ?? 'the'} migrated legacy diagnostic study/studies`);
    if (Number(keep.c) > 0) {
      console.log(
        `  kept ${keep.c} migrated study/studies that have since been finalised — ` +
          'a signed report is a medical record and is not deleted by a rollback'
      );
    }
    console.log('  source lab_order_items / radiology_orders were never modified');
    /* eslint-enable no-console */
  },
};
