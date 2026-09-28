# Complete Design Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining `DESIGN-HANDOFF.md` scope through six visible-first, independently verified slices without replacing the working task and focus-session architecture.

**Architecture:** Keep `App.vue` as the screen coordinator. Extract reusable visual components, the sidebar, timer surfaces, and keyboard behavior into focused Vue components/composables. Extend the existing SQLite/IPC/preload layers only for durable project colors, supporting notes, preferences, Home resume data, and optional abandon outcomes.

**Tech Stack:** Electron Forge 7, Vite, Vue 3 Composition API, Pinia, plain JavaScript, better-sqlite3, `@phosphor-icons/vue`, Vitest, Vue Test Utils, Playwright packaged smoke tests.

**Spec:** `docs/superpowers/specs/2026-09-28-complete-design-handoff-design.md`

## Global Constraints

- Preserve the managed Markdown sentinels `<!-- focus:tasks:start -->` and `<!-- focus:tasks:end -->` on their own lines.
- Keep `App.vue` screen coordination; do not introduce Vue Router.
- Use `0.5px` reflected-light borders and fade-ended dividers.
- Put empty-state and section icons inside rounded rectangular gradient containers.
- Primary buttons use `#2dd4bf` with regular-weight `#0f0f13` text.
- Use only Phosphor icons, regular at approximately `18px`, with fill for selected navigation.
- Project covers support predefined color swatches only; no images or arbitrary picker.
- Supporting notes persist in SQLite only and never enter managed Markdown.
- `sidebarCollapsed` and `floatingTimerEnabled` default to `false`.
- Floating timer preference requires explicit opt-in.
- Active-session crash/relaunch recovery remains out of scope.
- Breaks remain renderer-only and non-durable.
- Follow strict RED-GREEN-REFACTOR. Run `npm test` and `npm run test:e2e` after every major slice.
- Manually launch and inspect the packaged app after every major slice before committing.

## Review Focus

- A saved preference contains the wrong type: reject it and retain the previous value instead of corrupting layout state.
- A checkpoint references a deleted or completed task: Home skips it and renders the next eligible open task or empty state.
- A plain-key shortcut fires while typing: input, textarea, select, and contenteditable targets must suppress it.
- A quick-abandon log write fails: keep the timer visible and return an error rather than clearing session state.
- A project label is null, renamed, or has an invalid color: render the neutral fallback and reject colors outside the fixed palette.

---

### Task 1: Refine Add Action and Icon Containers

**Files:**
- Create: `src/components/IconContainer.vue`
- Modify: `src/views/InboxView.vue`
- Modify: `src/views/TodayView.vue`
- Modify: `src/views/CompletedView.vue`
- Modify: `src/views/SessionHistoryView.vue`
- Modify: `src/styles.css`
- Create: `tests/renderer/IconContainer.test.js`
- Modify: `tests/renderer/InboxView.test.js`
- Modify: `tests/renderer/TodayView.test.js`
- Modify: `tests/renderer/CompletedView.test.js`
- Modify: `tests/renderer/SessionHistoryView.test.js`

**Interfaces:**
- Produces: `IconContainer` component with `size: Number` prop and default icon slot.
- Produces: Inbox Add button containing Phosphor `Plus` and text `Add` at regular weight.

- [ ] **Step 1: Write failing component tests**

Add tests that mount `IconContainer` and assert:

```js
expect(wrapper.classes()).toContain('icon-container');
expect(wrapper.attributes('style')).toContain('--icon-container-size: 48px');
```

Add renderer tests that assert every empty state contains `.icon-container`, and Inbox Add contains an SVG followed by `Add`.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- tests/renderer/IconContainer.test.js tests/renderer/InboxView.test.js tests/renderer/TodayView.test.js tests/renderer/CompletedView.test.js tests/renderer/SessionHistoryView.test.js
```

Expected: failures because `IconContainer.vue` and icon-backed empty states do not exist.

- [ ] **Step 3: Implement the shared icon container and Add correction**

`IconContainer.vue` must expose:

```vue
<script setup>
defineProps({ size: { type: Number, default: 48 } });
</script>

<template>
  <span class="icon-container" :style="{ '--icon-container-size': `${size}px` }">
    <slot />
  </span>
</template>
```

Use suitable Phosphor icons for each empty state. Update Inbox Add to:

```vue
<button type="submit" class="btn-primary capture-add" :disabled="!newTitle.trim()">
  <PhPlus :size="16" weight="regular" aria-hidden="true" />
  <span>Add</span>
