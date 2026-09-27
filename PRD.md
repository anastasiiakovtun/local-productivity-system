# Product Requirements Document: Obsidian Focus Companion

- **Repository:** Local Productivity System
- **Status:** MVP specification
- **Representative user:** A student who uses Obsidian for notes and project work
- **Primary verified platform:** macOS 15.6 on Apple silicon
- **Portability assumption:** Windows x64 is build-verified through CI but not manually runtime-tested
- **Domain glossary:** [CONTEXT.md](CONTEXT.md)
- **Architecture decision:** [ADR-0001: Use Electron with Vue](docs/adr/0001-use-electron-vue.md)

## 1. Product summary

Obsidian Focus Companion is a local-first desktop application combining a minimal to-do system with a focus timer. It is designed for knowledge work whose durable context already lives in an Obsidian vault.

The product is centered on the **Resume Packet**: before a focus session, the app restores the minimum context required to continue meaningful work; after the session, it captures a structured **Checkpoint** so the next session can resume without reconstructing the user's mental state.

The app is not a replacement for Obsidian, a general-purpose project-management suite, or a full personal knowledge-management system. It is a temporary execution surface over the vault.

## 2. Problem statement

Knowledge work is often interrupted between study sessions, classes, days, or devices. A conventional task title such as “continue essay draft” does not preserve:

- What changed during the previous session.
- Which notes were relevant.
- What remained blocked.
- The exact next action.
- How much focused effort was planned and actually spent.

The user consequently searches several notes, rereads material, and reconstructs previous decisions before productive work can resume. Existing task managers and Pomodoro timers track what to do or how long work lasted, but generally do not preserve a vault-native handoff between sessions.

## 3. Product promise

> Resume meaningful work without reconstructing your mental state.

The product also aims to:

- Reduce friction between selecting a Task and beginning focused work.
- Make every completed session leave a useful next-step record.
- Preserve task and focus history in readable local records.
- Improve awareness of planned versus actual focused effort.

## 4. Goals and success measures

The MVP will be evaluated over a 14-day personal trial.

| Goal | Success measure |
|---|---|
| Become part of the representative user's workflow | Used on at least 10 of 14 study/project days |
| Reduce context reconstruction | No manual vault search in at least 80% of resume attempts |
| Preserve useful handoffs | At least 80% of completed Focus Sessions produce a useful Checkpoint |

A useful Checkpoint is one that, when shown later, communicates what changed and what should happen next.

### 4.1 Local evaluation instrumentation

- Usage days are counted automatically and locally.
- Checkpoint coverage is calculated from completed sessions with valid required fields.
- After a session starts, the user can mark “I had to search for more context.” Absence of that mark is treated as a proxy for resume success.
- When a prior Checkpoint is presented in a Resume Packet, the user can mark it “Not useful.” Absence is treated as a proxy for usefulness.
- An optional end-of-day review allows the user to correct these proxy classifications.
- No evaluation data leaves the device.

## 5. User and job to be done

### 5.1 Representative user

A student who:

- Uses Obsidian for lecture notes, research, writing, and project work.
- Works across multiple Projects and courses.
- Frequently stops and resumes work across days.
- Wants a lightweight task queue and focus timer without maintaining another knowledge base.
- Values local files, readable Markdown, and low setup friction.

### 5.2 Job to be done

> When I turn an Obsidian note into work, I want to choose the next action, begin focusing with almost no setup, and leave a durable Checkpoint, so I can resume later without searching for and reconstructing context.

## 6. Product principles

1. **Obsidian owns knowledge.** The app links to context; it does not duplicate a knowledge base.
2. **Resume before review.** The Resume Packet must be compact enough to accelerate starting.
3. **Every session leaves a handoff.** The Checkpoint is part of finishing, not an optional afterthought.
4. **Readable without the app.** Durable Tasks, Checkpoints, and activity logs remain understandable as Markdown.
5. **Local and private by default.** Core use requires no account, cloud service, telemetry, or network connection.
6. **Safe around user-authored notes.** The app edits only managed sections and never silently overwrites ambiguous external changes.
7. **One Task per Focus Session.** Trustworthy history is more important than supporting overlapping timers.
8. **Flow is not an error.** Reaching the minimum duration begins Overflow; it does not force a stop.
9. **Dates are not interchangeable.** Start date controls availability; due date communicates urgency.
10. **Every logged entry is temporally complete.** Date, time, UTC offset, and timezone are always retained.

