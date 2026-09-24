'use strict';

// BUG-015 regression tests: a real backup -> fresh database -> restore -> verify
// round-trip, plus the failure modes that used to be swallowed.

const assert = require('node:assert/strict');
const test = require('node:test');
const { Sequelize } = require('sequelize');

const config = require('../src/config');
const { sequelize } = require('../src/models');
const { createBackup, restoreBackup, readManifest, splitStatements, literal, escapeString } = require('../src/utils/sqlBackup');

const TEST_DB = 'hms_backup_roundtrip_test';
let backup = null;
let target = null;

const admin = new Sequelize('', config.db.user, config.db.password, {
  host: config.db.host, port: config.db.port, dialect: config.db.dialect, logging: false,
});

test.before(async () => {
  await sequelize.authenticate();
  backup = await createBackup(sequelize);
});

test.after(async () => {
  if (target) await target.close();
  await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await admin.close();
  await sequelize.close();
});

/* ── escaping ─────────────────────────────────────────────────────────────── */

test('BUG-015: escaping covers the characters the old code missed', () => {
  assert.equal(escapeString("O'Brien"), "'O\\'Brien'");
  assert.equal(escapeString('back\\slash'), "'back\\\\slash'");
  assert.equal(escapeString('line\nbreak'), "'line\\nbreak'");
  assert.equal(escapeString('tab\there'), "'tab\\there'");
  assert.equal(escapeString('null\0byte'), "'null\\0byte'");
  assert.equal(escapeString('ctrl\x1aZ'), "'ctrl\\ZZ'");
  assert.equal(escapeString('quote"double'), "'quote\\\"double'");
});

test('BUG-015: literal handles null, numbers, dates, buffers and objects', () => {
  assert.equal(literal(null), 'NULL');
  assert.equal(literal(undefined), 'NULL');
  assert.equal(literal(42), '42');
  assert.equal(literal(NaN), 'NULL');
  assert.equal(literal(true), '1');
  assert.equal(literal(new Date('2026-08-10T06:00:00Z')), "'2026-08-10 06:00:00'");
  assert.equal(literal(new Date('invalid')), 'NULL');
  assert.equal(literal(Buffer.from([0xde, 0xad])), "X'dead'");
  assert.match(literal({ a: 1 }), /^'{\\"a\\":1}'$/);
});

/* ── backup content ──────────────────────────────────────────────────────── */

test('BUG-015: the backup carries a verifiable manifest', () => {
  const manifest = readManifest(backup.sql);
  assert.equal(manifest.format_version, 2);
  assert.equal(manifest.database, config.db.name);
  assert.ok(Object.keys(manifest.tables).length > 30, 'the manifest must list every table');
  assert.ok(manifest.total_rows > 0);
  assert.ok(manifest.foreign_keys > 0);
});

test('BUG-015: the manifest row counts match the live database', async () => {
  const manifest = readManifest(backup.sql);
  for (const table of ['patients', 'invoices', 'payments', 'medicine_batches', 'admission_payments']) {
    const [[row]] = await sequelize.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
    assert.equal(manifest.tables[table].rows, Number(row.n), `${table} count must match`);
  }
});

test('BUG-015: statement splitting respects quotes and comments', () => {
  const sql = [
    '-- a comment with ; inside',
    "INSERT INTO t (a) VALUES ('semi ; colon');",
    "INSERT INTO t (a) VALUES ('escaped \\' quote ; here');",
    '/* block ; comment */',
    'SELECT 1;',
  ].join('\n');
  const statements = splitStatements(sql);
  assert.equal(statements.length, 3, 'comments must not become statements and quoted semicolons must not split');
  assert.match(statements[0], /semi ; colon/);
});

/* ── the round trip ──────────────────────────────────────────────────────── */

