'use strict';

const hasConstraint = async (sequelize, table, constraint) => {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?`,
    { replacements: [table, constraint] }
  );
  return rows.length > 0;
};

module.exports = {
  async up({ sequelize }) {
    if (!(await hasConstraint(sequelize, 'users', 'fk_users_organization'))) {
      await sequelize.query(
        'ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT'
      );
    }
    if (!(await hasConstraint(sequelize, 'users', 'fk_users_hospital'))) {
      await sequelize.query(
        'ALTER TABLE users ADD CONSTRAINT fk_users_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT'
      );
    }
    if (!(await hasConstraint(sequelize, 'users', 'fk_users_branch'))) {
      await sequelize.query(
        'ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT'
      );
    }
  },

  async down({ sequelize }) {
    for (const constraint of ['fk_users_branch', 'fk_users_hospital', 'fk_users_organization']) {
      if (await hasConstraint(sequelize, 'users', constraint)) {
        await sequelize.query(`ALTER TABLE users DROP FOREIGN KEY \`${constraint}\``);
      }
    }
  },
};