## 7. Scope overview

### 7.1 MVP capabilities

- Select and validate one Obsidian vault.
- Designate existing notes as Projects or create new Project notes.
- Manage Tasks in designated Project-note sections and an Inbox file.
- Capture, edit, complete, reopen, import, and soft-delete Tasks.
- Record task lifecycle events.
- Present Inbox, Today, Upcoming, Project, Completed, Trash, Activity, and Session History views.
- Build deterministic Resume Packets.
- Run configurable minimum-commitment focus sessions with Overflow.
- Offer optional configurable Break timers.
- Capture structured Checkpoints.
- Write canonical Project focus logs and concise daily-note summaries.
- Review and correct completed sessions without erasing original values.
- Detect external Markdown changes and resolve conflicts safely.
- Provide reminders, notifications, global shortcuts, tray access, and a compact timer.
- Build an unsigned Windows x64 artifact through CI while manually verifying only macOS.

### 7.2 Explicit non-goals

- Mobile application.
- Verified Windows or Linux runtime support.
- Accounts or application-managed cloud synchronization.
- Required Obsidian plugin.
- AI summaries or remote AI processing.
- Collaboration or shared Projects.
- Recurring Tasks.
- Habit tracking.
- Calendar or time-blocking interface.
- Website or application blocking.
- Automatic application/website surveillance.
- Natural-language Task parsing.
- Multiple vaults.
- Charts, streaks, achievements, heat maps, or productivity scores.
- Rich task notes or knowledge-management features.
- Custom Project templates.
- Code signing, notarization, or store distribution.
- Automatic updates or cloud crash reporting.
- Installer localization.
- Intel Mac verification.
- Loading remote web content in application windows.

## 8. Core domain model

Canonical terminology is defined in [CONTEXT.md](CONTEXT.md). The core relationships are:

- One configured **Vault** contains Project notes and app-managed records.
- A **Project** is a finishable outcome represented by one designated note.
- A **Task** may belong to one Project or remain temporarily unlinked in the Inbox.
- A Task has one stable Obsidian-compatible block ID.
- A **Focus Session** belongs to exactly one Task.
- A Focus Session begins with one **Resume Packet** and ends with one **Checkpoint**, unless the incomplete session is explicitly discarded during recovery.
- One Project has one canonical **Project Focus Log** containing its Checkpoints.
- Task changes produce append-only **Task Lifecycle Events**.
- Historical changes to completed sessions produce append-only **Corrections**.

## 9. Temporal data requirement

Every durable logged entry must include the following fields:

| Field | Requirement | Example |
|---|---|---|
| `local_date` | Local calendar date when the entry occurred or was detected | `2026-09-27` |
| `local_time` | Local clock time including seconds | `12:30:00` |
| `utc_offset` | Offset active at that time | `+02:00` |
| `timezone` | IANA timezone identifier | `Europe/Berlin` |
| `occurred_at_utc` | Equivalent unambiguous UTC instant | `2026-09-27T10:30:00Z` |

This applies to:

- Task creation, edit, completion, reopening, and deletion events.
- Detected external changes.
- Focus Session start, pause/resume transitions if durably logged, finish, recovery, and discard records.
- Checkpoints.
- Corrections.
- Activity Journal entries.
- Daily-note session summaries.
- Reminder changes when represented as durable lifecycle edits.
- Imports and restorations that create lifecycle events.

The app must capture the timezone at the time each event is created; it must not reconstruct historical timezone solely from the user's current system timezone. Display may be localized, but stored records retain the original local date, time, offset, IANA timezone, and UTC instant.

