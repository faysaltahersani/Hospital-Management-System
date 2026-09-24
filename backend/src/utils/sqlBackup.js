'use strict';

// BUG-015 — backup and restore.
//
// The previous implementation could not round-trip at all:
//   * `generateBackupData` produced a .sql text dump; `restoreBackupData`
//     accepted a JSON object with eight hand-listed entity types. The file the
//     app produced could not be fed back into the app.
//   * Every step was wrapped in `catch {}` while success counters incremented
//     regardless, so a total failure still reported
//     "Database backup restored successfully."
//   * A table that failed to dump was skipped silently, so a truncated backup
//     downloaded as though it were complete.
//   * Values were escaped by hand (only `\` and `'`), so binary/control
//     characters could corrupt the file.
//   * `doctors` could never restore: the guard tested `item.full_name`, a column
//     that table does not have.
//
// This module produces a self-describing SQL dump with a verifiable manifest and
// restores that exact format. It never swallows an error: any failure aborts and
// propagates, because a backup you cannot trust is worse than no backup.

const MANIFEST_BEGIN = '-- HMS-MANIFEST-BEGIN';
const MANIFEST_END = '-- HMS-MANIFEST-END';
const FORMAT_VERSION = 2;

/** Full MySQL string escaping, including the characters the old code missed. */
const escapeString = (value) => {
  const s = String(value);
  let out = '';
  for (const ch of s) {
    switch (ch) {
      case '\0': out += '\\0'; break;
      case '\b': out += '\\b'; break;
      case '\t': out += '\\t'; break;
      case '\n': out += '\\n'; break;
      case '\r': out += '\\r'; break;
      case '\x1a': out += '\\Z'; break;
      case '"': out += '\\"'; break;
      case "'": out += "\\'"; break;
      case '\\': out += '\\\\'; break;
      default: out += ch;
    }
  }
  return `'${out}'`;
};

const literal = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return 'NULL';
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  if (typeof value === 'object') return escapeString(JSON.stringify(value));
  return escapeString(value);
};

/**
 * Produces `{ sql, manifest, filename }`.
 * Throws on any failure — a partial dump is never returned.
 */
const createBackup = async (sequelize, { database } = {}) => {
  const dbName = database || sequelize.config.database;
  const generatedAt = new Date().toISOString();

  const [tableRows] = await sequelize.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`
  );
  const tables = tableRows.map((r) => r.name);
  if (tables.length === 0) throw new Error('Backup aborted: the database reports no tables');

  const manifest = { format_version: FORMAT_VERSION, database: dbName, generated_at: generatedAt, tables: {} };
  const body = [];

  for (const table of tables) {
    // No try/catch: a table we cannot read means the backup is not trustworthy.
    // eslint-disable-next-line no-await-in-loop
    const [[createRow]] = await sequelize.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRow['Create Table'] || Object.values(createRow)[1];
    if (!createSql) throw new Error(`Backup aborted: could not read the definition of \`${table}\``);

    // eslint-disable-next-line no-await-in-loop
    const [rows] = await sequelize.query(`SELECT * FROM \`${table}\``);

    body.push(`-- ---------- ${table} (${rows.length} rows) ----------`);
    body.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    body.push(`${createSql};`);

    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const columnList = columns.map((c) => `\`${c}\``).join(', ');
      // Chunked so a large table does not become one enormous statement.
      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const values = rows
          .slice(i, i + CHUNK)
          .map((row) => `(${columns.map((c) => literal(row[c])).join(', ')})`)
          .join(',\n');
        body.push(`INSERT INTO \`${table}\` (${columnList}) VALUES\n${values};`);
      }
    }
    body.push('');

    manifest.tables[table] = { rows: rows.length, columns: rows.length ? Object.keys(rows[0]).length : null };
  }

  const [[fkRow]] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
  );
  manifest.foreign_keys = Number(fkRow.n);
  manifest.total_rows = Object.values(manifest.tables).reduce((s, t) => s + t.rows, 0);

  const header = [
    '-- Hospital Management System backup',
    `-- Format version: ${FORMAT_VERSION}`,
    `-- Database: ${dbName}`,
    `-- Generated: ${generatedAt}`,
    '--',
    '-- Restore with: POST /api/v1/settings/backup/restore  (body: this file as text)',
    '-- The manifest below is used to verify the restore. Do not edit it.',
    MANIFEST_BEGIN,
    ...JSON.stringify(manifest, null, 0).match(/.{1,900}/g).map((c) => `-- ${c}`),
    MANIFEST_END,
    '',
    'SET FOREIGN_KEY_CHECKS=0;',
    'SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";',
    'SET NAMES utf8mb4;',
    '',
  ];

  const sql = `${header.join('\n')}${body.join('\n')}\nSET FOREIGN_KEY_CHECKS=1;\n`;
  const filename = `hospital-backup-${generatedAt.slice(0, 10)}-${generatedAt.slice(11, 19).replace(/:/g, '')}.sql`;

  return { sql, manifest, filename };
};

