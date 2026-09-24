'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { apiRateLimiter } = require('./middlewares/rateLimit.middleware');
const { notFound } = require('./middlewares/notFound.middleware');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// BUG-023 — only trust forwarding headers when a real proxy is in front,
// otherwise req.ip is attacker-controlled and per-IP rate limiting is void.
app.set('trust proxy', config.trustProxy ? 1 : false);

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    credentials: config.corsOrigin !== '*',
  })
);
app.use(compression());
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.jsonBodyLimit }));

if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined', { stream: logger.stream }));
}

app.use(config.apiPrefix, apiRateLimiter, routes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Hospital Management API',
    api: config.apiPrefix,
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
