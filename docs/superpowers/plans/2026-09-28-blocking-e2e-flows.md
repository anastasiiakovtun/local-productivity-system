# Blocking End-to-End Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete packaged task/session/break lifecycle and apply the approved visual handoff.

**Architecture:** Stores resolve the selected vault through `getVaultRoot()` at write time. `App.vue` coordinates a small explicit screen state; break timing remains renderer-only. Each slice ends with packaged manual verification against an isolated vault.

**Tech Stack:** Electron Forge 7, Vue 3 Composition API, Pinia, plain JavaScript, better-sqlite3, Vitest, Playwright, Phosphor Vue.

**Spec:** `docs/superpowers/specs/2026-09-28-blocking-e2e-flows-design.md`

## Global Constraints

- Implement tasks in the listed order.
- Use RED-GREEN TDD for every behavior change.
- Do not add crash recovery or active-session restoration.
- Breaks are non-durable and use `defaultBreakMinutes`.
- Primary teal buttons use regular-weight `#0f0f13` text.
- Borders/dividers use `0.5px` fading reflected-light gradients; icon placeholders use rounded gradient containers.
- Launch and exercise the packaged executable after every task.

## Review Focus

- Missing vault selection returns a controlled error, never a `path.join` type error.
- Any failed create removes task/event rows and restores Inbox content.
- Failed IPC operations do not advance the screen state.
- Repeated focus/abandon cycles do not retain stale selected-task or timer state.
- Break completion creates no session, checkpoint, event, or Markdown record.

---

### Task 1: Live vault root and atomic task creation

**Files:**
- Modify: `src/main.js`
- Modify: `src/main/task-store.js`
- Modify: `src/main/task-event-store.js`
- Modify: `src/main/checkpoint-store.js`
- Test: `tests/unit/task-store.test.js`
- Test: `tests/unit/task-event-store.test.js`
- Test: `tests/unit/checkpoint-store.test.js`

**Interfaces:**
- Produces: constructors accepting `getVaultRoot: () => string`; controlled `vault-not-selected` errors.

- [ ] Add failing tests proving a mutable vault getter resolves the latest string path.
- [ ] Add a failing create test whose `writeSection` rejects; assert zero `tasks` and `task_events` rows.
- [ ] Add a failing post-write test; assert original Inbox managed section is restored.
- [ ] Run `npm test -- tests/unit/task-store.test.js tests/unit/task-event-store.test.js tests/unit/checkpoint-store.test.js`; expect failures caused by current path contract and orphan row.
- [ ] Replace proxy/value paths with `getVaultRoot()` and validate its result before filesystem work.
- [ ] Coordinate create with explicit `BEGIN`/`COMMIT`/`ROLLBACK`; restore original Inbox section on failure.
- [ ] Run focused tests, then `npm test`; expect all pass.
- [ ] Run `npm run test:e2e`, launch packaged app with fresh user-data/vault, create a task, and inspect `Inbox.md`, `Activity.md`, tasks, and task_events.
- [ ] Manually force an unwritable/failed create and verify no orphan rows.
- [ ] Commit `fix: make task creation atomic in selected vault`.

