# Complete Design Handoff Design

## Goal

Finish the remaining `DESIGN-HANDOFF.md` scope without replacing the working task and focus-session architecture. The result must retain the verified task lifecycle, add the missing navigation, dashboard, timer, Resume Packet, and keyboard behavior, and apply the design system consistently.

## Success criteria

- Empty-state and section icons always appear inside rounded rectangular gradient containers with a reflected-light `0.5px` edge.
- The Inbox Add action shows a Phosphor `Plus` icon before `Add`; the label uses regular weight.
- The sidebar expands to `216px`, collapses to `56px`, persists its state, preserves accessible labels, and uses the specified Phosphor icons.
- Home shows the most recently checkpointed open task, with an empty state and quick capture when no resumable task exists.
- Project labels can have user-selected color swatches. Swatches appear consistently in the sidebar, Home, Resume Packet, and timer surfaces.
- The timer is presented as a focused modal surface with a backdrop, supports quick abandon, and can show a floating timer when the user enables it.
- Resume Packet supports durable task-level supporting notes and richer icon-backed sections.
- The keyboard behavior listed in `DESIGN-HANDOFF.md` works without intercepting plain keys while a user types.
- Every major slice passes unit/renderer tests, packaged Electron smoke verification, and a manual packaged-app check before the next slice begins.

## Scope and implementation order

Work proceeds in this visible-first order:

1. Quick visual corrections.
2. Collapsible sidebar.
3. Home dashboard and project color covers.
4. Timer modal, quick abandon, and floating timer.
5. Resume Packet supporting notes and icon sections.
6. Keyboard shortcut system.

The existing task lifecycle, checkpoint flow, non-durable break flow, SQLite persistence, and managed Markdown markers remain unchanged unless a slice explicitly extends them.

## Architecture

Use incremental modular extension. Keep the existing `App.vue` screen-state coordinator instead of introducing Vue Router. Extract focused components and composables when responsibilities become reusable or stateful:

- `AppSidebar.vue` owns expanded/collapsed presentation and navigation events.
- `IconContainer.vue` provides the shared reflected-edge icon treatment.
- `ProjectCover.vue` renders a project color swatch or neutral fallback.
- `HomeView.vue` owns resume-dashboard presentation and quick capture.
- `TimerModal.vue`, `QuickAbandonPanel.vue`, and `FloatingTimer.vue` present timer states while consuming the existing session store.
- `useKeyboardShortcuts.js` owns global shortcut registration, typing guards, and cleanup.

`App.vue` remains the coordinator for list, Resume Packet, timer, checkpoint, break-offer, and break screens. New components emit intent rather than directly choosing global screens.

## Slice 1: Quick visual corrections

### Icon containers

Create one `IconContainer` component that:

- Renders a rounded rectangle with the existing design tokens.
- Uses a `0.5px` transparent border and gradient border-box reflection.
- Uses a restrained teal-to-neutral surface gradient.
- Accepts size and semantic class props only where required.
- Keeps the contained icon decorative when nearby text names the state.

Apply it to every current empty state and to later section-header icons. No empty-state icon may float directly on the page background.

### Add action

Use Phosphor `Plus`, regular weight, before the `Add` label. Keep the entire control as one accessible button. Set the label to `font-weight: 400`; do not rely on inherited bold button styles.

## Slice 2: Collapsible sidebar

### Navigation model

Add a dedicated Home destination. Navigation order becomes:

1. Home — `House`
2. Inbox — `Tray`
3. Today — `CalendarBlank`
4. Completed — `CheckCircle`
5. Sessions — `ClockCounterClockwise`

The selected icon uses `weight="fill"`; unselected icons use `weight="regular"` at approximately `18px`.

### Expanded state

- Width: `216px`.
- Show app name, icon, and text labels.
- Preserve the teal selection indicator and gradient selected-row treatment.
- Show a collapse control using `SidebarSimple`.

### Collapsed state

- Width: `56px`.
- Preserve navigation order.
- Use centered `40px × 40px` hit areas.
- Hide visual labels while retaining `aria-label`.
- Show native or app tooltip text. Keyboard focus reveals it immediately.
- Use the same selected state without clipping the `3px × 16px` accent.

Persist `sidebarCollapsed` through the existing preferences table. The default is expanded.

## Slice 3: Home dashboard and project covers

### Resume selection

Home requests the most recently created checkpoint whose task is still open. The query orders checkpoints by `created_occurred_at_utc DESC` and returns the first matching open task. A task without a checkpoint does not become the resume card.

