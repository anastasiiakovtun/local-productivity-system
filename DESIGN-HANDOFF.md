<!-- Hallmark pre-emit critique: Philosophy 5, Hierarchy 5, Execution 5, Specificity 5, Restraint 5, Variety 4 -->

# Visual design handoff: to-do + Pomodoro desktop app

## Design read

Reading this as a compact desktop productivity app for a student who already works in Obsidian, with a calm, technical, dark interface that minimizes reorientation and makes resuming work the primary visual event.

**Direction:** A quiet dark workspace with one teal interaction color, restrained depth, and resume context presented as the most important object on screen.

**Why:** The product promise is about restoring mental state, not rewarding task completion. The UI should feel stable, legible, and familiar across long study sessions. Visual effects support hierarchy and state feedback only.

**Next:** Build the functional layouts and keyboard flows first. Apply the token, surface, gradient, sheen, and motion sections in the final polish pass.

## 1. Reference interpretation

Carry over this design DNA from the Aivora reference:

- Compact left navigation with clear selected-row treatment.
- Near-black page with slightly lighter layered surfaces.
- Fine low-opacity borders rather than bright outlines.
- A localized soft glow that gives the window depth without turning into a decorative mesh.
- Small icon containers, restrained shadows, and a subtle top-edge highlight.
- Tight typography and spacing suitable for a desktop tool.

Do not copy:

- The Kanban structure, column layout, labels, copy, lavender accent, Ask AI card, profile header, or exact navigation arrangement.
- The broad purple bloom. This app uses teal only for interaction and focus.
- High card counts or dashboard density. Resume context must remain visually dominant.

## 2. Design priorities

1. Resume context must be recognized within one glance.
2. Active task and timer state must remain obvious even when the sidebar is collapsed.
3. The interface must be keyboard-complete, not merely keyboard-compatible.
4. Teal means selection, focus, or primary action. It does not mean completion.
5. Status colors are semantic and local. Do not use them as decorative accents.
6. No points, streaks, confetti, celebratory counters, mascots, or game-like progress visuals.

## 3. Foundation tokens

Use Inter Variable. It is appropriate here because the user already accepts it, it remains highly legible at compact sizes, and it avoids adding a new brand decision before the app is validated.

```css
:root {
  color-scheme: dark;

  /* Core palette */
  --color-bg: #0f0f13;
  --color-bg-lift: #1a1a24;
  --color-surface: #1a1a20;
  --color-surface-subtle: #16161c;
  --color-surface-raised: #202028;
  --color-surface-hover: #22222a;

  --color-text: #f5f5f7;
  --color-text-muted: #9ca3af;
  --color-text-faint: #6f7580;
  --color-accent: #2dd4bf;
  --color-accent-ink: #0f0f13;

  --color-blocked: #f59e0b;
  --color-abandoned: #ef4444;
  --color-completed: #22c55e;

  /* Lines */
  --line-subtle: rgba(245, 245, 247, 0.06);
  --line-default: rgba(245, 245, 247, 0.08);
  --line-strong: rgba(245, 245, 247, 0.12);
  --line-accent: rgba(45, 212, 191, 0.28);

  /* Radii */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 999px;

  /* Space: 4px base */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Type */
  --font-sans: "Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-md: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --text-title: 28px;
  --text-timer: 56px;

  /* Motion */
  --dur-fast: 120ms;
  --dur-ui: 160ms;
  --dur-modal: 220ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* Elevation */
  --shadow-card:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 12px 32px rgba(0, 0, 0, 0.20);
  --shadow-raised:
    inset 0 1px 0 rgba(255, 255, 255, 0.055),
    0 20px 56px rgba(0, 0, 0, 0.34);
  --shadow-float:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 18px 48px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

html,
body,
#app {
  min-width: 0;
  min-height: 100%;
  overflow-x: clip;
}

body {
  margin: 0;
  color: var(--color-text);
  background-color: var(--color-bg);
  background-image: radial-gradient(
    ellipse 860px 620px at 72% 18%,
    #1a1a24 0%,
    #17171f 26%,
    #131319 52%,
    #0f0f13 78%
  );
  background-attachment: fixed;
  font-family: var(--font-sans);
  font-size: var(--text-md);
  line-height: 1.45;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  -webkit-font-smoothing: antialiased;
}
```

