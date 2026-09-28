import { vi, describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { TaskEventStore } from '../../src/main/task-event-store.js';
import { TaskStore } from '../../src/main/task-store.js';

const START = '<!-- focus:tasks:start -->';
const END   = '<!-- focus:tasks:end -->';

function makeInboxContent(inner = '') {
  return `# Inbox\n\n${START}\n${inner}${END}\n`;
}

function setup({ inboxContent = makeInboxContent(), missingInbox = false, getVaultRoot, eventStore: eventStoreOverride } = {}) {
  const db = openDatabase(':memory:');
  const vaultRoot = '/fake/vault';

  // Track write calls
  let currentContent = missingInbox ? null : inboxContent;
  let currentMtime = 1000;

  const readNote = vi.fn(async () => currentContent === null
    ? { status: 'error', reason: 'not-found' }
    : { status: 'success', content: currentContent, mtime: currentMtime });

  const writeSection = vi.fn(async (notePath, inner, mtime) => {
    // Reconstruct full content from split
    const start = currentContent.indexOf(START);
    const end = currentContent.indexOf(END);
    const before = currentContent.slice(0, start + START.length + 1);
    const after = currentContent.slice(end);
    currentContent = before + inner + after;
    currentMtime = currentMtime + 1;
    return { status: 'success', mtime: currentMtime };
  });

  const appendEvent = vi.fn(async () => crypto.randomUUID());
  const eventStore = eventStoreOverride ?? { appendEvent };

  const ts = vi.fn(() => ({
    local_date: '2026-09-28', local_time: '14:32:00',
    utc_offset: '+02:00', timezone: 'Europe/Berlin',
    occurred_at_utc: '2026-09-28T12:32:00Z',
  }));

  const fsApi = {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async (_notePath, content) => {
      currentContent = content;
      currentMtime += 1;
    }),
  };

  const store = new TaskStore({
    db, eventStore, getVaultRoot: getVaultRoot ?? (() => vaultRoot),
    readNote, writeSection,
    loggedTimestamp: ts,
    fsApi,
  });

  return { store, db, readNote, writeSection, appendEvent, ts, getContent: () => currentContent };
}

