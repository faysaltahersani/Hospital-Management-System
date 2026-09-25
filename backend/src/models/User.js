'use strict';

const { DataTypes, Model } = require('sequelize');
const { ROLE_VALUES, ROLES } = require('../config/constants');

module.exports = (sequelize) => {
  class User extends Model {
    toJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...ROLE_VALUES),
        allowNull: false,
        defaultValue: ROLES.RECEPTIONIST,
      },
      organization_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      hospital_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      branch_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // BUG-002 — forces a rotation at next login for accounts provisioned with
      // a random/unknown password or flagged as sharing a credential.
      must_change_password: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      paranoid: true,
      indexes: [
        { fields: ['email'], unique: true },
        { fields: ['role'] },
        { fields: ['organization_id'] },
        { fields: ['hospital_id'] },
        { fields: ['branch_id'] },
        { fields: ['department_id'] },
      ],
    }
  );

  return User;
};
