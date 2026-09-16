const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'taskflow.db'),
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  shutdownTimeoutMs: parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 5000,
  requestLogging: process.env.REQUEST_LOGGING !== 'false'
};

module.exports = config;
