// HMS Server Startup
'use strict';

const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/config/logger');
const { sequelize } = require('./src/models');

const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API base path: ${config.apiPrefix}`);
    });

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info(`${signal} received — shutting down gracefully`);

      // Forcefully terminate if open connections refuse to close in time.
      // Without this, a hung keep-alive socket can block process exit.
      const killer = setTimeout(() => {
        logger.warn('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      killer.unref();

      server.close(async () => {
        try {
          await sequelize.close();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', reason);
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      // We cannot trust process state after an uncaught exception; exit so
      // that the supervisor (pm2/k8s/systemd) restarts a fresh process.
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

start();