## 10. Task model

### 10.1 Task fields

Each managed Task contains:

| Field | Required | Notes |
|---|---|---|
| Stable ID | Yes | Obsidian-compatible block ID; survives renaming and movement |
| Title | Yes | Actionable label |
| Status | Yes | Active, completed, abandoned, or deleted state as applicable |
| Project/context link | Required before focus | May be absent while Task is in Inbox |
| Start date | No | Controls when the Task becomes actionable |
| Due date | No | Communicates urgency; does not control visibility |
| Focus estimate | No | Planned focused minutes |
| Reminder | No | One local reminder time; no recurrence |
| Created timestamp | Yes | Includes date, time, offset, timezone, and UTC instant |
| Updated timestamp | Yes | Includes date, time, offset, timezone, and UTC instant |

Priority and free-form task notes are excluded from the MVP. Durable context belongs in the linked Vault note.

### 10.2 Managed Markdown locations

- Linked Project Tasks live under a managed `## Tasks` section in the designated Project note.
- Unlinked or unorganized Tasks live in `Productivity/Inbox.md`.
- Arbitrary Markdown checkboxes are not automatically considered Tasks.
- The user may explicitly import an arbitrary checkbox into the managed task system.
- The app edits only its managed section and must preserve frontmatter and unrelated note content byte-for-byte where practical.

### 10.3 Stable identity

- Each Task uses an Obsidian-compatible block ID, such as `^task-<id>`.
- Identity must not depend on visible title, file path, line number, or ordering.
- Renaming or moving the Task line preserves lifecycle and session history.
- Duplicate IDs are treated as a conflict requiring resolution.

## 11. Task views

### 11.1 Inbox

Contains Tasks that are unlinked, unorganized, or intentionally deferred for later organization. A Task can be captured into Inbox with only a title.

### 11.2 Today

Contains incomplete Tasks whose start date is today or earlier, including overdue Tasks. Tasks without a start date remain available through their Project but do not automatically enter Today unless manually selected for Today in a future version.

### 11.3 Upcoming

Shows incomplete Tasks with future start dates or due dates.

### 11.4 Project

Shows active Tasks grouped under each designated Project. It links directly to the Project note and its focus log.

### 11.5 Completed

Provides searchable completed Tasks by Project and completion date. Completion does not destroy identity or history.

### 11.6 Trash

Contains soft-deleted Tasks. Deleted Tasks do not appear in active execution views but retain identity and history.

### 11.7 Activity

Displays Task Lifecycle Events in reverse chronological order with filters for date, Project, Task, event type, and change source.

### 11.8 Session History

Defined in section 18.

## 12. Task capture and editing

### 12.1 Global capture

- A configurable global shortcut opens compact Task capture.
- Title receives focus immediately.
- Pressing Enter with only a title saves the Task to Inbox.
- Project, start date, due date, estimate, and reminder are optional keyboard-accessible fields.
- Natural-language date parsing is not required.
- Saving creates a `created` Task Lifecycle Event with a complete Logged Timestamp.

### 12.2 Editing

Semantic fields are:

- Title.
- Project/context link.
- Start date.
- Due date.
- Estimate.
- Status.
- Reminder.

Changes to one or more semantic fields saved together create one `edited` event containing previous and new values. Ordering, whitespace, Markdown formatting, and stable-ID movement are not edits.

### 12.3 Completion and reopening

- Tasks may be completed or reopened without a Focus Session.
- Completion creates a `completed` event.
- Reopening creates a `reopened` event and preserves identity and history.
- If completion occurs while a Focus Session is active, the session-finish and Checkpoint flow is presented as part of completion.

### 12.4 Deletion and restoration

- Deletion is soft deletion.
- The Task is removed from the active Project section and added to readable Trash storage.
- Deletion creates a `deleted` event.
- Restoring a deleted Task creates a `reopened` event whose prior state is `deleted`.
- Event history remains after deletion.

## 13. Task lifecycle event model

Every event includes:

