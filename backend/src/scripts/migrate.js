'use strict';

// CLI for the migration runner. Replaces `db:sync` for schema management.
//   npm run db:migrate          -> apply all pending
//   npm run db:migrate:status   -> list applied/pending
//   npm run db:migrate:down     -> revert the last migration

const logger = require('../config/logger');
const { sequelize } = require('../models');
const runner = require('../migrations/runner');

const main = async () => {
  const command = process.argv[2] || 'up';
  try {
    await sequelize.authenticate();

    if (command === 'status') {
      const rows = await runner.status();
      for (const r of rows) {
        // eslint-disable-next-line no-console
        console.log(`${r.applied ? '[applied]' : '[pending]'} ${r.name}`);
      }
    } else if (command === 'down') {
      const { reverted } = await runner.down(process.argv[3] || 1);
      logger.info(`Reverted: ${reverted.join(', ') || 'nothing'}`);
    } else {
      const { applied } = await runner.up();
      logger.info(`Applied ${applied.length} migration(s)`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`, err);
    process.exit(1);
  }
};

main();
