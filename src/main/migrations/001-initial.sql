CREATE TABLE IF NOT EXISTS preferences (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',
  project_label    TEXT,
  start_date       TEXT,
  due_date         TEXT,
  estimate_minutes INTEGER,
  created_local_date      TEXT NOT NULL,
  created_local_time      TEXT NOT NULL,
  created_utc_offset      TEXT NOT NULL,
  created_timezone        TEXT NOT NULL,
  created_occurred_at_utc TEXT NOT NULL,
  updated_local_date      TEXT NOT NULL,
  updated_local_time      TEXT NOT NULL,
  updated_utc_offset      TEXT NOT NULL,
  updated_timezone        TEXT NOT NULL,
  updated_occurred_at_utc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_events (
  event_id         TEXT PRIMARY KEY,
  event_type       TEXT NOT NULL,
  task_id          TEXT NOT NULL,
  task_title       TEXT NOT NULL,
  project_label    TEXT,
  changed_fields   TEXT,
  source           TEXT NOT NULL DEFAULT 'app',
  local_date       TEXT NOT NULL,
  local_time       TEXT NOT NULL,
  utc_offset       TEXT NOT NULL,
  timezone         TEXT NOT NULL,
  occurred_at_utc  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id              TEXT PRIMARY KEY,
  task_id                 TEXT NOT NULL,
  task_title              TEXT NOT NULL,
  project_label           TEXT,
  planned_minutes         INTEGER NOT NULL,
  started_local_date      TEXT NOT NULL,
  started_local_time      TEXT NOT NULL,
  started_utc_offset      TEXT NOT NULL,
  started_timezone        TEXT NOT NULL,
  started_occurred_at_utc TEXT NOT NULL,
  paused_at_utc           TEXT,
  paused_seconds          INTEGER NOT NULL DEFAULT 0,
  ended_local_date        TEXT,
  ended_local_time        TEXT,
  ended_utc_offset        TEXT,
  ended_timezone          TEXT,
  ended_occurred_at_utc   TEXT,
  actual_seconds          INTEGER,
  overflow_seconds        INTEGER DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS checkpoints (
  checkpoint_id           TEXT PRIMARY KEY,
  session_id              TEXT NOT NULL REFERENCES sessions(session_id),
  task_id                 TEXT NOT NULL,
  project_label           TEXT,
  outcome                 TEXT NOT NULL,
  status                  TEXT NOT NULL,
  next_action             TEXT,
  blocker                 TEXT,
  created_local_date      TEXT NOT NULL,
  created_local_time      TEXT NOT NULL,
  created_utc_offset      TEXT NOT NULL,
  created_timezone        TEXT NOT NULL,
  created_occurred_at_utc TEXT NOT NULL
);
