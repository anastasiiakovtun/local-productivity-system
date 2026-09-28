import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateTaskId } from './task-id.js';
import { loggedTimestamp as defaultLoggedTimestamp } from './logged-timestamp.js';
import {
  formatTaskLine,
  insertTaskLine,
  parseTaskLine,
  removeTaskLine,
  replaceTaskLine,
} from './markdown-tasks.js';
import { splitSection } from './section-writer.js';

const START_SENTINEL = '<!-- focus:tasks:start -->';
const END_SENTINEL   = '<!-- focus:tasks:end -->';

function ensureSentinels(content) {
  if (content.includes(START_SENTINEL)) return content;
  return content + `\n${START_SENTINEL}\n${END_SENTINEL}\n`;
}

export class TaskStore {
  constructor({ db, eventStore, getVaultRoot, readNote, writeSection, loggedTimestamp, fsApi } = {}) {
    this._db = db;
    this._eventStore = eventStore;
    this._getVaultRoot = getVaultRoot;
    this._readNote = readNote;
    this._writeSection = writeSection;
    this._ts = loggedTimestamp ?? defaultLoggedTimestamp;
    this._mkdir = fsApi?.mkdir ?? mkdir;
    this._writeFile = fsApi?.writeFile ?? writeFile;

    this._insertTask = db.prepare(`
      INSERT INTO tasks (
        id, title, status, project_label, start_date, due_date, estimate_minutes,
        created_local_date, created_local_time, created_utc_offset,
        created_timezone, created_occurred_at_utc,
        updated_local_date, updated_local_time, updated_utc_offset,
        updated_timezone, updated_occurred_at_utc
      ) VALUES (
        @id, @title, @status, @project_label, @start_date, @due_date, @estimate_minutes,
        @local_date, @local_time, @utc_offset, @timezone, @occurred_at_utc,
        @local_date, @local_time, @utc_offset, @timezone, @occurred_at_utc
      )
    `);

    this._updateTask = db.prepare(`
      UPDATE tasks SET
        title = @title,
        status = @status,
        project_label = @project_label,
        start_date = @start_date,
        due_date = @due_date,
        estimate_minutes = @estimate_minutes,
        updated_local_date = @local_date,
        updated_local_time = @local_time,
        updated_utc_offset = @utc_offset,
        updated_timezone = @timezone,
        updated_occurred_at_utc = @occurred_at_utc
      WHERE id = @id
    `);
  }

  _getTask(id) {
    return this._db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  }

  _resolveVaultRoot() {
    const vaultRoot = this._getVaultRoot?.();
    if (typeof vaultRoot !== 'string' || vaultRoot.length === 0) {
      throw new Error('vault-not-selected');
    }
    return vaultRoot;
  }

  _inboxPath() {
    return path.join(this._resolveVaultRoot(), 'Productivity', 'Inbox.md');
  }

  async _ensureInbox() {
    const dir = path.join(this._resolveVaultRoot(), 'Productivity');
    await this._mkdir(dir, { recursive: true });
    const notePath = this._inboxPath();
    // Read or create
    let read = await this._readNote(notePath);
    if (read.status === 'error' && read.reason === 'not-found') {
      await this._writeFile(notePath, `# Inbox\n\n${START_SENTINEL}\n${END_SENTINEL}\n`, 'utf8');
      read = await this._readNote(notePath);
    }
    if (read.status !== 'success') throw new Error(read.reason ?? 'inbox-not-readable');
    return { notePath, content: read.content, mtime: read.mtime };
  }

  async createTask({ title, projectLabel = null, startDate = null, dueDate = null, estimateMinutes = null }) {
    const id = generateTaskId();
    const ts = this._ts();
    let inboxState = null;

    this._db.exec('BEGIN');
    try {
      this._insertTask.run({
        id, title, status: 'open',
        project_label: projectLabel, start_date: startDate,
        due_date: dueDate, estimate_minutes: estimateMinutes,
        ...ts,
      });

      const { notePath, content, mtime } = await this._ensureInbox();
      const normalized = ensureSentinels(content);
      const split = splitSection(normalized);
      inboxState = { notePath, inner: split.inner, mtime };
      const newLine = formatTaskLine({ title, id, done: false });
      const newInner = insertTaskLine(split.inner, newLine);
      const writeResult = await this._writeSection(notePath, newInner, mtime);
      if (writeResult?.status !== 'success') {
        throw new Error(writeResult?.reason ?? writeResult?.status ?? 'inbox-write-failed');
      }

      await this._eventStore.appendEvent({
        event_type: 'created', task_id: id, task_title: title,
        project_label: projectLabel, source: 'app', ...ts,
      });

      this._db.exec('COMMIT');
      return { status: 'success', task: this._getTask(id) };
    } catch (error) {
      if (this._db.inTransaction) this._db.exec('ROLLBACK');
      if (inboxState) {
        try {
          const current = await this._readNote(inboxState.notePath);
          const restoreMtime = current.status === 'success' ? current.mtime : inboxState.mtime;
          await this._writeSection(inboxState.notePath, inboxState.inner, restoreMtime);
        } catch {
          // Preserve the operation error; the caller must report the failed create.
        }
      }
      throw error;
    }
  }

