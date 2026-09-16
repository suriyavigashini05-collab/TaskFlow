const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        totalTasks: stats.total
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        error: err.message
      }
    });
  }
});

module.exports = router;
