const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const db = require('../src/db');

describe('Database Persistence Across Restarts', () => {
  const testDbDir = path.join(__dirname, 'temp_test_data');
  const testDbFile = path.join(testDbDir, 'persistence_test.db');

  before(() => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  after(() => {
    db.closeDb();
    if (fs.existsSync(testDbFile)) {
      try {
        fs.unlinkSync(testDbFile);
      } catch (e) {}
    }
    if (fs.existsSync(testDbDir)) {
      try {
        fs.rmdirSync(testDbDir);
      } catch (e) {}
    }
  });

  it('persists tasks, updates, and schema across database close and re-open', () => {
    // Phase 1: Initialize DB on disk and create tasks
    const firstInstance = db.initDb(testDbFile);
    assert.ok(fs.existsSync(testDbFile), 'Database file should exist on disk');

    const created1 = db.createTask({
      title: 'Persistent Task Alpha',
      description: 'Must survive restart',
      priority: 'high',
      status: 'pending',
      due_date: '2026-12-31'
    });

    const created2 = db.createTask({
      title: 'Persistent Task Beta',
      description: 'Must remain completed',
      priority: 'urgent',
      status: 'completed'
    });

    assert.equal(created1.id, 1);
    assert.equal(created2.id, 2);

    // Phase 2: Simulate full server shutdown / restart
    db.closeDb();

    // Phase 3: Reopen database from the exact same disk file
    const secondInstance = db.initDb(testDbFile);

    // Phase 4: Verify all data persisted correctly
    const allTasks = db.getAllTasks();
    assert.equal(allTasks.length, 2, 'Should have 2 tasks restored from disk');

    const task1 = db.getTaskById(1);
    assert.ok(task1, 'Task 1 should exist');
    assert.equal(task1.title, 'Persistent Task Alpha');
    assert.equal(task1.description, 'Must survive restart');
    assert.equal(task1.priority, 'high');
    assert.equal(task1.status, 'pending');
    assert.equal(task1.due_date, '2026-12-31');

    const task2 = db.getTaskById(2);
    assert.ok(task2, 'Task 2 should exist');
    assert.equal(task2.title, 'Persistent Task Beta');
    assert.equal(task2.status, 'completed');
    assert.ok(task2.completed_at, 'completed_at should persist');

    // Phase 5: Mutate data on reopened database
    const updated = db.updateTask(1, { status: 'in_progress', priority: 'urgent' });
    assert.equal(updated.status, 'in_progress');
    assert.equal(updated.priority, 'urgent');

    // Phase 6: Simulate second restart and verify mutation persisted
    db.closeDb();
    db.initDb(testDbFile);

    const recheckedTask1 = db.getTaskById(1);
    assert.equal(recheckedTask1.status, 'in_progress');
    assert.equal(recheckedTask1.priority, 'urgent');

    // Stats check across persistence
    const stats = db.getStats();
    assert.equal(stats.total, 2);
    assert.equal(stats.in_progress, 1);
    assert.equal(stats.completed, 1);
    assert.equal(stats.completion_percentage, 50);
  });
});
