const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const config = require('./config');

let currentDb = null;
let currentDbPath = null;

function initDb(dbPath = config.dbPath) {
  if (currentDb && currentDbPath === dbPath) {
    return currentDb;
  }

  if (currentDb) {
    closeDb();
  }

  // Ensure directory exists if not memory database
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Enable pragmas
  db.exec('PRAGMA foreign_keys = ON;');

  // Create tasks schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) NOT NULL DEFAULT 'medium',
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) NOT NULL DEFAULT 'pending',
      due_date TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  `);

  currentDb = db;
  currentDbPath = dbPath;
  return currentDb;
}

function getDb() {
  if (!currentDb) {
    return initDb();
  }
  return currentDb;
}

function closeDb() {
  if (currentDb) {
    try {
      currentDb.close();
    } catch (err) {
      // Ignored if already closed
    }
    currentDb = null;
    currentDbPath = null;
  }
}

function getAllTasks(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.search && filters.search.trim()) {
    conditions.push('(title LIKE ? OR description LIKE ?)');
    const searchTerm = `%${filters.search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (filters.status && filters.status !== 'all') {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    conditions.push('priority = ?');
    params.push(filters.priority);
  }

  let query = 'SELECT * FROM tasks';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  switch (filters.sort) {
    case 'due_date':
      query += ' ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, id DESC';
      break;
    case 'priority':
      query += ` ORDER BY CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5 END ASC, id DESC`;
      break;
    case 'title':
      query += ' ORDER BY title COLLATE NOCASE ASC';
      break;
    case 'oldest':
      query += ' ORDER BY id ASC';
      break;
    case 'newest':
    default:
      query += ' ORDER BY id DESC';
      break;
  }

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  return rows.map(formatTask);
}

function getTaskById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(Number(id));
  return row ? formatTask(row) : null;
}

function createTask(data) {
  const db = getDb();
  const title = (data.title || '').trim();
  const description = (data.description || '').trim();
  const priority = data.priority || 'medium';
  const status = data.status || 'pending';
  const dueDate = data.due_date || null;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, status, due_date, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = stmt.run(title, description, priority, status, dueDate, completedAt);
  return getTaskById(result.lastInsertRowid);
}

function updateTask(id, data) {
  const existing = getTaskById(id);
  if (!existing) return null;

  const db = getDb();
  const title = data.title !== undefined ? data.title.trim() : existing.title;
  const description = data.description !== undefined ? data.description.trim() : existing.description;
  const priority = data.priority !== undefined ? data.priority : existing.priority;
  const status = data.status !== undefined ? data.status : existing.status;
  const dueDate = data.due_date !== undefined ? (data.due_date || null) : existing.due_date;

  let completedAt = existing.completed_at;
  if (status === 'completed' && existing.status !== 'completed') {
    completedAt = new Date().toISOString();
  } else if (status !== 'completed') {
    completedAt = null;
  }

  const stmt = db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, completed_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(title, description, priority, status, dueDate, completedAt, Number(id));
  return getTaskById(id);
}

function toggleTask(id) {
  const existing = getTaskById(id);
  if (!existing) return null;

  const newStatus = existing.status === 'completed' ? 'pending' : 'completed';
  return updateTask(id, { status: newStatus });
}

function deleteTask(id) {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(Number(id));
  return result.changes > 0;
}

function getStats() {
  const db = getDb();

  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM tasks');
  const total = totalStmt.get().count;

  const statusStmt = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN priority IN ('high', 'urgent') AND status != 'completed' THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN due_date IS NOT NULL AND date(due_date) < date('now') AND status != 'completed' THEN 1 ELSE 0 END) as overdue
    FROM tasks
  `);

  const raw = statusStmt.get();
  const completed = raw.completed || 0;
  const inProgress = raw.in_progress || 0;
  const pending = raw.pending || 0;
  const highPriority = raw.high_priority || 0;
  const overdue = raw.overdue || 0;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    in_progress: inProgress,
    pending,
    high_priority: highPriority,
    overdue,
    completion_percentage: completionPercentage
  };
}

function formatTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    status: row.status,
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at
  };
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTask,
  deleteTask,
  getStats
};
