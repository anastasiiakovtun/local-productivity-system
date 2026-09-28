# Obsidian Focus Companion — Product Design Spec

**Date:** 2026-09-28  
**Status:** Draft for review  
**Covers:** §30 assignment requirements — Task CRUD + logging, adjustable timer, session review, resume context, Checkpoint

---

## 1. Scope

This spec covers the first complete product increment: a working to-do manager backed by vault Markdown and SQLite, a configurable Pomodoro-style focus timer, a structured Checkpoint capture, a Resume Packet shown before each session, and a Session History view. It does not cover notifications, tray, global shortcuts, crash recovery, file watcher, or Windows CI — those remain deferred per user direction.

---

## 2. Architecture baseline

The two proven spikes established:

- Secure sandboxed Electron/Vue scaffold (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`).
- Vault selection and path validation.
- Path guard (traversal rejection, symlink containment).
- Sentinel-based Markdown read/write with atomic swap and conflict detection.
- Narrow `contextBridge` surface (`window.vault.*`).

This spec builds on all of the above. New capabilities are added as new IPC channels with the same sender/frame/arg guards already established.

---

## 3. Data stores

### 3.1 Vault Markdown (durable, human-readable)

| File | Contents |
|---|---|
| `<ProjectNote>.md` | Managed `## Tasks` section delimited by `<!-- focus:tasks:start -->` / `<!-- focus:tasks:end -->` sentinels |
| `Productivity/Inbox.md` | Managed Inbox Tasks section, same sentinel pattern |
| `Productivity/Activity.md` | Append-only human-readable Task Lifecycle Event log |
| `Productivity/Focus Logs/<project-id>.md` | Append-only Checkpoint log per project |

The `Productivity/` folder name is configurable during onboarding but fixed for the MVP after that.

### 3.2 App-local SQLite (`app.getPath('userData')/focus.db`)

| Table | Contents |
|---|---|
| `tasks` | Last-known snapshot of every managed Task field |
| `task_events` | Append-only lifecycle events (created, edited, completed, reopened, deleted) |
| `sessions` | Focus Session records (start, end, planned duration, actual, overflow, task_id) |
| `checkpoints` | Checkpoint records linked to sessions |
| `preferences` | Key/value settings (vault path, managed folder, focus/break defaults) |

SQLite is the canonical store for queries, history, and recovery. Markdown is the durable readable projection. Pinia is derived/display state only.

---

## 4. Logged Timestamp (§9)

Every durable write (task event, session start/end, checkpoint) includes:

```js
{
  local_date:    '2026-09-28',         // YYYY-MM-DD, local calendar date
  local_time:    '14:32:00',           // HH:MM:SS, local clock
  utc_offset:    '+02:00',             // active UTC offset at moment of write
  timezone:      'Europe/Berlin',      // IANA identifier from system
  occurred_at_utc: '2026-09-28T12:32:00Z'
}
```

A single `loggedTimestamp()` helper in the main process produces this object. It is never reconstructed after the fact.

---

## 5. Task model

### 5.1 Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Obsidian block ID, e.g. `^task-a1b2c3` — generated on creation, never changes |
| `title` | string | Required, non-empty |
| `status` | enum | `open`, `completed`, `deleted` |
| `project_id` | string \| null | Null while in Inbox |
| `start_date` | date string \| null | `YYYY-MM-DD`; controls when task appears in Today |
| `due_date` | date string \| null | `YYYY-MM-DD`; communicates urgency |
| `estimate_minutes` | integer \| null | Planned focused minutes |
| `created_at` | LoggedTimestamp | Set at creation, immutable |
| `updated_at` | LoggedTimestamp | Updated on every semantic edit |

### 5.2 Markdown representation

Tasks are stored as `- [ ]` / `- [x]` checkboxes with a trailing block ID:

```markdown
<!-- focus:tasks:start -->
- [ ] Write methodology section ^task-a1b2c3
- [x] Read Chapter 4 ^task-d4e5f6
<!-- focus:tasks:end -->
```

Additional metadata (dates, estimate) is stored in SQLite only. The Markdown line is the visible title + status + stable ID. No YAML per-task frontmatter.

### 5.3 Task lifecycle events

Each event is a SQLite row in `task_events`:

| Field | Notes |
|---|---|
| `event_id` | UUID |
| `event_type` | `created`, `edited`, `completed`, `reopened`, `deleted` |
| `task_id` | Stable block ID |
| `task_title` | Title copied at event time |
| `project_id` | Project at event time, or null |
| `changed_fields` | JSON object `{ field: { from, to } }` — for `edited` events |
| `source` | `app`, `external`, or `import` |
| `LoggedTimestamp fields` | All five fields from §4 |

A human-readable projection is appended to `Productivity/Activity.md` after each canonical SQLite write.

---

## 6. Task operations

### 6.1 Capture (Inbox)

- Title is the only required field.
- Creates a `created` event.
- Writes the task line to `Productivity/Inbox.md` managed section.
- Inserts into `tasks` table.

### 6.2 Edit

- Any combination of title, project link, start date, due date, estimate changed in one save = one `edited` event with `changed_fields`.

### 6.3 Complete

- Sets status to `completed`, updates `- [ ]` → `- [x]` in Markdown.
- Creates a `completed` event.
- If a Focus Session is active for this task, triggers the Checkpoint flow first.

### 6.4 Reopen

- Sets status back to `open`, updates `- [x]` → `- [ ]` in Markdown.
- Creates a `reopened` event.

### 6.5 Delete (hard)

- Sets status to `deleted` in SQLite.
- Removes the task line from the Project/Inbox managed section permanently.
- Creates a `deleted` event in `task_events` (history preserved in SQLite).
- No Trash.md write. No restore capability in this increment.

### 6.6 Link to Project

- Moves the task line from Inbox to the Project note's managed section.
- Creates an `edited` event recording `{ project_id: { from: null, to: '<id>' } }`.

---

## 7. Views (renderer)

### 7.1 Inbox

Lists all tasks with `project_id = null` and `status = open`. Capture bar always visible.

### 7.2 Today

Lists open tasks where `start_date ≤ today` (or `start_date IS NULL` and task is linked to an active project). Sorted by due date ascending, nulls last.

### 7.3 Projects

Lists designated Projects. Expanding a Project shows its open tasks from the managed section.

### 7.4 Completed

Lists completed tasks across all projects, sortable by completion date. Searchable by title.

### 7.5 Session History

Lists Focus Sessions reverse-chronologically. Each row: task, project, session date, planned/actual/overflow duration, checkpoint status. Expandable detail shows full Checkpoint.

---

## 8. Project management (minimal for this increment)

- A Project is a vault note that has been designated by the user.
- Designating writes the sentinel markers into the note's `## Tasks` section (or creates the section).
- A `projects` SQLite table stores: `id`, `title`, `note_path`, `focus_log_path`.
- No Area assignment in this increment. No Project creation — only designating existing notes.

---

## 9. Focus Session

### 9.1 Pre-session: Resume Packet

Shown before starting. Contains:

- Task title and Project link.
- Previous Checkpoint for this Task (or Project, if no task-specific one exists).
- Next Action from that Checkpoint.
- Proposed Minimum Commitment (default 25 min, editable per-session).

User can edit Next Action and Minimum Commitment before starting. Starting creates a `session` record in SQLite with `started_at` LoggedTimestamp, `planned_minutes`, `task_id`.

### 9.2 Timer

- Countdown from Minimum Commitment.
- At zero: one visual notification (in-app only — system notifications deferred) and timer enters Overflow (counts up).
- Overflow continues until user ends session.
- Timer state derived from `started_at` + `planned_minutes`; UI polls every second. No accumulated interval drift.
- Pause: saves `paused_at` to session record; resumes by computing remaining = `planned_minutes * 60 - elapsed_before_pause`.

### 9.3 Settings

- Default focus: 25 minutes (range 1–180).
- Default break: 5 minutes (range 1–60).
- Per-session overrides do not change defaults unless "Make default" is selected.
- Stored in `preferences` SQLite table.

### 9.4 Break

- Offered after session ends (not automatic).
- Counts down from break duration.
- No durable break record required in this increment (no LoggedTimestamp required until system notifications are in place).

---

## 10. Checkpoint

### 10.1 Required fields

- **Outcome:** one sentence. "No progress" is valid.
- **Status:** `continue`, `blocked`, `completed`, or `abandoned`.
- **Next Action:** required for `continue` and `blocked`; omitted for `completed`/`abandoned`.

### 10.2 Auto-populated fields

- Session ID, Task ID, Project link.
- Planned / actual / overflow duration (derived from session record).
- Session start and end LoggedTimestamps.
- Checkpoint-created LoggedTimestamp.

### 10.3 Durable output

- Full Checkpoint appended to `Productivity/Focus Logs/<project-id>.md`.
- Concise entry (task, outcome, focus time, link) appended to daily note if configured; otherwise skipped silently.

### 10.4 Validation

The app refuses to finish a session if:
- Outcome is empty.
- Status is not one of the four allowed values.
- Next Action is empty when status is `continue` or `blocked`.

---

## 11. Session History (§18)

- Reverse-chronological list of all sessions.
- Each row: task title, project, date, planned/actual/overflow minutes, checkpoint status.
- Expandable detail: full checkpoint, supporting notes (empty in this increment), corrected/recovered indicator.
- Filters: date range, project, checkpoint status.
- Corrections deferred (original values shown as-is; no correction UI in this increment).

---

## 12. IPC surface extensions

New channels beyond the two spikes:

| Channel | Direction | Purpose |
|---|---|---|
| `app:get-preferences` | renderer→main | Load settings |
| `app:set-preferences` | renderer→main | Save settings |
| `vault:list-notes` | renderer→main | List `.md` files in vault for Project designation |
| `vault:designate-project` | renderer→main | Add sentinel section to an existing note |
| `tasks:create` | renderer→main | Create task (Inbox or Project) |
| `tasks:edit` | renderer→main | Edit task fields |
| `tasks:complete` | renderer→main | Complete task |
| `tasks:reopen` | renderer→main | Reopen task |
| `tasks:delete` | renderer→main | Hard-delete task (remove from Markdown, SQLite status=deleted, append Activity.md) |
| `tasks:list` | renderer→main | Query tasks (by view: inbox/today/project/completed) |
| `sessions:start` | renderer→main | Start Focus Session (creates session record) |
| `sessions:pause` | renderer→main | Pause active session |
| `sessions:resume` | renderer→main | Resume paused session |
| `sessions:end` | renderer→main | End session (triggers Checkpoint flow) |
| `sessions:list` | renderer→main | Query sessions (Session History) |
| `checkpoints:save` | renderer→main | Save Checkpoint and write to Focus Log |

Each channel uses the same sender/frame/arg guards as the existing handlers.

---

## 13. Security: no new surface

`window.vault` gains no new methods. The new IPC channels are exposed through a second `contextBridge` key `window.app` with the same narrow-factory pattern:

```js
window.app = {
  getPreferences(),
  setPreferences(prefs),
  listNotes(),
  designateProject(notePath),
  createTask(fields),
  editTask(id, changedFields),
  completeTask(id),
  reopenTask(id),
  deleteTask(id),
  listTasks(view, filters),
  startSession(taskId, plannedMinutes),
  pauseSession(sessionId),
  resumeSession(sessionId),
  endSession(sessionId),
  listSessions(filters),
  saveCheckpoint(sessionId, fields),
}
```

All return structured results `{ status: 'success', data }` or `{ status: 'error', reason }`. Schema validation in both directions.

---

## 14. SQLite setup

- `better-sqlite3` installed with Electron rebuild via `@electron/rebuild`.
- Migrations run synchronously at startup (main process, before `createWindow`).
- All writes inside transactions.
- Append-only tables (`task_events`, `sessions`, `checkpoints`) never have rows updated or deleted.

The `better-sqlite3` rebuild/package spike (§27 item 7) is required before the SQLite implementation tasks. It will be done as the first inline spike of the implementation phase.

---

## 15. Out of scope for this increment

- File watcher / external edit detection.
- System notifications.
- Tray / menu-bar.
- Global shortcuts.
- Crash recovery (timer state persistence across unclean quit).
- Task reminders.
- Corrections to historical sessions.
- Windows CI.
- Multiple vaults.
- Daily-note detection/configuration (Checkpoint writes to Focus Log only; daily note skipped).
- Supporting Notes (Resume Packet shows previous Checkpoint only; note links deferred).
- Area assignment.
- Project creation (designation of existing notes only).
- Import of arbitrary checkboxes.
- Upcoming view (start date filtering deferred to after Today view is stable).
- Trash view and restore (hard delete only).
- Activity/event log view (events written to Activity.md in vault but no in-app viewer).