</button>
```

Add CSS for fixed-size gradient containers and `.capture-add { font-weight: 400; }`.

- [ ] **Step 4: Run focused and full tests**

```bash
npm test -- tests/renderer/IconContainer.test.js tests/renderer/InboxView.test.js tests/renderer/TodayView.test.js tests/renderer/CompletedView.test.js tests/renderer/SessionHistoryView.test.js
npm test
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 5: Manually verify packaged app**

Launch the packaged app. Inspect Inbox Add alignment, label weight, keyboard focus, and every empty-state container at normal and narrow widths.

- [ ] **Step 6: Commit**

```bash
git add src/components/IconContainer.vue src/views src/styles.css tests/renderer
git commit -m "fix: refine add action and icon containers"
```

---

### Task 2: Add Collapsible Application Sidebar

**Files:**
- Create: `src/components/AppSidebar.vue`
- Modify: `src/App.vue`
- Modify: `src/main/app-handlers.js`
- Modify: `src/shared/app-schema.js`
- Modify: `src/styles.css`
- Create: `tests/renderer/AppSidebar.test.js`
- Modify: `tests/renderer/App.test.js`
- Modify: `tests/unit/app-handlers.test.js`
- Create: `tests/unit/app-schema.test.js`

**Interfaces:**
- Consumes: `window.app.getPreferences()` and `window.app.setPreferences(prefs)`.
- Produces: `AppSidebar` props `{ activeView: String, collapsed: Boolean, projects: Array }`.
- Produces events: `navigate(view)`, `toggle-collapse`, `select-project(projectLabel)`.
- Produces preference: `sidebarCollapsed: boolean`, default `false`.

- [ ] **Step 1: Write RED preference-validation tests**

Add tests:

```js
expect(validatePreferences({ sidebarCollapsed: true })).toBeNull();
expect(validatePreferences({ sidebarCollapsed: 'yes' })).toBe('sidebarCollapsed must be boolean');
```

Assert `getPreferences()` returns `sidebarCollapsed: false` when missing.

- [ ] **Step 2: Run validation tests and verify RED**

```bash
npm test -- tests/unit/app-schema.test.js tests/unit/app-handlers.test.js
```

- [ ] **Step 3: Implement preference validation/default**

Extend `validatePreferences()` with exact type checks for known fields. Extend `getPrefs()` with:

```js
sidebarCollapsed: prefs.sidebarCollapsed ?? false,
floatingTimerEnabled: prefs.floatingTimerEnabled ?? false,
```

Do not reject partial preference updates.

- [ ] **Step 4: Write RED sidebar renderer tests**

Cover:

- Expanded width class and visible labels.
- Navigation order Home, Inbox, Today, Completed, Sessions.
- Correct Phosphor icon components.
- Collapsed state hides visual labels but preserves `aria-label`.
- Collapse emits once.
- Project rows render color cover/fallback when passed.
- `aria-current="page"` follows `activeView`.

- [ ] **Step 5: Implement `AppSidebar.vue` and App integration**

Move all sidebar markup from `App.vue`. Use `House`, `Tray`, `CalendarBlank`, `CheckCircle`, `ClockCounterClockwise`, and `SidebarSimple`. Load `sidebarCollapsed` after vault initialization. On toggle:

```js
const previous = sidebarCollapsed.value;
sidebarCollapsed.value = !previous;
const result = await window.app.setPreferences({ sidebarCollapsed: sidebarCollapsed.value });
if (result.status !== 'success') sidebarCollapsed.value = previous;
```

Expose a local alert on failure.

- [ ] **Step 6: Add responsive/reflected-edge CSS**

Use `216px`/`56px` grid columns, `40px` collapsed hit targets, immediate `:focus-visible` tooltips, and preserve the selected accent.

- [ ] **Step 7: Verify slice**

```bash
npm test -- tests/renderer/AppSidebar.test.js tests/renderer/App.test.js tests/unit/app-schema.test.js tests/unit/app-handlers.test.js
npm test
npm run test:e2e
```

Manually verify collapse/expand, restart persistence, tooltips, arrow/tab focus, and narrow-window layout in the package.

- [ ] **Step 8: Commit**

```bash
git add src/components/AppSidebar.vue src/App.vue src/main/app-handlers.js src/shared/app-schema.js src/styles.css tests
git commit -m "feat: add collapsible application sidebar"
```

---

