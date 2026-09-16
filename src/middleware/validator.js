const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

function validateCreateTask(req, res, next) {
  const { title, description, priority, status, due_date } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required and must not be empty.');
  } else if (title.trim().length > 200) {
    errors.push('Title must not exceed 200 characters.');
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string.');
    } else if (description.length > 2000) {
      errors.push('Description must not exceed 2000 characters.');
    }
  }

  if (priority !== undefined && priority !== null) {
    if (!VALID_PRIORITIES.includes(priority.toLowerCase())) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
    }
  }

  if (status !== undefined && status !== null) {
    if (!VALID_STATUSES.includes(status.toLowerCase())) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  if (due_date !== undefined && due_date !== null && due_date !== '') {
    const parsedDate = new Date(due_date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date format (e.g. YYYY-MM-DD).');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Normalize fields
  req.body.title = title.trim();
  if (description) req.body.description = description.trim();
  if (priority) req.body.priority = priority.toLowerCase();
  if (status) req.body.status = status.toLowerCase();
  if (due_date === '' || due_date === undefined) req.body.due_date = null;

  next();
}

function validateUpdateTask(req, res, next) {
  const { title, description, priority, status, due_date } = req.body;
  const errors = [];

  if (title === undefined && description === undefined && priority === undefined && status === undefined && due_date === undefined) {
    return res.status(400).json({
      error: 'Validation failed',
      details: ['At least one field (title, description, priority, status, due_date) must be provided for update.']
    });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title must be a non-empty string.');
    } else if (title.trim().length > 200) {
      errors.push('Title must not exceed 200 characters.');
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string.');
    } else if (description.length > 2000) {
      errors.push('Description must not exceed 2000 characters.');
    }
  }

  if (priority !== undefined && priority !== null) {
    if (!VALID_PRIORITIES.includes(priority.toLowerCase())) {
      errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
    }
  }

  if (status !== undefined && status !== null) {
    if (!VALID_STATUSES.includes(status.toLowerCase())) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  if (due_date !== undefined && due_date !== null && due_date !== '') {
    const parsedDate = new Date(due_date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Due date must be a valid date format (e.g. YYYY-MM-DD).');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Normalize fields
  if (title !== undefined) req.body.title = title.trim();
  if (description !== undefined && description !== null) req.body.description = description.trim();
  if (priority !== undefined && priority !== null) req.body.priority = priority.toLowerCase();
  if (status !== undefined && status !== null) req.body.status = status.toLowerCase();
  if (due_date === '') req.body.due_date = null;

  next();
}

module.exports = {
  validateCreateTask,
  validateUpdateTask
};
