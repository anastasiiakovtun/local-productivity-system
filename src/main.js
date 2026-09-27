import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { createMainWindowOptions } from './main/window-options.js';
import { registerVaultSelectionHandler } from './main/vault-selection-handler.js';
import { validateVault } from './main/vault-validator.js';

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

app.whenReady().then(() => {
  registerVaultSelectionHandler({
    ipcMain,
    dialog,
    getMainWindow: () => mainWindow,
    validateVault,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
