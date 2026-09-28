import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const defaultFsApi = { mkdir, appendFile };

const TASK_STATUS_BY_EVENT = {
  created: 'open',
  edited: 'open',
  completed: 'completed',
  reopened: 'open',
  deleted: 'deleted',
};

function markdownEvent(event) {
  let block = '## Task event\n\n';
  block += `**Date:** ${event.local_date}  \n`;
  block += `**Time:** ${event.local_time}  \n`;
  block += `**UTC offset:** ${event.utc_offset}  \n`;
  block += `**Timezone:** ${event.timezone}  \n`;
  block += `**Event:** task_${event.event_type}  \n`;
  block += `**Status:** ${TASK_STATUS_BY_EVENT[event.event_type] ?? 'unknown'}  \n`;
  block += `**Task:** ${event.task_title} (\`${event.task_id}\`)  \n`;
  if (event.project_label) block += `**Project:** ${event.project_label}  \n`;
  block += `**Source:** ${event.source}  \n`;
  if (event.changed_fields) block += `**Changes:** \`${JSON.stringify(event.changed_fields)}\`  \n`;
  block += '\n---\n\n';
  return block;
}

export class TaskEventStore {
  constructor(db, getVaultRoot, fsApi = defaultFsApi) {
    this._db = db;
    this._getVaultRoot = getVaultRoot;
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
    const vaultRoot = this._getVaultRoot?.();
    if (typeof vaultRoot !== 'string' || vaultRoot.length === 0) {
      throw new Error('vault-not-selected');
    }
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

    // Append human-readable block to Activity.md
    const activityDir = path.join(vaultRoot, 'Productivity');
    const activityPath = path.join(activityDir, 'Activity.md');
    await this._fsApi.mkdir(activityDir, { recursive: true });
    await this._fsApi.appendFile(
      activityPath,
      markdownEvent({
        event_type,
        task_id,
        task_title,
        project_label,
        changed_fields,
        source,
        local_date,
        local_time,
        utc_offset,
        timezone,
      }),
    );

    return event_id;
  }
}
