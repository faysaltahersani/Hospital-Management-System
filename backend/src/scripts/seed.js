'use strict';

const crypto = require('crypto');
const logger = require('../config/logger');
const { sequelize, User, Department } = require('../models');
const { hashPassword } = require('../utils/password');
const { ROLES } = require('../config/constants');

// BUG-002 — the admin password used to be a hardcoded literal that was also
// published in README.md and reused for every seeded staff account. It is now
// generated per run, printed once so the operator can capture it, and flagged
// for mandatory rotation at first login. Set SEED_ADMIN_PASSWORD to choose one
// deliberately (e.g. in an automated environment).
const generatePassword = () => `${crypto.randomBytes(18).toString('base64url')}Aa1!`;

const DEFAULT_ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL || 'admin@hospital.local',
  password: process.env.SEED_ADMIN_PASSWORD || generatePassword(),
  full_name: 'Admin',
  role: ROLES.ADMIN,
};

const DEFAULT_DEPARTMENTS = [
  { name: 'General Medicine', code: 'GEN', description: 'General medical consultations' },
  { name: 'Cardiology', code: 'CARD', description: 'Heart and circulatory system' },
  { name: 'Pediatrics', code: 'PED', description: 'Child healthcare' },
  { name: 'Orthopedics', code: 'ORTHO', description: 'Bones, joints, and muscles' },
  { name: 'Gynecology', code: 'GYN', description: "Women's health" },
];

const seedAdmin = async () => {
  const existing = await User.findOne({ where: { email: DEFAULT_ADMIN.email } });
  if (existing) {
    logger.info(`Admin already exists: ${DEFAULT_ADMIN.email}`);
    return;
  }
  const password_hash = await hashPassword(DEFAULT_ADMIN.password);
  await User.create({
    email: DEFAULT_ADMIN.email,
    password_hash,
    full_name: DEFAULT_ADMIN.full_name,
    role: DEFAULT_ADMIN.role,
    is_active: true,
    must_change_password: true,
  });
  // Printed once, to stdout only. Rotate at first login.
  // eslint-disable-next-line no-console
  console.log(
    '\n=============================================================\n' +
      ` Admin account created: ${DEFAULT_ADMIN.email}\n` +
      ` One-time password:     ${DEFAULT_ADMIN.password}\n` +
      ' This password must be changed at first login and is not\n' +
      ' stored or logged anywhere else.\n' +
      '=============================================================\n'
  );
};

const seedDepartments = async () => {
  for (const dept of DEFAULT_DEPARTMENTS) {
    const [, created] = await Department.findOrCreate({
      where: { code: dept.code },
      defaults: dept,
    });
    logger.info(`Department ${dept.code}: ${created ? 'created' : 'exists'}`);
  }
};

const main = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    await seedAdmin();
    await seedDepartments();
    logger.info('Seed complete');
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed', err);
    process.exit(1);
  }
};

main();
