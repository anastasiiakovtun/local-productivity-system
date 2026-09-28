import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { TaskEventStore } from '../../src/main/task-event-store.js';

let db;
let vaultRoot;

beforeEach(async () => {
  db = openDatabase(':memory:');
  vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-events-'));
});

afterEach(async () => {
  db.close();
  await rm(vaultRoot, { recursive: true, force: true });
});

const baseEvent = () => ({
  event_type: 'created',
  task_id: '^task-abc123',
  task_title: 'Write essay',
  local_date: '2026-09-28',
  local_time: '14:32:00',
  utc_offset: '+02:00',
  timezone: 'Europe/Berlin',
  occurred_at_utc: '2026-09-28T12:32:00Z',
});

describe('TaskEventStore', () => {
  it('appendEvent inserts a row retrievable by event_id', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    const event_id = await store.appendEvent(baseEvent());
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(row).toBeTruthy();
    expect(row.event_type).toBe('created');
    expect(row.task_title).toBe('Write essay');
  });

  it('all five timestamp fields are on the inserted row', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    const event_id = await store.appendEvent(baseEvent());
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(row.local_date).toBe('2026-09-28');
    expect(row.local_time).toBe('14:32:00');
    expect(row.utc_offset).toBe('+02:00');
    expect(row.timezone).toBe('Europe/Berlin');
    expect(row.occurred_at_utc).toBe('2026-09-28T12:32:00Z');
  });

  it('creates Activity.md when absent', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    await store.appendEvent(baseEvent());
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content).toBeTruthy();
  });

  it('appends on second call — does not overwrite', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    await store.appendEvent(baseEvent());
    await store.appendEvent({ ...baseEvent(), event_type: 'completed', task_title: 'Write essay' });
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('appended line contains event_type and task_title', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    await store.appendEvent(baseEvent());
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content).toContain('created');
    expect(content).toContain('Write essay');
  });

  it('stores changed_fields as JSON string', async () => {
    const store = new TaskEventStore(db, vaultRoot);
    const event_id = await store.appendEvent({
      ...baseEvent(),
      event_type: 'edited',
      changed_fields: { title: { from: 'Old', to: 'New' } },
    });
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(JSON.parse(row.changed_fields)).toEqual({ title: { from: 'Old', to: 'New' } });
  });
});
