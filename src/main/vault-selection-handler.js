import {
  parseVaultSelectionResult,
  VAULT_SELECT_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export function createVaultSelectionHandler({ dialog, getMainWindow, validateVault, logger = console }) {
  return async function selectVault(event, ...args) {
    const mainWindow = getMainWindow();
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame ||
      args.length !== 0
    ) return unexpectedError();

    try {
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose test Obsidian Vault',
        properties: ['openDirectory'],
      });

      if (selection.canceled) return { status: 'cancelled' };
      if (!Array.isArray(selection.filePaths) || selection.filePaths.length !== 1) {
        return unexpectedError();
      }

      return parseVaultSelectionResult(await validateVault(selection.filePaths[0]));
    } catch (error) {
      logger.error('Vault selection failed', error);
      return unexpectedError();
    }
  };
}

export function registerVaultSelectionHandler({ ipcMain, ...dependencies }) {
  ipcMain.handle(VAULT_SELECT_CHANNEL, createVaultSelectionHandler(dependencies));
}
