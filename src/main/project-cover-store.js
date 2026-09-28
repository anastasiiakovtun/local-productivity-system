import { validateProjectCover } from '../shared/app-schema.js';

export class ProjectCoverStore {
  constructor(db) {
    this._db = db;
  }

  listProjects() {
    return this._db.prepare(`
      SELECT DISTINCT tasks.project_label AS label, project_covers.color
      FROM tasks
      LEFT JOIN project_covers ON project_covers.project_label = tasks.project_label
      WHERE tasks.project_label IS NOT NULL AND trim(tasks.project_label) <> ''
      ORDER BY tasks.project_label COLLATE NOCASE
    `).all();
  }

  setCover(projectLabel, color) {
    const validationError = validateProjectCover(projectLabel, color);
    if (validationError) throw new TypeError(validationError);
    this._db.prepare(`
      INSERT INTO project_covers (project_label, color)
      VALUES (?, ?)
      ON CONFLICT(project_label) DO UPDATE SET color = excluded.color
    `).run(projectLabel, color);
  }

  getHomeResume() {
    return this._db.prepare(`
      SELECT
        tasks.*,
        checkpoints.outcome,
        checkpoints.next_action,
        checkpoints.created_occurred_at_utc AS checkpoint_created_occurred_at_utc,
        project_covers.color
      FROM checkpoints
      JOIN tasks ON tasks.id = checkpoints.task_id
      LEFT JOIN project_covers ON project_covers.project_label = tasks.project_label
      WHERE tasks.status = 'open'
      ORDER BY checkpoints.created_occurred_at_utc DESC
      LIMIT 1
    `).get() ?? null;
  }
}
