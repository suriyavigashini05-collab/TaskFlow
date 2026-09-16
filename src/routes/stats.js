const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res, next) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
