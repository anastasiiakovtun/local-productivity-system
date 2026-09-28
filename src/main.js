import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { createMainWindowOptions } from './main/window-options.js';
import { registerVaultSelectionHandler } from './main/vault-selection-handler.js';
import { validateVault } from './main/vault-validator.js';
import { registerVaultIoHandlers } from './main/vault-io-handlers.js';
import { guardPath } from './main/vault-paths.js';
import { readNote } from './main/note-reader.js';
import { writeSection } from './main/section-writer.js';
import { openDatabase } from './main/db.js';
import { TaskStore } from './main/task-store.js';
import { TaskEventStore } from './main/task-event-store.js';
import { SessionStore } from './main/session-store.js';
import { CheckpointStore } from './main/checkpoint-store.js';
import { ProjectCoverStore } from './main/project-cover-store.js';
import { registerAppHandlers } from './main/app-handlers.js';

app.enableSandbox();

let mainWindow = null;
let floatingWindow = null;

function openFloatingWindow(sessionStore) {
  if (floatingWindow && !floatingWindow.isDestroyed()) { floatingWindow.focus(); return; }
  const floatingPreloadPath = path.join(__dirname, 'preload/floating-api.js');
  floatingWindow = new BrowserWindow({
    width: 300, height: 64,
    frame: false, alwaysOnTop: true, resizable: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: floatingPreloadPath,
    },
  });
  const floatingHtmlPath = path.join(__dirname, '../floating.html');
  floatingWindow.loadFile(floatingHtmlPath);
  floatingWindow.on('closed', () => { floatingWindow = null; });

  // Register floating IPC — only accept calls from floatingWindow.webContents
  ipcMain.handle('floating:get-state', (event) => {
    if (!floatingWindow || event.sender !== floatingWindow.webContents) return null;
    const active = sessionStore.getActiveSession?.();
    if (!active) return null;
    return {
      timerState: active.status === 'paused' ? 'paused' : 'running',
      secondsRemaining: 0,
      elapsedOverflow: 0,
      taskTitle: active.task_title,
    };
  });
  ipcMain.handle('floating:pause', (event) => {
    if (!floatingWindow || event.sender !== floatingWindow.webContents) return null;
    return { ok: true };
  });
  ipcMain.handle('floating:resume', (event) => {
    if (!floatingWindow || event.sender !== floatingWindow.webContents) return null;
    return { ok: true };
  });
  ipcMain.handle('floating:focus-main', (event) => {
    if (!floatingWindow || event.sender !== floatingWindow.webContents) return null;
    mainWindow?.focus();
    return { ok: true };
  });
}

function closeFloatingWindow() {
  if (floatingWindow && !floatingWindow.isDestroyed()) floatingWindow.close();
}

function createWindow() {
  mainWindow = new BrowserWindow(
    createMainWindowOptions(path.join(__dirname, 'preload.js')),
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

let vaultRoot = null;

function trackingValidateVault(candidatePath) {
  return validateVault(candidatePath).then((result) => {
    if (result.status === 'selected') vaultRoot = result.path;
    return result;
  });
}

app.whenReady().then(() => {
  // Open SQLite in the app user-data directory
  const dbPath = path.join(app.getPath('userData'), 'focus.db');
  const db = openDatabase(dbPath);

  // Restore vault root from saved preferences on startup
  try {
    const savedVaultPath = db.prepare("SELECT value FROM preferences WHERE key = 'vaultPath'").get();
    if (savedVaultPath) {
      const parsed = JSON.parse(savedVaultPath.value);
      if (typeof parsed === 'string') {
        validateVault(parsed).then((result) => {
          if (result.status === 'selected') vaultRoot = result.path;
        });
      }
    }
  } catch { /* non-fatal */ }

  const getVaultRoot = () => vaultRoot;
  const eventStore     = new TaskEventStore(db, getVaultRoot);
  const taskStore      = new TaskStore({ db, eventStore, getVaultRoot, readNote, writeSection });
  const sessionStore   = new SessionStore(db);
  const checkpointStore = new CheckpointStore(db, getVaultRoot);
  const projectCoverStore = new ProjectCoverStore(db);

  registerVaultSelectionHandler({
    ipcMain, dialog,
    getMainWindow: () => mainWindow,
    validateVault: trackingValidateVault,
  });

  registerVaultIoHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    getVaultRoot: () => vaultRoot,
    guardPath, readNote, writeSection,
  });

  registerAppHandlers({
    ipcMain, db,
    getMainWindow: () => mainWindow,
    taskStore, sessionStore, checkpointStore, projectCoverStore,
    openFloatingWindow: () => openFloatingWindow(sessionStore),
    closeFloatingWindow,
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