### Active Home state

Show `Continue where you left off` with:

- Project cover and project label.
- Task title.
- Previous checkpoint outcome.
- Next action.
- Primary `Resume` action with a Phosphor `Play` icon.
- A visually secondary quick-capture tile.

Use the two-column desktop composition from `DESIGN-HANDOFF.md`; stack below `820px`.

### Empty Home state

Show `Nothing to resume` with:

- `ClockCounterClockwise` inside `IconContainer`.
- `No active task` title.
- `Start a task from Today or capture a new one.` body.
- `Go to Today` primary action.
- `Quick capture` secondary action.

### Quick capture

Home quick capture reuses the existing task-creation API. Successful creation refreshes Home and Inbox data without navigating away.

### Project covers

This release supports color swatches only.

- Persist a color per exact `project_label` in a new `project_covers` table.
- A project without a chosen color renders a neutral fallback with `FolderSimple` inside a gradient container.
- Selecting a cover opens a restrained palette of predefined accessible colors; no arbitrary color picker and no image upload.
- Changing a cover updates every surface that derives that project label.
- Tasks without a project use the neutral fallback and do not create a database row.

The sidebar may show a compact Projects group derived from distinct non-null project labels. It is informational/filtering UI only; this scope does not add a full Projects screen.

## Slice 4: Timer surfaces

### Full timer modal

Present the active timer above the existing app shell:

- Dimmed, blurred backdrop.
- Centered raised panel up to `560px` wide.
- Project cover, task title, focus label, and `56px` tabular timer.
- Pause/Resume as the primary action according to timer state.
- Finish as a secondary action.
- Close button at top-right.
- When floating timer is enabled, a separate Minimize control hides the full modal and reveals the floating surface.

Closing does not mutate session state. It opens the quick-abandon panel. Minimizing does not open quick abandon.

### Quick-abandon panel

The panel shows:

- Back action to return to timer.
- `StopCircle` inside a semantic icon container.
- `End this session?` title.
- Fixed `Abandoned` status.
- Optional outcome input.
- `Keep working` secondary action.
- `End session` restrained danger action.

If an outcome is entered, persist it in the abandoned Focus Log entry. An empty outcome still permits immediate abandonment. Going back preserves entered text for the lifetime of the active timer screen.

### Floating timer preference

Add `floatingTimerEnabled`, default `false`, to preferences and expose a settings toggle in an accessible compact settings panel.

### Preferred floating timer implementation

Use a dedicated Electron `BrowserWindow` only if a spike proves all of the following without destabilizing the packaged app:

- The window can render the current timer state securely through a narrow preload bridge.
- Main and floating surfaces stay synchronized for pause/resume.
- Closing the floating window does not abandon or end the session.
- The window packages and launches in the existing Forge/Vite build.
- The implementation does not duplicate countdown ownership.

The existing session store and main-process session records remain authoritative. The floating renderer receives timer snapshots/events and sends only pause/resume/focus-main-window intents.

### Explicit fallback

If the dedicated Electron window is time-consuming or risky, implement an in-window pinned `FloatingTimer` panel instead. The fallback must be explicitly recorded in the task commit and final report; it must not be silently substituted.

The fallback:

- Pins a `232px × 52px` timer above the app shell.
- Uses `--shadow-float`, a `12px` radius, task cover, time, and pause/resume control.
- Appears only when `floatingTimerEnabled` is true and the full timer modal is dismissed or minimized.
- Does not create a second countdown or durable record.

## Slice 5: Resume Packet enhancements

### Persistence

Add nullable `supporting_notes TEXT` to `tasks` through a new migration. The field is task-level SQLite data only. It is not written to Inbox Markdown or Focus Log Markdown.

Extend task editing so supporting notes can change without altering title or project label. Existing edit behavior and event logging remain intact; `changed_fields` records a supporting-notes edit.

### Presentation

Use the Resume Packet as the signature surface:

- Project cover, task title, project name, and session duration in the header.
- `MapPinLine` icon for Previous checkpoint.
- `ArrowBendDownRight` for Next action.
- `NotePencil` for Supporting notes.
- `WarningCircle` for Blocker.
- Every section icon appears inside `IconContainer`.
- Empty blocker text reads `No blocker recorded`.

Supporting notes support inline Edit, Save, and Cancel. Cancel restores the persisted value. Failed save keeps the editor open and presents an error.

