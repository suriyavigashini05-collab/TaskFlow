# TaskFlow

> A modern, responsive, and persistent task management application built with **Node.js 24**, **Express**, and **SQLite**.

TaskFlow is designed for speed, clarity, and reliability. It combines an accessible, modern vanilla JavaScript/CSS3 frontend with an Express and SQLite backend, providing real-time search, priority management, dashboard analytics, and persistence across restarts without external database servers or cloud dependencies.

---

## Features

- **Full Task Lifecycle (CRUD)**: Create, view, update, toggle completion, and delete tasks.
- **Priority Classification**: Categorize tasks into `Low`, `Medium`, `High`, and `Urgent` with color-coded badges.
- **Instant Search & Dynamic Filters**: Debounced full-text search across titles and descriptions; filter by status (`Pending`, `In Progress`, `Completed`) and priority.
- **Live Dashboard Analytics**: Real-time metrics tracking total tasks, completion percentage, in-progress tasks, pending tasks, urgent tasks, and overdue indicators.
- **SQLite Persistence**: Data is automatically persisted to disk (`data/taskflow.db`) and preserved across server restarts.
- **Polished, Accessible UI**:
  - Dark & Light mode toggle with persistent preference (`localStorage` and system theme detection).
  - Glassmorphic card design with subtle gradients and micro-animations.
  - Accessible keyboard shortcuts (`N` for new task, `/` to focus search, `Esc` to close modals).
  - Empty states with action triggers, loading spinners, and toast notifications.
- **DevOps Ready**:
  - `/health` endpoint for uptime monitoring and database connectivity verification.
  - Automated API test suite and database persistence test suite.
  - Production-ready `Dockerfile` and `docker-compose.yml` with named persistent volume.
  - GitHub Actions CI workflow for test execution and container build verification.

---

## Technology Stack