### Task 3: Add Home Dashboard and Project Covers

**Files:**
- Create: `src/main/migrations/002-dashboard-and-resume.sql`
- Create: `src/main/project-cover-store.js`
- Create: `src/components/ProjectCover.vue`
- Create: `src/views/HomeView.vue`
- Create: `src/stores/home.js`
- Modify: `src/main/db.js`
- Modify: `src/main/app-handlers.js`
- Modify: `src/shared/app-schema.js`
- Modify: `src/preload/app-api.js`
- Modify: `src/App.vue`
- Modify: `src/components/AppSidebar.vue`
- Modify: `src/styles.css`
- Create: `tests/unit/project-cover-store.test.js`
- Modify: `tests/unit/db.test.js`
- Modify: `tests/unit/app-handlers.test.js`
- Modify: `tests/unit/app-schema.test.js`
- Modify: `tests/unit/app-api.test.js`
- Create: `tests/renderer/ProjectCover.test.js`
- Create: `tests/renderer/HomeView.test.js`
- Modify: `tests/renderer/App.test.js`

**Interfaces:**
- Migration adds `tasks.supporting_notes TEXT` and `project_covers(project_label TEXT PRIMARY KEY, color TEXT NOT NULL)`.
- Produces preload APIs:
  - `getHomeResume()`
  - `listProjects()`
  - `setProjectCover(projectLabel, color)`
- Produces fixed `PROJECT_COVER_COLORS` shared constant.
- Produces Home events: `resume(task)`, `go-today`, `task-created`.

- [ ] **Step 1: Write RED migration tests**

Open an in-memory migrated DB and assert:

```js
expect(taskColumns).toContain('supporting_notes');
expect(tableNames).toContain('project_covers');
```

Run `npm test -- tests/unit/db.test.js` and verify RED.

- [ ] **Step 2: Add and load migration 002**

Migration content:

```sql
ALTER TABLE tasks ADD COLUMN supporting_notes TEXT;
CREATE TABLE IF NOT EXISTS project_covers (
  project_label TEXT PRIMARY KEY,
  color TEXT NOT NULL
);
```

Bundle/load it in `src/main/db.js` after migration 001. Preserve idempotent migration tracking used by the current DB implementation.

- [ ] **Step 3: Write RED store and IPC tests**

Test:

- Home query returns the newest checkpoint attached to an open task.
- Home skips deleted/completed tasks.
- Project list derives distinct non-null labels.
- Missing cover returns `color: null`.
- Only fixed palette colors are accepted.
- Invalid labels/colors fail validation.

- [ ] **Step 4: Implement project and Home data APIs**

`ProjectCoverStore` methods:

```js
listProjects();
setCover(projectLabel, color);
getHomeResume();
```

`getHomeResume()` joins checkpoints to open tasks, orders by `created_occurred_at_utc DESC`, and returns task fields plus checkpoint outcome/next action and cover color.

Add channels and preload wrappers with sender guards.

- [ ] **Step 5: Write RED component tests**

`ProjectCover` tests color tile vs neutral `FolderSimple` fallback. `HomeView` tests active card, empty state, quick capture, Resume, Go to Today, and palette selection.

- [ ] **Step 6: Implement Home and covers**

Add `useHomeStore()` with `resumeTask`, `projects`, `load()`, and `setProjectCover()`. Integrate Home as default navigation destination. Reuse `ProjectCover` in Home and sidebar project rows.

- [ ] **Step 7: Verify slice**

```bash
npm test -- tests/unit/db.test.js tests/unit/project-cover-store.test.js tests/unit/app-handlers.test.js tests/unit/app-schema.test.js tests/unit/app-api.test.js tests/renderer/ProjectCover.test.js tests/renderer/HomeView.test.js tests/renderer/App.test.js tests/renderer/AppSidebar.test.js
npm test
npm run test:e2e
```

Manual package checks: active/empty Home, newest eligible checkpoint, quick capture, Home Resume, predefined color changes across Home/sidebar, neutral fallback, restart persistence, and real DB rows.

- [ ] **Step 8: Commit**

```bash
git add src/main/migrations/002-dashboard-and-resume.sql src/main/project-cover-store.js src/components/ProjectCover.vue src/views/HomeView.vue src/stores/home.js src/main/db.js src/main/app-handlers.js src/shared/app-schema.js src/preload/app-api.js src/App.vue src/components/AppSidebar.vue src/styles.css tests
git commit -m "feat: add home dashboard and project covers"
```

