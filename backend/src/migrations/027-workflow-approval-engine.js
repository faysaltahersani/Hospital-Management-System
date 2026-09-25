'use strict';

module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workflow_definitions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, organization_id BIGINT UNSIGNED NOT NULL,
        hospital_id BIGINT UNSIGNED NULL, branch_id BIGINT UNSIGNED NULL, code VARCHAR(60) NOT NULL,
        name VARCHAR(180) NOT NULL, workflow_type VARCHAR(60) NOT NULL, entity_type VARCHAR(80) NOT NULL,
        description TEXT NULL, min_amount DECIMAL(14,2) NULL, max_amount DECIMAL(14,2) NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'BDT', is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_by BIGINT UNSIGNED NULL, updated_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id),
        UNIQUE KEY uq_workflow_definition_org_code (organization_id,code),
        KEY idx_workflow_type_active (workflow_type,is_active), KEY idx_workflow_hospital (hospital_id),
        KEY idx_workflow_branch (branch_id),
        CONSTRAINT fk_workflow_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_workflow_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
        CONSTRAINT fk_workflow_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
        CONSTRAINT fk_workflow_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_workflow_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_workflow_amount_range CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, workflow_definition_id BIGINT UNSIGNED NOT NULL,
        step_order SMALLINT UNSIGNED NOT NULL, name VARCHAR(160) NOT NULL, approver_role VARCHAR(60) NULL,
        approver_user_id BIGINT UNSIGNED NULL, min_approvals SMALLINT UNSIGNED NOT NULL DEFAULT 1,
        can_reject TINYINT(1) NOT NULL DEFAULT 1, due_hours INT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id), UNIQUE KEY uq_workflow_step_order (workflow_definition_id,step_order),
        KEY idx_workflow_step_role (approver_role), KEY idx_workflow_step_user (approver_user_id),
        CONSTRAINT fk_workflow_step_definition FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE,
        CONSTRAINT fk_workflow_step_user FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT ck_workflow_step_approver CHECK (approver_role IS NOT NULL OR approver_user_id IS NOT NULL)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, workflow_definition_id BIGINT UNSIGNED NOT NULL,
        organization_id BIGINT UNSIGNED NOT NULL, hospital_id BIGINT UNSIGNED NULL, branch_id BIGINT UNSIGNED NULL,
        request_code VARCHAR(70) NOT NULL, entity_type VARCHAR(80) NOT NULL, entity_id VARCHAR(80) NULL,
        title VARCHAR(220) NOT NULL, description TEXT NULL, amount DECIMAL(14,2) NULL,
        currency_code CHAR(3) NOT NULL DEFAULT 'BDT',
        status ENUM('draft','submitted','in_review','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
        current_step_order SMALLINT UNSIGNED NULL, payload JSON NULL, requested_by BIGINT UNSIGNED NOT NULL,
        submitted_at DATETIME NULL, completed_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL, PRIMARY KEY (id), UNIQUE KEY uq_approval_request_code (request_code),
        KEY idx_approval_org_status (organization_id,status), KEY idx_approval_branch_status (branch_id,status),
        KEY idx_approval_definition (workflow_definition_id), KEY idx_approval_entity (entity_type,entity_id),
        KEY idx_approval_requester (requested_by),
        CONSTRAINT fk_approval_definition FOREIGN KEY (workflow_definition_id) REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
        CONSTRAINT fk_approval_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_approval_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
        CONSTRAINT fk_approval_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
        CONSTRAINT fk_approval_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS approval_actions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, approval_request_id BIGINT UNSIGNED NOT NULL,
        workflow_step_id BIGINT UNSIGNED NULL, step_order SMALLINT UNSIGNED NULL,
        action ENUM('submit','approve','reject','comment','cancel') NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL, comments TEXT NULL, metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id),
        KEY idx_approval_action_request (approval_request_id,created_at),
        KEY idx_approval_action_step (workflow_step_id,action), KEY idx_approval_action_user (user_id),
        CONSTRAINT fk_approval_action_request FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_approval_action_step FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id) ON DELETE RESTRICT,
        CONSTRAINT fk_approval_action_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },

  async down() {
    throw new Error('027-workflow-approval-engine is not reversible because approval history is an audit record');
  },
};
