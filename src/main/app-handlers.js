import {
  CHANNELS,
  validateCreateTask,
  validateEditTask,
  validateListTasks,
  validatePreferences,
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

export function createAppHandlers({ getMainWindow, taskStore, db, logger = console }) {
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

  return {
    handleGetPreferences,
    handleSetPreferences,
    handleCreateTask,
    handleEditTask,
    handleCompleteTask,
    handleReopenTask,
    handleDeleteTask,
    handleListTasks,
  };
}

export function registerAppHandlers({ ipcMain, ...deps }) {
  const h = createAppHandlers(deps);
  ipcMain.handle(CHANNELS.GET_PREFERENCES,  h.handleGetPreferences);
  ipcMain.handle(CHANNELS.SET_PREFERENCES,  h.handleSetPreferences);
  ipcMain.handle(CHANNELS.TASKS_CREATE,     h.handleCreateTask);
  ipcMain.handle(CHANNELS.TASKS_EDIT,       h.handleEditTask);
  ipcMain.handle(CHANNELS.TASKS_COMPLETE,   h.handleCompleteTask);
  ipcMain.handle(CHANNELS.TASKS_REOPEN,     h.handleReopenTask);
  ipcMain.handle(CHANNELS.TASKS_DELETE,     h.handleDeleteTask);
  ipcMain.handle(CHANNELS.TASKS_LIST,       h.handleListTasks);
}