- Unique event ID.
- Event type: `created`, `edited`, `completed`, `reopened`, or `deleted`.
- Stable Task ID.
- Task title copied at event time.
- Project/context link at event time, if any.
- Changed fields with previous and new values where applicable.
- Source: `app`, `external`, or `import`.
- Complete Logged Timestamp fields from section 9.
- For externally detected changes, a flag stating that the timestamp is detection time.

The canonical event store is append-only. A human-readable Markdown projection is appended to `Productivity/Activity.md` promptly after the canonical write succeeds.

## 14. Project management

### 14.1 Designating a Project

The user can:

1. Search the Vault and select an existing note, or create a new Project note.
2. Confirm it as the Project home.
3. Allow the app to add a managed `## Tasks` section if absent.
4. Optionally assign an Area.
5. Allow the app to create or connect the canonical Project Focus Log.

An Area is optional. Custom templates are not required.

### 14.2 Missing or renamed Project notes

- The app attempts resolution through stable metadata or known identity before treating a path as broken.
- Ambiguous matches require user confirmation.
- Missing notes are never silently recreated or removed.
- An unresolved Project note blocks new Focus Sessions for that Project.
- Existing Tasks, Checkpoints, lifecycle events, and history remain available for recovery and relinking.

## 15. Resume Packet

### 15.1 Purpose

The Resume Packet restores enough context to start work without becoming another planning ritual.

### 15.2 Default contents

- Current Task.
- Link to the Project note.
- Previous Checkpoint for the Task or Project.
- Recorded Next Action.
- Up to three recently linked Supporting Notes.
- Current Blocker, when present.
- Proposed Minimum Commitment.

Historical time totals, older Checkpoints, and broad Project status are available through progressive disclosure rather than shown by default.

### 15.3 Deterministic generation

The MVP uses explicit structured records and note links only. It does not read the Vault to generate an AI summary.

Supporting Notes are drawn from:

- Notes explicitly linked to the Task or Project.
- Notes opened through the app during prior sessions.
- Notes manually added during Checkpoint capture.

The app must not claim to know every note opened inside Obsidian without a plugin.

### 15.4 Pre-session interaction

Before starting, the user may revise:

- Next Action.
- Minimum Commitment.
- Supporting Notes.

If the packet is already correct, the session starts with one click or keyboard action. A separate definition-of-done field is not required.

## 16. Focus timer

### 16.1 Defaults and limits

- Initial focus default: 25 minutes.
- Initial Break default: 5 minutes.
- Focus range: 1–180 whole minutes.
- Break range: 1–60 whole minutes.
- Per-session overrides do not change defaults unless “Make default” is explicitly selected.

### 16.2 Focus Session lifecycle

- One Focus Session belongs to one Task.
- Starting requires a Project or context-note link.
- The app stores authoritative start and transition timestamps; UI countdown ticks are derived display state.
- Pause preserves the active Focus Session and does not create a Checkpoint.
- Reaching the Minimum Commitment triggers one notification and enters Overflow.
- Overflow continues until the user ends the session.
- Switching Tasks ends the current session and requires its Checkpoint before a new session begins.

### 16.3 Breaks

- A Break is offered only after the user ends a Focus Session.
- A Break never begins automatically.
- The user may override its duration.
- Break completion triggers a local notification.
- Break history need not appear as a primary analytical view, but any durable Break record must satisfy the Logged Timestamp requirement.

### 16.4 Crash and restart recovery

When an active session was not closed cleanly, the next launch offers:

1. Resume from the persisted timer state.
2. End at a user-confirmed corrected time.
3. Discard the incomplete session.

Recovered or corrected sessions are marked in history. Discarding an incomplete session does not remove earlier Checkpoints or task events.

## 17. Checkpoint

### 17.1 Required fields

- **Outcome:** one sentence; “No progress” is valid.
- **Status:** `continue`, `blocked`, `completed`, or `abandoned`.
- **Next Action:** required for `continue` and `blocked`; omitted only for `completed` or `abandoned`.

### 17.2 Automatically associated fields