---

### Task 4: Add Timer Modal, Quick Abandon, and Floating Timer

**Files:**
- Create: `src/components/TimerModal.vue`
- Create: `src/components/QuickAbandonPanel.vue`
- Create: `src/components/FloatingTimer.vue`
- Modify: `src/views/TimerView.vue`
- Modify: `src/stores/session.js`
- Modify: `src/main/checkpoint-store.js`
- Modify: `src/main/app-handlers.js`
- Modify: `src/shared/app-schema.js`
- Modify: `src/preload/app-api.js`
- Modify: `src/App.vue`
- Modify: `src/styles.css`
- Create: `tests/renderer/TimerModal.test.js`
- Create: `tests/renderer/QuickAbandonPanel.test.js`
- Create: `tests/renderer/FloatingTimer.test.js`
- Modify: `tests/renderer/TimerView.test.js`
- Modify: `tests/renderer/App.test.js`
- Modify: `tests/unit/app-handlers.test.js`
- Modify: `tests/unit/checkpoint-store.test.js`
- Modify: `tests/unit/app-api.test.js`
- Optional dedicated-window path only:
  - Create: `src/floating-main.js`
  - Create: `src/floating.html`
  - Create: `src/preload/floating-api.js`
  - Modify: `forge.config.js`
  - Modify: `src/main.js`
  - Add focused unit/package tests for new window options and artifacts.

**Interfaces:**
- `abandonSession(sessionId, outcome = null)` persists optional outcome.
- `TimerModal` emits `finish`, `request-abandon`, and `minimize`.
- `QuickAbandonPanel` emits `back` and `confirm(outcome)`.
- `FloatingTimer` consumes session store and emits `restore`.

- [ ] **Step 1: Run a bounded dedicated-window spike**

Create spike files only under `$TMPDIR/floating-timer-spike/`. Prove renderer packaging, secure narrow preload, pause/resume synchronization, close-without-abandon, and one countdown owner. Run package and launch manually.

Record one of these exact decisions in the task notes before production edits:

Record `Dedicated window selected: all five criteria passed.` when all criteria pass. Otherwise record `Pinned panel fallback selected:` followed by the failed criterion and observed evidence in the task progress notes.

Delete spike files afterward. If fallback is selected, state it in the Task 4 commit body and final report.

- [ ] **Step 2: Write RED optional-abandon tests**

Test validation and handler behavior for `null`, empty, and non-empty outcomes. Assert a non-empty outcome appears in abandoned Focus Log Markdown. Assert a log-write failure returns an error and does not clear the active session.

- [ ] **Step 3: Make abandon reliable and outcome-aware**

Change handler ordering so session state clears only after durable abandon logging succeeds. Extend `CheckpointStore.writeAbandonLog(sessionId, outcome)` and preload API. Keep optional outcome out when blank.

- [ ] **Step 4: Write RED timer-surface tests**

Cover:

- Dialog semantics, project cover, tabular time, Pause/Resume and Finish.
- Close opens quick-abandon without abandoning.
- Back preserves typed outcome and timer state.
- Confirm with empty or non-empty outcome abandons.
- Minimize appears only when floating timer preference is enabled.
- Floating surface shows cover, time, pause/resume, and restore.
- Preference failure restores previous toggle value and shows an error.

- [ ] **Step 5: Implement modal and pinned surface behavior**

Refactor `TimerView` to compose `TimerModal` and `QuickAbandonPanel`. Add `timerPresentation: 'modal' | 'floating'` to App renderer state. `Escape` from quick abandon returns to timer; it never abandons.

Implement `FloatingTimer.vue` unconditionally as the tested presentation component. If the spike selected dedicated window, render equivalent content in the second window and use `FloatingTimer` as shared view logic where practical. If fallback selected, pin it over `.app-shell`.

- [ ] **Step 6: Implement selected floating transport**

**Dedicated-window branch:** Add a secure non-node renderer and narrow preload. Main process owns open/close/focus and forwards session snapshots. Controls send pause/resume/focus-main intents only.

**Fallback branch:** No Forge entry changes. App shows in-window `FloatingTimer` only when opted in and minimized. The existing Pinia session store remains the only countdown owner.

- [ ] **Step 7: Verify slice**