/** Reads the embedded manifest back out of a dump. Throws if absent/corrupt. */
const readManifest = (sql) => {
  const start = sql.indexOf(MANIFEST_BEGIN);
  const end = sql.indexOf(MANIFEST_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      'Restore aborted: this file has no HMS manifest. It was not produced by this application, ' +
        'so its contents cannot be verified.'
    );
  }
  const json = sql
    .slice(start + MANIFEST_BEGIN.length, end)
    .split('\n')
    .map((line) => line.replace(/^\s*--\s?/, ''))
    .join('')
    .trim();
  let manifest;
  try {
    manifest = JSON.parse(json);
  } catch (err) {
    throw new Error(`Restore aborted: the manifest is not valid JSON (${err.message})`);
  }
  if (Number(manifest.format_version) !== FORMAT_VERSION) {
    throw new Error(
      `Restore aborted: backup format version ${manifest.format_version} is not supported (expected ${FORMAT_VERSION})`
    );
  }
  return manifest;
};

/** Splits a dump into executable statements, respecting quotes and comments. */
const splitStatements = (sql) => {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (!inSingle && !inDouble && ch === '-' && next === '-') { inLineComment = true; i += 1; continue; }
    if (!inSingle && !inDouble && ch === '/' && next === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close === -1 ? sql.length : close + 1;
      continue;
    }

    if (inSingle) {
      current += ch;
      if (ch === '\\') { current += next; i += 1; continue; }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      current += ch;
      if (ch === '\\') { current += next; i += 1; continue; }
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") { inSingle = true; current += ch; continue; }
    if (ch === '"') { inDouble = true; current += ch; continue; }

    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};

/**
 * Restores a dump into `targetSequelize` and verifies the result against the
 * manifest. Throws with a specific reason on any mismatch.
 */
const restoreBackup = async (targetSequelize, sql) => {
  if (typeof sql !== 'string' || sql.trim() === '') {
    throw new Error('Restore aborted: no backup content was supplied');
  }
  const manifest = readManifest(sql);
  const statements = splitStatements(sql);
  if (statements.length === 0) throw new Error('Restore aborted: the backup contains no statements');

  let executed = 0;
  for (const statement of statements) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await targetSequelize.query(statement);
      executed += 1;
    } catch (err) {
      // Fail loudly, with enough context to act on.
      throw new Error(
        `Restore FAILED at statement ${executed + 1} of ${statements.length}: ${err.message}\n` +
          `Statement began: ${statement.slice(0, 200)}`
      );
    }
  }

  const verification = await verifyRestore(targetSequelize, manifest);
  return { manifest, statements: statements.length, executed, verification };
};

/**
 * Compares the restored database against the manifest: table presence, row
 * counts and foreign-key count. Returns a report and throws if anything differs.
 */
const verifyRestore = async (targetSequelize, manifest) => {
  const [tableRows] = await targetSequelize.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
  );
  const present = new Set(tableRows.map((r) => r.name));
  const expected = Object.keys(manifest.tables);

  const missingTables = expected.filter((t) => !present.has(t));
  const rowMismatches = [];

  for (const table of expected) {
    if (!present.has(table)) continue;
    // eslint-disable-next-line no-await-in-loop
    const [[row]] = await targetSequelize.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    const actual = Number(row.n);
    const wanted = Number(manifest.tables[table].rows);
    if (actual !== wanted) rowMismatches.push({ table, expected: wanted, actual });
  }

  const [[fkRow]] = await targetSequelize.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
  );
  const foreignKeys = { expected: Number(manifest.foreign_keys), actual: Number(fkRow.n) };

  const report = {
    tables_expected: expected.length,
    tables_present: expected.length - missingTables.length,
    missing_tables: missingTables,
    row_mismatches: rowMismatches,
    foreign_keys: foreignKeys,
    total_rows_expected: manifest.total_rows,
    ok: missingTables.length === 0 && rowMismatches.length === 0 && foreignKeys.expected === foreignKeys.actual,
  };

  if (!report.ok) {
    const reasons = [];
    if (missingTables.length) reasons.push(`missing tables: ${missingTables.join(', ')}`);
    if (rowMismatches.length) {
      reasons.push(
        `row count mismatch: ${rowMismatches.map((m) => `${m.table} expected ${m.expected} got ${m.actual}`).join('; ')}`
      );
    }
    if (foreignKeys.expected !== foreignKeys.actual) {
      reasons.push(`foreign keys expected ${foreignKeys.expected} got ${foreignKeys.actual}`);
    }
    const error = new Error(`Restore verification FAILED — ${reasons.join(' | ')}`);
    error.report = report;
    throw error;
  }

  return report;
};

module.exports = { createBackup, restoreBackup, verifyRestore, readManifest, splitStatements, escapeString, literal, FORMAT_VERSION };
