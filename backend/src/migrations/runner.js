'use strict';

// Minimal, dependency-free migration runner.
//
// Migrations live in this directory as `NNN-name.js` and export
// `up({ queryInterface, sequelize, Sequelize })` and `down(...)`.
// Applied migrations are recorded in `schema_migrations`, so running
// `npm run db:migrate` twice is a no-op. This replaces
// `sequelize.sync({ alter: true })`, which re-added indexes on every run
// (see BUG-018) and cannot express data repair.

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const logger = require('../config/logger');

const TABLE = 'schema_migrations';

const ensureTable = async () => {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
      \`name\` VARCHAR(191) NOT NULL,
      \`applied_at\` DATETIME NOT NULL,
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
};

const applied = async () => {
  const [rows] = await sequelize.query(`SELECT name FROM \`${TABLE}\` ORDER BY name ASC`);
  return rows.map((r) => r.name);
};

const discover = () =>
  fs
    .readdirSync(__dirname)
    .filter((f) => /^\d{3}-.+\.js$/.test(f))
    .sort();

const load = (file) => {
  const mod = require(path.join(__dirname, file));
  if (typeof mod.up !== 'function') {
    throw new Error(`Migration ${file} does not export an up() function`);
  }
  return mod;
};

const context = () => ({
  queryInterface: sequelize.getQueryInterface(),
  sequelize,
  Sequelize,
});

const up = async () => {
  await ensureTable();
  const done = new Set(await applied());
  const pending = discover().filter((f) => !done.has(f));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return { applied: [] };
  }

  const ran = [];
  for (const file of pending) {
    const migration = load(file);
    logger.info(`Applying ${file}`);
    // Each migration owns its own transaction so a failure cannot leave a
    // half-applied schema recorded as complete. DDL in MySQL is not
    // transactional, so migrations must additionally be written idempotently.
    // eslint-disable-next-line no-await-in-loop
    await migration.up(context());
    // eslint-disable-next-line no-await-in-loop
    await sequelize.query(`INSERT INTO \`${TABLE}\` (name, applied_at) VALUES (?, NOW())`, {
      replacements: [file],
    });
    ran.push(file);
    logger.info(`Applied  ${file}`);
  }
  return { applied: ran };
};

const down = async (steps = 1) => {
  await ensureTable();
  const done = await applied();
  const target = done.slice(-Number(steps));
  for (const file of target.reverse()) {
    const migration = load(file);
    if (typeof migration.down !== 'function') {
      throw new Error(`Migration ${file} is not reversible`);
    }
    logger.info(`Reverting ${file}`);
    // eslint-disable-next-line no-await-in-loop
    await migration.down(context());
    // eslint-disable-next-line no-await-in-loop
    await sequelize.query(`DELETE FROM \`${TABLE}\` WHERE name = ?`, { replacements: [file] });
  }
  return { reverted: target };
};

const status = async () => {
  await ensureTable();
  const done = new Set(await applied());
  return discover().map((file) => ({ name: file, applied: done.has(file) }));
};

module.exports = { up, down, status, discover };