### Task 2: Reachable focus-session and Checkpoint flow

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/InboxView.vue`
- Modify: `src/views/TodayView.vue`
- Modify: `src/views/TimerView.vue`
- Modify: `src/views/CheckpointView.vue`
- Modify: `src/stores/session.js`
- Modify: `src/main/app-handlers.js`
- Modify: `src/main/checkpoint-store.js`
- Test: `tests/renderer/App.test.js`
- Test: `tests/renderer/InboxView.test.js`
- Test: `tests/renderer/TodayView.test.js`
- Test: `tests/renderer/TimerView.test.js`
- Test: `tests/unit/app-handlers.test.js`
- Test: `tests/unit/checkpoint-store.test.js`

**Interfaces:**
- Produces: task views emit `focus(task)`; App screen states `list|resume|timer|checkpoint|break-offer|break`; abandoned Focus Log writer.

- [ ] Add failing renderer tests for Focus entry, resume start/cancel, timer end/abandon, Checkpoint cancel/save, and no transition after failed IPC.
- [ ] Add failing main-process tests proving abandon writes Focus Log Markdown and Session History remains queryable.
- [ ] Run focused tests; expect missing controls/transitions/logging failures.
- [ ] Implement App screen coordinator and mount existing Resume Packet, Timer, and Checkpoint components.
- [ ] Add Focus actions to Inbox and Today and explicit success/failure events from Timer/Checkpoint.
- [ ] Route abandon through the existing Focus Log owner; clear renderer state only on success.
- [ ] Run focused tests and `npm test`.
- [ ] Package and manually verify start, pause, resume, Checkpoint cancel, Checkpoint save, second-session abandon, Focus Logs, and Sessions screen.
- [ ] Commit `feat: connect focus session lifecycle`.

### Task 3: Inbox task editing and lifecycle verification

**Files:**
- Modify: `src/views/InboxView.vue`
- Modify: `src/stores/tasks.js`
- Test: `tests/renderer/InboxView.test.js`

**Interfaces:**
- Produces: `editTask(id, changes)`; inline title/project-label form.

- [ ] Add failing tests for Edit, initial values, empty-title validation, Save, Cancel, retry after error, and refresh after success.
- [ ] Run `npm test -- tests/renderer/InboxView.test.js`; expect missing Edit behavior failures.
- [ ] Implement Pinia `editTask` and minimal inline form.
- [ ] Run focused tests and `npm test`.
- [ ] Package and manually create, edit, complete, reopen, and delete a task; inspect Inbox and Activity Markdown after every action.
- [ ] Commit `feat: edit Inbox tasks inline`.

### Task 4: Non-durable break flow

**Files:**
- Create: `src/views/BreakView.vue`
- Modify: `src/App.vue`
- Test: `tests/renderer/BreakView.test.js`
- Test: `tests/renderer/App.test.js`

**Interfaces:**
- Consumes: `window.app.getPreferences()`.
- Produces: `BreakView` events `done`; App break offer actions `takeBreak()` and `finishFlow()`.

- [ ] Add failing tests for break offer after Checkpoint, preference duration, countdown, `End Break`, completion text, and Done.
- [ ] Add a test snapshotting IPC calls before/after break; assert no durable write call occurs.
- [ ] Run focused tests; expect missing component/state failures.
- [ ] Implement break offer and timestamp-derived renderer countdown.
- [ ] Run focused tests and `npm test`.
- [ ] Package with `defaultBreakMinutes=1`; manually save Checkpoint, start/end or complete break, and verify SQLite/Markdown have no break record.
- [ ] Run full requested lifecycle from a fresh vault and inspect all Markdown/SQLite records.
- [ ] Commit `feat: add non-durable break timer`.

### Task 5: Visual handoff and Phosphor navigation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/App.vue`
- Modify: `src/styles.css`
- Modify: existing view templates only where semantic classes are required
- Test: `tests/renderer/App.test.js`

**Interfaces:**
- Adds runtime dependency `@phosphor-icons/vue`.

- [ ] Add failing App tests asserting four icon components, labels, and `aria-current="page"`.
- [ ] Install `@phosphor-icons/vue` and map House, CalendarBlank, CheckCircle, and ClockCounterClockwise to current nav items.
- [ ] Apply exact handoff tokens, radial gradient, selected-nav indicator, radii, fields, cards, reduced-motion/transparency rules, and semantic colors.
- [ ] Replace solid separators with `0.5px` reflected-light gradients that fade to the dark surface; use rounded gradient containers for every icon/image placeholder.
- [ ] Set every primary teal button to regular-weight dark `#0f0f13` text.
- [ ] Run renderer tests and `npm test`.
- [ ] Run `npm run test:e2e`; launch packaged app at 1000×700 and inspect every reachable screen for contrast, focus, clipping, icons, fading `0.5px` edges, rounded gradient icon containers, and handoff fidelity.
- [ ] Repeat final clean-vault lifecycle; inspect Inbox, Activity, both Focus Logs, Sessions UI, and SQLite.
- [ ] Commit `style: apply visual handoff and navigation icons`.

### Task 6: Whole-branch verification

**Files:** none unless a verified defect requires a TDD fix.

- [ ] Run `npm test`; require all tests pass.
- [ ] Run `npm run test:e2e`; require packaged smoke pass.
- [ ] Launch packaged executable independently and complete the full manual lifecycle once more.
- [ ] Record exact Markdown paths and compare lifecycle entries to SQLite rows.
- [ ] Run `git diff --check` and confirm clean worktree.
- [ ] Dispatch whole-branch reviewer; fix accepted findings with RED-GREEN tests.
- [ ] Report commits, test counts, package path, manual evidence, and any remaining limitation.
