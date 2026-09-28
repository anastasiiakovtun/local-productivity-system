import {
  CHANNELS,
  validateCreateTask,
  validateEditTask,
  validateListTasks,
  validatePreferences,
  validateStartSession,
} from '../shared/app-schema.js';

const ok = (data) => ({ status: 'success', data });
const err = (reason) => ({ status: 'error', reason });
const unexpectedError = () => err('unexpected-error');

function isSenderValid(event, mainWindow) {
  return (
    mainWindow &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

export function createAppHandlers({ getMainWindow, taskStore, sessionStore, checkpointStore, db, logger = console }) {
  function guard(event) {
    if (!isSenderValid(event, getMainWindow())) return false;
    return true;
  }

  function getPrefs() {
    const rows = db.prepare('SELECT key, value FROM preferences').all();
    const prefs = {};
    for (const { key, value } of rows) {
      try { prefs[key] = JSON.parse(value); } catch { prefs[key] = value; }
    }
    return {
      vaultPath: prefs.vaultPath ?? null,
      managedFolder: prefs.managedFolder ?? 'Productivity',
      defaultFocusMinutes: prefs.defaultFocusMinutes ?? 25,
      defaultBreakMinutes: prefs.defaultBreakMinutes ?? 5,
    };
  }

  function setPrefs(prefs) {
    const upsert = db.prepare(
      'INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    const tx = db.transaction((p) => {
      for (const [key, value] of Object.entries(p)) {
        upsert.run(key, JSON.stringify(value));
      }
    });
    tx(prefs);
  }

  async function handleGetPreferences(event) {
    if (!guard(event)) return unexpectedError();
    try { return ok(getPrefs()); } catch { return unexpectedError(); }
  }

  async function handleSetPreferences(event, prefs) {
    if (!guard(event)) return unexpectedError();
    const validErr = validatePreferences(prefs);
    if (validErr) return err(validErr);
    try { setPrefs(prefs); return ok(null); } catch { return unexpectedError(); }
  }

  async function handleCreateTask(event, fields) {
    if (!guard(event)) return unexpectedError();
    const validErr = validateCreateTask(fields);
    if (validErr) return err(validErr);
    try {
      return await taskStore.createTask(fields);
    } catch (e) {
      logger.error('tasks:create failed', e);
      return unexpectedError();
    }
  }

  async function handleEditTask(event, id, changes) {
    if (!guard(event)) return unexpectedError();
    const validErr = validateEditTask(id, changes);
    if (validErr) return err(validErr);
    try {
      return await taskStore.editTask({ id, changes });
    } catch (e) {
      logger.error('tasks:edit failed', e);
      return unexpectedError();
    }
  }

  async function handleCompleteTask(event, id) {
    if (!guard(event)) return unexpectedError();
    if (typeof id !== 'string' || !id) return err('id is required');
    try { return await taskStore.completeTask({ id }); } catch { return unexpectedError(); }
  }

  async function handleReopenTask(event, id) {
    if (!guard(event)) return unexpectedError();
    if (typeof id !== 'string' || !id) return err('id is required');
    try { return await taskStore.reopenTask({ id }); } catch { return unexpectedError(); }
  }

  async function handleDeleteTask(event, id) {
    if (!guard(event)) return unexpectedError();
    if (typeof id !== 'string' || !id) return err('id is required');
    try { return await taskStore.deleteTask({ id }); } catch { return unexpectedError(); }
  }

  async function handleListTasks(event, view) {
    if (!guard(event)) return unexpectedError();
    const validErr = validateListTasks(view);
    if (validErr) return err(validErr);
    try { return ok(taskStore.listTasks({ view })); } catch { return unexpectedError(); }
  }

  async function handleStartSession(event, taskId, plannedMinutes) {
    if (!guard(event)) return unexpectedError();
    const validErr = validateStartSession(taskId, plannedMinutes);
    if (validErr) return err(validErr);
    try {
      const task = taskStore._db
        ? taskStore._db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
        : null;
      const session = sessionStore.startSession({
        taskId,
        taskTitle: task?.title ?? taskId,
        projectLabel: task?.project_label ?? null,
        plannedMinutes,
      });
      return ok(session);
    } catch (e) {
      logger.error('sessions:start failed', e);
      return unexpectedError();
    }
  }

  async function handlePauseSession(event, sessionId) {
    if (!guard(event)) return unexpectedError();
    if (typeof sessionId !== 'string' || !sessionId) return err('sessionId required');
    try { return ok(sessionStore.pauseSession(sessionId)); } catch { return unexpectedError(); }
  }

  async function handleResumeSession(event, sessionId) {
    if (!guard(event)) return unexpectedError();
    if (typeof sessionId !== 'string' || !sessionId) return err('sessionId required');
    try { return ok(sessionStore.resumeSession(sessionId)); } catch { return unexpectedError(); }
  }

  async function handleAbandonSession(event, sessionId) {
    if (!guard(event)) return unexpectedError();
    if (typeof sessionId !== 'string' || !sessionId) return err('sessionId required');
    try { return ok(sessionStore.abandonSession(sessionId)); } catch { return unexpectedError(); }
  }

  async function handleGetActiveSession(event) {
    if (!guard(event)) return unexpectedError();
    try { return ok(sessionStore.getActiveSession()); } catch { return unexpectedError(); }
  }

  async function handleGetLastCheckpoint(event, taskId) {
    if (!guard(event)) return unexpectedError();
    if (typeof taskId !== 'string' || !taskId) return err('taskId required');
    try { return ok(sessionStore.getLastCheckpointForTask(taskId)); } catch { return unexpectedError(); }
  }

  async function handleListSessions(event, filters) {
    if (!guard(event)) return unexpectedError();
    try { return ok(sessionStore.listSessions(filters ?? {})); } catch { return unexpectedError(); }
  }

  async function handleSaveCheckpoint(event, sessionId, fields) {
    if (!guard(event)) return unexpectedError();
    if (typeof sessionId !== 'string' || !sessionId) return err('sessionId required');
    if (!fields || typeof fields !== 'object') return err('fields required');
    try {
      // Compute actual/overflow from session timestamps
      const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);
      if (!session) return err('session not found');
      const startMs = new Date(session.started_occurred_at_utc).getTime();
      const actualSeconds = Math.round((Date.now() - startMs) / 1000) - (session.paused_seconds ?? 0);
      const plannedSeconds = session.planned_minutes * 60;
      const overflowSeconds = Math.max(0, actualSeconds - plannedSeconds);

      const { loggedTimestamp } = await import('./logged-timestamp.js');
      const result = await checkpointStore.saveCheckpoint({
        sessionId,
        taskId: session.task_id,
        projectLabel: session.project_label,
        outcome: fields.outcome,
        status: fields.status,
        nextAction: fields.nextAction ?? null,
        blocker: fields.blocker ?? null,
        ts: loggedTimestamp(),
        actualSeconds,
        overflowSeconds,
      });
      return result.status === 'success' ? ok(result) : result;
    } catch (e) {
      logger.error('checkpoints:save failed', e);
      return unexpectedError();
    }
  }

  return {
    handleGetPreferences,
    handleSetPreferences,
    handleCreateTask,
    handleEditTask,
    handleCompleteTask,
    handleReopenTask,
    handleDeleteTask,
    handleListTasks,
    handleStartSession,
    handlePauseSession,
    handleResumeSession,
    handleAbandonSession,
    handleGetActiveSession,
    handleGetLastCheckpoint,
    handleListSessions,
    handleSaveCheckpoint,
  };
}

