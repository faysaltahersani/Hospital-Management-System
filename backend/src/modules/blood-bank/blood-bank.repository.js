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
const { BloodDonor, BloodBag, BloodIssue, Patient } = require('../../models');

const findAndCountDonors = ({ filters = {}, search, limit, offset }) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = [
      { donor_code: { [Op.like]: `%${search}%` } },
      { full_name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  return BloodDonor.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
};

const findDonorById = (id, options = {}) => BloodDonor.findByPk(id, options);
const countDonorsForYear = (year, options = {}) =>
  BloodDonor.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createDonor = (data, options = {}) => BloodDonor.create(data, options);
const updateDonor = (donor, changes, options = {}) => donor.update(changes, options);
const destroyDonor = (donor, options = {}) => donor.destroy(options);

const bagIncludes = [
  { model: BloodDonor, as: 'donor', attributes: ['id', 'donor_code', 'full_name', 'blood_group', 'phone'] },
];

const findAndCountBags = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.collected_at = range;
  if (search) {
    where[Op.or] = [
      { bag_code: { [Op.like]: `%${search}%` } },
      { blood_group: { [Op.like]: `%${search}%` } },
      { component: { [Op.like]: `%${search}%` } },
    ];
  }
  return BloodBag.findAndCountAll({
    where,
    include: bagIncludes,
    limit,
    offset,
    order: [['collected_at', 'DESC'], ['id', 'DESC']],
    distinct: true,
  });
};

const findBagById = (id, options = {}) => BloodBag.findByPk(id, { include: bagIncludes, ...options });
const countBagsForYear = (year, options = {}) =>
  BloodBag.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createBag = (data, options = {}) => BloodBag.create(data, options);
const updateBag = (bag, changes, options = {}) => bag.update(changes, options);
const destroyBag = (bag, options = {}) => bag.destroy(options);

const stockSummary = () =>
  BloodBag.findAll({
    attributes: [
      'blood_group',
      'component',
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
    ],
    group: ['blood_group', 'component', 'status'],
    raw: true,
  });

const issueIncludes = [
  {
    model: BloodBag,
    as: 'bag',
    attributes: ['id', 'bag_code', 'blood_group', 'component', 'volume_ml', 'expires_at', 'status'],
  },
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'phone'] },
];

const findAndCountIssues = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.issued_at = range;
  if (search) {
    where[Op.or] = [
      { issue_code: { [Op.like]: `%${search}%` } },
      { issued_to: { [Op.like]: `%${search}%` } },
    ];
  }
  return BloodIssue.findAndCountAll({
    where,
    include: issueIncludes,
    limit,
    offset,
    order: [['issued_at', 'DESC']],
    distinct: true,
  });
};

const findIssueById = (id, options = {}) => BloodIssue.findByPk(id, { include: issueIncludes, ...options });
const countIssuesForYear = (year, options = {}) =>
  BloodIssue.count({
    where: Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('created_at')), year),
    paranoid: false,
    ...options,
  });
const createIssue = (data, options = {}) => BloodIssue.create(data, options);
const destroyIssue = (issue, options = {}) => issue.destroy(options);

module.exports = {
  findAndCountDonors,
  findDonorById,
  countDonorsForYear,
  createDonor,
  updateDonor,
  destroyDonor,
  findAndCountBags,
  findBagById,
  countBagsForYear,
  createBag,
  updateBag,
  destroyBag,
  stockSummary,
  findAndCountIssues,
  findIssueById,
  countIssuesForYear,
  createIssue,
  destroyIssue,
};
