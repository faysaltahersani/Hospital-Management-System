'use strict';

const { DataTypes, Model } = require('sequelize');

// BUG-012 / BUG-026 — real batch records. Available quantity is always derived
// (quantity_in - quantity_out); it is never stored, so it cannot drift.
module.exports = (sequelize) => {
  class MedicineBatch extends Model {
    get available() {
      return Number(this.quantity_in || 0) - Number(this.quantity_out || 0);
    }
  }

  MedicineBatch.init(
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      medicine_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      batch_no: { type: DataTypes.STRING(60), allowNull: false },
      // Nullable on purpose: an unrecorded expiry must read as unknown rather
      // than being defaulted to a plausible-looking date.
      expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
      quantity_in: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      quantity_out: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      source: { type: DataTypes.STRING(60), allowNull: true },
    },
    {
      sequelize,
      modelName: 'MedicineBatch',
      tableName: 'medicine_batches',
      paranoid: true,
      indexes: [{ fields: ['medicine_id', 'batch_no'], unique: true }, { fields: ['expiry_date'] }],
    }
  );

  return MedicineBatch;
};
