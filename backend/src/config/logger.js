'use strict';

const { createLogger, format, transports } = require('winston');
const config = require('./index');

const logFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  config.env === 'development' ? format.colorize() : format.uncolorize(),
  format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}] ${stack || message}`;
  })
);

const logger = createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [new transports.Console()],
});

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
