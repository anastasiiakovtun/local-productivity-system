import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../../src/main/db.js';
import { SessionStore } from '../../src/main/session-store.js';

let db;
let store;

const fixedTs = () => ({
  local_date: '2026-09-28', local_time: '14:32:00',
  utc_offset: '+02:00', timezone: 'Europe/Berlin',
  occurred_at_utc: '2026-09-28T12:32:00Z',
});

beforeEach(() => {
  db = openDatabase(':memory:');
  store = new SessionStore(db, fixedTs);
});

afterEach(() => db.close());

const base = () => ({ taskId: '^task-abc', taskTitle: 'Write essay', plannedMinutes: 25 });

describe('SessionStore.startSession', () => {
  it('inserts a row with status=active and started timestamp fields', () => {
    const s = store.startSession(base());
    expect(s.status).toBe('active');
    expect(s.task_id).toBe('^task-abc');
    expect(s.started_local_date).toBe('2026-09-28');
    expect(s.started_utc_offset).toBe('+02:00');
    expect(s.started_timezone).toBe('Europe/Berlin');
    expect(s.planned_minutes).toBe(25);
  });

  it('stores project_label when provided', () => {
    const s = store.startSession({ ...base(), projectLabel: 'Thesis' });
    expect(s.project_label).toBe('Thesis');
  });
});

describe('SessionStore.pauseSession', () => {
  it('sets status=paused and paused_at_utc', () => {
    const s = store.startSession(base());
    const paused = store.pauseSession(s.session_id);
    expect(paused.status).toBe('paused');
    expect(paused.paused_at_utc).toBeTruthy();
  });
});

describe('SessionStore.resumeSession', () => {
  it('clears paused_at_utc and sets status=active, accumulating paused_seconds', () => {
    const s = store.startSession(base());
    store.pauseSession(s.session_id);
    const resumed = store.resumeSession(s.session_id);
    expect(resumed.status).toBe('active');
    expect(resumed.paused_at_utc).toBeNull();
    expect(resumed.paused_seconds).toBeGreaterThanOrEqual(0);
  });
});

describe('SessionStore.abandonSession', () => {
  it('sets status=abandoned and populates ended timestamp fields', () => {
    const s = store.startSession(base());
    const abandoned = store.abandonSession(s.session_id);
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.ended_local_date).toBe('2026-09-28');
    expect(abandoned.ended_occurred_at_utc).toBe('2026-09-28T12:32:00Z');
  });
});

describe('SessionStore.getActiveSession', () => {
  it('returns active session', () => {
    const s = store.startSession(base());
    expect(store.getActiveSession()?.session_id).toBe(s.session_id);
  });

  it('returns null when no active session', () => {
    expect(store.getActiveSession()).toBeNull();
  });

  it('returns null after session is ended', () => {
    const s = store.startSession(base());
    store.endSession(s.session_id, { actualSeconds: 1500 });
    expect(store.getActiveSession()).toBeNull();
  });
});

describe('SessionStore.endSession', () => {
  it('sets status=ended with actual_seconds and ended timestamps', () => {
    const s = store.startSession(base());
    const ended = store.endSession(s.session_id, { actualSeconds: 1680, overflowSeconds: 180 });
    expect(ended.status).toBe('ended');
    expect(ended.actual_seconds).toBe(1680);
    expect(ended.overflow_seconds).toBe(180);
    expect(ended.ended_occurred_at_utc).toBe('2026-09-28T12:32:00Z');
  });
});
