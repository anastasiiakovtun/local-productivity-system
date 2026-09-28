# Blocking End-to-End Flows and Visual Handoff Design

**Date:** 2026-09-28  
**Branch:** `fix/blocking-e2e-flows`  
**Status:** Approved in conversation

## 1. Goal

Make the packaged Obsidian Focus Companion usable through the assignment's complete task and focus lifecycle. Fix the blocking flows in this exact order, manually package and exercise each completed slice, then apply `DESIGN-HANDOFF.md` to the working screens.

The final clean-vault verification must cover task creation, editing, completion, reopening, deletion, a completed focus session with a Checkpoint and break, and an abandoned session. The resulting Obsidian Markdown and SQLite records must match the visible actions.

## 2. Scope and order

1. Fix live vault-root resolution and failed-create rollback.
2. Wire `ResumePacketView`, `TimerView`, and `CheckpointView` into the app flow.
3. Add task editing to Inbox.
4. Add a non-durable break after a saved Checkpoint.
5. Apply the visual design handoff and Phosphor navigation icons.
6. Repeat the complete lifecycle from a clean isolated vault.

Each functional slice uses test-driven development, gets packaged, launches as the packaged executable, and receives manual verification before the next slice begins.

## 3. Vault-root resolution and task-creation consistency

### 3.1 Root cause

`src/main.js` currently passes function and proxy objects to stores that call `path.join` as if they received strings. The selected vault is only known after the stores are created, so the stores need a live accessor rather than a captured value or proxy.

### 3.2 Store contract

`TaskStore`, `TaskEventStore`, and `CheckpointStore` receive `getVaultRoot`, a zero-argument function that returns the current canonical vault path string. Every filesystem operation resolves the path immediately before use. A missing vault root returns a controlled error rather than passing a non-string value to `path.join`.

### 3.3 Creation consistency

Task creation coordinates SQLite and vault writes as one operation:

1. Read and retain the original Inbox managed-section state.
2. Begin an explicit SQLite transaction.
3. Insert the task row.
4. Write the task checkbox to Inbox Markdown.
5. Insert the `created` task event and append its Activity Markdown entry.
6. Commit SQLite only after all required writes succeed.

On failure:

- roll back the SQLite transaction, removing task and event rows;
- restore the original Inbox managed section if it changed;
- return an error to the renderer;
- keep the capture form values for retry.

The regression test injects a vault-write failure and proves that no task row or task-event row remains.

## 4. Application screen flow

Use a small screen-state coordinator in `App.vue`. Vue Router is not needed for the current four list screens and three session screens.

```text
Inbox or Today
  -> Resume Packet
  -> Focus Timer
  -> Checkpoint
  -> Break Offer
  -> Break Timer
  -> originating task view
```

### 4.1 Entry points

Inbox and Today task rows gain a `Focus` action. Selecting it records the originating view and selected task, then displays `ResumePacketView`.

### 4.2 Resume Packet

`ResumePacketView` shows the selected task, project label, previous Checkpoint, and adjustable focus duration. Successful session start displays `TimerView`. Cancel returns to the originating task view without creating a session.

### 4.3 Timer

`TimerView` supports pause, resume, end, and abandon.

- End opens `CheckpointView` without ending the session first.
- Cancel from Checkpoint returns to the active timer.
- Abandon ends the session, appends an abandoned entry to the task Focus Log, clears renderer session state, and returns to the originating task view.
- Screen transitions occur only after successful IPC results. Errors remain visible on the current screen.

### 4.4 Checkpoint

Saving a valid Checkpoint atomically inserts the Checkpoint and ends the session in SQLite, then appends the complete Focus Log block. Success clears the active renderer session and opens the break offer. Failure leaves the Checkpoint fields and active screen intact for retry.

### 4.5 Relaunch behavior

Crash recovery is out of scope. On launch, the app does not query for or restore a prior active session. It does not add recovery UI, reconstruct elapsed state, or change the prior database row automatically. A new session may start normally; no resume behavior is introduced in this increment.

## 5. Task editing

Inbox task rows gain an accessible `Edit` action. It opens an inline form initialized with the task title and project label.

- Save calls the existing `tasks:edit` IPC method.
- Cancel exits editing without changes.
- Empty titles cannot be saved.
- A failed save keeps entered values and displays an inline error.
- A successful save refreshes Inbox and updates both SQLite and Markdown through existing task-store behavior.

