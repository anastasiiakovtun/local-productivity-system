# Grill evidence record — Obsidian Focus Companion

- **Session date:** 2026-09-27 (CEST, UTC+02:00)
- **Method:** `grill-with-docs` decision-tree interview
- **Representative user:** The developer, a student who uses Obsidian for notes and project work
- **Primary outputs:** [`PRD.md`](../../PRD.md), [`CONTEXT.md`](../../CONTEXT.md), and [`ADR-0001`](../adr/0001-use-electron-vue.md)
- **Output commit:** `c16a02c` — `Add PRD, domain glossary, and architecture decision from grill session`

> **Evidence note:** This is a structured reconstruction of the confirmed Grill rounds and the documents they produced. It is not presented as a word-for-word chat transcript. The durable evidence is the decision trail below, its traceability to the PRD/glossary/ADR, and commit `c16a02c`.

## Starting brief

The starting idea was a combined to-do and Pomodoro desktop app for Obsidian-using knowledge workers. Its proposed differentiator was a **Resume Packet** that restores context before a focus session and a structured **Checkpoint** that records the handoff afterward.

The Grill's job was to challenge the idea until no major product, scope, data, workflow, or architecture decision remained implicit. The user was treated as the representative MVP customer rather than inventing a broad persona.

## Decision-tree record

### Round 1 — Product foundations

**Challenge:** What failure is primary: starting friction, resumption failure, or poor effort awareness?

**Confirmed decision:** Address all three, with the product centered on resumption. This became the promise: **“Resume meaningful work without reconstructing your mental state.”**

**Challenge:** How will the MVP be judged?

**Confirmed decision:** Evaluate a 14-day personal trial against three measures:

- Use on at least 10 of 14 study/project days.
- Resume without a manual vault search in at least 80% of attempts.
- Produce a useful Checkpoint after at least 80% of completed sessions.

**Challenge:** Which system owns durable information?

**Confirmed decision:** Use split ownership. Obsidian Markdown owns durable Tasks, context, and Checkpoints; the app owns transient timer/UI state and a local query/event store.

**Challenge:** Is this a generic app with an Obsidian integration or an Obsidian companion?

**Confirmed decision:** It is a **Vault companion**. Obsidian owns knowledge; the application is a temporary execution surface.

**PRD trace:** §§1–6.

### Round 2 — Domain and core loop

**Challenge:** What exactly is a Project?

**Confirmed decision:** A Project is a finishable outcome represented by one designated Obsidian note. An optional Area, such as a course, can group Projects.

**Challenge:** May a Task exist without context?

**Confirmed decision:** A Task may be captured into Inbox without a link, but it must be connected to a Project or context note before a Focus Session begins.

**Challenge:** What belongs in the default Resume Packet?

**Confirmed decision:** Show only the current Task, Project link, previous Checkpoint, recorded Next Action, up to three Supporting Notes, a current Blocker if one exists, and the proposed focus duration. Older history remains behind progressive disclosure.

**Challenge:** Should AI decide which context matters?

**Confirmed decision:** No AI in the MVP. Packet generation is deterministic and uses explicit links and structured records.

**Challenge:** What is the minimum viable Checkpoint?

**Confirmed decision:** Require:

1. One-sentence Outcome; “No progress” is valid.
2. Status: `continue`, `blocked`, `completed`, or `abandoned`.
3. Next Action unless completed or abandoned.

The target completion time is under 20 seconds. Blocker detail, reflection, and additional notes are optional.

**Challenge:** Should the timer interrupt flow?

**Confirmed decision:** Use a Minimum Commitment rather than strict automatic cycles. When the chosen duration ends, the session enters **Overflow** and continues until the user stops.

**PRD trace:** §§8 and 15–17. **Glossary trace:** Project, Task, Focus Session, Resume Packet, Checkpoint, Minimum Commitment, and Overflow in `CONTEXT.md`.

### Round 3 — Markdown ownership and session integrity

**Challenge:** Should every checkbox in the Vault become a Task?

**Confirmed decision:** No. Managed Tasks use a predictable representation; arbitrary checkboxes can be explicitly imported.

**Challenge:** Where do Tasks live?

**Confirmed decision:** Project Tasks live under a managed `## Tasks` section in the designated Project note. Unlinked Tasks live in a dedicated Inbox file.

**Challenge:** How does Task identity survive renaming or movement?