export function registerAppHandlers({ ipcMain, ...deps }) {
  const h = createAppHandlers(deps);
  ipcMain.handle(CHANNELS.GET_PREFERENCES,    h.handleGetPreferences);
  ipcMain.handle(CHANNELS.SET_PREFERENCES,    h.handleSetPreferences);
  ipcMain.handle(CHANNELS.TASKS_CREATE,       h.handleCreateTask);
  ipcMain.handle(CHANNELS.TASKS_EDIT,         h.handleEditTask);
  ipcMain.handle(CHANNELS.TASKS_COMPLETE,     h.handleCompleteTask);
  ipcMain.handle(CHANNELS.TASKS_REOPEN,       h.handleReopenTask);
  ipcMain.handle(CHANNELS.TASKS_DELETE,       h.handleDeleteTask);
  ipcMain.handle(CHANNELS.TASKS_LIST,         h.handleListTasks);
  ipcMain.handle(CHANNELS.SESSIONS_START,     h.handleStartSession);
  ipcMain.handle(CHANNELS.SESSIONS_PAUSE,     h.handlePauseSession);
  ipcMain.handle(CHANNELS.SESSIONS_RESUME,    h.handleResumeSession);
  ipcMain.handle(CHANNELS.SESSIONS_ABANDON,   h.handleAbandonSession);
  ipcMain.handle('sessions:get-active',       h.handleGetActiveSession);
  ipcMain.handle('sessions:get-checkpoint',   h.handleGetLastCheckpoint);
  ipcMain.handle(CHANNELS.SESSIONS_LIST,      h.handleListSessions);
  ipcMain.handle(CHANNELS.CHECKPOINTS_SAVE,   h.handleSaveCheckpoint);
}
