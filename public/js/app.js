/**
 * TaskFlow Frontend Application
 * Vanilla JavaScript state management, API integration, and interactive UI
 */

(function () {
  'use strict';

  // State
  const state = {
    tasks: [],
    stats: {
      total: 0,
      completed: 0,
      in_progress: 0,
      pending: 0,
      high_priority: 0,
      overdue: 0,
      completion_percentage: 0
    },
    filters: {
      search: '',
      status: 'all',
      priority: 'all',
      sort: 'newest'
    },
    editingTaskId: null,
    deletingTaskId: null,
    isLoading: false,
    searchDebounceTimer: null
  };

  // DOM Elements
  const elements = {
    themeToggle: document.getElementById('theme-toggle'),
    connectionStatus: document.getElementById('connection-status'),
    statusLabel: document.querySelector('.status-label'),
    statusDot: document.querySelector('.status-dot'),

    // Stats
    statTotal: document.getElementById('stat-total'),
    statCompleted: document.getElementById('stat-completed'),
    statInProgress: document.getElementById('stat-inprogress'),
    statPending: document.getElementById('stat-pending'),
    statUrgent: document.getElementById('stat-urgent'),
    statProgressBar: document.getElementById('stat-progress-bar'),
    statPercentageText: document.getElementById('stat-percentage-text'),

    // Toolbar
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterPills: document.querySelectorAll('.filter-pill'),
    priorityFilter: document.getElementById('priority-filter'),
    sortSelect: document.getElementById('sort-select'),
    filterSummary: document.getElementById('filter-summary'),
    filterSummaryText: document.getElementById('filter-summary-text'),
    btnResetFilters: document.getElementById('btn-reset-filters'),

    // Task list & states
    taskList: document.getElementById('task-list'),
    loadingIndicator: document.getElementById('loading-indicator'),
    emptyState: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyDesc: document.getElementById('empty-desc'),
    emptyActionBtn: document.getElementById('empty-action-btn'),

    // Task Modal
    btnOpenCreate: document.getElementById('btn-open-create'),
    taskModal: document.getElementById('task-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalClose: document.getElementById('modal-close'),
    modalCancel: document.getElementById('modal-cancel'),
    taskForm: document.getElementById('task-form'),
    taskIdInput: document.getElementById('task-id'),
    taskTitleInput: document.getElementById('task-title'),
    taskDescInput: document.getElementById('task-description'),
    taskPriorityInput: document.getElementById('task-priority'),
    taskStatusInput: document.getElementById('task-status'),
    taskDueDateInput: document.getElementById('task-duedate'),
    titleError: document.getElementById('title-error'),
    modalSubmit: document.getElementById('modal-submit'),
    submitSpinner: document.getElementById('submit-spinner'),
    submitText: document.getElementById('submit-text'),

    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteTaskTitle: document.getElementById('delete-task-title'),
    deleteModalClose: document.getElementById('delete-modal-close'),
    deleteCancel: document.getElementById('delete-cancel'),
    deleteConfirm: document.getElementById('delete-confirm'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem('taskflow_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);

    elements.themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('theme-dark');
      const newTheme = isDark ? 'light' : 'dark';
      setTheme(newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info');
    });
  }

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }
    localStorage.setItem('taskflow_theme', theme);
  }

  // --- API Client ---
  async function apiRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        ...options
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data && data.details ? data.details.join(' ') : (data && data.error ? data.error : response.statusText);
        throw new Error(errorMsg);
      }

      setServerOnline(true);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        setServerOnline(false);
      }
      throw err;
    }
  }

  function setServerOnline(online) {
    if (online) {
      elements.statusLabel.textContent = 'Online';
      elements.statusDot.style.backgroundColor = 'var(--status-completed)';
      elements.statusDot.style.boxShadow = '0 0 6px var(--status-completed)';
    } else {
      elements.statusLabel.textContent = 'Offline';
      elements.statusDot.style.backgroundColor = 'var(--danger)';
      elements.statusDot.style.boxShadow = '0 0 6px var(--danger)';
    }
  }

  // --- Data Fetching ---
  async function loadTasks() {
    elements.loadingIndicator.classList.remove('hidden');
    elements.taskList.classList.add('hidden');
    elements.emptyState.classList.add('hidden');

    try {
      const params = new URLSearchParams();
      if (state.filters.search) params.append('search', state.filters.search);
      if (state.filters.status !== 'all') params.append('status', state.filters.status);
      if (state.filters.priority !== 'all') params.append('priority', state.filters.priority);
      if (state.filters.sort) params.append('sort', state.filters.sort);

      const tasks = await apiRequest(`/api/tasks?${params.toString()}`);
      state.tasks = tasks;
      renderTasks();
      updateFilterSummary();
    } catch (err) {
      showToast(`Error loading tasks: ${err.message}`, 'error');
    } finally {
      elements.loadingIndicator.classList.add('hidden');
    }
  }

  async function loadStats() {
    try {
      const stats = await apiRequest('/api/stats');
      state.stats = stats;
      renderStats();
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // --- Rendering ---
  function renderStats() {
    const s = state.stats;
    elements.statTotal.textContent = s.total;
    elements.statCompleted.textContent = s.completed;
    elements.statInProgress.textContent = s.in_progress;
    elements.statPending.textContent = s.pending;
    elements.statUrgent.textContent = s.high_priority;

    elements.statProgressBar.style.width = `${s.completion_percentage}%`;
    elements.statPercentageText.textContent = `${s.completion_percentage}% completed`;
  }

  function renderTasks() {
    elements.taskList.innerHTML = '';

    if (state.tasks.length === 0) {
      elements.taskList.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');

      const isFiltered = state.filters.search || state.filters.status !== 'all' || state.filters.priority !== 'all';
      if (isFiltered) {
        elements.emptyTitle.textContent = 'No matching tasks found';
        elements.emptyDesc.textContent = 'Try adjusting your search query, priority, or status filters.';
        elements.emptyActionBtn.innerHTML = '<span>Clear All Filters</span>';
        elements.emptyActionBtn.onclick = resetFilters;
      } else {
        elements.emptyTitle.textContent = 'No tasks yet';
        elements.emptyDesc.textContent = 'Stay organized and boost productivity by creating your first task.';
        elements.emptyActionBtn.innerHTML = '<span>+ Create New Task</span>';
        elements.emptyActionBtn.onclick = () => openTaskModal();
      }
      return;
    }

    elements.emptyState.classList.add('hidden');
    elements.taskList.classList.remove('hidden');

    state.tasks.forEach(task => {
      const card = createTaskCardElement(task);
      elements.taskList.appendChild(card);
    });
  }

  function createTaskCardElement(task) {
    const card = document.createElement('article');
    card.className = `task-card ${task.status === 'completed' ? 'is-completed' : ''}`;
    card.setAttribute('data-id', task.id);
    card.setAttribute('data-priority', task.priority);
    card.setAttribute('role', 'listitem');

    // Due date calculations
    let dueDateHtml = '';
    if (task.due_date) {
      const dueDate = new Date(task.due_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isPast = dueDate < today && task.status !== 'completed';
      const isToday = dueDate.getTime() === today.getTime() && task.status !== 'completed';

      let dueClass = '';
      if (isPast) dueClass = 'is-overdue';
      else if (isToday) dueClass = 'is-today';

      const formatted = dueDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: dueDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });

      dueDateHtml = `
        <span class="due-badge ${dueClass}" title="${isPast ? 'Overdue!' : isToday ? 'Due today!' : 'Due date'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${isPast ? 'Overdue: ' : ''}${formatted}</span>
        </span>
      `;
    }

    const priorityLabels = {
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };

    const statusLabels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed'
    };

    card.innerHTML = `
      <button class="task-checkbox-btn" aria-label="${task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}" title="${task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}">
        <div class="checkbox-custom">
          <svg class="checkbox-icon" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </button>

      <div class="task-content">
        <div class="task-title-row">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-actions">
            <button class="btn-card-action btn-edit" title="Edit task" aria-label="Edit task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-card-action btn-delete" title="Delete task" aria-label="Delete task">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>

        ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}

        <div class="task-meta">
          <span class="badge badge-${task.priority}">
            ${priorityLabels[task.priority] || task.priority}
          </span>
          <span class="badge badge-${task.status}">
            ${statusLabels[task.status] || task.status}
          </span>
          ${dueDateHtml}
        </div>
      </div>
    `;

    // Bind Event Listeners
    const checkboxBtn = card.querySelector('.task-checkbox-btn');
    checkboxBtn.addEventListener('click', () => handleToggleTask(task.id));

    const editBtn = card.querySelector('.btn-edit');
    editBtn.addEventListener('click', () => openTaskModal(task));

    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', () => openDeleteModal(task));

    return card;
  }

  function updateFilterSummary() {
    const activeFilters = [];
    if (state.filters.search) {
      activeFilters.push(`Search: "${state.filters.search}"`);
    }
    if (state.filters.status !== 'all') {
      activeFilters.push(`Status: ${state.filters.status.replace('_', ' ')}`);
    }
    if (state.filters.priority !== 'all') {
      activeFilters.push(`Priority: ${state.filters.priority}`);
    }

    if (activeFilters.length > 0) {
      elements.filterSummaryText.textContent = `Showing ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'} (${activeFilters.join(', ')})`;
      elements.filterSummary.classList.remove('hidden');
    } else {
      elements.filterSummary.classList.add('hidden');
    }
  }

  function resetFilters() {
    state.filters.search = '';
    state.filters.status = 'all';
    state.filters.priority = 'all';
    state.filters.sort = 'newest';

    elements.searchInput.value = '';
    elements.searchClear.classList.add('hidden');
    elements.priorityFilter.value = 'all';
    elements.sortSelect.value = 'newest';

    elements.filterPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.status === 'all');
      pill.setAttribute('aria-selected', pill.dataset.status === 'all' ? 'true' : 'false');
    });

    loadTasks();
  }

  // --- Task Actions ---
  async function handleToggleTask(id) {
    try {
      const updated = await apiRequest(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
      showToast(
        updated.status === 'completed' ? 'Task completed! 🎉' : 'Task marked pending.',
        'success'
      );
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err) {
      showToast(`Failed to update task: ${err.message}`, 'error');
    }
  }

  // --- Modal Management ---
  function openTaskModal(task = null) {
    clearFormErrors();
    if (task) {
      state.editingTaskId = task.id;
      elements.modalTitle.textContent = 'Edit Task';
      elements.submitText.textContent = 'Update Task';
      elements.taskIdInput.value = task.id;
      elements.taskTitleInput.value = task.title;
      elements.taskDescInput.value = task.description || '';
      elements.taskPriorityInput.value = task.priority;
      elements.taskStatusInput.value = task.status;
      elements.taskDueDateInput.value = task.due_date ? task.due_date.substring(0, 10) : '';
    } else {
      state.editingTaskId = null;
      elements.modalTitle.textContent = 'Create New Task';
      elements.submitText.textContent = 'Create Task';
      elements.taskForm.reset();
      elements.taskIdInput.value = '';
      elements.taskPriorityInput.value = 'medium';
      elements.taskStatusInput.value = 'pending';
    }

    elements.taskModal.classList.remove('hidden');
    elements.taskTitleInput.focus();
    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeTaskModal() {
    elements.taskModal.classList.add('hidden');
    state.editingTaskId = null;
    clearFormErrors();
    document.removeEventListener('keydown', handleModalKeydown);
  }

  function openDeleteModal(task) {
    state.deletingTaskId = task.id;
    elements.deleteTaskTitle.textContent = `"${task.title}"`;
    elements.deleteModal.classList.remove('hidden');
    elements.deleteConfirm.focus();
    document.addEventListener('keydown', handleDeleteModalKeydown);
  }

  function closeDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    state.deletingTaskId = null;
    document.removeEventListener('keydown', handleDeleteModalKeydown);
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      closeTaskModal();
    }
  }

  function handleDeleteModalKeydown(e) {
    if (e.key === 'Escape') {
      closeDeleteModal();
    }
  }

  function clearFormErrors() {
    elements.titleError.textContent = '';
  }

  // --- Form Submission ---
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const title = elements.taskTitleInput.value.trim();
    if (!title) {
      elements.titleError.textContent = 'Task title is required.';
      elements.taskTitleInput.focus();
      return;
    }

    const payload = {
      title: title,
      description: elements.taskDescInput.value.trim(),
      priority: elements.taskPriorityInput.value,
      status: elements.taskStatusInput.value,
      due_date: elements.taskDueDateInput.value || null
    };

    setSubmitLoading(true);

    try {
      if (state.editingTaskId) {
        await apiRequest(`/api/tasks/${state.editingTaskId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Task updated successfully!', 'success');
      } else {
        await apiRequest('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Task created successfully!', 'success');
      }

      closeTaskModal();
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err) {
      elements.titleError.textContent = err.message;
      showToast(err.message, 'error');
    } finally {
      setSubmitLoading(false);
    }
  }

  function setSubmitLoading(loading) {
    elements.modalSubmit.disabled = loading;
    if (loading) {
      elements.submitSpinner.classList.remove('hidden');
      elements.submitText.textContent = 'Saving...';
    } else {
      elements.submitSpinner.classList.add('hidden');
      elements.submitText.textContent = state.editingTaskId ? 'Update Task' : 'Create Task';
    }
  }

  async function handleConfirmDelete() {
    if (!state.deletingTaskId) return;

    try {
      await apiRequest(`/api/tasks/${state.deletingTaskId}`, { method: 'DELETE' });
      showToast('Task deleted successfully.', 'info');
      closeDeleteModal();
      await Promise.all([loadTasks(), loadStats()]);
    } catch (err) {
      showToast(`Failed to delete task: ${err.message}`, 'error');
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close alert">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      dismissToast(toast);
    });

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      dismissToast(toast);
    }, 4000);
  }

  function dismissToast(toast) {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 200);
    }
  }

  // --- Utility ---
  function escapeHtml(string) {
    if (!string) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return string.replace(/[&<>"']/g, m => map[m]);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Search input with debounce
    elements.searchInput.addEventListener('input', e => {
      const val = e.target.value;
      if (val) {
        elements.searchClear.classList.remove('hidden');
      } else {
        elements.searchClear.classList.add('hidden');
      }

      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        state.filters.search = val.trim();
        loadTasks();
      }, 250);
    });

    elements.searchClear.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.searchClear.classList.add('hidden');
      state.filters.search = '';
      loadTasks();
      elements.searchInput.focus();
    });

    // Status Filter Pills
    elements.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-selected', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        state.filters.status = pill.dataset.status;
        loadTasks();
      });
    });

    // Priority filter
    elements.priorityFilter.addEventListener('change', e => {
      state.filters.priority = e.target.value;
      loadTasks();
    });

    // Sort select
    elements.sortSelect.addEventListener('change', e => {
      state.filters.sort = e.target.value;
      loadTasks();
    });

    // Reset filters
    elements.btnResetFilters.addEventListener('click', resetFilters);

    // Create Modal triggers
    elements.btnOpenCreate.addEventListener('click', () => openTaskModal());
    elements.modalClose.addEventListener('click', closeTaskModal);
    elements.modalCancel.addEventListener('click', closeTaskModal);
    elements.taskModal.addEventListener('click', e => {
      if (e.target === elements.taskModal) closeTaskModal();
    });

    // Form submit
    elements.taskForm.addEventListener('submit', handleFormSubmit);

    // Delete Modal triggers
    elements.deleteModalClose.addEventListener('click', closeDeleteModal);
    elements.deleteCancel.addEventListener('click', closeDeleteModal);
    elements.deleteConfirm.addEventListener('click', handleConfirmDelete);
    elements.deleteModal.addEventListener('click', e => {
      if (e.target === elements.deleteModal) closeDeleteModal();
    });

    // Keyboard shortcut (N for new task, / to search)
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openTaskModal();
      } else if (e.key === '/') {
        e.preventDefault();
        elements.searchInput.focus();
      }
    });
  }

  // --- Initialize App ---
  function init() {
    initTheme();
    setupEventListeners();
    loadStats();
    loadTasks();
  }

  // Kickoff on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