```bash
npm test -- tests/renderer/TimerModal.test.js tests/renderer/QuickAbandonPanel.test.js tests/renderer/FloatingTimer.test.js tests/renderer/TimerView.test.js tests/renderer/App.test.js tests/unit/app-handlers.test.js tests/unit/checkpoint-store.test.js tests/unit/app-api.test.js
npm test
npm run test:e2e
```

Manually verify timer modal/backdrop, pause/resume, Finish, close/back, empty/non-empty abandon, preference default-off, preference restart persistence, minimize/restore, and selected floating implementation. Inspect SQLite and Focus Log Markdown.

- [ ] **Step 8: Commit**

For a dedicated window:

```bash
git add src forge.config.js tests
git commit -m "feat: add timer surfaces and quick abandon" -m "Floating timer implementation: dedicated Electron window. All five spike criteria passed."
```

For the fallback:

```bash
git add src tests
git commit -m "feat: add timer surfaces and quick abandon" -m "Floating timer implementation: pinned in-window fallback. Dedicated-window spike failed at least one required criterion; evidence is recorded in task progress and the final report."
```

---

### Task 5: Enhance Resume Packet Context

**Files:**
- Create: `src/components/ResumeSection.vue`
- Modify: `src/views/ResumePacketView.vue`
- Modify: `src/main/task-store.js`
- Modify: `src/main/app-handlers.js`
- Modify: `src/shared/app-schema.js`
- Modify: `src/preload/app-api.js`
- Modify: `src/stores/tasks.js`
- Modify: `src/styles.css`
- Create: `tests/renderer/ResumeSection.test.js`
- Modify: `tests/renderer/ResumePacketView.test.js`
- Modify: `tests/unit/task-store.test.js`
- Modify: `tests/unit/app-handlers.test.js`
- Modify: `tests/unit/app-schema.test.js`
- Modify: `tests/unit/app-api.test.js`

**Interfaces:**
- Consumes: migrated `tasks.supporting_notes` from Task 3.
- Produces: `editTask(id, { supportingNotes })` update.
- Produces: `ResumeSection` props `{ label, icon, tone }` and default content slot.

- [ ] **Step 1: Write RED persistence tests**

Test nullable string validation, DB update, unchanged Markdown task line, and `changed_fields` event metadata. Reject non-string/non-null notes.

- [ ] **Step 2: Implement supporting-notes update**

Map API `supportingNotes` to DB `supporting_notes`. Keep existing title/project edit behavior. Do not include notes in Markdown rendering.

- [ ] **Step 3: Write RED Resume Packet tests**

Cover project cover/header, `MapPinLine`, `ArrowBendDownRight`, `NotePencil`, `WarningCircle`, icon containers, last checkpoint outcome/next action/blocker, empty blocker copy, and supporting-note Edit/Save/Cancel/error.

- [ ] **Step 4: Implement richer Resume Packet**

Use `ResumeSection.vue` for each context block. Inline note editor keeps a draft, restores on Cancel, and stays open on failed Save. Start Session remains primary and receives initial focus when notes are not editing.

- [ ] **Step 5: Verify slice**

```bash
npm test -- tests/renderer/ResumeSection.test.js tests/renderer/ResumePacketView.test.js tests/unit/task-store.test.js tests/unit/app-handlers.test.js tests/unit/app-schema.test.js tests/unit/app-api.test.js
npm test
npm run test:e2e
```

Manual package checks: notes save/cancel/restart/error, no notes in Inbox/Activity/Focus Log Markdown, icon containers, blocker states, project cover, and session start.

- [ ] **Step 6: Commit**

```bash
git add src/components/ResumeSection.vue src/views/ResumePacketView.vue src/main/task-store.js src/main/app-handlers.js src/shared/app-schema.js src/preload/app-api.js src/stores/tasks.js src/styles.css tests
git commit -m "feat: enhance resume packet context"
```

---

### Task 6: Add Application Keyboard Shortcuts

