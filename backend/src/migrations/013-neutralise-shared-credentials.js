'use strict';

// BUG-002 — 24 accounts in the shipped data share one of two bcrypt hashes,
// because the seed script hashed a single password once and copied it. All 24 are
// soft-deleted, so they cannot authenticate today (verified: login returns
// "Invalid email or password"). That is a property of the current data, not a
// safeguard — restoring any of them would immediately reinstate a known
// credential.
//
// This flags every account with a shared hash, soft-deleted included, so a
// restored account must rotate before it can be used. Passwords are NOT changed:
// silently rewriting a credential would lock a real user out with no notice.

module.exports = {
  async up({ sequelize }) {
    const [groups] = await sequelize.query(
      `SELECT password_hash, COUNT(*) AS n
         FROM users
        GROUP BY password_hash
       HAVING COUNT(*) > 1`
    );

    let flagged = 0;
    for (const group of groups) {
      // eslint-disable-next-line no-await-in-loop
      const [result] = await sequelize.query(
        'UPDATE users SET must_change_password = 1 WHERE password_hash = ? AND must_change_password = 0',
        { replacements: [group.password_hash] }
      );
      flagged += result?.changedRows ?? 0;
    }

    const [[live]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NULL AND must_change_password = 1'
    );
    const [[deleted]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM users WHERE deleted_at IS NOT NULL AND must_change_password = 1'
    );

    // eslint-disable-next-line no-console
    console.log(
      `  shared credentials: ${groups.length} shared-hash group(s); flagged ${flagged} additional account(s). ` +
        `must_change_password now set on ${live.n} live and ${deleted.n} soft-deleted account(s). ` +
        `No password was modified; login now refuses everything except a password change for these accounts.`
    );
  },

  async down({ sequelize }) {
    await sequelize.query('UPDATE users SET must_change_password = 0 WHERE deleted_at IS NOT NULL');
  },
};
