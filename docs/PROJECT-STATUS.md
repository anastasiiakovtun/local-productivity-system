# Project Status

**Last updated:** 2026-09-28  
**Repo:** `local-productivity-system`  
**Main branch HEAD:** `b6095aa`  
**Pending merge:** `feat/product` (9 commits ahead of main, 228/228 tests pass)

---

## What's built

### Merged into `main`

#### Spike #1 — Secure Electron/Vue scaffold + Vault selection (`154a9f0`)
- Sandboxed BrowserWindow (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`).
- Vault directory selection via native dialog.
- Vault validation: readable, writable, contains `.obsidian/`.
- Path guard: traversal rejection, symlink containment, canonicalisation.
- Narrow `contextBridge` surface: `window.vault.select()` only.
- Smoke test: vault keys, sandbox preferences, no `window.require`/`window.process`.
- Stale-package artifact detection fixed (`extract-zip` override for Node 26 + Forge 7.11.2).

#### Spike #2 — Safe vault note read/write with sentinel markers (`c88eaa6`)
- `window.vault.readNote(relativePath)` → `{ status, content, mtime }`.
- `window.vault.writeSection(relativePath, newContent, mtime)` → atomic `.tmp`→rename write.
- Sentinel format: `<!-- focus:tasks:start -->` / `<!-- focus:tasks:end -->` (invisible in Obsidian, survives user subheadings, works mid-note or at EOF).
- Conflict detection: mtime checked before write; returns `{ status: 'conflict' }` rather than overwriting.
- Path guard rejects `../` traversal, absolute-outside-vault, empty string, symlink escapes.
- 129/129 tests.

#### Docs
- `docs/superpowers/specs/2026-09-28-electron-vue-vault-selection-design.md`
- `docs/superpowers/specs/2026-09-28-vault-note-io-design.md`
- `docs/superpowers/specs/2026-09-28-product-design.md`
- `docs/superpowers/plans/2026-09-28-electron-vue-vault-selection.md`
- `docs/superpowers/plans/2026-09-28-vault-note-io.md`
- `docs/superpowers/plans/2026-09-28-product.md`
- `docs/spikes/001-electron-vue-vault-selection.md`
- `docs/spikes/002-vault-note-io.md`

---

### Ready to merge — `feat/product` (9 commits, 228/228 tests)

| Commit | Delivers |
|---|---|
| `bad37d5` | `better-sqlite3` installed, rebuilt for Electron, migration runs, package artifact still passes |
| `40efd0d` | `loggedTimestamp()` (all 5 PRD §9 fields); `TaskEventStore` → `task_events` SQLite + `Productivity/Activity.md` append |
| `9732547` | Task CRUD: create/edit/complete/reopen/delete; `markdown-tasks.js` pure parser; `TaskStore` with injected deps |
| `26dd931` | `app-handlers.js` (sender/arg guards); `window.app` bridge (15 methods); `app-schema.js` validators |
| `7bbb884` | Navigation shell (Inbox/Today/Completed/Sessions sidebar); Inbox view with capture bar; Pinia stores; vault init flow |
| `a4a40f7` | Today view; Completed view with client-side search filter and reopen |
| `277563d` | `SessionStore` (start/pause/resume/abandon); Resume Packet screen (task title, project label, last checkpoint outcome/status, duration selector); Timer view (countdown → Overflow, pause/resume, abandon) |
| `ef70d14` | `CheckpointStore`; Checkpoint form (outcome, status, conditional next action); Focus Log append per task (`Productivity/Focus Logs/<task_id>.md`); session start + abandon + completed all write durable LoggedTimestamp records |
| `5584779` | Session History view (reverse-chron, expandable detail, date/status filters); `sessions:list` IPC handler with LEFT JOIN to checkpoints |

#### Session lifecycle logging (assignment requirement confirmation)

All three session events produce durable SQLite records with full LoggedTimestamp fields:

- **Session start** — `sessions` row inserted with `status='active'` + `started_*` timestamp the moment the user clicks Start.
- **Session abandoned** — `status='abandoned'` + `ended_*` timestamp + one-line entry appended to Focus Log.
- **Session completed** — `status='ended'` + `ended_*` + `actual_seconds` + `overflow_seconds`; full Checkpoint appended to Focus Log.

---

## Key scope decisions and rationale

| Dropped | Reason |
|---|---|
| Full Projects screen with vault-note browsing/linking | Not in §30 assignment requirements; `project_label` plain-text field on each task is sufficient |
| Onboarding wizard | Not required — vault path stored silently after first selection; no multi-step setup needed |
| Trash view + soft-delete | Assignment doesn't require a trash bin; hard-delete keeps the codebase smaller without losing the logged `deleted` event in SQLite |
| Activity log in-app viewer | Events still written to `Productivity/Activity.md` in the vault (readable in Obsidian); no in-app UI screen required by assignment |
| System notifications | §27 spike item; deferred — timer Overflow is visible in-app |
| Tray / menu-bar | §27 spike item; deferred |
| Global shortcuts | §27 spike item; deferred |
| Crash recovery | §27 spike item; deferred |
| File watcher / external edit detection | §27 spike item; deferred |
| Windows CI | §27 spike item; deferred |
| Upcoming view | Not in §30 minimum; Today + Completed cover the required views |
| Supporting Notes in Resume Packet | Deferred; PRD §15.2 feature, not in §30 assignment requirements |
| Daily-note integration | Deferred; Focus Log write alone satisfies §17 |

---

## Still required / outstanding

### Immediately before submission

1. **Merge `feat/product` → `main`** — 228/228 pass, whole-branch review pending.
2. **End-to-end manual verification** — launch the packaged app, select a vault, create a task, run a focus session, complete a checkpoint, view session history. Automated tests cover units and renderer; a live smoke-run confirms wiring.
3. **README** — no user-facing README exists. Needs: what the app does, how to install deps and run (`npm install && npm start`), how to run tests (`npm test`), platform notes (macOS arm64 verified, Windows unverified).
4. **Session start/abandon logging to vault** — confirmed present in SQLite; verify the abandoned-session line is actually appended to the Focus Log file in a real run (covered by unit test but not e2e).

### Deferred (post-deadline, if time allows)

- System notifications (Overflow + Break end).
- Tray / menu-bar / compact always-on-top timer.
- Global shortcuts for capture and task queue.
- Crash recovery (persist timer state across unclean quit).
- File watcher + external edit detection and conflict resolution UI.
- Windows CI artifact build.
- Corrections to historical sessions.
- Upcoming view (tasks with future start dates).
- Supporting Notes in Resume Packet.
- Daily-note summary integration.

---

## Branch state

```
main          b6095aa  ← last merged (spike #2 docs + product spec/plan)
feat/product  5584779  ← 9 tasks complete, 228/228 tests, ready to merge
feat/todo-app          ← old scaffold branch, superseded
feat/pomodoro-timer    ← old scaffold branch, superseded
```

Worktree: `.worktrees/product` (git-ignored, safe to delete after merge).