- **Runtime**: [Node.js 24](https://nodejs.org/)
- **Backend Framework**: [Express 4](https://expressjs.com/)
- **Database**: SQLite (Node.js built-in `node:sqlite` `DatabaseSync`)
- **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Variables), and Vanilla JavaScript (ES6+)
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert/strict`) & [Supertest](https://github.com/ladjs/supertest)
- **Containerization**: Docker (Multi-stage `node:24-alpine`) & Docker Compose

---

## Project Structure

```
TaskFlow/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow
├── data/                      # SQLite runtime database directory (excluded from git/zip)
│   └── .gitkeep
├── public/                    # Frontend static assets
│   ├── css/
│   │   └── styles.css         # Responsive styling, design tokens, light/dark themes
│   ├── js/
│   │   └── app.js             # Vanilla JS state, API client, modal and toast logic
│   ├── favicon.svg            # TaskFlow SVG brand icon
│   └── index.html             # Accessible single-page application layout
├── src/
│   ├── config.js              # Application configuration (PORT, HOST, DB_PATH)
│   ├── db.js                  # SQLite database connection, migrations, query helpers
│   ├── server.js              # Express app setup, routing, and graceful shutdown
│   ├── middleware/
│   │   ├── errorHandler.js    # Standardized JSON error response handler
│   │   └── validator.js       # Request validation for tasks
│   └── routes/
│       ├── health.js          # Health check endpoint (/health)
│       ├── stats.js           # Dashboard statistics endpoint (/api/stats)
│       └── tasks.js           # Task CRUD and toggle endpoints (/api/tasks)
├── tests/
│   ├── api.test.js            # Automated API and static asset tests
│   └── persistence.test.js    # Dedicated database persistence test
├── .dockerignore
├── .gitignore
├── docker-compose.yml         # Local container orchestration with persistent volume
├── Dockerfile                 # Multi-stage production container
├── package.json               # Project manifest and scripts
├── package-lock.json          # Dependency lockfile
└── README.md                  # Documentation and setup guide
```

---

## Getting Started on Windows (Local Setup)

### Prerequisites

- **Node.js**: Version 22.5.0 or 24.x+ installed ([Download Node.js](https://nodejs.org/))
- **npm**: Version 10.x or 11.x+ (comes bundled with Node.js)
- *Note: Docker, AWS, or external database engines are NOT required for local execution.*

### 1. Clone or Open the Project

Open PowerShell or Command Prompt and navigate to the project root:

```powershell
cd d:\TaskFlow
```

### 2. Install Dependencies

Install the lightweight project dependencies:

```powershell
npm install
```

### 3. Run the Automated Tests

Execute the comprehensive test suite (API tests, validation tests, and persistence tests):

```powershell
npm test
```

### 4. Start the Application

Start the production server:

```powershell
npm start
```

Or start the server in development mode with auto-reloading:

```powershell
npm run dev
```

The application will bind to `localhost` by default:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## Docker Setup (Optional)

Docker is completely optional. If you have Docker Desktop installed, you can build and run TaskFlow in a container with persistent database volume.

### Using Docker Compose (Recommended)

```bash
docker compose up -d
```

This starts the container and mounts a persistent Docker volume (`taskflow_data`) to `/data` so your tasks persist across container recreation.

To stop the container:

```bash
docker compose down
```

### Using the Docker CLI Directly

1. Build the Docker image:
   ```bash
   docker build -t taskflow:latest .
   ```

2. Run the container with a persistent volume:
   ```bash
   docker volume create taskflow_data
   docker run -d -p 3000:3000 -v taskflow_data:/data --name taskflow-app taskflow:latest
   ```

---

## REST API Reference

### 1. Health Check

- **`GET /health`**
  - Returns service status, uptime, and database connectivity.
  - **Response `200 OK`**:
    ```json
    {
      "status": "ok",
      "uptime": 12.45,
      "timestamp": "2026-09-16T11:10:00.000Z",
      "database": {
        "status": "connected",
        "totalTasks": 5
      },
      "environment": "development",
      "nodeVersion": "v24.13.0"
    }
    ```

### 2. Dashboard Statistics

- **`GET /api/stats`**
  - Returns calculated task metrics.
  - **Response `200 OK`**:
    ```json
    {
      "total": 10,
      "completed": 6,
      "in_progress": 2,
      "pending": 2,
      "high_priority": 3,
      "overdue": 1,
      "completion_percentage": 60
    }
    ```

### 3. Tasks

- **`GET /api/tasks`**
  - Query parameters:
    - `search`: Filter by keyword in title or description.
    - `status`: Filter by `all`, `pending`, `in_progress`, or `completed`.
    - `priority`: Filter by `all`, `low`, `medium`, `high`, or `urgent`.
    - `sort`: Sort order (`newest`, `oldest`, `due_date`, `priority`, `title`).
  - **Response `200 OK`**: Array of task objects.

- **`POST /api/tasks`**
  - Create a new task.
  - **Request Body**:
    ```json
    {
      "title": "Build release candidate",
      "description": "Prepare production bundle and verify checklists",
      "priority": "urgent",
      "status": "in_progress",
      "due_date": "2026-10-01"
    }
    ```
  - **Response `201 Created`**: The created task object.

- **`GET /api/tasks/:id`**
  - Retrieve details for a single task.
  - **Response `200 OK`** or **`404 Not Found`**.

- **`PUT /api/tasks/:id`**
  - Update an existing task.
  - **Request Body**: Any combination of `title`, `description`, `priority`, `status`, `due_date`.
  - **Response `200 OK`** or **`404 Not Found`**.

- **`PATCH /api/tasks/:id/toggle`**
  - Quick toggle between `completed` and `pending`.
  - **Response `200 OK`** or **`404 Not Found`**.

- **`DELETE /api/tasks/:id`**
  - Permanently remove a task.
  - **Response `200 OK`**: `{ "message": "Task deleted successfully", "id": 1 }`.

---

## Environment Variables

| Variable   | Default Value            | Description                                  |
|------------|--------------------------|----------------------------------------------|
| `PORT`     | `3000`                   | Port number on which the server listens      |
| `HOST`     | `localhost`              | Host address (`0.0.0.0` in Docker)           |
| `DB_PATH`  | `./data/taskflow.db`     | File path for the persistent SQLite database |
| `NODE_ENV` | `development`            | Environment mode (`development`/`production`)|

---

## Verification & Testing

To run the automated test suite at any time:

```powershell
npm test
```

All 21 test cases (unit, API integration, static assets, and persistent SQLite restart simulations) execute in under 1 second.