- Session ID and Task ID.
- Project link.
- Planned focus duration.
- Actual focus duration.
- Overflow duration.
- Session start Logged Timestamp.
- Session end Logged Timestamp.
- Checkpoint-created Logged Timestamp.
- Supporting Notes opened through the app.
- Corrected/recovered indicator.

### 17.3 Optional fields

- Blocker detail.
- Additional manually selected Supporting Notes.
- Free-form reflection.
- Interruption count.

The required Checkpoint should normally take less than 20 seconds to complete.

### 17.4 Durable location

- The complete canonical Checkpoint is appended to the Project Focus Log.
- The Project note links to its focus log or latest Checkpoint.
- The daily note receives a concise entry containing focus time, Task, Outcome, and link to the canonical Checkpoint.
- Full Checkpoints are not duplicated into daily notes.
- If daily-note output is disabled, the canonical Project Focus Log is still written.

## 18. Session History and corrections

### 18.1 Session History capabilities

The MVP provides a reverse-chronological list with filters for:

- Date range.
- Project.
- Task.
- Checkpoint Status.

Each session detail shows:

- Task and Project.
- Session start/end date, time, UTC offset, timezone, and UTC instant.
- Planned duration.
- Actual duration.
- Overflow duration.
- Full Checkpoint.
- Supporting Notes.
- Corrected/recovered indicator.
- Link to the canonical Obsidian record.

### 18.2 Corrections

- The user may correct historical duration or Checkpoint fields.
- Corrections append a new record; they do not overwrite the original silently.
- Current corrected values are shown normally with a “corrected” marker.
- Session detail exposes original and corrected values.
- Every Correction has a complete Logged Timestamp.

## 19. External edits and reconciliation

### 19.1 Detection

- The app watches managed Vault files while running.
- On startup, it compares current managed Tasks with the last known snapshot.
- Semantic external changes create lifecycle events with source `external`.
- The external event time is explicitly labeled as detection time.

### 19.2 Conflict rules

- The app attempts field-level merges only inside managed sections.
- Unrelated note content is never overwritten.
- If the underlying note changed after it was read and the merge is ambiguous, the write stops.
- The app preserves both states and presents a conflict-resolution screen.
- Duplicate Task IDs, malformed managed records, and simultaneous incompatible edits are conflicts.
- The app must not silently select app-wins or Vault-wins behavior.

### 19.3 Self-write suppression

The watcher must distinguish or safely debounce changes caused by the app itself so one write does not generate repeated external-change events.

## 20. Vault layout

Default configurable structure:

```text
Productivity/
├── Inbox.md
├── Activity.md
├── Trash.md
└── Focus Logs/
    └── <project-id>.md
```

Requirements:

- The root folder can be renamed during onboarding.
- File roles are fixed for the MVP.
- Project Tasks remain inside the relevant Project note’s managed section.
- Daily summaries use the existing daily-note location and date format when detected or the user-provided configuration.
- The app-managed folder remains visible in Obsidian; it is not a hidden dot-folder.

## 21. Onboarding

First run must:

1. Ask the user to select the Obsidian Vault directory.
2. Validate that the directory is readable and writable.
3. Ask for or confirm the app-managed folder.
4. Detect the daily-note location and date format where possible; otherwise ask.
5. Ask for default focus and Break durations.
6. Allow registration of the first Project note or skipping to Inbox.
7. Explain which files and managed sections the app may modify.
8. Preview files that will be created.
9. Create files only after confirmation.

Onboarding does not require an account, plugin, tutorial carousel, or template import.

## 22. Reminders and notifications

### 22.1 Task reminders

- A Task can have one optional local reminder.
- Reminder notification displays the Task title and relevant Project.
- Clicking opens the Resume Packet.
- Snooze options: 10 minutes, 1 hour, and tomorrow.
- Dismissal leaves Task state unchanged.
- Reminder recurrence is not supported.
- If notification permission is denied, the reminder remains visible in the app.

### 22.2 Focus notifications

