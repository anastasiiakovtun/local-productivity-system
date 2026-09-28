import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { createMainWindowOptions } from './main/window-options.js';
import { registerVaultSelectionHandler } from './main/vault-selection-handler.js';
import { validateVault } from './main/vault-validator.js';
import { registerVaultIoHandlers } from './main/vault-io-handlers.js';
import { guardPath } from './main/vault-paths.js';
import { readNote } from './main/note-reader.js';
import { writeSection } from './main/section-writer.js';

app.enableSandbox();

let mainWindow = null;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

let vaultRoot = null;

// Wraps validateVault so main.js can capture the canonical path on a successful selection.
function trackingValidateVault(candidatePath) {
  return validateVault(candidatePath).then((result) => {
    if (result.status === 'selected') vaultRoot = result.path;
    return result;
  });
}

app.whenReady().then(() => {
  registerVaultSelectionHandler({
    ipcMain,
    dialog,
    getMainWindow: () => mainWindow,
    validateVault: trackingValidateVault,
  });
  registerVaultIoHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    getVaultRoot: () => vaultRoot,
    guardPath,
    readNote,
    writeSection,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