Next action continues to come from the last checkpoint. This scope does not make checkpoint history editable.

## Slice 6: Keyboard shortcuts

Create one global shortcut composable with these safeguards:

- Ignore plain-key shortcuts when focus is in `input`, `textarea`, `select`, or editable content.
- Modifier shortcuts may run while typing only when explicitly specified.
- Register once when the app shell mounts and remove listeners when it unmounts.
- Do not trigger shortcuts when a modal has a more specific handler.

Implement:

- `Cmd/Ctrl + N`: open quick capture.
- `G`, then `T`: navigate to Today. The sequence expires after a short timeout.
- `R`: open the current Home resume task when available.
- `Enter`: activate the focused primary action through normal button behavior; do not add a global Enter override.
- `Space`: pause/resume while the timer surface is focused and no field is active.
- `S`: open checkpoint flow while the timer is active.
- `Escape`: close or back out of the topmost safe dialog; never abandon automatically.
- `Cmd/Ctrl + Enter`: save Checkpoint while its form is open.

Expose shortcuts through tooltips, keycaps, or nearby hints. Do not implement invisible behavior with no discoverability path.

## Data and migration changes

Create a second migration rather than altering `001-initial.sql` for existing installations.

The migration adds:

```sql
ALTER TABLE tasks ADD COLUMN supporting_notes TEXT;

CREATE TABLE IF NOT EXISTS project_covers (
  project_label TEXT PRIMARY KEY,
  color         TEXT NOT NULL
);
```

Preferences remain key/value JSON rows and gain:

- `sidebarCollapsed`: boolean, default `false`.
- `floatingTimerEnabled`: boolean, default `false`.

Preference validation accepts these exact boolean fields while preserving existing focus, break, and vault preferences.

## Error handling

- Failed preference writes keep the previous sidebar or floating-timer state and show a local error.
- Missing Home resume data renders the empty state, not an error.
- A checkpoint whose task was deleted is skipped by the Home query.
- Invalid project-cover colors are rejected at the IPC boundary; only predefined palette values are accepted.
- Failed supporting-note saves retain unsaved text and show an alert.
- Floating-window creation failure triggers the explicit pinned-panel fallback decision during implementation; it does not silently disable the feature.
- Quick-abandon writes the abandoned session and Focus Log atomically to the same practical standard as the existing session path. Failed abandon leaves the timer screen visible with an error.

## Accessibility

- Minimum compact hit area is `36px × 36px`; sidebar targets prefer `40px × 40px`.
- Every icon-only control has `aria-label` and tooltip text.
- Selected navigation uses `aria-current="page"`.
- Collapsed sidebar labels remain available to assistive technology.
- Modals use dialog semantics, initial focus, focus containment, and focus restoration.
- Timer updates are not announced every second. Announce state changes only.
- Status controls retain radio semantics.
- Reduced-motion and reduced-transparency fallbacks remain active.

## Testing and verification

Use strict TDD for every behavior change:

1. Add one failing unit or renderer test.
2. Run it and confirm the expected failure.
3. Add the smallest implementation.
4. Run the focused test.
5. Run `npm test`.
6. Run `npm run test:e2e` after each major slice.
7. Launch the packaged app and manually verify the slice before committing.

Required manual checks include:

- Expanded and collapsed sidebar, restart persistence, labels, and keyboard focus.
- Home active and empty states, quick capture, resume selection, and project colors.
- Timer modal, pause/resume, checkpoint, quick-abandon back/end paths, and the selected floating implementation.
- Resume Packet note edit/save/cancel/error behavior.
- Every shortcut with and without an active text field.
- Real SQLite, Inbox Markdown, Activity Markdown, and Focus Log output.
- No break records and no new unwanted Markdown fields.

## Commit boundaries

Use one verified commit per slice:

1. `fix: refine add action and icon containers`
2. `feat: add collapsible application sidebar`
3. `feat: add home dashboard and project covers`
4. `feat: add timer surfaces and quick abandon`
5. `feat: enhance resume packet context`
6. `feat: add application keyboard shortcuts`

A final verification-only commit is unnecessary unless verification discovers a defect that requires code changes.

## Out of scope

- Vue Router migration.
- Project image uploads.
- Full project-management screens.
- Active-session crash or relaunch recovery.
- Durable break records.
- Arbitrary user-configurable shortcuts.
- Editing historical checkpoints.
- Automatic floating timer activation without user opt-in.