**Confirmed decision:** Use stable Obsidian-compatible block IDs rather than title, path, or line number.

**Challenge:** Where is a Checkpoint canonical?

**Confirmed decision:** Store one canonical record in a Project Focus Log. Project and daily notes contain links or concise summaries rather than duplicated full Checkpoints.

**Challenge:** Without an Obsidian plugin, what counts as a touched note?

**Confirmed decision:** Automatically include notes opened through the app and allow manual additions. Do not claim to observe all Obsidian activity.

**Challenge:** Can Focus Sessions overlap or switch Tasks silently?

**Confirmed decision:** One Focus Session belongs to one Task. Switching ends the current session and requires its Checkpoint.

**Challenge:** What happens on pause, abandon, or crash?

**Confirmed decision:** Pause retains the session; finish opens Checkpoint capture; abandon still records an Outcome and Status. After a crash, offer resume, corrected finish, or discard, and mark reconstructed time visibly.

**PRD trace:** §§10, 15–19, and 29.

### Round 4 — Assignment-mandated logs and review

The user added explicit assignment requirements during the Grill rather than allowing them to remain implied.

**Requirement challenge:** Which Task lifecycle changes must be logged?

**Confirmed decision:** Log `created`, `edited`, `completed`, `reopened`, and `deleted` events.

**Challenge:** What counts as an edit?

**Confirmed decision:** Log semantic changes to title, Project/context link, start date, due date, estimate, Status, and reminder. Do not log whitespace, formatting, ordering, or block-ID movement. Group fields saved together into one edit event.

**Challenge:** What if a Task is edited directly in Obsidian?

**Confirmed decision:** Reconcile managed Markdown with the last-known snapshot. Record detected semantic changes with source `external`, while clearly treating the timestamp as detection time rather than the unknowable exact edit time.

**Challenge:** Does deletion erase history?

**Confirmed decision:** No. Deletion moves the Task to readable Trash and appends a `deleted` event. Restoration appends `reopened` with prior state `deleted`.

**Challenge:** Where does lifecycle history live?

**Confirmed decision:** Use an append-only local event store for reliable querying plus a human-readable Markdown Activity Journal in the Vault.

**Requirement challenge:** Can users change focus and break durations?

**Confirmed decision:** Yes. Defaults are 25 minutes focus and 5 minutes break. Focus accepts 1–180 whole minutes; Break accepts 1–60. Per-session overrides do not change defaults unless explicitly saved.

**Requirement challenge:** Can users review completed sessions?

**Confirmed decision:** Session History is reverse chronological, filterable by date, Project, Task, and Status, and shows planned, actual, and Overflow duration; full Checkpoint; Supporting Notes; correction state; and the canonical Obsidian link.

**Challenge:** May history be corrected?

**Confirmed decision:** Corrections append new records and preserve originals.

**Requirement challenge:** What temporal data must every durable log contain?

**Confirmed decision:** Every durable entry stores local date, local time, UTC offset, IANA timezone, and the equivalent UTC instant. This applies to task events, Focus Sessions, Checkpoints, Corrections, Activity entries, and daily summaries.

**PRD trace:** §§9, 12–13, 16, 18, and 30.

### Round 5 — Desktop workflow, privacy, and scope

**Challenge:** What are the exact Task fields and execution views?

**Confirmed decision:** Tasks contain stable ID, title, Status, Project/context link, start date, due date, estimate, timestamps, and one optional reminder. The PRD defines Inbox, Today, Upcoming, Project, Completed, Trash, Activity, and Session History views.

**Challenge:** How much capture complexity is acceptable?

**Confirmed decision:** Use a compact form with title plus optional Project, dates, estimate, and reminder. Natural-language parsing is deferred.

**Challenge:** How is a Project registered?

**Confirmed decision:** Select an existing note or create a new one, add the managed Tasks section with confirmation, and create/connect its Focus Log.

**Challenge:** How should ambiguous concurrent Markdown changes behave?

**Confirmed decision:** Attempt a safe field-level merge inside managed sections. If ambiguous, stop, preserve both states, and show conflict resolution. Never silently choose app-wins or Vault-wins.

**Challenge:** What is the privacy boundary?

**Confirmed decision:** The MVP is entirely local: no account, telemetry, cloud service, remote AI, or required network access.

**Challenge:** Which features are explicit non-goals?