  async editTask({ id, changes }) {
    const current = this._getTask(id);
    if (!current) return { status: 'error', reason: 'not-found' };

    const semanticKeys = ['title', 'projectLabel', 'startDate', 'dueDate', 'estimateMinutes'];
    const dbKeyMap = {
      projectLabel: 'project_label', startDate: 'start_date',
      dueDate: 'due_date', estimateMinutes: 'estimate_minutes',
    };

    const changed_fields = {};
    for (const key of semanticKeys) {
      const dbKey = dbKeyMap[key] ?? key;
      if (key in changes && changes[key] !== current[dbKey]) {
        changed_fields[key] = { from: current[dbKey], to: changes[key] };
      }
    }

    if (Object.keys(changed_fields).length === 0) return { status: 'success', task: current };

    const ts = this._ts();
    const updated = {
      id,
      title: changes.title ?? current.title,
      status: current.status,
      project_label: changes.projectLabel !== undefined ? changes.projectLabel : current.project_label,
      start_date: changes.startDate !== undefined ? changes.startDate : current.start_date,
      due_date: changes.dueDate !== undefined ? changes.dueDate : current.due_date,
      estimate_minutes: changes.estimateMinutes !== undefined ? changes.estimateMinutes : current.estimate_minutes,
      ...ts,
    };
    this._updateTask.run(updated);

    // Update Markdown if title changed
    if (changed_fields.title) {
      const notePath = this._inboxPath();
      const read = await this._readNote(notePath);
      if (read.status === 'success') {
        const split = splitSection(read.content);
        if (split.before) {
          const newLine = formatTaskLine({ title: updated.title, id, done: current.status === 'completed' });
          const newInner = replaceTaskLine(split.inner, id, newLine);
          await this._writeSection(notePath, newInner, read.mtime);
        }
      }
    }

    await this._eventStore.appendEvent({
      event_type: 'edited', task_id: id,
      task_title: updated.title,
      project_label: updated.project_label,
      changed_fields, source: 'app', ...ts,
    });

    return { status: 'success', task: this._getTask(id) };
  }

  async completeTask({ id }) {
    const current = this._getTask(id);
    if (!current) return { status: 'error', reason: 'not-found' };
    const ts = this._ts();
    this._updateTask.run({ ...current, status: 'completed', ...ts });

    const notePath = this._inboxPath();
    const read = await this._readNote(notePath);
    if (read.status === 'success') {
      const split = splitSection(read.content);
      if (split.before) {
        const newLine = formatTaskLine({ title: current.title, id, done: true });
        const newInner = replaceTaskLine(split.inner, id, newLine);
        await this._writeSection(notePath, newInner, read.mtime);
      }
    }

    await this._eventStore.appendEvent({
      event_type: 'completed', task_id: id,
      task_title: current.title, project_label: current.project_label,
      source: 'app', ...ts,
    });
    return { status: 'success' };
  }

  async reopenTask({ id }) {
    const current = this._getTask(id);
    if (!current) return { status: 'error', reason: 'not-found' };
    const ts = this._ts();
    this._updateTask.run({ ...current, status: 'open', ...ts });

    const notePath = this._inboxPath();
    const read = await this._readNote(notePath);
    if (read.status === 'success') {
      const split = splitSection(read.content);
      if (split.before) {
        const newLine = formatTaskLine({ title: current.title, id, done: false });
        const newInner = replaceTaskLine(split.inner, id, newLine);
        await this._writeSection(notePath, newInner, read.mtime);
      }
    }

    await this._eventStore.appendEvent({
      event_type: 'reopened', task_id: id,
      task_title: current.title, project_label: current.project_label,
      source: 'app', ...ts,
    });
    return { status: 'success' };
  }

  async deleteTask({ id }) {
    const current = this._getTask(id);
    if (!current) return { status: 'error', reason: 'not-found' };
    const ts = this._ts();
    this._updateTask.run({ ...current, status: 'deleted', ...ts });

    const notePath = this._inboxPath();
    const read = await this._readNote(notePath);
    if (read.status === 'success') {
      const split = splitSection(read.content);
      if (split.before) {
        const newInner = removeTaskLine(split.inner, id);
        await this._writeSection(notePath, newInner, read.mtime);
      }
    }

    await this._eventStore.appendEvent({
      event_type: 'deleted', task_id: id,
      task_title: current.title, project_label: current.project_label,
      source: 'app', ...ts,
    });
    return { status: 'success' };
  }

  listTasks({ view }) {
    const today = new Date().toISOString().slice(0, 10);
    if (view === 'inbox') {
      return this._db.prepare(`SELECT * FROM tasks WHERE status = 'open' ORDER BY rowid`).all();
    }
    if (view === 'today') {
      return this._db.prepare(`
        SELECT * FROM tasks WHERE status = 'open'
          AND (start_date IS NULL OR start_date <= ?)
        ORDER BY due_date ASC NULLS LAST, rowid
      `).all(today);
    }
    if (view === 'completed') {
      return this._db.prepare(`SELECT * FROM tasks WHERE status = 'completed' ORDER BY updated_occurred_at_utc DESC`).all();
    }
    throw new Error(`Unknown view: ${view}`);
  }
}
