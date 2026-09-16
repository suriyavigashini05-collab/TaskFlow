const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/db');

describe('TaskFlow API & Static Asset Tests', () => {
  before(() => {
    db.initDb(':memory:');
  });

  after(() => {
    db.closeDb();
  });

  beforeEach(() => {
    const database = db.getDb();
    database.exec("DELETE FROM tasks; DELETE FROM sqlite_sequence WHERE name='tasks';");
  });

  describe('Static Frontend Serving', () => {
    it('GET / should serve index.html with 200 OK', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.ok(res.text.includes('TaskFlow'));
      assert.ok(res.text.includes('<html'));
    });

    it('GET /css/styles.css should serve CSS styling', async () => {
      const res = await request(app).get('/css/styles.css');
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/css'));
      assert.ok(res.text.includes('--font-main'));
    });

    it('GET /js/app.js should serve frontend client logic', async () => {
      const res = await request(app).get('/js/app.js');
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('javascript'));
      assert.ok(res.text.includes('TaskFlow Frontend Application'));
    });
  });

  describe('Health Endpoint', () => {
    it('GET /health should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.database.status, 'connected');
      assert.ok(res.body.uptime !== undefined);
      assert.ok(res.body.timestamp !== undefined);
    });
  });

  describe('Task Creation & Validation', () => {
    it('POST /api/tasks creates task with default fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Finish report' });

      assert.equal(res.status, 201);
      assert.equal(res.body.title, 'Finish report');
      assert.equal(res.body.priority, 'medium');
      assert.equal(res.body.status, 'pending');
      assert.equal(res.body.description, '');
      assert.ok(res.body.id > 0);
      assert.ok(res.body.created_at);
    });

    it('POST /api/tasks creates task with custom fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Deploy production release',
          description: 'Deploy v2.0 to cloud servers',
          priority: 'urgent',
          status: 'in_progress',
          due_date: '2026-10-01'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.title, 'Deploy production release');
      assert.equal(res.body.description, 'Deploy v2.0 to cloud servers');
      assert.equal(res.body.priority, 'urgent');
      assert.equal(res.body.status, 'in_progress');
      assert.equal(res.body.due_date, '2026-10-01');
    });

    it('POST /api/tasks rejects empty title with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
      assert.ok(res.body.details.length > 0);
    });

    it('POST /api/tasks rejects invalid priority with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Invalid task', priority: 'extreme' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
    });

    it('POST /api/tasks rejects invalid status with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Invalid task', status: 'archived' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation failed');
    });
  });

  describe('Task Retrieval & Filtering', () => {
    beforeEach(() => {
      db.createTask({ title: 'Alpha task', priority: 'low', status: 'pending', due_date: '2026-10-15' });
      db.createTask({ title: 'Beta urgent bug', priority: 'urgent', status: 'in_progress', due_date: '2026-09-20' });
      db.createTask({ title: 'Gamma review', priority: 'high', status: 'completed', due_date: '2026-09-10' });
    });

    it('GET /api/tasks returns all tasks', async () => {
      const res = await request(app).get('/api/tasks');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 3);
    });

    it('GET /api/tasks?search=bug searches across title and description', async () => {
      const res = await request(app).get('/api/tasks?search=bug');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Beta urgent bug');
    });

    it('GET /api/tasks?status=completed filters by status', async () => {
      const res = await request(app).get('/api/tasks?status=completed');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Gamma review');
    });

    it('GET /api/tasks?priority=urgent filters by priority', async () => {
      const res = await request(app).get('/api/tasks?priority=urgent');
      assert.equal(res.status, 200);
      assert.equal(res.body.length, 1);
      assert.equal(res.body[0].title, 'Beta urgent bug');
    });

    it('GET /api/tasks/:id returns single task', async () => {
      const tasks = db.getAllTasks();
      const firstId = tasks[tasks.length - 1].id;
      const res = await request(app).get(`/api/tasks/${firstId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.id, firstId);
      assert.equal(res.body.title, 'Alpha task');
    });

    it('GET /api/tasks/:id returns 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/tasks/9999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Task not found');
    });
  });

  describe('Task Update, Toggle & Delete', () => {
    let taskId;

    beforeEach(() => {
      const task = db.createTask({ title: 'Original task', priority: 'medium', status: 'pending' });
      taskId = task.id;
    });

    it('PUT /api/tasks/:id updates task fields', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          title: 'Updated title',
          priority: 'high',
          status: 'in_progress'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.title, 'Updated title');
      assert.equal(res.body.priority, 'high');
      assert.equal(res.body.status, 'in_progress');
    });

    it('PATCH /api/tasks/:id/toggle toggles task completion', async () => {
      const res1 = await request(app).patch(`/api/tasks/${taskId}/toggle`);
      assert.equal(res1.status, 200);
      assert.equal(res1.body.status, 'completed');
      assert.ok(res1.body.completed_at);

      const res2 = await request(app).patch(`/api/tasks/${taskId}/toggle`);
      assert.equal(res2.status, 200);
      assert.equal(res2.body.status, 'pending');
      assert.equal(res2.body.completed_at, null);
    });

    it('DELETE /api/tasks/:id removes task', async () => {
      const res = await request(app).delete(`/api/tasks/${taskId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Task deleted successfully');

      const fetchRes = await request(app).get(`/api/tasks/${taskId}`);
      assert.equal(fetchRes.status, 404);
    });

    it('DELETE /api/tasks/:id returns 404 for missing task', async () => {
      const res = await request(app).delete('/api/tasks/99999');
      assert.equal(res.status, 404);
    });
  });

  describe('Dashboard Statistics', () => {
    beforeEach(() => {
      db.createTask({ title: 'Task 1', priority: 'low', status: 'completed' });
      db.createTask({ title: 'Task 2', priority: 'medium', status: 'completed' });
      db.createTask({ title: 'Task 3', priority: 'high', status: 'in_progress' });
      db.createTask({ title: 'Task 4', priority: 'urgent', status: 'pending' });
    });

    it('GET /api/stats calculates accurate statistics and percentage', async () => {
      const res = await request(app).get('/api/stats');
      assert.equal(res.status, 200);
      assert.equal(res.body.total, 4);
      assert.equal(res.body.completed, 2);
      assert.equal(res.body.in_progress, 1);
      assert.equal(res.body.pending, 1);
      assert.equal(res.body.high_priority, 2);
      assert.equal(res.body.completion_percentage, 50);
    });
  });
});