### Contrast checks

- `#F5F5F7` on `#0F0F13`: 17.56:1.
- `#9CA3AF` on `#0F0F13`: 7.53:1.
- `#2DD4BF` on `#0F0F13`: 10.27:1.
- `#0F0F13` on `#2DD4BF`: 10.27:1.
- Blocked `#F59E0B` on `#1A1A20`: 8.06:1.
- Abandoned `#EF4444` on `#1A1A20`: 4.60:1. Keep abandoned labels at 14px or larger and medium weight.
- Completed `#22C55E` on `#1A1A20`: 7.60:1.

Do not lower the opacity of semantic text itself. Use tinted backgrounds and borders around full-strength semantic text.

## 4. Shape system

All UI is rounded, but the radius communicates scale:

- 6px: project cover swatches, status chips, keyboard keycaps.
- 8px: inputs, icon buttons, small buttons, nav rows, image thumbnails.
- 12px: standard cards, task rows, quick-capture tile, timer controls.
- 16px: resume packet, checkpoint dialogs, home cards.
- 20px: full timer panel and quick-abandon panel (modal dialogs over the faded backdrop).
- Pill radius: segmented status choices and compact floating timer only.

Do not mix square controls with rounded cards. Do not make every object pill-shaped.

## 5. Surface, border, divider, and sheen recipes

### Border and icon-container override

This rule supersedes the solid `1px` border examples below for the implementation pass:

- Use `0.5px` borders and dividers.
- Borders must read as reflected light: use a low-opacity gradient that fades into the adjacent dark surface instead of a uniform hard line.
- Horizontal dividers fade to transparent at both ends.
- Icon or image placeholders use rounded-rectangle containers with a subtle surface gradient, low-opacity edge reflection, and the documented radius scale. Do not place a bare icon directly on a flat background.

```css
.soft-border {
  border: 0.5px solid transparent;
  background:
    linear-gradient(var(--color-surface), var(--color-surface)) padding-box,
    linear-gradient(135deg, rgba(245, 245, 247, 0.13), rgba(245, 245, 247, 0.035) 55%, transparent) border-box;
}

.divider {
  height: 0.5px;
  background: linear-gradient(90deg, transparent, rgba(245, 245, 247, 0.08) 22%, rgba(245, 245, 247, 0.04) 78%, transparent);
}

.icon-container {
  display: inline-grid;
  place-items: center;
  border: 0.5px solid transparent;
  border-radius: var(--radius-md);
  background:
    linear-gradient(145deg, rgba(45, 212, 191, 0.10), rgba(255, 255, 255, 0.025)) padding-box,
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.025) 60%, transparent) border-box;
}
```

### Standard card

```css
.card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  background: rgba(26, 26, 32, 0.94);
  box-shadow: var(--shadow-card);
}

.card:hover {
  border-color: var(--line-strong);
  background: rgba(32, 32, 40, 0.96);
}
```

### Raised dialog

```css
.dialog {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(245, 245, 247, 0.10);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 18%),
    #1a1a20;
  box-shadow: var(--shadow-raised);
}

.dialog-backdrop {
  background: rgba(7, 7, 10, 0.72);
  backdrop-filter: blur(10px) saturate(0.88);
  -webkit-backdrop-filter: blur(10px) saturate(0.88);
}
```

### Dividers

```css
.divider {
  height: 1px;
  border: 0;
  background: rgba(245, 245, 247, 0.08);
}

.divider--quiet {
  background: rgba(245, 245, 247, 0.06);
}
```

Use one divider between meaningful groups. Do not outline every row on all four sides.

### Primary action with restrained sheen

```css
.button-primary {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius-sm);
  color: var(--color-accent-ink);
  background: var(--color-accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.26),
    0 0 0 1px rgba(45, 212, 191, 0.12),
    0 8px 24px rgba(45, 212, 191, 0.14);
  font: 600 var(--text-md) / 1 var(--font-sans);
  transition:
    transform var(--dur-fast) var(--ease-out),
    filter var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.button-primary::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.04) 42%,
    rgba(255, 255, 255, 0) 62%
  );
  pointer-events: none;
}

.button-primary:hover {
  filter: brightness(1.055);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.30),
    0 0 0 1px rgba(45, 212, 191, 0.16),
    0 10px 28px rgba(45, 212, 191, 0.18);
}

.button-primary:active {
  transform: translateY(1px) scale(0.99);
}

.button-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
```

