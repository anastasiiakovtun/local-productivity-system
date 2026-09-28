import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { createAppHandlers } from '../../src/main/app-handlers.js';
import { SessionStore } from '../../src/main/session-store.js';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
  const projectCoverStore = {
    getHomeResume: vi.fn().mockReturnValue(null),
    listProjects: vi.fn().mockReturnValue([]),
    setCover: vi.fn(),
  };

  const handlers = createAppHandlers({
    getMainWindow: () => mainWindow,
    taskStore,
    projectCoverStore,
    db,
    logger: { error: vi.fn() },
  });

  const validEvent = {
    sender: mainWindow.webContents,
    senderFrame: mainWindow.webContents.mainFrame,
  };
  const badEvent = { sender: {}, senderFrame: {} };

  return { handlers, taskStore, projectCoverStore, db, validEvent, badEvent };
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
    expect(result.data.sidebarCollapsed).toBe(false);
    expect(result.data.floatingTimerEnabled).toBe(false);
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
    const result = await handlers.handleListTasks(validEvent, 'nonexistent-view');
    expect(result.status).toBe('error');
  });

  it('handles trash view', async () => {
    const { handlers, taskStore, validEvent } = setup();
    await handlers.handleListTasks(validEvent, 'trash');
    expect(taskStore.listTasks).toHaveBeenCalledWith({ view: 'trash' });
  });

  it('handles upcoming view', async () => {
    const { handlers, taskStore, validEvent } = setup();
    await handlers.handleListTasks(validEvent, 'upcoming');
    expect(taskStore.listTasks).toHaveBeenCalledWith({ view: 'upcoming' });
  });
});

describe('Home and project cover handlers', () => {
  it('returns Home resume data and project list', async () => {
    const { handlers, projectCoverStore, validEvent } = setup();
    projectCoverStore.getHomeResume.mockReturnValue({ id: '^task-1' });
    projectCoverStore.listProjects.mockReturnValue([{ label: 'Thesis', color: null }]);
    expect((await handlers.handleGetHomeResume(validEvent)).data).toEqual({ id: '^task-1' });
    expect((await handlers.handleListProjects(validEvent)).data).toEqual([{ label: 'Thesis', color: null }]);
  });

  it('validates project labels and palette colors before persisting', async () => {
    const { handlers, projectCoverStore, validEvent } = setup();
    const invalidLabel = await handlers.handleSetProjectCover(validEvent, '', '#2dd4bf');
    const invalidColor = await handlers.handleSetProjectCover(validEvent, 'Thesis', '#ffffff');
    expect(invalidLabel).toEqual({ status: 'error', reason: 'projectLabel is required' });
    expect(invalidColor).toEqual({ status: 'error', reason: 'invalid project cover color' });
    expect(projectCoverStore.setCover).not.toHaveBeenCalled();
  });
});