describe('TaskStore.createTask', () => {
  it('resolves the latest vault root before filesystem work', async () => {
    let vaultRoot = '/old/vault';
    const { store, writeSection } = setup({ getVaultRoot: () => vaultRoot });
    vaultRoot = '/new/vault';

    await store.createTask({ title: 'Write essay' });

    expect(writeSection).toHaveBeenCalledWith(
      '/new/vault/Productivity/Inbox.md',
      expect.any(String),
      expect.any(Number),
    );
  });

  it('returns a controlled error when no vault is selected', async () => {
    const { store } = setup({ getVaultRoot: () => '' });
    await expect(store.createTask({ title: 'Write essay' })).rejects.toThrow('vault-not-selected');
  });

  it('rolls back the task when the Inbox write fails', async () => {
    const { store, db, writeSection } = setup();
    writeSection.mockRejectedValueOnce(new Error('disk full'));

    await expect(store.createTask({ title: 'Write essay' })).rejects.toThrow('disk full');

    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM task_events').all()).toHaveLength(0);
  });

  it('rolls back when writeSection returns an error status', async () => {
    const { store, db, writeSection } = setup();
    writeSection.mockResolvedValueOnce({ status: 'error', reason: 'not-writable' });

    await expect(store.createTask({ title: 'Write essay' })).rejects.toThrow('not-writable');

    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM task_events').all()).toHaveLength(0);
  });

  it('creates a missing Inbox with managed-section sentinels', async () => {
    const { store, getContent } = setup({ missingInbox: true });

    await store.createTask({ title: 'Write essay' });

    expect(getContent()).toContain(START);
    expect(getContent()).toContain('- [ ] Write essay');
    expect(getContent()).toContain(END);
  });

  it('restores the original Inbox and rolls back rows when event logging fails', async () => {
    const original = makeInboxContent('- [ ] Existing ^task-existing\n');
    let db;
    const eventStore = {
      appendEvent: vi.fn(async (event) => {
        db.prepare(`
          INSERT INTO task_events (
            event_id, event_type, task_id, task_title, project_label,
            changed_fields, source, local_date, local_time, utc_offset,
            timezone, occurred_at_utc
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(), event.event_type, event.task_id, event.task_title,
          event.project_label, null, event.source, event.local_date,
          event.local_time, event.utc_offset, event.timezone, event.occurred_at_utc,
        );
        throw new Error('activity write failed');
      }),
    };
    const result = setup({ inboxContent: original, eventStore });
    ({ db } = result);

    await expect(result.store.createTask({ title: 'Write essay' }))
      .rejects.toThrow('activity write failed');

    expect(result.getContent()).toBe(original);
    expect(db.prepare('SELECT * FROM tasks').all()).toHaveLength(0);
    expect(db.prepare('SELECT * FROM task_events').all()).toHaveLength(0);
  });

  it('inserts a row into tasks table', async () => {
    const { store, db } = setup();
    await store.createTask({ title: 'Write essay' });
    const rows = db.prepare('SELECT * FROM tasks').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Write essay');
    expect(rows[0].status).toBe('open');
  });

  it('calls writeSection to update Inbox.md', async () => {
    const { store, writeSection } = setup();
    await store.createTask({ title: 'Write essay' });
    expect(writeSection).toHaveBeenCalled();
  });

  it('emits a created event', async () => {
    const { store, appendEvent } = setup();
    await store.createTask({ title: 'Write essay' });
    expect(appendEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'created' }));
  });

  it('stores project_label when provided', async () => {
    const { store, db } = setup();
    await store.createTask({ title: 'Task', projectLabel: 'Thesis' });
    const row = db.prepare('SELECT project_label FROM tasks').get();
    expect(row.project_label).toBe('Thesis');
  });
});

describe('TaskStore.editTask', () => {
  it('updates title in SQLite and emits edited event with changed_fields', async () => {
    const { store, db, appendEvent } = setup();
    const { task } = await store.createTask({ title: 'Old title' });
    await store.editTask({ id: task.id, changes: { title: 'New title' } });

    const updated = db.prepare('SELECT title FROM tasks WHERE id = ?').get(task.id);
    expect(updated.title).toBe('New title');
    expect(appendEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      event_type: 'edited',
      changed_fields: { title: { from: 'Old title', to: 'New title' } },
    }));
  });

  it('does not emit an event when no fields change', async () => {
    const { store, appendEvent } = setup();
    const { task } = await store.createTask({ title: 'Same' });
    const callsBefore = appendEvent.mock.calls.length;
    await store.editTask({ id: task.id, changes: { title: 'Same' } });
    expect(appendEvent.mock.calls.length).toBe(callsBefore);
  });
});

describe('TaskStore.completeTask', () => {
  it('updates status to completed and emits completed event', async () => {
    const { store, db, appendEvent } = setup();
    const { task } = await store.createTask({ title: 'Task' });
    await store.completeTask({ id: task.id });

    const row = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task.id);
    expect(row.status).toBe('completed');
    expect(appendEvent).toHaveBeenLastCalledWith(expect.objectContaining({ event_type: 'completed' }));
  });
});

describe('TaskStore.reopenTask', () => {
  it('updates status to open and emits reopened event', async () => {
    const { store, db, appendEvent } = setup();
    const { task } = await store.createTask({ title: 'Task' });
    await store.completeTask({ id: task.id });
    await store.reopenTask({ id: task.id });

    const row = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task.id);
    expect(row.status).toBe('open');
    expect(appendEvent).toHaveBeenLastCalledWith(expect.objectContaining({ event_type: 'reopened' }));
  });
});

describe('TaskStore.deleteTask', () => {
  it('updates status to deleted and emits deleted event', async () => {
    const { store, db, appendEvent } = setup();
    const { task } = await store.createTask({ title: 'Task' });
    await store.deleteTask({ id: task.id });

    const row = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task.id);
    expect(row.status).toBe('deleted');
    expect(appendEvent).toHaveBeenLastCalledWith(expect.objectContaining({ event_type: 'deleted' }));
  });
});

describe('TaskStore.listTasks', () => {
  it('inbox returns only open tasks', async () => {
    const { store } = setup();
    await store.createTask({ title: 'Open' });
    const { task } = await store.createTask({ title: 'Done' });
    await store.completeTask({ id: task.id });

    const inbox = store.listTasks({ view: 'inbox' });
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe('Open');
  });

  it('today excludes tasks with future start dates', async () => {
    const { store } = setup();
    await store.createTask({ title: 'Available', startDate: '2020-01-01' });
    await store.createTask({ title: 'Future', startDate: '2099-01-01' });
    await store.createTask({ title: 'No date' });

    const today = store.listTasks({ view: 'today' });
    const titles = today.map((t) => t.title);
    expect(titles).toContain('Available');
    expect(titles).toContain('No date');
    expect(titles).not.toContain('Future');
  });

  it('completed returns only completed tasks', async () => {
    const { store } = setup();
    await store.createTask({ title: 'Open' });
    const { task } = await store.createTask({ title: 'Done' });
    await store.completeTask({ id: task.id });

    const completed = store.listTasks({ view: 'completed' });
    expect(completed).toHaveLength(1);
    expect(completed[0].title).toBe('Done');
  });
});
