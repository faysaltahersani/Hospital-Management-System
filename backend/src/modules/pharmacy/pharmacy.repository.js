'use strict';

// Sequelize options (notably `transaction`) are forwarded by every helper below.
// They used to be dropped: a service inside `sequelize.transaction(async (t))`
// would call `repository.create(data, { transaction: t })` and the row was written
// on a DIFFERENT pooled connection, outside the transaction. Two consequences,
// both observed under a 50-user load test:
//   * the write was not rolled back with its transaction, leaving orphans (an OPD
//     visit with no invoice when the billing step failed)
//   * each request needed a second connection while holding one, so with
//     DB_POOL_MAX=10 concurrent writers deadlocked the pool until the acquire
//     timeout fired

const { Op, Sequelize } = require('sequelize');
const { dateTimeRange } = require('../../utils/dateUtils');
const {
  Doctor,
  Medicine,
  MedicineSale,
  MedicineSaleItem,
  Patient,
  Prescription,
  User,
} = require('../../models');

const medicineSearch = (search) => [
  { code: { [Op.like]: `%${search}%` } },
  { name: { [Op.like]: `%${search}%` } },
  { generic_name: { [Op.like]: `%${search}%` } },
  { manufacturer: { [Op.like]: `%${search}%` } },
];

const findAndCountMedicines = ({ company, filters = {}, groupName, search, unit, limit, offset }) => {
  const where = { ...filters };
  const conditions = [];
  if (unit) conditions.push({ unit });
  if (groupName) {
    conditions.push({ [Op.or]: [{ group_name: groupName }, { generic_name: groupName }] });
  }
  if (company) {
    conditions.push({ [Op.or]: [{ company }, { manufacturer: company }] });
  }
  if (search) conditions.push({ [Op.or]: medicineSearch(search) });
  if (conditions.length) where[Op.and] = conditions;
  return Medicine.findAndCountAll({
    where,
    limit,
    offset,
    order: [['id', 'DESC']],
  });
};

const findMedicineById = (id, options = {}) => Medicine.findByPk(id, options);
const findMedicineByCode = (code, options = {}) => Medicine.findOne({ where: { code }, ...options });
const createMedicine = (data, options = {}) => Medicine.create(data, options);
const updateMedicine = (medicine, changes, options = {}) => medicine.update(changes, options);
const destroyMedicine = (medicine, options = {}) => medicine.destroy(options);

const saleIncludes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
  {
    model: Prescription,
    as: 'prescription',
    attributes: ['id', 'prescription_code', 'status'],
    include: [
      {
        model: Doctor,
        as: 'doctor',
        attributes: ['id', 'doctor_code'],
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }],
      },
    ],
  },
  { model: User, as: 'cashier', attributes: ['id', 'full_name', 'email'] },
  {
    model: MedicineSaleItem,
    as: 'items',
    include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'code', 'name', 'unit'] }],
  },
];

const findAndCountSales = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.sold_at = range;
  if (search) {
    where[Op.or] = [
      { sale_code: { [Op.like]: `%${search}%` } },
      { '$patient.full_name$': { [Op.like]: `%${search}%` } },
      { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
      { '$items.medicine.name$': { [Op.like]: `%${search}%` } },
    ];
  }
  return MedicineSale.findAndCountAll({
    where,
    include: saleIncludes,
    limit,
    offset,
    order: [['sold_at', 'DESC']],
    distinct: true,
    subQuery: false,
  });
};

const findSaleById = (id, options = {}) => MedicineSale.findByPk(id, { include: saleIncludes, ...options });
// Returns the sale without joins, suitable for SELECT ... FOR UPDATE locking.
const findSaleRowById = (id, options = {}) => MedicineSale.findByPk(id, options);
const findSaleItems = (saleId, options = {}) =>
  MedicineSaleItem.findAll({ where: { sale_id: saleId }, ...options });
const countSalesForYear = (year, options = {}) =>
  MedicineSale.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createSale = (data, options = {}) => MedicineSale.create(data, options);
const createSaleItems = (items, options = {}) => MedicineSaleItem.bulkCreate(items, options);
const updateSale = (sale, changes, options = {}) => sale.update(changes, options);
const destroySale = (sale, options = {}) => sale.destroy(options);

module.exports = {
  // Exported so the service layer can reuse the same eager-load shape when it
  // resolves sales referenced by sales-return records (BUG-007).
  saleIncludes,
  findAndCountMedicines,
  findMedicineById,
  findMedicineByCode,
  createMedicine,
  updateMedicine,
  destroyMedicine,
  findAndCountSales,
  findSaleById,
  findSaleRowById,
  findSaleItems,
  countSalesForYear,
  createSale,
  createSaleItems,
  updateSale,
  destroySale,
};