Keep the teal shadow below 18% opacity. A stronger glow becomes decorative and competes with the timer.

### Secondary and destructive actions

```css
.button-secondary {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.button-danger {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: var(--radius-sm);
  color: #ef4444;
  background: rgba(239, 68, 68, 0.10);
}

.button-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--line-strong);
}

.button-danger:hover {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.34);
}
```

## 6. Application shell

### Desktop dimensions

- Recommended minimum app window: 960 x 640px.
- Expanded sidebar: 216px.
- Collapsed sidebar: 56px.
- Main content max readable width: 1040px.
- Main content padding: 24px at widths above 960px, 16px below 960px.
- Native OS title-bar controls remain untouched.

### Expanded sidebar

Order from the sketch:

1. Text app name at top. Use 15px, weight 650, letter spacing `-0.01em`.
2. Home.
3. Today.
4. Upcoming.
5. Projects group.
6. Nested project rows with cover swatch or image.
7. Divider.
8. Completed.
9. Session history.
10. Trash.
11. Activity.
12. Collapse control anchored to the lower edge or aligned with the app-name row.

Suggested icons from `@phosphor-icons/vue`, regular weight at 18px:

- Home: `House`.
- Today: `CalendarBlank`.
- Upcoming: `CalendarDots`.
- Projects: `Folders`.
- Completed: `CheckCircle`.
- Session history: `ClockCounterClockwise`.
- Trash: `Trash`.
- Activity: `Pulse`.
- Collapse: `SidebarSimple`.

Use one icon family only. Set Phosphor `weight="regular"`; use `weight="fill"` only for the selected nav icon if more emphasis is needed.

### Project covers

- Sidebar cover: 20 x 20px, radius 6px.
- Home/resume cover: 36 x 36px, radius 8px.
- Resume packet cover: 48 x 48px, radius 10px.
- Image cover CSS: `object-fit: cover; object-position: center`.
- Color cover: solid user-selected swatch with a 1px inset white highlight at 8% opacity.
- Missing cover fallback: neutral `#262630` tile containing `FolderSimple`, not a random decorative illustration.

### Collapsed sidebar

- Preserve the same vertical order as expanded mode.
- Show icons centered in 40 x 40px hit areas within the 56px rail.
- Hover or keyboard focus reveals a tooltip after 800ms. Keyboard focus tooltip has no delay.
- Activating Projects opens a flyout, width 224px, offset 8px from the rail, radius 12px, using `--shadow-float`.
- Project rows in the flyout include the 20px cover and project name.

### Selected navigation state

Use the teal accent, not a separate color.

Reason: teal already means current interaction and focus. A second selection color would add another semantic category and compete with Blocked, Abandoned, and Completed. Keep the teal treatment quiet enough that it does not read as a status.

```css
.nav-item {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  min-height: 36px;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  background: transparent;
}

.nav-item[aria-current="page"] {
  color: var(--color-text);
  border-color: rgba(45, 212, 191, 0.12);
  background: linear-gradient(
    90deg,
    rgba(45, 212, 191, 0.14) 0%,
    rgba(45, 212, 191, 0.055) 72%,
    rgba(45, 212, 191, 0.025) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 0 18px rgba(45, 212, 191, 0.055);
}

.nav-item[aria-current="page"]::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 50%;
  width: 3px;
  height: 16px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  box-shadow: 0 0 10px rgba(45, 212, 191, 0.24);
  transform: translateY(-50%);
}
```

## 7. Typography hierarchy

```css
.page-title {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-title);
  font-weight: 650;
  line-height: 1.18;
  letter-spacing: -0.025em;
}

.section-title {
  margin: 0;
  color: var(--color-text);
  font-size: var(--text-lg);
  font-weight: 620;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.label {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 550;
  line-height: 1.35;
}

.timer-value {
  color: var(--color-text);
  font-size: var(--text-timer);
  font-weight: 620;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}
```

Avoid all-caps section labels. Use sentence case throughout. Use tabular numerals for timers, elapsed time, and session durations.

## 8. Home screen

### Active state

Heading: `Continue where you left off`

Desktop composition:

- Two-column grid: `minmax(0, 1.45fr) minmax(240px, 0.55fr)`.
- Gap: 16px.
- Main resume card minimum height: 220px.
- Quick capture tile minimum height: 220px.
- Below 820px, stack into one column.

Resume card order:

1. Project cover and project name.
2. Task title, 20px, weight 650.
3. `Last checkpoint` label and one or two line sentence.
4. Quiet divider.
5. `Next action` label and one or two line sentence.
6. Primary `Resume` button aligned bottom-right. Include `Play` icon.

Truncate checkpoint and next action after two lines on Home. The full text remains available in the open resume packet.

Quick capture tile:

- Use `PlusCircle` or `NotePencil` icon, not a decorative sparkle.
- Label: `Quick capture`.
- Supporting copy: `Add a task without leaving this view.`
- Entire tile is clickable and keyboard focusable.
- Keep it visually secondary: neutral card with teal only on focus/hover icon.

### Empty state

Heading: `Nothing to resume`

Use `ClockCounterClockwise` inside a 48 x 48px rounded icon container because the state is specifically about no resumable work, not a generic empty box.

Copy:

- Title: `No active task`
- Body: `Start a task from Today or capture a new one.`
- Primary action: `Go to Today`
- Secondary text action: `Quick capture`

Empty-state layout, top to bottom:

1. Icon container.
2. Title and body. Stack gap between icon and text: 16px. Gap between title and body: 8px.
3. `Go to Today` button, centered, at the bottom of the card, 20px below the body.

Empty-state container:

- Width: min(420px, 100%).
- Padding: 32px.
- Icon container background: `rgba(45, 212, 191, 0.08)`.
- Icon color: `#2DD4BF`.
- Do not add an illustration that is unrelated to work resumption.

## 9. Timer states

### Full timer panel

- Presented above a faded app background.
- Dialog width: 560px, max width `calc(100vw - 32px)`.
- Padding: 32px.
- Top row: project cover (56 x 56px) with project name and task title on the left; close button (and optional minimize) on the right. The cover, text block, and close button share one row at the top of the card.
- Timer below the top row, 56px, tabular numerals, centered horizontally and vertically in the remaining space.
- Planned-duration row below the timer.
- Controls aligned right with 12px gap.
- Primary control: Pause or Resume.
- Secondary control: Stop.

Do not use a circular completion ring. It makes the timer feel game-like and adds continuous visual pressure. If elapsed proportion is required, use a 2px quiet line at the bottom of the panel with `rgba(45, 212, 191, 0.55)` fill and no track stronger than 6% white.

### Countdown

- Example display: `23:41`.
- Timer remains `#F5F5F7`.
- A quiet `Focus session` label can sit above the task title.
- Pause is primary while running. Resume is primary while paused.

### Overflow

- Label: `Overtime`.
- Display: `+04:12`.
- Keep the value `#F5F5F7`; do not turn it red.
- A small neutral label distinguishes overflow without suggesting failure.
- Keep `Finish` as the primary action and `Pause` as secondary if pausing overtime is allowed.

### Close behavior and quick abandon

The top-right close action does not immediately destroy state. It opens the compact quick-abandon panel described in section 12.

### Floating timer

- Size: 232 x 52px.
- Radius: 12px.
- Surface: `rgba(26, 26, 32, 0.96)`.
- Backdrop filter: `blur(14px) saturate(1.05)`.
- Shadow: `--shadow-float`.
- Layout: 32px cover, time, 32px pause/resume button.
- Outer padding: 10px.
- Gap: 10px.
- Timer font: 18px, weight 620, tabular numerals.
- Drag region may occupy the non-interactive background, but controls must be marked `-webkit-app-region: no-drag` in Electron.
- Keep it visible above other app windows only if the user explicitly enables the floating timer behavior.

## 10. Resume packet

Treat this as the product's signature surface, not a generic task details card.

- Dialog width: 640px.
- Max height: `min(760px, calc(100vh - 48px))`.
- Internal scroll only after the header and start action remain visible.
- Padding: 24px.
- Close button: top-right.

Header:

1. 48px project cover.
2. Task title.
3. Project name in muted text.
The 40px project cover is vertically centered against the project name and title block. The session duration control is not in the header; it sits in the footer.

Content sections:

