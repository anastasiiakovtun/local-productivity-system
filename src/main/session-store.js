import { loggedTimestamp as defaultTs } from './logged-timestamp.js';

export class SessionStore {
  constructor(db, loggedTimestamp) {
    this._db = db;
    this._ts = loggedTimestamp ?? defaultTs;

    this._insert = db.prepare(`
      INSERT INTO sessions (
        session_id, task_id, task_title, project_label, planned_minutes,
        started_local_date, started_local_time, started_utc_offset,
        started_timezone, started_occurred_at_utc,
        status
      ) VALUES (
        @session_id, @task_id, @task_title, @project_label, @planned_minutes,
        @local_date, @local_time, @utc_offset, @timezone, @occurred_at_utc,
        'active'
      )
    `);

    this._get = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
    this._getActive = db.prepare("SELECT * FROM sessions WHERE status IN ('active','paused') LIMIT 1");
  }

  startSession({ taskId, taskTitle, projectLabel = null, plannedMinutes }) {
    const session_id = crypto.randomUUID();
    const ts = this._ts();
    this._insert.run({ session_id, task_id: taskId, task_title: taskTitle, project_label: projectLabel, planned_minutes: plannedMinutes, ...ts });
    return this._get.get(session_id);
  }

  pauseSession(sessionId) {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    this._db.prepare(`UPDATE sessions SET status='paused', paused_at_utc=? WHERE session_id=?`).run(now, sessionId);
    return this._get.get(sessionId);
  }

  resumeSession(sessionId) {
    const session = this._get.get(sessionId);
    if (!session || !session.paused_at_utc) return session;
    const pausedMs = Date.now() - new Date(session.paused_at_utc).getTime();
    const addedSeconds = Math.round(pausedMs / 1000);
    this._db.prepare(`
      UPDATE sessions
      SET status='active', paused_at_utc=NULL,
          paused_seconds = paused_seconds + ?
      WHERE session_id=?
    `).run(addedSeconds, sessionId);
    return this._get.get(sessionId);
  }

  abandonSession(sessionId) {
    const ts = this._ts();
    this._db.prepare(`
      UPDATE sessions SET status='abandoned',
        ended_local_date=@local_date, ended_local_time=@local_time,
        ended_utc_offset=@utc_offset, ended_timezone=@timezone,
        ended_occurred_at_utc=@occurred_at_utc
      WHERE session_id=@session_id
    `).run({ session_id: sessionId, ...ts });
    return this._get.get(sessionId);
  }

  endSession(sessionId, { actualSeconds, overflowSeconds = 0 }) {
    const ts = this._ts();
    this._db.prepare(`
      UPDATE sessions SET status='ended',
        ended_local_date=@local_date, ended_local_time=@local_time,
        ended_utc_offset=@utc_offset, ended_timezone=@timezone,
        ended_occurred_at_utc=@occurred_at_utc,
        actual_seconds=@actual_seconds, overflow_seconds=@overflow_seconds
      WHERE session_id=@session_id
    `).run({ session_id: sessionId, actual_seconds: actualSeconds, overflow_seconds: overflowSeconds, ...ts });
    return this._get.get(sessionId);
  }

  getActiveSession() {
    return this._getActive.get() ?? null;
  }

  getLastCheckpointForTask(taskId) {
    return this._db.prepare(`
      SELECT c.* FROM checkpoints c
      JOIN sessions s ON s.session_id = c.session_id
      WHERE s.task_id = ?
      ORDER BY c.created_occurred_at_utc DESC LIMIT 1
    `).get(taskId) ?? null;
  }

  listSessions({ fromDate = null, toDate = null, checkpointStatus = null } = {}) {
    return this._db.prepare(`
      SELECT s.*, c.outcome, c.status AS checkpoint_status, c.next_action
      FROM sessions s
      LEFT JOIN checkpoints c ON c.session_id = s.session_id
      WHERE s.status IN ('ended','abandoned')
        AND (? IS NULL OR date(s.started_occurred_at_utc) >= ?)
        AND (? IS NULL OR date(s.started_occurred_at_utc) <= ?)
        AND (? IS NULL OR COALESCE(c.status, s.status) = ?)
      ORDER BY s.started_occurred_at_utc DESC
    `).all(fromDate, fromDate, toDate, toDate, checkpointStatus, checkpointStatus);
  }
}