describe('handleAbandonSession — Focus Log', () => {
  it('writes an abandoned entry to Focus Log Markdown when abandon succeeds', async () => {
    let vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-abandon-'));
    try {
      const db = openDatabase(':memory:');
      const mainWindow = makeWindow();
      const sessionStore = new SessionStore(db);
      const { CheckpointStore } = await import('../../src/main/checkpoint-store.js');
      const checkpointStore = new CheckpointStore(db, () => vaultRoot);

      const taskStore = {
        _db: db,
        createTask: vi.fn(),
        editTask: vi.fn(),
        completeTask: vi.fn(),
        reopenTask: vi.fn(),
        deleteTask: vi.fn(),
        listTasks: vi.fn().mockReturnValue([]),
      };

      const handlers = createAppHandlers({
        getMainWindow: () => mainWindow,
        taskStore, sessionStore, checkpointStore, db,
        logger: { error: vi.fn() },
      });

      const validEvent = { sender: mainWindow.webContents, senderFrame: mainWindow.webContents.mainFrame };

      // Create a task row so start-session can look it up
      db.prepare(`INSERT INTO tasks (id, title, status, project_label, start_date, due_date, estimate_minutes,
        created_local_date, created_local_time, created_utc_offset, created_timezone, created_occurred_at_utc,
        updated_local_date, updated_local_time, updated_utc_offset, updated_timezone, updated_occurred_at_utc)
        VALUES ('^task-abc', 'Write essay', 'open', 'Thesis', NULL, NULL, NULL,
        '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z',
        '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z')`).run();

      const startResult = await handlers.handleStartSession(validEvent, '^task-abc', 25);
      expect(startResult.status).toBe('success');
      const sessionId = startResult.data.session_id;

      const abandonResult = await handlers.handleAbandonSession(validEvent, sessionId);
      expect(abandonResult.status).toBe('success');

      const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
      const content = await readFile(logPath, 'utf8');
      expect(content).toContain('abandoned');
      expect(content).toContain('Write essay');
    } finally {
      await rm(vaultRoot, { recursive: true, force: true });
    }
  });

  it('handleAbandonSession remains queryable in session history after abandon', async () => {
    let vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-abandon2-'));
    try {
      const db = openDatabase(':memory:');
      const mainWindow = makeWindow();
      const sessionStore = new SessionStore(db);
      const { CheckpointStore } = await import('../../src/main/checkpoint-store.js');
      const checkpointStore = new CheckpointStore(db, () => vaultRoot);
      const taskStore = { _db: db, createTask: vi.fn(), editTask: vi.fn(), completeTask: vi.fn(), reopenTask: vi.fn(), deleteTask: vi.fn(), listTasks: vi.fn().mockReturnValue([]) };
      const handlers = createAppHandlers({ getMainWindow: () => mainWindow, taskStore, sessionStore, checkpointStore, db, logger: { error: vi.fn() } });
      const validEvent = { sender: mainWindow.webContents, senderFrame: mainWindow.webContents.mainFrame };

      db.prepare(`INSERT INTO tasks (id, title, status, project_label, start_date, due_date, estimate_minutes, created_local_date, created_local_time, created_utc_offset, created_timezone, created_occurred_at_utc, updated_local_date, updated_local_time, updated_utc_offset, updated_timezone, updated_occurred_at_utc) VALUES ('^task-abc', 'Write essay', 'open', null, NULL, NULL, NULL, '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z', '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z')`).run();
      const startResult = await handlers.handleStartSession(validEvent, '^task-abc', 25);
      await handlers.handleAbandonSession(validEvent, startResult.data.session_id);

      const list = await handlers.handleListSessions(validEvent, {});
      expect(list.status).toBe('success');
      expect(list.data.some(s => s.status === 'abandoned')).toBe(true);
    } finally {
      await rm(vaultRoot, { recursive: true, force: true });
    }
  });

  it('passes outcome string to writeAbandonLog', async () => {
    let vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-abandon3-'));
    try {
      const db = openDatabase(':memory:');
      const mainWindow = makeWindow();
      const sessionStore = new SessionStore(db);
      const { CheckpointStore } = await import('../../src/main/checkpoint-store.js');
      const checkpointStore = new CheckpointStore(db, () => vaultRoot);
      const taskStore = { _db: db, createTask: vi.fn(), editTask: vi.fn(), completeTask: vi.fn(), reopenTask: vi.fn(), deleteTask: vi.fn(), listTasks: vi.fn().mockReturnValue([]) };
      const handlers = createAppHandlers({ getMainWindow: () => mainWindow, taskStore, sessionStore, checkpointStore, db, logger: { error: vi.fn() } });
      const validEvent = { sender: mainWindow.webContents, senderFrame: mainWindow.webContents.mainFrame };

      db.prepare(`INSERT INTO tasks (id, title, status, project_label, start_date, due_date, estimate_minutes, created_local_date, created_local_time, created_utc_offset, created_timezone, created_occurred_at_utc, updated_local_date, updated_local_time, updated_utc_offset, updated_timezone, updated_occurred_at_utc) VALUES ('^task-abc', 'Write essay', 'open', null, NULL, NULL, NULL, '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z', '2026-09-28', '10:00:00', '+02:00', 'Europe/Berlin', '2026-09-28T08:00:00Z')`).run();
      const startResult = await handlers.handleStartSession(validEvent, '^task-abc', 25);
      const sessionId = startResult.data.session_id;

      await handlers.handleAbandonSession(validEvent, sessionId, 'Ran out of time.');

      const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
      const content = await readFile(logPath, 'utf8');
      expect(content).toContain('abandoned');
      expect(content).toContain('Ran out of time.');
    } finally {
      await rm(vaultRoot, { recursive: true, force: true });
    }
  });
});