- One local notification when Minimum Commitment ends.
- One local notification when a Break ends.
- Sound is configurable.
- Periodic “still focused?” prompts are disabled and not required.
- A notification never automatically starts a Focus Session.

## 23. Desktop experience

### 23.1 Experience character

- Calm, compact, and keyboard-first.
- Progressive disclosure instead of dense dashboards.
- Native system appearance support.
- No gamification.
- The application is an execution surface, not a destination for prolonged organization.

### 23.2 Required desktop affordances

- Global shortcut for Task capture.
- Global shortcut for opening the execution queue, subject to OS shortcut availability.
- Keyboard navigation across primary views.
- Keyboard actions for opening a Resume Packet; starting, pausing, resuming, and ending a session; completing a Checkpoint; and opening Obsidian links.
- Compact always-on-top timer window.
- macOS menu-bar presence.
- Windows tray implementation retained for build portability.
- Shortcut conflict feedback and configurable alternatives.

## 24. Local-first privacy and security

### 24.1 Privacy

- No account.
- No telemetry.
- No remote analytics.
- No remote AI.
- No application-managed cloud sync.
- No Vault content leaves the device.
- Network access is not required for core use.

### 24.2 Electron security boundary

The architecture follows [ADR-0001](docs/adr/0001-use-electron-vue.md):

- `nodeIntegration` is disabled in renderer windows.
- Context isolation is enabled.
- Renderer sandboxing is enabled.
- The renderer does not receive Node, filesystem, SQL, shell, or generic IPC APIs.
- The preload script exposes one narrow method per permitted operation through `contextBridge`.
- IPC sender and payload validation is mandatory.
- Runtime schemas validate IPC, persistence, event, settings, and parsed-Markdown data.
- Remote web content is not loaded inside application windows.
- External links are validated before being opened with the system browser.
- Vault paths are canonicalized and must remain inside the configured Vault.

## 25. Technical architecture

### 25.1 Stack

- Electron.
- Vue 3.
- Composition API.
- Pinia.
- Plain JavaScript.
- Vite.
- Electron Forge.
- `better-sqlite3` behind a dedicated persistence module.
- Reusable runtime schema validation.

Exact versions and the package-manager lockfile are committed. Dependency upgrades are deliberate because Electron Forge’s Vite integration may introduce breaking changes.

### 25.2 Process responsibilities

#### Main process

- Application lifecycle.
- Vault selection and path validation.
- Markdown reads, guarded writes, and atomic replacement.
- File watching and self-write suppression.
- SQLite, migrations, and transactions.
- Timer truth and crash recovery.
- Notifications and reminders.
- Global shortcuts.
- Tray and window management.
- Validated IPC handlers.

#### Preload script

- Narrow `contextBridge` surface.
- Input/output validation.
- Specific event subscriptions.
- No generic IPC forwarding.

#### Vue renderer

- Views and interaction.
- Resume Packet assembly and presentation.
- Task and Checkpoint forms.
- Lifecycle rules and user-facing reconciliation workflows.
- Pinia state.
- Session History and Activity presentation.
- Display timer derived from main-process timestamps.

### 25.3 Two-store model

#### Vault Markdown

Durable, readable representation of:

- Managed Tasks.
- Project Focus Logs and Checkpoints.
- Daily summaries.
- Activity Journal.
- Trash.

#### App-local SQLite

Canonical/query-oriented storage for:

- Append-only lifecycle events.
- Timer and recovery state.
- Last-known Task snapshots.
- Reconciliation metadata.
- Corrections.
- Preferences.
- Search/query indexes.

SQLite must live in the application-data directory, not inside the Vault. Pinia state is not durable truth.

### 25.4 Cross-platform constraint

- No hard-coded `/Users/...` paths.
- Use Node/Electron platform path APIs.
- Keep path separators and filesystem case behavior platform-neutral.
- Use `CommandOrControl` shortcut abstractions where appropriate.
- Use Electron APIs for notifications, tray, dialogs, and windows instead of macOS-only APIs.
- Windows CI packages an unsigned x64 artifact.
- Windows is labeled build-verified, not manually tested.

