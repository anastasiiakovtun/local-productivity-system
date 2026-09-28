import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const defaultFsApi = { mkdir, appendFile };

const VALID_STATUSES = new Set(['continue', 'blocked', 'completed', 'abandoned']);

export class CheckpointStore {
  constructor(db, getVaultRoot, fsApi = defaultFsApi) {
    this._db = db;
    this._getVaultRoot = getVaultRoot;
    this._fsApi = fsApi;

    this._insert = db.prepare(`
      INSERT INTO checkpoints (
        checkpoint_id, session_id, task_id, project_label,
        outcome, status, next_action, blocker,
        created_local_date, created_local_time, created_utc_offset,
        created_timezone, created_occurred_at_utc
      ) VALUES (
        @checkpoint_id, @session_id, @task_id, @project_label,
        @outcome, @status, @next_action, @blocker,
        @local_date, @local_time, @utc_offset, @timezone, @occurred_at_utc
      )
    `);

    this._endSession = db.prepare(`
      UPDATE sessions SET status='ended',
        ended_local_date=@local_date, ended_local_time=@local_time,
        ended_utc_offset=@utc_offset, ended_timezone=@timezone,
        ended_occurred_at_utc=@occurred_at_utc,
        actual_seconds=@actual_seconds, overflow_seconds=@overflow_seconds
      WHERE session_id=@session_id
    `);

    this._getSession = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
  }

  validate({ outcome, status, nextAction }) {
    if (!outcome || typeof outcome !== 'string' || outcome.trim() === '') {
      return 'outcome is required';
    }
    if (!VALID_STATUSES.has(status)) {
      return 'status must be continue | blocked | completed | abandoned';
    }
    if ((status === 'continue' || status === 'blocked') && (!nextAction || nextAction.trim() === '')) {
      return 'nextAction is required for continue/blocked';
    }
    return null;
  }

  async saveCheckpoint({ sessionId, taskId, projectLabel = null, outcome, status, nextAction = null, blocker = null, ts, actualSeconds, overflowSeconds = 0 }) {
    const validErr = this.validate({ outcome, status, nextAction });
    if (validErr) return { status: 'error', reason: validErr };
    const vaultRoot = this._getVaultRoot?.();
    if (typeof vaultRoot !== 'string' || vaultRoot.length === 0) {
      throw new Error('vault-not-selected');
    }

    const checkpoint_id = crypto.randomUUID();

    const tx = this._db.transaction(() => {
      this._insert.run({
        checkpoint_id, session_id: sessionId, task_id: taskId,
        project_label: projectLabel, outcome, status,
        next_action: nextAction, blocker,
        ...ts,
      });
      this._endSession.run({
        session_id: sessionId,
        actual_seconds: actualSeconds,
        overflow_seconds: overflowSeconds,
        ...ts,
      });
    });
    tx();

    // Append to Focus Log
    const session = this._getSession.get(sessionId);
    await this._appendToFocusLog(vaultRoot, session, { outcome, status, nextAction, ts, actualSeconds, overflowSeconds });

    return { status: 'success', checkpoint_id };
  }

  async writeAbandonLog(sessionId) {
    const vaultRoot = this._getVaultRoot?.();
    if (typeof vaultRoot !== 'string' || vaultRoot.length === 0) {
      throw new Error('vault-not-selected');
    }
    const session = this._getSession.get(sessionId);
    if (!session) return;
    const { loggedTimestamp } = await import('./logged-timestamp.js');
    const ts = loggedTimestamp();
    const actualSeconds = session.ended_occurred_at_utc
      ? Math.round((new Date(session.ended_occurred_at_utc).getTime() - new Date(session.started_occurred_at_utc).getTime()) / 1000) - (session.paused_seconds ?? 0)
      : 0;
    await this._appendFocusLogBlock(vaultRoot, session, { outcome: null, status: 'abandoned', nextAction: null, ts, actualSeconds, overflowSeconds: 0 });
  }

  async _appendToFocusLog(vaultRoot, session, { outcome, status, nextAction, ts, actualSeconds, overflowSeconds }) {
    await this._appendFocusLogBlock(vaultRoot, session, { outcome, status, nextAction, ts, actualSeconds, overflowSeconds });
  }

  async _appendFocusLogBlock(vaultRoot, session, { outcome, status, nextAction, ts, actualSeconds, overflowSeconds }) {
    if (!session) return;
    const logDir = path.join(vaultRoot, 'Productivity', 'Focus Logs');
    const logPath = path.join(logDir, `${session.task_id.replace('^', '')}.md`);
    await this._fsApi.mkdir(logDir, { recursive: true });

    const plannedMin = session.planned_minutes;
    const actualMin  = Math.round(actualSeconds / 60);
    const overflowMin = Math.round(overflowSeconds / 60);

    let block = `## ${ts.local_date} ${ts.local_time.slice(0, 5)} ${ts.utc_offset} — ${status}\n\n`;
    block += `**Task:** ${session.task_title}  \n`;
    block += `**Planned:** ${plannedMin} min | **Actual:** ${actualMin} min | **Overflow:** ${overflowMin} min  \n`;
    if (outcome != null) block += `**Outcome:** ${outcome}  \n`;
    if (nextAction) block += `**Next Action:** ${nextAction}  \n`;
    block += '\n---\n\n';

    await this._fsApi.appendFile(logPath, block);
  }
}
