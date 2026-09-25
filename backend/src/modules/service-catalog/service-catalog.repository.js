'use strict';
const models = require('../../models');

const MODEL_BY_ENTITY = Object.freeze({
  types: models.ServiceType,
  categories: models.ServiceCategory,
  services: models.Service,
  prices: models.ServicePrice,
  rules: models.PricingRule,
});

const modelFor = (entity) => MODEL_BY_ENTITY[entity] || null;
const findById = (entity, id, options = {}) => modelFor(entity).findByPk(id, options);
const create = (entity, data, options = {}) => modelFor(entity).create(data, options);
const update = (row, data, options = {}) => row.update(data, options);
const remove = (row, options = {}) => row.destroy(options);

module.exports = { MODEL_BY_ENTITY, modelFor, findById, create, update, remove };