## 26. Non-functional requirements

### 26.1 Safety

- No silent overwrite of ambiguous Vault changes.
- App writes must be atomic where the operating system permits.
- App restart must not corrupt an active timer or event store.
- Lifecycle and Correction records are append-only.
- Clearing history requires explicit destructive confirmation.

### 26.2 Performance

- Task capture should open promptly from the global shortcut.
- Resume Packet generation should not require a whole-vault AI or content scan.
- UI countdown accuracy must derive from timestamps rather than accumulated intervals.
- Large filesystem operations and migrations must not visibly freeze the renderer.

### 26.3 Accessibility and operability

- Primary workflows are keyboard-operable.
- Focus indicators are visible.
- Controls have accessible labels.
- Information is not communicated through color alone.
- Text remains usable at system scaling settings.

### 26.4 Portability and retention

- Durable Markdown is readable without the application.
- Event/session history is retained indefinitely until explicitly cleared.
- App-local data can be exported in a future version; an export UI is not required for MVP if Markdown projections are current.

## 27. Formal technical spike gate

Before full product-screen development, a technical spike must demonstrate all of the following:

- [ ] Electron/Vue launches with sandboxing and context isolation enabled.
- [ ] A test Vault can be selected.
- [ ] Paths outside the authorized Vault are rejected.
- [ ] A Project note can be read through narrow preload IPC.
- [ ] A managed section can be modified without altering unrelated note content.
- [ ] A conflicting external edit is detected and preserved.
- [ ] A SQLite lifecycle event can be inserted and queried.
- [ ] `better-sqlite3` rebuilds and packages correctly for Electron.
- [ ] External file changes are detected without self-write loops.
- [ ] A global shortcut can be registered and conflicts reported.
- [ ] A local notification can be displayed.
- [ ] A tray/menu-bar item and compact always-on-top timer can be created.
- [ ] Active timer state survives relaunch and supports recovery.
- [ ] Logged records include date, time, UTC offset, IANA timezone, and UTC instant.
- [ ] Windows CI completes an unsigned x64 package build.

If the spike fails, implementation pauses for scope or architecture correction before full UI work proceeds.

## 28. Primary acceptance scenario

1. The user invokes global capture.
2. They create a Task in Inbox.
3. A `created` event is logged with date, time, UTC offset, timezone, and UTC instant.
4. They link the Task to an existing Project note and set a start date and estimate.
5. One grouped `edited` event records the changed fields and complete Logged Timestamp.
6. The user starts work.
7. The app presents a deterministic Resume Packet.
8. The user confirms a 25-minute Minimum Commitment.
9. The timer reaches 25 minutes, notifies once, and enters Overflow.
10. The user finishes later.
11. They record an Outcome, Next Action, and `continue` Status.
12. The app writes the canonical Checkpoint with full session and Checkpoint temporal fields.
13. The app appends a concise daily-note summary and link.
14. Session History displays planned, actual, and Overflow duration.
15. The next day, the user selects the same Task.
16. The previous Checkpoint and Supporting Notes appear in the Resume Packet.
17. The user resumes without manually searching the Vault.
18. The user later completes, reopens, edits, and deletes the Task.
19. Each lifecycle transition remains reviewable in Activity and readable in Markdown, with date, time, UTC offset, timezone, and UTC instant.

## 29. Failure and edge-case acceptance criteria

### 29.1 External edit

Given the user changes a managed Task directly in Obsidian while the app is closed, when the app next reconciles, it records the semantic difference as an external lifecycle event with a detection timestamp and does not misrepresent it as the exact edit time.

### 29.2 Write conflict

Given the Project note changed after the app read it, when the app cannot safely merge its managed-section update, it preserves both states and shows conflict resolution instead of overwriting the note.

### 29.3 Missing Project note

Given a Project note is moved or renamed, the app attempts identity-based resolution. If unresolved, it blocks new sessions for that Project and permits relinking without deleting history.

