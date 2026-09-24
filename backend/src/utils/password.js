'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');

const hashPassword = async (plain) => {
  return bcrypt.hash(plain, config.security.bcryptSaltRounds);
};

const comparePassword = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

module.exports = { hashPassword, comparePassword };