1. `Previous checkpoint`
   - Read-only mental-state summary.
   - Use `MapPinLine` icon.
2. `Next action`
   - Most visually prominent text block after the title.
   - Use `ArrowBendDownRight` icon.
   - `Edit` button on the same line as the text, aligned right: 28px high, 14px label, 16px pencil icon, teal text on a 8% teal background with a teal border.
3. `Supporting notes`
   - Bulleted or short paragraph content.
   - Use `NotePencil` icon.
   - Same `Edit` button as Next action, on the same line as the content.
4. `Blocker`
   - Use `WarningCircle` icon.
   - If empty, show `No blocker recorded` in faint text, not a large empty box.
   - If populated, use amber text and a 10% amber background.

All four section icons use the same 24px rounded-rectangle icon container (radius 6px).

Edit mode replaces the text with a textarea and `Cancel` / `Save` buttons. It keeps the app's normal scale: 14px text, 36px buttons, 16px icons.

Footer:

- Session duration input (`25` + `min`, 36px high) directly left of the Start button.
- Primary action: `Start session` with `Play` icon.
- Duration and Start button aligned right as one group.
- Shortcut hint to the left: `Enter` shown as a keycap.

The Next action block should receive keyboard focus first when the packet opens only if it is editable. Otherwise focus the Start session button.

## 11. Full checkpoint dialog

This dialog captures enough context to resume later.

- Width: 600px.
- Padding: 24px.
- Header icon container: 48 x 48px, radius 12px.
- Icon: `MapPinLine` or `Signpost`, 24px. Prefer `MapPinLine` for continuity with the resume packet.
- Title: `Ending this session`.
- Supporting line: task title in muted text.

Fields:

1. `Status`
   - Segmented control: Completed, Blocked, Abandoned.
   - Each option includes its relevant icon and semantic color only when selected.
2. `Outcome`
   - Required one-line or short multiline input.
   - Prompt: `What changed or was decided?`
3. `Next action`
   - Required unless the project/task is fully completed.
   - Prompt: `What is the first concrete step when you return?`
4. `Blocker`
   - Render only when Status is Blocked.
   - Prompt: `What is preventing progress?`
5. `Supporting note`
   - Optional, collapsed by default behind `Add supporting note` if the dialog becomes too tall.

Footer:

- Secondary action: `Back`.
- Primary action: `Save checkpoint`.
- If Status is Abandoned, primary action label becomes `End session` and uses the restrained danger treatment, not a filled red slab.

Input styling:

```css
.field {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  background: rgba(15, 15, 19, 0.58);
  caret-color: var(--color-accent);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18);
}

.field::placeholder {
  color: #7f8793;
}

.field:focus-visible {
  outline: 0;
  border-color: rgba(45, 212, 191, 0.56);
  box-shadow:
    0 0 0 3px rgba(45, 212, 191, 0.14),
    inset 0 1px 2px rgba(0, 0, 0, 0.18);
}
```

## 12. Quick-abandon panel

This is a reduced checkpoint flow reached from the timer close action.

- Width: 440px.
- Padding: 24px.
- Back arrow at top-left returns to the timer without changing state.
- Icon: `StopCircle`, 24px, abandoned red inside a 48px container.
- Title: `End this session?`
- Status is fixed and visibly labeled `Abandoned`.
- One `Outcome` field asks: `Why are you stopping?`
- Keep the field optional if fast exit is a hard requirement, but preserve entered text if the user goes back.
- Primary action: `End session`, restrained danger style.
- Secondary action: `Keep working`.
- Action buttons centered in the panel. Icons and labels are vertically centered inside each button.

Do not use `Confirm` as the button label. Name the irreversible outcome.

Suggested keyboard behavior:

- `Escape`: return to timer, not abandon.
- `Cmd/Ctrl + Enter`: end session when focus is inside Outcome.
- `Tab`: Back, Outcome, Keep working, End session.

## 13. Status treatments

```css
.status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 600;
}

.status--blocked {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.10);
}

.status--abandoned {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(239, 68, 68, 0.10);
}

.status--completed {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.22);
  background: rgba(34, 197, 94, 0.10);
}
```

Status color never replaces the status text or icon. Do not rely on color alone.

## 14. Interaction and motion

Motion should communicate state changes, not personality.