test('BUG-015: backup restores into a fresh database and verifies', async () => {
  await admin.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await admin.query(`CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);

  target = new Sequelize(TEST_DB, config.db.user, config.db.password, {
    host: config.db.host, port: config.db.port, dialect: config.db.dialect, logging: false,
  });

  const [[before]] = await target.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE='BASE TABLE'"
  );
  assert.equal(Number(before.n), 0, 'the target must start empty');

  const result = await restoreBackup(target, backup.sql);
  assert.equal(result.verification.ok, true, JSON.stringify(result.verification));
  assert.equal(result.verification.missing_tables.length, 0);
  assert.equal(result.verification.row_mismatches.length, 0);
  assert.equal(result.verification.foreign_keys.expected, result.verification.foreign_keys.actual);
  assert.equal(result.executed, result.statements, 'every statement must have executed');
});

test('BUG-015: schema matches the source exactly after restore', async () => {
  const q = async (conn, sql) => (await conn.query(sql))[0][0].n;
  const src = config.db.name;

  for (const [label, sql] of [
    ['tables', "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA='%DB%' AND TABLE_TYPE='BASE TABLE'"],
    ['columns', "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='%DB%'"],
    ['foreign_keys', "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='%DB%' AND CONSTRAINT_TYPE='FOREIGN KEY'"],
    ['unique_keys', "SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='%DB%' AND CONSTRAINT_TYPE='UNIQUE'"],
    ['indexes', "SELECT COUNT(DISTINCT CONCAT(TABLE_NAME,INDEX_NAME)) AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='%DB%'"],
  ]) {
    const a = await q(sequelize, sql.replace('%DB%', src));
    const b = await q(target, sql.replace('%DB%', TEST_DB));
    assert.equal(Number(b), Number(a), `${label} must match (source ${a}, restored ${b})`);
  }
});

test('BUG-015: financial, patient and inventory totals survive the round trip', async () => {
  const pairs = [
    ['SELECT COUNT(*) AS n FROM patients', 'patients'],
    ['SELECT ROUND(COALESCE(SUM(total),0)) AS n FROM invoices', 'invoice total'],
    ['SELECT ROUND(COALESCE(SUM(paid_amount),0)) AS n FROM invoices', 'invoice paid'],
    ['SELECT ROUND(COALESCE(SUM(amount),0)) AS n FROM payments', 'payment total'],
    ['SELECT ROUND(COALESCE(SUM(amount),0)) AS n FROM admission_payments', 'IPD payments'],
    ['SELECT COALESCE(SUM(quantity_in-quantity_out),0) AS n FROM medicine_batches', 'batch stock'],
    ['SELECT COUNT(*) AS n FROM blood_bags', 'blood bags'],
    ['SELECT COUNT(*) AS n FROM users', 'users'],
  ];
  for (const [sql, label] of pairs) {
    const [[a]] = await sequelize.query(sql);
    const [[b]] = await target.query(sql);
    assert.equal(Number(b.n), Number(a.n), `${label} must match (source ${a.n}, restored ${b.n})`);
  }
});

test('BUG-015: representative records are byte-identical after restore', async () => {
  const [[srcPatient]] = await sequelize.query('SELECT patient_code, full_name, gender, blood_group FROM patients ORDER BY id LIMIT 1');
  const [[resPatient]] = await target.query('SELECT patient_code, full_name, gender, blood_group FROM patients ORDER BY id LIMIT 1');
  assert.deepEqual(resPatient, srcPatient, 'the first patient record must be identical');

  const [[srcInv]] = await sequelize.query('SELECT invoice_code, subtotal, discount, tax, total, paid_amount, status FROM invoices ORDER BY id LIMIT 1');
  const [[resInv]] = await target.query('SELECT invoice_code, subtotal, discount, tax, total, paid_amount, status FROM invoices ORDER BY id LIMIT 1');
  assert.deepEqual(resInv, srcInv, 'the first invoice must be identical');

  const [[srcBatch]] = await target.query('SELECT batch_no, quantity_in, quantity_out FROM medicine_batches ORDER BY id LIMIT 1');
  assert.ok(srcBatch, 'batches must be present after restore');
});

test('BUG-015: foreign keys are enforced in the restored database', async () => {
  await assert.rejects(
    () => target.query('INSERT INTO admission_payments (admission_id, account_name, amount, paid_at, created_at, updated_at) VALUES (99999999, \'Cash\', 1, NOW(), NOW(), NOW())'),
    /foreign key|constraint/i,
    'a dangling foreign key must be rejected, proving constraints were restored'
  );
});

/* ── failure modes: must fail loudly ─────────────────────────────────────── */

test('BUG-015: a file without a manifest is refused', async () => {
  await assert.rejects(
    () => restoreBackup(target, 'CREATE TABLE nope (id INT);'),
    /no HMS manifest/i,
    'an unverifiable file must not be restored'
  );
});

test('BUG-015: empty input is refused', async () => {
  await assert.rejects(() => restoreBackup(target, ''), /no backup content/i);
  await assert.rejects(() => restoreBackup(target, null), /no backup content/i);
});

test('BUG-015: a corrupt manifest is refused', async () => {
  const broken = backup.sql.replace(/-- \{"format_version".*/, '-- {not json');
  await assert.rejects(() => restoreBackup(target, broken), /manifest/i);
});

test('BUG-015: an unsupported format version is refused', () => {
  const bumped = backup.sql.replace('"format_version":2', '"format_version":99');
  assert.throws(() => readManifest(bumped), /not supported/i);
});

test('BUG-015: a broken statement aborts loudly instead of being swallowed', async () => {
  const manifest = readManifest(backup.sql);
  const sabotaged = backup.sql.replace(
    'SET FOREIGN_KEY_CHECKS=0;',
    'SET FOREIGN_KEY_CHECKS=0;\nINSERT INTO table_that_does_not_exist (a) VALUES (1);'
  );
  await assert.rejects(
    () => restoreBackup(target, sabotaged),
    /Restore FAILED at statement/i,
    'a failing statement must abort the restore with a specific message'
  );
  assert.ok(manifest.total_rows > 0);
});

test('BUG-015: a row-count mismatch fails verification', async () => {
  // Restore cleanly, then delete a row and re-verify against the same manifest.
  await restoreBackup(target, backup.sql);
  await target.query('DELETE FROM patients ORDER BY id DESC LIMIT 1');
  const { verifyRestore } = require('../src/utils/sqlBackup');
  await assert.rejects(
    () => verifyRestore(target, readManifest(backup.sql)),
    /verification FAILED/i,
    'a silent data loss must be detected'
  );
});
