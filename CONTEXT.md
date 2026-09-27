# Domain Glossary

## User

The individual knowledge worker using the product. For the MVP, the representative User is a student who uses Obsidian for notes and project work.

## Vault

The User's Obsidian vault. It is the durable context for projects, supporting notes, tasks, and focus-session checkpoints.

## Area

An optional ongoing sphere of responsibility that groups Projects, such as a university course. An Area does not represent a finishable outcome.

## Project

A finishable outcome represented by one designated note in the Vault. The designated note is the Project's home and may link to Supporting Notes and Tasks.

## Supporting Note

A note explicitly linked to a Project or Task because it provides context needed to perform the work. Merely sharing a folder with a Project does not make a note a Supporting Note.

## Task

An actionable unit of work in the execution queue. A Task has a stable identity, title, Status, optional Project or context-note link, optional start date, optional due date, optional focus estimate, timestamps, and an optional reminder. A Task may be captured without context in the Inbox, but it must be linked to a Project or context note before a Focus Session begins.

## Inbox

The temporary holding place for Tasks that have not yet been fully organized or linked to context.

## Today

The view of incomplete Tasks whose start date is today or earlier, including overdue Tasks. A due date communicates urgency but does not control when a Task becomes actionable.

## Upcoming

The view of incomplete Tasks with future start dates or due dates.

## Completed

The searchable history of completed Tasks. Completed Tasks retain their stable identity and lifecycle history.

## Managed Section

A designated section of a Project note whose Task records the application may safely maintain without rewriting unrelated note content.

## Project Focus Log

The canonical chronological note containing a Project's Checkpoints. Project and daily notes may link to these records but do not duplicate the complete Checkpoint.

## Focus Session

A period in which the User works on one Task. It begins by presenting a Resume Packet and ends by capturing a Checkpoint.

## Minimum Commitment

The amount of focused time the User commits to before starting a Focus Session. Reaching it does not force the Focus Session to stop.

## Overflow

The phase after the Minimum Commitment has elapsed while the User continues working productively. Overflow ends only when the User chooses to stop the Focus Session.

## Resume Packet

The compact set of context shown immediately before a Focus Session. By default it contains the current Task, Project link, previous Checkpoint, recorded Next Action, up to three recently linked Supporting Notes, any current Blocker, and a proposed Minimum Commitment.

## Checkpoint

The durable structured record created when a Focus Session ends. It contains an Outcome, a Status, and—unless the Task is completed or abandoned—a Next Action. Session duration, touched notes, and Logged Timestamps for the session and Checkpoint are associated with it automatically.

## Outcome

A one-sentence account of what changed during a Focus Session. "No progress" is a valid Outcome.

## Next Action

The concrete action from which work should resume. It is required when a Checkpoint has the Status `continue` or `blocked`.

## Status

The Task state recorded in a Checkpoint: `continue`, `blocked`, `completed`, or `abandoned`.

## Blocker

A condition preventing meaningful progress on a Task. A Blocker is optional context unless the Checkpoint Status is `blocked`.

## Task Lifecycle Event

A durable record of a meaningful change to a managed Task. The MVP records `created`, `edited`, `completed`, `reopened`, and `deleted` events. Every event includes a Logged Timestamp.

## Logged Timestamp

The complete temporal context attached to every durable log entry. It records the local calendar date, local clock time, UTC offset, IANA timezone identifier, and equivalent UTC instant. For example: date `2026-09-27`, time `12:30:00`, offset `+02:00`, timezone `Europe/Berlin`, and UTC instant `2026-09-27T10:30:00Z`. This requirement applies to Task Lifecycle Events, Focus Sessions, Checkpoints, Corrections, Activity Journal entries, daily-note summaries, and other durable logged records.

## Task Creation

The lifecycle transition in which a new managed Task receives its stable identity and becomes part of the execution queue.

## Task Edit

A Task Lifecycle Event recording one or more semantic changes saved together. Semantic fields are the title, Project or context link, start date, due date, estimate, Status, and any future priority field. Ordering, whitespace, Markdown formatting, and movement of the stable block ID are not Task Edits.

## Task Completion

The lifecycle transition in which a Task becomes completed. A completed Task leaves the active execution queue but retains its identity and history.

## Task Reopening

The lifecycle transition in which a completed Task returns to the active execution queue with its existing identity and history.

## Task Deletion

The lifecycle transition in which a Task is removed from ordinary use and moved to the Trash while its identity and history are preserved. Restoring a deleted Task creates a `reopened` event whose prior state is `deleted`.

## External Change

A semantic Task change made directly in the Vault rather than through the application. The application records it when reconciliation detects the changed state. Its event timestamp means "detected at," not necessarily "edited at."

## Activity Journal

The human-readable Markdown projection in the Vault of Task Lifecycle Events. It preserves meaningful task history outside the application while the canonical append-only event store supports reliable querying.

## Trash

The readable archive of deleted Tasks. Tasks in the Trash retain their identity and history but do not appear in the active execution queue.

## Break

An optional timed recovery period offered after the User ends a Focus Session. A Break never starts automatically and never interrupts Overflow.

## Focus Defaults

The User's preferred starting values for Minimum Commitment and Break duration. Initial defaults are 25 minutes of focus and 5 minutes of break. Focus may be set from 1–180 whole minutes and Break from 1–60 whole minutes. A one-off override does not change Focus Defaults unless the User explicitly chooses to make it the new default.

## Session History

The reverse-chronological review of completed Focus Sessions. It supports filtering by date range, Project, Task, and Status and exposes planned, actual, and Overflow duration; the complete Checkpoint; touched Supporting Notes; corrected-time state; and a link to the canonical Vault record.

## Correction

An append-only amendment to a completed Focus Session's timing or Checkpoint. The corrected value is presented as current, while the original value remains available in Session History.
