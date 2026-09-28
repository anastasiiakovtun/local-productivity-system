# Grill session — Obsidian Focus Companion

**Date:** 2026-09-27  
**Output:** `PRD.md`, `CONTEXT.md`, `docs/adr/0001-use-electron-vue.md`  
**Commit:** `c16a02c` — "Add PRD, domain glossary, and architecture decision from grill session"

---

## Purpose

The Grill session tested whether the product idea was well-scoped, differentiated, and technically sound before full implementation began. The agent challenged the product concept across scope, user value, technical risk, and non-goals.

---

## Challenges and outcomes

### 1. Is combining to-do and Pomodoro actually differentiated?

**Challenge:** Adding tasks to a Pomodoro timer already exists — TickTick, Focus To-Do, and others already do it. What makes this different?

**Response:** The differentiator is not the combination. It is the closed continuity loop: the Resume Packet restores context before work starts, and the Checkpoint captures it afterward. Neither TickTick nor Focus To-Do write a structured handoff to Obsidian. The product is an Obsidian-native execution layer, not another generic task-plus-timer app.

**Decision:** The product promise was sharpened to *"Resume meaningful work without reconstructing your mental state"* (PRD §3). The Resume Packet and Checkpoint became the signature features, not the task manager or timer alone.

---

### 2. Should the app replace Obsidian's note-taking?

**Challenge:** Will users want their context, notes, and task records inside the app instead of in Obsidian?

**Response:** No. Obsidian owns knowledge. The app links to context; it does not duplicate a knowledge base (PRD §6, principle 1). Rich research notes, backlinks, attachments, and graph views would compete with Obsidian rather than complement it.

**Decision:** The app reads and writes narrow structured sections of vault Markdown. Unrelated note content is never overwritten. The app is a temporary execution surface over the vault, not a second knowledge base.

---

### 3. What is the minimum viable Checkpoint?

**Challenge:** Structured post-session capture sounds heavy. What is the minimum that makes it useful without becoming a burden?

**Response:** Three required fields are enough: one-sentence outcome, status (continue / blocked / completed / abandoned), and next action when work continues. The target was under 20 seconds to complete (PRD §17). Optional fields — blocker detail, supporting notes, reflection — are never required.

**Decision:** The Checkpoint form was constrained to the minimum. Mandatory ratings, mood fields, tags, or retrospective questionnaires were explicitly excluded (PRD §17).

---

### 4. Should the app support multiple vaults or multiple devices?

**Challenge:** Real users often have more than one vault or work across devices.

**Response:** Multiple vaults and cloud sync are out of scope for the MVP. They add complexity that would delay proving the core loop works at all. One vault, one device is sufficient to validate the Resume Packet and Checkpoint workflow (PRD §7.2 non-goals).

**Decision:** Multiple vaults, accounts, and cloud sync remain explicit non-goals. The architecture avoids hard-coded assumptions that would block adding them later, but none are built now.

---

### 5. Electron vs Tauri — which framework?

**Challenge:** Tauri produces smaller binaries and has stronger capability-based filesystem controls. Why choose Electron?

**Response:** Tauri requires Rust for the security-sensitive parts — vault access, file watching, timer recovery, and native integration. That adds learning and debugging risk within the assignment timeline. Electron keeps everything in JavaScript, the language already in use (ADR-0001).

**Decision:** Electron with Vue 3 was chosen. The ADR commits the reasoning so it is reviewable and can be revisited. Tauri remains a valid future option if binary size or sandbox model becomes a priority.

---

### 6. What is explicitly out of scope?

**Challenge:** The feature list could expand indefinitely — keyboard shortcuts, notifications, tray, crash recovery, Windows, recurring tasks, AI summaries, collaboration. Which of these must be scoped out now?

**Response:** The assignment requires proving the core loop works. Everything that does not directly serve task management, focus timing, Checkpoint capture, and Obsidian logging is deferred or excluded.

**Decision:** Explicit non-goals (PRD §7.2) include mobile, Windows runtime verification, accounts, cloud sync, AI summaries, recurring tasks, habit tracking, calendar integration, charts, streaks, and achievements. Keyboard shortcuts were dropped from the first release to reduce scope.

---

## What the Grill changed

| Topic | Before | After |
|---|---|---|
| Core differentiator | "tasks + Pomodoro" | Closed continuity loop: Resume Packet + Checkpoint |
| Product promise | Vague | "Resume meaningful work without reconstructing your mental state" |
| Checkpoint scope | Open-ended | Three required fields, under 20 seconds target |
| Vault role | Unclear | Obsidian owns knowledge; app writes only managed sections |
| Framework choice | Undecided | Electron + Vue, Tauri rejected with documented reasoning |
| Non-goals | Informal | Explicit list in PRD §7.2 |
