import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const defaultFsApi = { mkdir, appendFile };

export class TaskEventStore {
  constructor(db, vaultRoot, fsApi = defaultFsApi) {
    this._db = db;
    this._vaultRoot = vaultRoot;
    this._fsApi = fsApi;

    this._insert = db.prepare(`
      INSERT INTO task_events (
        event_id, event_type, task_id, task_title, project_label,
        changed_fields, source,
        local_date, local_time, utc_offset, timezone, occurred_at_utc
      ) VALUES (
        @event_id, @event_type, @task_id, @task_title, @project_label,
        @changed_fields, @source,
        @local_date, @local_time, @utc_offset, @timezone, @occurred_at_utc
      )
    `);
  }

  async appendEvent({
    event_type,
    task_id,
    task_title,
    project_label = null,
    changed_fields = null,
    source = 'app',
    local_date,
    local_time,
    utc_offset,
    timezone,
    occurred_at_utc,
  }) {
    const event_id = crypto.randomUUID();

    this._insert.run({
      event_id,
      event_type,
      task_id,
      task_title,
      project_label,
      changed_fields: changed_fields ? JSON.stringify(changed_fields) : null,
      source,
      local_date,
      local_time,
      utc_offset,
      timezone,
      occurred_at_utc,
    });

    // Append human-readable line to Activity.md
    const activityDir = path.join(this._vaultRoot, 'Productivity');
    const activityPath = path.join(activityDir, 'Activity.md');
    await this._fsApi.mkdir(activityDir, { recursive: true });
    await this._fsApi.appendFile(
      activityPath,
      `[${local_date} ${local_time}] ${event_type}: ${task_title} (${task_id})\n`,
    );

    return event_id;
  }
}