- Hover transitions: 120ms.
- Selection and panel state transitions: 160ms.
- Dialog enter/exit: 220ms.
- Use `cubic-bezier(0.16, 1, 0.3, 1)` for entry and direct state response.
- Dialog entry: opacity 0 to 1 and translateY(8px) to 0.
- Floating timer entry: opacity 0 to 1 and scale 0.98 to 1.
- Sidebar collapse: width and label opacity may animate, but do not animate every child independently.
- Timer digits do not animate each second. Update instantly to avoid visual noise.
- Focus rings appear instantly, with no transition.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .dialog-backdrop,
  .floating-timer {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .floating-timer {
    background: #1a1a20;
  }
}
```

## 15. Keyboard requirements

Minimum implementation target:

- Global quick capture: `Cmd/Ctrl + N`.
- Focus Today: `G`, then `T`, if the app uses sequential navigation shortcuts.
- Open active resume packet: `R` when not typing.
- Start or resume session: `Enter` from the focused primary action.
- Pause/resume timer: `Space` when the timer surface has focus and no text field is active.
- Open stop/checkpoint flow: `S` when timer is active.
- Close dialogs safely: `Escape`.
- Save checkpoint: `Cmd/Ctrl + Enter`.
- Every shortcut must have a menu/tooltip discoverability path and must be disabled while typing unless it includes Cmd/Ctrl.

Use roving focus for segmented controls and arrow-key navigation for the status choices.

## 16. Accessibility and semantic requirements

- Minimum hit area: 36 x 36px for compact desktop controls. Prefer 40 x 40px in the sidebar.
- Visible focus ring: 2px teal with 3px offset or a 3px translucent teal halo on inputs.
- Icon-only controls require `aria-label` and a tooltip.
- Selected nav uses `aria-current="page"`.
- Segmented status uses radio semantics.
- Dialogs trap focus and restore focus to the invoking control when closed.
- Timer updates should not use a live region every second. Announce only state changes such as paused, resumed, overtime started, or session ended.
- Keep important text at 12px or larger. Body and form content should be 14px.

## 17. Polish pass sequence

Do not block functional development on visual polish.

### Core build first

1. Route and screen structure.
2. Task, project cover, timer, checkpoint, and resume data states.
3. Keyboard flows and focus management.
4. Empty, loading, error, paused, overtime, and abandoned states.
5. Floating window behavior in Electron.

### Polish after core behavior works

1. Apply semantic tokens and typography.
2. Normalize radii and control heights.
3. Add low-opacity dividers and borders.
4. Add the radial window background.
5. Add card elevation and modal backdrop.
6. Add active-nav and primary-button sheen.
7. Add icons and state-specific empty visuals.
8. Add restrained transitions and reduced-motion handling.
9. Verify contrast, keyboard behavior, 960 x 640 layout, and narrow window stacking.

## 18. Coder acceptance checklist

- [ ] Active nav uses teal, with a 3px x 16px indicator and no second selection color.
- [ ] Background uses the specified radial gradient, not a linear gradient or purple mesh.
- [ ] Borders and dividers are `0.5px` reflected-light gradients that fade into dark surfaces, not solid hard lines.
- [ ] Icon and image placeholders use rounded-rectangle gradient containers, never bare flat icons.
- [ ] All cards, buttons, icon containers, fields, and dialogs follow the documented radius scale.
- [ ] Dividers remain at 6% to 8% white opacity.
- [ ] Primary-action glow remains at or below 18% teal opacity.
- [ ] Project covers work as both image and color swatch in sidebar, Home, and resume packet.
- [ ] Home has active and empty states.
- [ ] Timer has countdown, paused, overtime, and floating states.
- [ ] Closing the timer opens quick abandon instead of immediately discarding state.
- [ ] Full checkpoint captures status, outcome, next action, and conditional blocker.
- [ ] Resume packet shows previous checkpoint, next action, supporting notes, blocker, and session duration.
- [ ] Relevant Phosphor icons are used. No decorative sparkles or unrelated empty-state art.
- [ ] Focus is visible and all icon-only actions have accessible names.
- [ ] Reduced motion and reduced transparency fallbacks work.
- [ ] No gamification patterns have been introduced.

## One thing to review

Review the resume packet first. It carries the product promise and establishes the hierarchy, spacing, status language, icon style, and button treatment that the other screens should inherit.