The task Pinia store gains `editTask(id, changes)` and refreshes affected lists after success.

## 6. Break flow

After a Checkpoint saves, show a break offer with `Take Break` and `Done`.

- `Take Break` reads `defaultBreakMinutes` from preferences and starts a separate countdown.
- Break state is renderer-only and non-durable.
- The break screen provides `End Break`.
- At zero it displays `Break complete` and `Done`.
- Completing or ending the break returns to the originating task view.
- No break row, event, or Markdown record is created.

## 7. Abandoned-session Markdown

The existing Focus Log writer owns both completed and abandoned session projections. Abandoning appends:

```markdown
## YYYY-MM-DD HH:MM +HH:MM — abandoned

**Task:** Task title
**Duration:** N min

---
```

The abandoned session remains queryable in Session History and has full ended timestamp fields in SQLite.

## 8. Visual handoff

After all functional manual gates pass, apply `DESIGN-HANDOFF.md` to existing screens.

### 8.1 Foundation

- Use the exact dark palette, radial background gradient, Inter stack, spacing, radii, borders, shadows, focus treatments, motion durations, and transparency fallbacks from the handoff.
- Primary buttons use regular-weight `#0f0f13` text on `#2dd4bf` for specified contrast.
- Secondary and destructive actions use the handoff's neutral and restrained-danger treatments.
- Cards, task rows, forms, Resume Packet, Timer, Checkpoint, break offer, and break timer use the documented radius hierarchy.

### 8.2 Navigation icons

Add `@phosphor-icons/vue` as a runtime dependency. Keep current navigation labels and behavior:

- Inbox: `House`
- Today: `CalendarBlank`
- Completed: `CheckCircle`
- Sessions: `ClockCounterClockwise`

Icons use regular weight at 18px. Selected rows use the handoff's teal gradient, 3px by 16px indicator, `aria-current="page"`, and rounded 8px treatment. No deferred navigation screens are added.

## 9. Testing strategy

### 9.1 Automated RED-GREEN slices

- Dynamic vault getter and controlled missing-root behavior.
- Failed task creation leaves no task or event row.
- Inbox restoration after a post-write failure.
- Session component transitions in `App.vue`.
- Focus action from Inbox and Today.
- Checkpoint cancel and save transitions.
- Abandon success and failure behavior, including Focus Log Markdown.
- Inline task edit save, cancel, validation, and retry behavior.
- Break offer, preference duration, countdown completion, and early end.
- Navigation icons, accessible names, and selected state.
- Packaged smoke test continues to launch the actual packaged executable.

### 9.2 Manual package gates

Use a fresh isolated user-data directory and vault for each gate.

1. **Persistence gate:** select vault, create task, inspect Inbox and Activity Markdown, inject or reproduce a failed write, and confirm no orphan task/event rows.
2. **Session gate:** start, pause, resume, cancel Checkpoint back to timer, save a Checkpoint, abandon another session, and inspect Focus Logs and Session History.
3. **Edit gate:** edit title/project label, complete, reopen, and delete; inspect Inbox and Activity Markdown after each action.
4. **Break gate:** save Checkpoint, start break using configured default, end or complete break, and confirm no durable break record.
5. **Visual gate:** inspect Inbox, Today, Completed, Sessions, Resume Packet, Timer, Checkpoint, and break screens at 1000 x 700.
6. **Final clean-vault gate:** execute the complete requested lifecycle and compare UI, Markdown, and SQLite.

## 10. Acceptance criteria

- Packaged app launches without a main-process JavaScript error.
- Task creation writes matching SQLite, Inbox Markdown, and Activity Markdown records.
- Failed task creation leaves no orphaned task or task event.
- Task edit, complete, reopen, and delete work from reachable UI and update Markdown.
- Focus session can be started from a task and completed through a Checkpoint.
- A second session can be abandoned and appears in its Focus Log and Session History.
- Break uses `defaultBreakMinutes`, is reachable after Checkpoint, and creates no durable record.
- Existing session components are mounted through an understandable App-level flow.
- No active-session restoration or crash-recovery feature is added.
- Existing screens match the requested radial background, button contrast, rounded selected navigation, and Phosphor icon treatment.
- Full automated suite and packaged smoke test pass.
- Final manual verification observes correct Markdown files in the selected vault.
