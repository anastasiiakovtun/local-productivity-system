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
    const store = new TaskEventStore(db, () => vaultRoot);
    const event_id = await store.appendEvent(baseEvent());
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(row).toBeTruthy();
    expect(row.event_type).toBe('created');
    expect(row.task_title).toBe('Write essay');
  });

  it('all five timestamp fields are on the inserted row', async () => {
    const store = new TaskEventStore(db, () => vaultRoot);
    const event_id = await store.appendEvent(baseEvent());
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(row.local_date).toBe('2026-09-28');
    expect(row.local_time).toBe('14:32:00');
    expect(row.utc_offset).toBe('+02:00');
    expect(row.timezone).toBe('Europe/Berlin');
    expect(row.occurred_at_utc).toBe('2026-09-28T12:32:00Z');
  });

  it('creates Activity.md when absent', async () => {
    const store = new TaskEventStore(db, () => vaultRoot);
    await store.appendEvent(baseEvent());
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content).toBeTruthy();
  });

  it('appends on second call — does not overwrite', async () => {
    const store = new TaskEventStore(db, () => vaultRoot);
    await store.appendEvent(baseEvent());
    await store.appendEvent({ ...baseEvent(), event_type: 'completed', task_title: 'Write essay' });
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content.match(/^## Task event$/gm)).toHaveLength(2);
  });

  it('appends every required Obsidian event field', async () => {
    const store = new TaskEventStore(db, () => vaultRoot);
    await store.appendEvent({
      ...baseEvent(),
      project_label: 'Thesis',
      changed_fields: { title: { from: 'Plan essay', to: 'Write essay' } },
    });
    const content = await readFile(path.join(vaultRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content).toContain('**Date:** 2026-09-28');
    expect(content).toContain('**Time:** 14:32:00');
    expect(content).toContain('**UTC offset:** +02:00');
    expect(content).toContain('**Timezone:** Europe/Berlin');
    expect(content).toContain('**Event:** task_created');
    expect(content).toContain('**Status:** open');
    expect(content).toContain('**Task:** Write essay (`^task-abc123`)');
    expect(content).toContain('**Project:** Thesis');
    expect(content).toContain('**Changes:**');
  });

  it('stores changed_fields as JSON string', async () => {
    const store = new TaskEventStore(db, () => vaultRoot);
    const event_id = await store.appendEvent({
      ...baseEvent(),
      event_type: 'edited',
      changed_fields: { title: { from: 'Old', to: 'New' } },
    });
    const row = db.prepare('SELECT * FROM task_events WHERE event_id = ?').get(event_id);
    expect(JSON.parse(row.changed_fields)).toEqual({ title: { from: 'Old', to: 'New' } });
  });

  it('resolves the latest vault root before appending Activity.md', async () => {
    const secondRoot = await mkdtemp(path.join(os.tmpdir(), 'focus-events-latest-'));
    let currentRoot = vaultRoot;
    const store = new TaskEventStore(db, () => currentRoot);
    currentRoot = secondRoot;

    await store.appendEvent(baseEvent());

    const content = await readFile(path.join(secondRoot, 'Productivity', 'Activity.md'), 'utf8');
    expect(content).toContain('Write essay');
    await rm(secondRoot, { recursive: true, force: true });
  });

  it('throws a controlled error when no vault is selected', async () => {
    const store = new TaskEventStore(db, () => null);
    await expect(store.appendEvent(baseEvent())).rejects.toThrow('vault-not-selected');
  });
});
