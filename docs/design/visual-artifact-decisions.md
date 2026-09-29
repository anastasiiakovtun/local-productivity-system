# Visual artifact decisions

This record explains what each artifact in `reference/` helped decide. The sketches establish structure and workflow; `reference-visual_style.png` is a style reference only. Later refinements in `DESIGN-HANDOFF.md` are identified separately rather than attributed to the original drawings.

## `sketch-1-nav-bar.jpg`

**Visible concept:** An expanded sidebar with Home, Today, Upcoming, Projects, nested project names, Completed, Session History, Trash, and Activity. A second state shows a collapsed icon rail with a project flyout.

**Decision:** Use persistent left navigation, expose projects as a hierarchy, and support expanded and collapsed navigation states. This informed `DESIGN-HANDOFF.md` §6.

**Later refinement:** The final handoff specifies the collapse control and exact grouping. The sketch suggests separators but does not clearly label an “Other” group.

## `sketch-2-homeno_active_tasks.jpg`

**Visible concept:** Two Home states. The active state combines “Continue where you left off,” a resume card, and a Quick Capture tile. The empty state says “Nothing to resume,” explains that no task is active, and offers “Go to Today.”

**Decision:** Home must answer one question immediately: can the user resume work? When work exists, show its checkpoint and next action beside Quick Capture. When no work exists, use a centered empty state with a direct route to Today. This informed `DESIGN-HANDOFF.md` §8.

**Later refinement:** The handoff adds a secondary Quick Capture action to the empty state; that action is not visible in the original empty-state sketch.

## `sketch-3-timeroverflowfloating-state.jpg`

**Visible concept:** A full timer over a faded background, an Overflow state with a primary Finish action, and a compact timer displayed over another application.

**Decision:** Keep the active timer visually focused, allow work to continue after the minimum commitment as Overflow, and provide a compact always-on-top timer. This informed `DESIGN-HANDOFF.md` §9.

**Later refinement:** “Overflow” became “Overtime” in parts of the handoff. After review, the timer puts the project cover, task title, and close button on one top row, centers the countdown in the remaining space, and aligns the controls right, instead of stacking a centered cover above the title. Electron `BrowserWindow` implementation, its preference toggle, and default-off behavior are engineering decisions, not details shown by the sketch.

## `sketch-4-resume-packet.jpg`

**Visible concept:** An open Resume Packet card with task identity, project, duration, Previous Checkpoint, Next Action, Supporting Notes, Blocker, inline edit controls, and a start action.

**Decision:** Present resumption context before starting the timer. Keep four distinct context areas: Previous Checkpoint, Next Action, Supporting Notes, and Blocker. This informed `DESIGN-HANDOFF.md` §10.

**Later refinement:** The handoff defines a quiet empty-blocker state instead of leaving a large blank blocker area. After review, the duration control moved from the header to the footer, next to Start session, and both sit on the right. Edit became a visible button on the same line as the content.

## `sketch-5-checkpoint-popup.jpg`

**Visible concept:** An end-of-session form with status controls, Outcome, Next Action, and a continuation action. “Abandoned” is the only clearly legible status label; the control count suggests four status choices.

**Decision:** Ending a session must capture both what happened and what state the work is in. Outcome and status are primary; Next Action depends on the selected state. This informed `DESIGN-HANDOFF.md` §11 and the implemented four states: Continue, Blocked, Completed, and Abandoned.

**Later refinement:** The handoff changes the action wording to “Save checkpoint” or “End session” and defines conditional fields. Unreadable sketch labels are not treated as evidence.

## `sketch-6-quick-abandon.jpg`

**Visible concept:** Closing an active session opens a reduced panel with a back action, fixed Abandoned status, one Outcome field, and confirmation.

**Decision:** Never discard a session silently. A quick abandon uses a shorter path than the full Checkpoint while still allowing the user to record an outcome or return to the timer. This informed `DESIGN-HANDOFF.md` §12.

**Later refinement:** The handoff names the actions “Keep working” and “End session” and makes Outcome optional. The drawing itself does not explicitly mark Outcome as optional.

## `reference-visual_style.png`

**Visible concept:** A dark Aivora dashboard with compact navigation, layered surfaces, rounded cards, low-contrast borders, restrained shadows, lavender accents, and a localized glow.

**Decision:** Use the image only as a visual mood reference. It informed the dark layered surfaces, compact navigation, atmospheric background, rounded panels, subtle shadows, and top-lit glass-edge treatment described in `DESIGN-HANDOFF.md` §§1–4. The implementation uses a restrained `0.5px` gradient border highlight.

**Deliberate differences:** The product does not copy the Kanban layout, dashboard density, labels, AI card, purple bloom, or lavender accent. Teal is the product-specific accent.

## Overall design outcome

The six sketches established navigation, Home states, timer behavior, Resume Packet structure, Checkpoint capture, and safe abandonment before visual styling. The mood reference then helped translate those flows into a cohesive dark interface. `DESIGN-HANDOFF.md` is the implementation-ready synthesis; this document preserves which decisions came from each source artifact.
