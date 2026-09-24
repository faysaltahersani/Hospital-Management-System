'use strict';

const logger = require('../config/logger');
const { sequelize } = require('../models');

const main = async () => {
  const force = process.argv.includes('--force');
  const alter = process.argv.includes('--alter');

  try {
    await sequelize.authenticate();
    logger.info('Database connected — running sync...');
    await sequelize.sync({ force, alter });
    logger.info(`Sync complete (force=${force}, alter=${alter})`);
    process.exit(0);
  } catch (err) {
    logger.error('Sync failed', err);
    process.exit(1);
  }
};

main();
