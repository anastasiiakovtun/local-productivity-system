import { describe, expect, it, vi } from 'vitest';
import { createVaultSelectionHandler } from '../../src/main/vault-selection-handler.js';

function setup(overrides = {}) {
  const mainFrame = {};
  const webContents = { mainFrame };
  const mainWindow = { webContents };
  const dialog = {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/vault'] }),
  };
  const validateVault = vi.fn().mockResolvedValue({ status: 'selected', path: '/vault' });
  const logger = { error: vi.fn() };
  const dependencies = {
    dialog,
    getMainWindow: () => mainWindow,
    validateVault,
    logger,
    ...overrides,
  };
  return {
    handler: createVaultSelectionHandler(dependencies),
    event: { sender: webContents, senderFrame: mainFrame },
    dialog,
    validateVault,
    logger,
    mainWindow,
  };
}

describe('createVaultSelectionHandler', () => {
  it('returns cancelled without validating a path', async () => {
    const context = setup({
      dialog: { showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }) },
    });

    await expect(context.handler(context.event)).resolves.toEqual({ status: 'cancelled' });
    expect(context.validateVault).not.toHaveBeenCalled();
  });

  it('validates one selected directory', async () => {
    const context = setup();

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'selected',
      path: '/vault',
    });
    expect(context.dialog.showOpenDialog).toHaveBeenCalledWith(context.mainWindow, {
      title: 'Choose test Obsidian Vault',
      properties: ['openDirectory'],
    });
    expect(context.validateVault).toHaveBeenCalledWith('/vault');
  });

  it('rejects multiple selected paths', async () => {
    const context = setup({
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/one', '/two'] }),
      },
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.validateVault).not.toHaveBeenCalled();
  });

  it('rejects a different webContents before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler({ sender: {}, senderFrame: context.event.senderFrame })).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('rejects a child frame before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler({ sender: context.event.sender, senderFrame: {} })).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('rejects extra arguments before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler(context.event, '/arbitrary/path')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('sanitizes internal failures', async () => {
    const failure = new Error('private path details');
    const context = setup({
      dialog: { showOpenDialog: vi.fn().mockRejectedValue(failure) },
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.logger.error).toHaveBeenCalledWith('Vault selection failed', failure);
  });

  it('sanitizes malformed validator output', async () => {
    const context = setup({
      validateVault: vi.fn().mockResolvedValue({ status: 'selected', path: '/vault', leak: true }),
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });
});
