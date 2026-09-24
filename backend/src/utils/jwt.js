'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

const baseOptions = {
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
};

const signAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    ...baseOptions,
    expiresIn: config.jwt.accessExpiresIn,
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    ...baseOptions,
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret, baseOptions);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret, baseOptions);
};

const decodeToken = (token) => jwt.decode(token);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
