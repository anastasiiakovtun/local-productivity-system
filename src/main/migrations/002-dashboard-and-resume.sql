ALTER TABLE tasks ADD COLUMN supporting_notes TEXT;

CREATE TABLE IF NOT EXISTS project_covers (
  project_label TEXT PRIMARY KEY,
  color TEXT NOT NULL
);
