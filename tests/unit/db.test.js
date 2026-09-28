import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/main/db.js';

describe('openDatabase', () => {
  it('opens an in-memory database without throwing', () => {
    const db = openDatabase(':memory:');
    expect(db).toBeTruthy();
    db.close();
  });

  it('creates all four tables after migration', () => {
    const db = openDatabase(':memory:');
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all()
      .map((r) => r.name);

    expect(tables).toContain('preferences');
    expect(tables).toContain('tasks');
    expect(tables).toContain('task_events');
    expect(tables).toContain('sessions');
    expect(tables).toContain('checkpoints');
    db.close();
  });

  it('can insert and read a preferences row', () => {
    const db = openDatabase(':memory:');
    db.prepare(`INSERT INTO preferences (key, value) VALUES (?, ?)`).run('theme', 'dark');
    const row = db.prepare(`SELECT value FROM preferences WHERE key = ?`).get('theme');
    expect(row.value).toBe('dark');
    db.close();
  });

  it('can insert and read a tasks row with all timestamp fields', () => {
    const db = openDatabase(':memory:');
    db.prepare(`
      INSERT INTO tasks (
        id, title, status,
        created_local_date, created_local_time, created_utc_offset,
        created_timezone, created_occurred_at_utc,
        updated_local_date, updated_local_time, updated_utc_offset,
        updated_timezone, updated_occurred_at_utc
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      '^task-abc123', 'Write essay', 'open',
      '2026-09-28', '14:32:00', '+02:00', 'Europe/Berlin', '2026-09-28T12:32:00Z',
      '2026-09-28', '14:32:00', '+02:00', 'Europe/Berlin', '2026-09-28T12:32:00Z',
    );
    const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get('^task-abc123');
    expect(row.title).toBe('Write essay');
    expect(row.created_utc_offset).toBe('+02:00');
    expect(row.created_timezone).toBe('Europe/Berlin');
    db.close();
  });

  it('migration is idempotent — running twice does not throw', () => {
    const db = openDatabase(':memory:');
    expect(() => openDatabase(':memory:')).not.toThrow();
    db.close();
  });
});
