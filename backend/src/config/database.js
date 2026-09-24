'use strict';

const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('./logger');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  logging: config.db.logging ? (msg) => logger.debug(msg) : false,
  pool: {
    max: config.db.pool.max,
    min: config.db.pool.min,
    idle: config.db.pool.idle,
  },
  define: {
    underscored: true,
    freezeTableName: false,
    timestamps: true,
    paranoid: false,
  },
  timezone: '+00:00',
});

module.exports = sequelize;