**Files:**
- Create: `src/composables/useKeyboardShortcuts.js`
- Modify: `src/App.vue`
- Modify: `src/components/AppSidebar.vue`
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/InboxView.vue`
- Modify: `src/views/TimerView.vue`
- Modify: `src/views/CheckpointView.vue`
- Modify: `src/styles.css`
- Create: `tests/renderer/useKeyboardShortcuts.test.js`
- Modify: `tests/renderer/App.test.js`
- Modify: `tests/renderer/HomeView.test.js`
- Modify: `tests/renderer/TimerView.test.js`
- Modify: `tests/renderer/CheckpointView.test.js`

**Interfaces:**
- Produces `useKeyboardShortcuts({ onQuickCapture, onGoToday, onResumeTask, onTimerToggle, onTimerStop, onEscape, onCheckpointSave, isTimerActive, isCheckpointOpen })`.
- Produces `isTypingTarget(target): boolean` helper exported for direct testing.

- [ ] **Step 1: Write RED shortcut/composable tests**

Cover:

```js
expect(isTypingTarget(input)).toBe(true);
expect(isTypingTarget(textarea)).toBe(true);
expect(isTypingTarget(select)).toBe(true);
expect(isTypingTarget(contentEditable)).toBe(true);
expect(isTypingTarget(button)).toBe(false);
```

Also test Cmd/Ctrl+N, G then T with expiry, R, Space, S, Escape topmost behavior, Cmd/Ctrl+Enter, no plain-key action while typing, and listener cleanup.

- [ ] **Step 2: Implement composable with one registration**

Use `onMounted`/`onUnmounted`. Keep the G-prefix timestamp inside the composable. Use `event.metaKey || event.ctrlKey` for cross-platform modifier shortcuts. Prevent default only after a shortcut is accepted.

- [ ] **Step 3: Integrate screen-specific actions**

App owns global navigation and topmost Escape. Timer and Checkpoint expose explicit methods with `defineExpose()` where needed, or receive shortcut-trigger props/events; choose the smaller interface proven by tests. Native focused-button Enter remains unchanged.

- [ ] **Step 4: Add discoverability**

Add `title`, tooltip, or keycap hints for every shortcut. Do not display platform-wrong modifier text: use `⌘` on macOS and `Ctrl` elsewhere through one computed label.

- [ ] **Step 5: Verify slice**

```bash
npm test -- tests/renderer/useKeyboardShortcuts.test.js tests/renderer/App.test.js tests/renderer/HomeView.test.js tests/renderer/TimerView.test.js tests/renderer/CheckpointView.test.js
npm test
npm run test:e2e
```

Manually test every shortcut in packaged Electron with body focus and with every field type focused. Confirm Escape never abandons and Space does not scroll while accepted by timer.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useKeyboardShortcuts.js src/App.vue src/components/AppSidebar.vue src/views/HomeView.vue src/views/InboxView.vue src/views/TimerView.vue src/views/CheckpointView.vue src/styles.css tests/renderer
git commit -m "feat: add application keyboard shortcuts"
```

---

### Task 7: Whole-Branch Verification and Review

**Files:**
- Modify only if verification exposes a defect. Every fix requires a new failing regression test first.

**Interfaces:**
- Consumes all six slice interfaces.
- Produces a verified branch ready for local merge or PR.

- [ ] **Step 1: Run clean automated verification**

```bash
npm install
npm test
npm run test:e2e
```

Expected: all tests and package checks pass without errors.

- [ ] **Step 2: Run complete packaged lifecycle from a clean isolated vault**

Verify:

- Home empty state and icon container.
- Add button icon/weight and quick capture.
- Create, edit, complete, reopen, and delete a task.
- Sidebar collapse/expand and restart persistence.
- Project swatch selection and all cover surfaces.
- Home resume selection after saving a checkpoint.
- Resume notes save/cancel/restart.
- Timer modal, pause/resume, minimize/floating/restore, Finish, checkpoint, break, quick-abandon Back and End.
- Every keyboard shortcut while typing and not typing.

- [ ] **Step 3: Inspect durable outputs**

Inspect the isolated SQLite database and:

- `Productivity/Inbox.md`
- `Productivity/Activity.md`
- `Productivity/Focus Logs/*.md`

Confirm supporting notes and breaks do not appear in Markdown. Confirm project covers exist only in `project_covers`. Confirm abandonment outcomes appear only in abandoned Focus Log entries.

- [ ] **Step 4: Perform visual verification**

Capture packaged screenshots at expanded desktop, collapsed desktop, and narrow width. Check against every acceptance item in `DESIGN-HANDOFF.md`, including `0.5px` edges, icon containers, selected navigation, modal hierarchy, teal glow limit, and reduced-motion fallback.

- [ ] **Step 5: Request whole-branch review**

Use a fresh reviewer subagent. Provide the spec, plan, branch diff, test output, screenshots, SQLite summary, and Markdown evidence. Fix every blocking issue with TDD and re-run Steps 1–4.

- [ ] **Step 6: Present integration options**

Follow `superpowers:finishing-a-development-branch`. Do not merge or push without the user's choice.