**Confirmed decision:** Exclude mobile, verified Windows/Linux runtime support, accounts, cloud sync, required plugin, AI summaries, collaboration, recurring Tasks, habits, calendar/time-blocking UI, blocking, surveillance, natural-language parsing, multiple Vaults, gamification, rich task notes, and custom Project templates.

**PRD trace:** §§7, 10–14, 19–24, and 26.

### Round 6 — Platform and technical risk

**Challenge:** The developer works on macOS, but the teacher grades on Windows. What support claim is honest?

**Confirmed decision:** macOS 15.6 on Apple silicon is the only manually verified target. Keep code platform-neutral and produce an unsigned Windows x64 artifact through CI. Label Windows **build-verified, not manually tested**.

**Challenge:** Tauri or Electron?

**Decision path:** Tauri was initially recommended for scoped filesystem permissions and smaller packaging. The developer then identified prior Vue/JavaScript experience and no Rust experience. Learning Rust for Vault I/O, watching, timer recovery, and native integrations was judged too risky for the assignment timeline.

**Final confirmed decision:** Use Electron as the sole desktop framework with Vue 3, Composition API, Pinia, Vite, and plain JavaScript. The main process owns privileged work; an isolated preload exposes narrow operations; the renderer has no Node, generic IPC, filesystem, or SQL access.

**Challenge:** What persistence and packaging choices reduce ambiguity?

**Confirmed decision:** Use `better-sqlite3` behind a persistence module and Electron Forge/Vite with pinned versions and a committed lockfile.

**Challenge:** How is architecture risk front-loaded?

**Confirmed decision:** A formal spike must prove path containment, guarded Markdown writes, conflict detection, file watching without self-write loops, SQLite packaging, shortcuts, notifications, tray/timer behavior, crash recovery, complete temporal fields, and a Windows CI package before full UI development.

**ADR trace:** `docs/adr/0001-use-electron-vue.md`. **PRD trace:** §§24–27 and 31.

## What the Grill changed

| Topic | Before Grill | Confirmed result |
|---|---|---|
| Differentiation | Combined to-do + Pomodoro | Closed continuity loop: Resume Packet + Checkpoint |
| Product promise | Broad productivity improvement | Resume meaningful work without reconstructing mental state |
| Target user | Obsidian-using knowledge workers | Developer/student as representative MVP user |
| Knowledge ownership | Unclear | Obsidian owns knowledge; app is an execution surface |
| Task source | Potentially any checkbox | Managed Tasks plus explicit import |
| Project meaning | Unspecified | Finishable outcome represented by one designated note |
| Checkpoint | Open-ended reflection | Outcome + Status + conditional Next Action; under 20 seconds |
| Timer | Generic Pomodoro | Minimum Commitment followed by optional Overflow |
| Task history | General logging | Five explicit lifecycle event types with semantic diffs |
| Temporal data | Timestamp implied | Date, time, UTC offset, IANA timezone, and UTC instant required |
| Session review | Unspecified | Filterable Session History with append-only Corrections |
| Vault safety | General file writing | Managed sections, stable IDs, reconciliation, and conflict UI |
| Privacy | Unspecified | Fully local; no accounts, telemetry, cloud, or remote AI |
| Platform | Desktop | macOS verified; Windows CI build only |
| Framework | Undecided; Tauri considered | Electron + Vue selected; reasoning captured in ADR-0001 |
| Scope control | Informal | Explicit MVP capabilities and non-goals in PRD §7 |

## Artifact traceability

| Evidence | Role |
|---|---|
| `PRD.md` | Complete product requirements, acceptance criteria, assignment traceability, risks, and technical gate |
| `CONTEXT.md` | Canonical meanings of Project, Task, Resume Packet, Checkpoint, lifecycle event, Logged Timestamp, and other domain terms |
| `docs/adr/0001-use-electron-vue.md` | Accepted framework decision, rejected Tauri alternative, security boundary, and portability consequences |
| Commit `c16a02c` | Introduced the three Grill outputs together with an explicit Grill-session commit message |

## Evidence boundaries

This record demonstrates that the PRD was produced through a structured challenge-and-decision process and identifies the resulting decisions. It does not claim that every feature in the PRD was implemented, that Windows was manually tested, or that the reconstructed wording is a verbatim transcript. Implementation evidence belongs in tests, spike reports, `docs/PROJECT-STATUS.md`, and release artifacts.