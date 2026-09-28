import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { SessionStore } from '../../src/main/session-store.js';
import { CheckpointStore } from '../../src/main/checkpoint-store.js';

let db, vaultRoot, sessionStore, checkpointStore;

const fixedTs = () => ({
  local_date: '2026-09-28', local_time: '15:00:00',
  utc_offset: '+02:00', timezone: 'Europe/Berlin',
  occurred_at_utc: '2026-09-28T13:00:00Z',
});

beforeEach(async () => {
  db = openDatabase(':memory:');
  vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-cp-'));
  sessionStore = new SessionStore(db, fixedTs);
  checkpointStore = new CheckpointStore(db, () => vaultRoot);
});

afterEach(async () => {
  db.close();
  await rm(vaultRoot, { recursive: true, force: true });
});

function startSession() {
  return sessionStore.startSession({
    taskId: '^task-abc', taskTitle: 'Write essay', plannedMinutes: 25,
  });
}

const validCheckpoint = (sessionId) => ({
  sessionId,
  taskId: '^task-abc',
  outcome: 'Drafted introduction.',
  status: 'continue',
  nextAction: 'Finish methods section.',
  ts: fixedTs(),
  actualSeconds: 1680,
  overflowSeconds: 180,
});

describe('CheckpointStore.validate', () => {
  it('accepts valid fields', () => {
    expect(checkpointStore.validate({ outcome: 'Done', status: 'completed', nextAction: null })).toBeNull();
  });

  it('rejects empty outcome', () => {
    expect(checkpointStore.validate({ outcome: '', status: 'completed' })).toBeTruthy();
  });

  it('rejects invalid status', () => {
    expect(checkpointStore.validate({ outcome: 'Done', status: 'unknown' })).toBeTruthy();
  });

  it('rejects missing nextAction for continue', () => {
    expect(checkpointStore.validate({ outcome: 'Done', status: 'continue', nextAction: '' })).toBeTruthy();
  });

  it('allows missing nextAction for completed', () => {
    expect(checkpointStore.validate({ outcome: 'Done', status: 'completed', nextAction: null })).toBeNull();
  });
});

describe('CheckpointStore.saveCheckpoint', () => {
  it('inserts a checkpoint row with all required fields', async () => {
    const s = startSession();
    const r = await checkpointStore.saveCheckpoint(validCheckpoint(s.session_id));
    expect(r.status).toBe('success');
    const row = db.prepare('SELECT * FROM checkpoints WHERE checkpoint_id = ?').get(r.checkpoint_id);
    expect(row.outcome).toBe('Drafted introduction.');
    expect(row.status).toBe('continue');
    expect(row.created_timezone).toBe('Europe/Berlin');
  });

  it('marks the session as ended', async () => {
    const s = startSession();
    await checkpointStore.saveCheckpoint(validCheckpoint(s.session_id));
    const session = db.prepare('SELECT status, actual_seconds FROM sessions WHERE session_id = ?').get(s.session_id);
    expect(session.status).toBe('ended');
    expect(session.actual_seconds).toBe(1680);
  });

  it('creates Focus Logs directory and file and appends Markdown block', async () => {
    const s = startSession();
    await checkpointStore.saveCheckpoint(validCheckpoint(s.session_id));
    const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('continue');
    expect(content).toContain('Drafted introduction.');
    expect(content).toContain('Finish methods section.');
  });

  it('writes every required completed-session event field', async () => {
    const s = startSession();
    await checkpointStore.saveCheckpoint(validCheckpoint(s.session_id));
    const content = await readFile(
      path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md'),
      'utf8',
    );
    expect(content).toContain('**Date:** 2026-09-28');
    expect(content).toContain('**Time:** 15:00:00');
    expect(content).toContain('**UTC offset:** +02:00');
    expect(content).toContain('**Timezone:** Europe/Berlin');
    expect(content).toContain('**Event:** session_completed');
    expect(content).toContain('**Status:** continue');
    expect(content).toContain('**Task:** Write essay (`^task-abc`)');
  });

  it('returns validation error for empty outcome', async () => {
    const s = startSession();
    const r = await checkpointStore.saveCheckpoint({ ...validCheckpoint(s.session_id), outcome: '' });
    expect(r.status).toBe('error');
  });

  it('returns validation error for missing nextAction when continue', async () => {
    const s = startSession();
    const r = await checkpointStore.saveCheckpoint({ ...validCheckpoint(s.session_id), nextAction: '' });
    expect(r.status).toBe('error');
  });

  it('resolves the latest vault root before writing the Focus Log', async () => {
    const nextRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-cp-latest-'));
    let currentRoot = vaultRoot;
    checkpointStore = new CheckpointStore(db, () => currentRoot);
    const s = startSession();
    currentRoot = nextRoot;

    await checkpointStore.saveCheckpoint(validCheckpoint(s.session_id));

    const content = await readFile(
      path.join(nextRoot, 'Productivity', 'Focus Logs', 'task-abc.md'),
      'utf8',
    );
    expect(content).toContain('Drafted introduction.');
    await rm(nextRoot, { recursive: true, force: true });
  });

  it('throws a controlled error when no vault is selected', async () => {
    checkpointStore = new CheckpointStore(db, () => undefined);
    const s = startSession();
    await expect(checkpointStore.saveCheckpoint(validCheckpoint(s.session_id)))
      .rejects.toThrow('vault-not-selected');
  });
});

describe('CheckpointStore.writeAbandonLog with optional outcome', () => {
  it('appends abandoned block without outcome when outcome is null', async () => {
    const s = startSession();
    await checkpointStore.writeAbandonLog(s.session_id, null);
    const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('abandoned');
    expect(content).not.toContain('**Outcome:**');
  });

  it('appends abandoned block with outcome when non-empty outcome provided', async () => {
    const s = startSession();
    await checkpointStore.writeAbandonLog(s.session_id, 'Ran out of time.');
    const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
    const content = await readFile(logPath, 'utf8');
    expect(content).toContain('abandoned');
    expect(content).toContain('Ran out of time.');
  });

  it('treats empty string outcome same as null', async () => {
    const s = startSession();
    await checkpointStore.writeAbandonLog(s.session_id, '');
    const logPath = path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md');
    const content = await readFile(logPath, 'utf8');
    expect(content).not.toContain('**Outcome:**');
  });

  it('writes cancellation event and complete timestamp fields', async () => {
    const s = startSession();
    sessionStore.abandonSession(s.session_id);
    await checkpointStore.writeAbandonLog(s.session_id);
    const content = await readFile(
      path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md'),
      'utf8',
    );
    expect(content).toContain('**Event:** session_cancelled');
    expect(content).toContain('**Status:** abandoned');
    expect(content).toContain('**UTC offset:** +02:00');
    expect(content).toContain('**Timezone:** Europe/Berlin');
  });
});

describe('CheckpointStore.writeSessionStartLog', () => {
  it('appends a complete session-start event', async () => {
    const s = startSession();
    await checkpointStore.writeSessionStartLog(s);
    const content = await readFile(
      path.join(vaultRoot, 'Productivity', 'Focus Logs', 'task-abc.md'),
      'utf8',
    );
    expect(content).toContain('**Date:** 2026-09-28');
    expect(content).toContain('**Time:** 15:00:00');
    expect(content).toContain('**UTC offset:** +02:00');
    expect(content).toContain('**Timezone:** Europe/Berlin');
    expect(content).toContain('**Event:** session_started');
    expect(content).toContain('**Status:** active');
    expect(content).toContain('**Task:** Write essay (`^task-abc`)');
    expect(content).toContain('**Planned:** 25 min');
  });
});
