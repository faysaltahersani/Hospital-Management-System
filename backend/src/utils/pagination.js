'use strict';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePaging = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildMeta = ({ total, page, limit }) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
};

module.exports = { parsePaging, buildMeta };
