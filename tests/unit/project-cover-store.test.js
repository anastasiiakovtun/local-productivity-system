import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { ProjectCoverStore } from '../../src/main/project-cover-store.js';
import { PROJECT_COVER_COLORS } from '../../src/shared/app-schema.js';

const timestamp = '2026-09-28T10:00:00.000Z';

function insertTask(db, { id, title, status = 'open', projectLabel = null }) {
  db.prepare(`INSERT INTO tasks (
    id, title, status, project_label,
    created_local_date, created_local_time, created_utc_offset, created_timezone, created_occurred_at_utc,
    updated_local_date, updated_local_time, updated_utc_offset, updated_timezone, updated_occurred_at_utc
  ) VALUES (?, ?, ?, ?, '2026-09-28', '12:00:00', '+02:00', 'Europe/Berlin', ?,
    '2026-09-28', '12:00:00', '+02:00', 'Europe/Berlin', ?)`)
    .run(id, title, status, projectLabel, timestamp, timestamp);
}

function insertCheckpoint(db, { id, taskId, createdAt, outcome = 'Progress', nextAction = 'Continue' }) {
  const sessionId = `session-${id}`;
  db.prepare(`INSERT INTO sessions (
    session_id, task_id, task_title, project_label, planned_minutes,
    started_local_date, started_local_time, started_utc_offset, started_timezone, started_occurred_at_utc
  ) VALUES (?, ?, ?, NULL, 25, '2026-09-28', '12:00:00', '+02:00', 'Europe/Berlin', ?)`)
    .run(sessionId, taskId, taskId, createdAt);
  db.prepare(`INSERT INTO checkpoints (
    checkpoint_id, session_id, task_id, project_label, outcome, status, next_action,
    created_local_date, created_local_time, created_utc_offset, created_timezone, created_occurred_at_utc
  ) VALUES (?, ?, ?, NULL, ?, 'continue', ?, '2026-09-28', '12:00:00', '+02:00', 'Europe/Berlin', ?)`)
    .run(id, sessionId, taskId, outcome, nextAction, createdAt);
}

describe('ProjectCoverStore', () => {
  it('returns the newest checkpoint attached to an open task', () => {
    const db = openDatabase(':memory:');
    insertTask(db, { id: '^older', title: 'Older task', projectLabel: 'Thesis' });
    insertTask(db, { id: '^newer', title: 'Newest task', projectLabel: 'Launch' });
    insertCheckpoint(db, { id: 'cp-old', taskId: '^older', createdAt: '2026-09-28T09:00:00.000Z' });
    insertCheckpoint(db, { id: 'cp-new', taskId: '^newer', createdAt: '2026-09-28T11:00:00.000Z', outcome: 'Drafted', nextAction: 'Review' });

    expect(new ProjectCoverStore(db).getHomeResume()).toMatchObject({
      id: '^newer', title: 'Newest task', project_label: 'Launch', outcome: 'Drafted', next_action: 'Review', color: null,
    });
    db.close();
  });

  it('skips completed and deleted tasks', () => {
    const db = openDatabase(':memory:');
    insertTask(db, { id: '^open', title: 'Open task' });
    insertTask(db, { id: '^done', title: 'Done task', status: 'completed' });
    insertTask(db, { id: '^deleted', title: 'Deleted task', status: 'deleted' });
    insertCheckpoint(db, { id: 'cp-open', taskId: '^open', createdAt: '2026-09-28T09:00:00.000Z' });
    insertCheckpoint(db, { id: 'cp-done', taskId: '^done', createdAt: '2026-09-28T11:00:00.000Z' });
    insertCheckpoint(db, { id: 'cp-deleted', taskId: '^deleted', createdAt: '2026-09-28T12:00:00.000Z' });

    expect(new ProjectCoverStore(db).getHomeResume().id).toBe('^open');
    db.close();
  });

  it('lists distinct project labels with neutral missing covers', () => {
    const db = openDatabase(':memory:');
    insertTask(db, { id: '^one', title: 'One', projectLabel: 'Thesis' });
    insertTask(db, { id: '^two', title: 'Two', projectLabel: 'Thesis' });
    insertTask(db, { id: '^three', title: 'Three', projectLabel: 'Launch' });

    expect(new ProjectCoverStore(db).listProjects()).toEqual([
      { label: 'Launch', color: null },
      { label: 'Thesis', color: null },
    ]);
    db.close();
  });

  it('persists only fixed palette colors', () => {
    const db = openDatabase(':memory:');
    insertTask(db, { id: '^one', title: 'One', projectLabel: 'Thesis' });
    const store = new ProjectCoverStore(db);
    store.setCover('Thesis', PROJECT_COVER_COLORS[0]);
    expect(store.listProjects()[0].color).toBe(PROJECT_COVER_COLORS[0]);
    expect(() => store.setCover('Thesis', '#ffffff')).toThrow('invalid project cover color');
    db.close();
  });
});
