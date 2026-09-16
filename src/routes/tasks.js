const express = require('express');
const router = express.Router();
const db = require('../db');
const { validateCreateTask, validateUpdateTask } = require('../middleware/validator');

// GET /api/tasks - List tasks with search, filters, and sorting
router.get('/', (req, res, next) => {
  try {
    const { search, status, priority, sort } = req.query;
    const tasks = db.getAllTasks({ search, status, priority, sort });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const task = db.getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks - Create task
router.post('/', validateCreateTask, (req, res, next) => {
  try {
    const task = db.createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', validateUpdateTask, (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const updated = db.updateTask(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/toggle - Toggle completion status
router.patch('/:id/toggle', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const toggled = db.toggleTask(id);
    if (!toggled) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(toggled);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const deleted = db.deleteTask(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
