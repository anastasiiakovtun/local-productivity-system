# Submission Completion Design

## Goal

Complete the repository-controlled assignment requirements without changing the product's established architecture or inventing personal reflection content for the student.

## Scope

This pass will:

1. Make every Obsidian task and focus log entry include date, time, UTC offset, IANA timezone, event type, status, and relevant task/session details.
2. Append focus-session start records to the task's Focus Log while preserving append-only behavior.
3. Add a user-facing break-duration control backed by the existing preference.
4. Add automated evidence for restart persistence and offline packaged startup.
5. Add cited research covering three task managers and three focus-timer products.
6. Record a product Grill that challenges scope, differentiation, usability, and technical risk.
7. Update README, project status, and per-artifact design rationale.
8. Generate a Markdown sample through the application code path, not by manually composing event entries.
9. Assemble a submission report and PDF. The AI usage and personal reflection sections remain explicit placeholders until Anastasiia supplies them.

## Non-goals

- Rewriting the existing application architecture.
- Adding cloud services, telemetry, accounts, Vue Router, SCSS, or keyboard shortcuts.
- Expanding the MVP to every aspirational feature in the original PRD.
- Inventing personal experiences, opinions, or AI disclosure on the student's behalf.
- Pushing branches or submitting files to an external learning platform.

## Application changes

### Consistent Markdown event schema

Task and focus Markdown records will use a readable field list with these labels:

- Date
- Time
- UTC offset
- Timezone
- Event
- Status
- Task
- Event-specific details

The existing `loggedTimestamp()` values remain authoritative. Existing SQLite rows and migrations do not change.

### Session-start logging

Starting a session will append a `session_started` block to `Productivity/Focus Logs/<task-id>.md` after the SQLite session row is created. Completed and abandoned records will use the same common field labels. Writes remain append-only.

If Markdown append fails after SQLite insertion, the handler will surface the failure rather than report complete success. No rollback is introduced because the existing two-store workflow already treats SQLite as canonical and Markdown as a projection.

### Break-duration control

The break offer will expose a whole-minute input constrained to the existing 1–60 minute requirement. Saving updates `defaultBreakMinutes` through the existing preferences API. Starting a break uses the selected value.

## Verification changes

- Unit tests will assert complete Markdown fields and session-start append behavior.
- Renderer tests will assert break-duration editing, validation, persistence, and use.
- Restart verification will create persisted state, reopen the same data directory, and confirm state remains queryable.
- Offline verification will launch the packaged application with network requests blocked and confirm its main window loads.

## Documentation deliverables

### Research

A cited Markdown document will compare at least three task managers and three focus-timer products. It will classify essential, useful, and unnecessary features and connect the Resume Packet and Checkpoint to the research findings.

### Grill

A documented Grill will include challenges, responses, decisions changed, and decisions retained. It will distinguish evidence from product judgment.

### Design artifacts

Every tracked file in `reference/` will receive a short explanation of what it helped decide.

### Submission report

The report source will combine research, PRD summary, design and technical decisions, visual artifacts, and vault examples. AI usage and reflection will remain clearly marked placeholders until the user's own text is available. The final PDF will not be called complete while either placeholder remains.

## Delivery

Work occurs on `docs/submission-package`. Each responsibility receives a focused commit. Nothing is pushed or merged without explicit approval.
