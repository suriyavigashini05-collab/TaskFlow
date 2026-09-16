const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const db = require('./db');

const healthRoutes = require('./routes/health');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Basic Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => config.nodeEnv === 'test' || req.path === '/health',
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.'
  }
});
app.use(limiter);

// Simple Request Logging (method + path + status + response time)
app.use((req, res, next) => {
  if (!config.requestLogging || config.nodeEnv === 'test') {
    return next();
  }
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Body parsing and static file serving
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/health', healthRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);

// Fallback to index.html for SPA frontend routing if needed
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

let server = null;
let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Gracefully shutting down TaskFlow...`);

  const forceTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, config.shutdownTimeoutMs);
  forceTimer.unref();

  if (server) {
    server.close(() => {
      try {
        db.closeDb();
        console.log('Database connection closed and HTTP server stopped.');
      } catch (err) {
        console.error('Error closing database:', err.message);
      }
      clearTimeout(forceTimer);
      process.exit(0);
    });
  } else {
    try {
      db.closeDb();
    } catch (err) {
      console.error('Error closing database:', err.message);
    }
    clearTimeout(forceTimer);
    process.exit(0);
  }
}

function startServer(port = config.port, host = config.host) {
  // Ensure database initialized
  db.initDb(config.dbPath);

  server = app.listen(port, host, () => {
    console.log(`TaskFlow server running at http://${host}:${port}`);
    console.log(`Health check available at http://${host}:${port}/health`);
    console.log(`Database connected at ${config.dbPath}`);
  });

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
