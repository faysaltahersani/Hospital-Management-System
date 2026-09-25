'use strict';

const { Op } = require('sequelize');
const { Organization, Hospital, Branch } = require('../../models');

const searchableWhere = (filters = {}, search, fields = ['name', 'code']) => {
  const where = { ...filters };
  if (search) {
    where[Op.or] = fields.map((field) => ({ [field]: { [Op.like]: `%${search}%` } }));
  }
  return where;
};

const listOrganizations = ({ filters, search, limit, offset }) =>
  Organization.findAndCountAll({
    where: searchableWhere(filters, search, ['name', 'legal_name', 'code']),
    limit,
    offset,
    order: [['name', 'ASC']],
  });

const listHospitals = ({ filters, search, limit, offset }) =>
  Hospital.findAndCountAll({
    where: searchableWhere(filters, search),
    include: [{ model: Organization, as: 'organization', attributes: ['id', 'code', 'name'] }],
    limit,
    offset,
    distinct: true,
    order: [['name', 'ASC']],
  });

const listBranches = ({ filters, search, limit, offset }) =>
  Branch.findAndCountAll({
    where: searchableWhere(filters, search),
    include: [
      {
        model: Hospital,
        as: 'hospital',
        attributes: ['id', 'organization_id', 'code', 'name'],
        include: [{ model: Organization, as: 'organization', attributes: ['id', 'code', 'name'] }],
      },
    ],
    limit,
    offset,
    distinct: true,
    order: [['is_main', 'DESC'], ['name', 'ASC']],
  });

const hierarchy = () =>
  Organization.findAll({
    where: { is_active: true },
    include: [
      {
        model: Hospital,
        as: 'hospitals',
        where: { is_active: true },
        required: false,
        include: [
          {
            model: Branch,
            as: 'branches',
            where: { is_active: true },
            required: false,
          },
        ],
      },
    ],
    order: [
      ['name', 'ASC'],
      [{ model: Hospital, as: 'hospitals' }, 'name', 'ASC'],
      [{ model: Hospital, as: 'hospitals' }, { model: Branch, as: 'branches' }, 'is_main', 'DESC'],
      [{ model: Hospital, as: 'hospitals' }, { model: Branch, as: 'branches' }, 'name', 'ASC'],
    ],
  });

const modelFor = (entity) => ({ organizations: Organization, hospitals: Hospital, branches: Branch }[entity]);

const findById = (entity, id, options = {}) => modelFor(entity).findByPk(id, options);
const findOne = (entity, where, options = {}) => modelFor(entity).findOne({ where, ...options });
const create = (entity, data, options = {}) => modelFor(entity).create(data, options);
const update = (row, changes, options = {}) => row.update(changes, options);
const destroy = (row, options = {}) => row.destroy(options);

module.exports = {
  listOrganizations,
  listHospitals,
  listBranches,
  hierarchy,
  findById,
  findOne,
  create,
  update,
  destroy,
};