### 29.4 Crash recovery

Given a Focus Session was active when the app closed unexpectedly, the next launch offers resume, corrected finish, or discard. A corrected session is visibly marked and preserves original recovery information.

### 29.5 Task switching

Given a Focus Session is active, attempting to start another Task requires ending the current session and completing its Checkpoint first.

### 29.6 Invalid Checkpoint

The app refuses to finish a session when Outcome is missing, Status is invalid, or Next Action is absent for `continue` or `blocked`.

### 29.7 Duplicate Task ID

The app treats duplicate block IDs as a conflict and does not merge their histories automatically.

### 29.8 Timezone change

Given the system timezone changes between sessions or during the product trial, each new logged entry retains its own local date, local time, UTC offset, IANA timezone, and UTC instant. Existing entries are not rewritten to the new timezone.

### 29.9 Notification permission denied

The app remains usable, shows reminders in-app, and communicates that system notifications are unavailable.

### 29.10 Windows CI

The Windows workflow installs dependencies, rebuilds native modules for Electron, runs automated tests, and produces an unsigned x64 package. Success is recorded as build portability, not runtime verification.

## 30. Assignment requirement traceability

| Assignment requirement | PRD coverage |
|---|---|
| Combined to-do and Pomodoro/focus application | Sections 10–18 |
| Obsidian logging | Sections 17, 20, and 25 |
| Task creation logging | Sections 12–13 |
| Task edit logging | Sections 12–13 |
| Task completion logging | Sections 12–13 |
| Task reopening logging | Sections 12–13 |
| Task deletion logging | Sections 12–13 |
| Every logged entry includes date | Section 9 and acceptance criteria |
| Every logged entry includes time | Section 9 and acceptance criteria |
| Every logged entry includes timezone | Section 9 and acceptance criteria |
| Adjustable focus duration | Section 16 |
| Adjustable Break duration | Section 16 |
| Review past completed sessions | Section 18 |
| Resume context before focus | Section 15 |
| Structured post-session Checkpoint | Section 17 |

## 31. Assumptions and risks

### 31.1 Assumptions

- The representative user is sufficient for MVP decisions.
- One Vault is enough for the assignment.
- Obsidian-compatible Markdown and block IDs remain available.
- The user accepts app-managed sections in Project notes.
- macOS 15.6 on Apple silicon is the only runtime environment guaranteed during development.
- Windows code is compiled and packaged through CI but may not be manually tested.
- Unsigned artifacts are acceptable for assignment submission.

### 31.2 Principal risks

| Risk | Mitigation |
|---|---|
| Electron renderer gains excessive privileges | Context isolation, sandbox, disabled Node integration, narrow preload APIs, IPC validation |
| App damages user-authored Markdown | Managed-section boundaries, atomic writes, snapshots, conflict detection, technical spike |
| File watcher creates duplicate events | Debounce, self-write suppression, snapshot reconciliation |
| SQLite native module fails to package on Windows | Early `better-sqlite3` packaging spike and Windows CI |
| Resume Packet becomes too large | Fixed default contents and progressive disclosure |
| Checkpoint feels burdensome | Three required fields and under-20-second target |
| Proxy success metrics overstate usefulness | “Not useful/search required” controls and optional end-of-day correction |
| Timezone ambiguity or daylight-saving errors | Store local date/time, offset, IANA timezone, and UTC instant on every entry |
| Teacher expects verified Windows behavior | Clearly label support level and provide CI-built artifact plus source instructions |

## 32. Future considerations

Not committed to the MVP:

- Manual Windows smoke testing and verified Windows support.
- Mobile companion.
- Multiple Vaults.
- Recurring Tasks.
- Natural-language capture.
- Optional AI-assisted Resume Packet summarization performed locally or with explicit consent.
- Task/calendar integrations.
- Session analytics beyond history and simple planned-versus-actual review.
- Export and restore tooling for the SQLite event store.
- Optional Obsidian plugin for precise active-note tracking.
- Signed distribution and automatic updates.
