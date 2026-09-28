import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { createAppHandlers } from '../../src/main/app-handlers.js';

function makeWindow() {
  const mainFrame = {};
  const webContents = { mainFrame };
  return { webContents };
}

function setup() {
  const db = openDatabase(':memory:');
  const mainWindow = makeWindow();
  const taskStore = {
    createTask: vi.fn().mockResolvedValue({ status: 'success', task: {} }),
    editTask: vi.fn().mockResolvedValue({ status: 'success', task: {} }),
    completeTask: vi.fn().mockResolvedValue({ status: 'success' }),
    reopenTask: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteTask: vi.fn().mockResolvedValue({ status: 'success' }),
    listTasks: vi.fn().mockReturnValue([]),
  };

  const handlers = createAppHandlers({
    getMainWindow: () => mainWindow,
    taskStore,
    db,
    logger: { error: vi.fn() },
  });

  const validEvent = {
    sender: mainWindow.webContents,
    senderFrame: mainWindow.webContents.mainFrame,
  };
  const badEvent = { sender: {}, senderFrame: {} };

  return { handlers, taskStore, db, validEvent, badEvent };
}

describe('app-handlers sender guard', () => {
  it('rejects requests from wrong webContents', async () => {
    const { handlers, badEvent } = setup();
    const result = await handlers.handleCreateTask(badEvent, { title: 'x' });
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
  });
});

describe('handleGetPreferences', () => {
  it('returns default preferences when table is empty', async () => {
    const { handlers, validEvent } = setup();
    const result = await handlers.handleGetPreferences(validEvent);
    expect(result.status).toBe('success');
    expect(result.data.defaultFocusMinutes).toBe(25);
    expect(result.data.defaultBreakMinutes).toBe(5);
  });
});

describe('handleSetPreferences + handleGetPreferences round-trip', () => {
  it('stores and retrieves preferences', async () => {
    const { handlers, validEvent } = setup();
    await handlers.handleSetPreferences(validEvent, { vaultPath: '/my/vault' });
    const result = await handlers.handleGetPreferences(validEvent);
    expect(result.data.vaultPath).toBe('/my/vault');
  });
});

describe('handleCreateTask', () => {
  it('calls taskStore.createTask with the fields', async () => {
    const { handlers, taskStore, validEvent } = setup();
    await handlers.handleCreateTask(validEvent, { title: 'Do a thing' });
    expect(taskStore.createTask).toHaveBeenCalledWith({ title: 'Do a thing' });
  });

  it('returns error when title is missing', async () => {
    const { handlers, taskStore, validEvent } = setup();
    const result = await handlers.handleCreateTask(validEvent, { title: '' });
    expect(result.status).toBe('error');
    expect(taskStore.createTask).not.toHaveBeenCalled();
  });
});

describe('handleDeleteTask', () => {
  it('calls taskStore.deleteTask', async () => {
    const { handlers, taskStore, validEvent } = setup();
    await handlers.handleDeleteTask(validEvent, '^task-abc123');
    expect(taskStore.deleteTask).toHaveBeenCalledWith({ id: '^task-abc123' });
  });
});

describe('handleListTasks', () => {
  it('calls taskStore.listTasks with the view', async () => {
    const { handlers, taskStore, validEvent } = setup();
    const result = await handlers.handleListTasks(validEvent, 'inbox');
    expect(taskStore.listTasks).toHaveBeenCalledWith({ view: 'inbox' });
    expect(result.status).toBe('success');
  });

  it('returns error for unknown view', async () => {
    const { handlers, validEvent } = setup();
    const result = await handlers.handleListTasks(validEvent, 'trash');
    expect(result.status).toBe('error');
  });
});
