# Project guide: what every folder and file is for

This is a beginner-friendly map of the `local-productivity-system` repository. It explains what each folder and file does, in plain English.

---

## The big picture first

The app is a **desktop app** built with **Electron**. An Electron app has two halves that run separately:

| Half | Also called | What it does | Where it lives |
|---|---|---|---|
| **The back** | "main process" | Has full access to your computer. Opens windows, reads and writes files in your Obsidian vault, talks to the database. | `src/main.js` and `src/main/` |
| **The front** | "renderer" | The screens you see and click. Built with **Vue**. It is locked down for safety and **cannot** touch files directly. | `src/App.vue`, `src/views/`, `src/components/`, `src/stores/`, `src/styles/` |

Between the two halves sits a small, controlled **bridge** called the **preload** (`src/preload.js` and `src/preload/`). The front can only ask the back to do things through this bridge. This is on purpose: it keeps the app secure.

Where data is saved:

- **SQLite database** (`focus.db`): a small database file on your Mac. It stores tasks, sessions, checkpoints, and settings so the app can search and list them quickly.
- **Your Obsidian vault**: the app also writes readable Markdown notes (activity log, focus logs) into your vault, so you can read your history inside Obsidian.

---

## Top-level files (in the main folder)

| File | What it is for |
|---|---|
| `README.md` | The front page of the project. Short description, features, and how to install and run it. |
| `PRD.md` | **Product Requirements Document.** The full description of what the app must do and why. The "contract" for the product. |
| `CONTEXT.md` | **Glossary.** Explains the words used in this project (Vault, Project, Task, Session, Checkpoint, and so on), so everyone means the same thing. |
| `DESIGN-HANDOFF.md` | The **visual design guide**: colors, spacing, fonts, and how each screen should look and feel. |
| `package.json` | The project's **ID card for npm**. Lists the app name, the libraries it needs, and the commands you can run (`npm start`, `npm test`, `npm run package`). |
| `package-lock.json` | Auto-generated. Records the **exact** version of every library installed, so every install is identical. Never edit this by hand. |
| `index.html` | The empty web page that the Vue app is loaded into. The app fills it in when it starts. |
| `forge.config.js` | Settings for **Electron Forge**, the tool that runs and packages the app into a real `.app`. |
| `vite.main.config.mjs` | Build settings for the **back** half (`src/main.js`). |
| `vite.preload.config.mjs` | Build settings for the **bridge** (`src/preload.js`). |
| `vite.renderer.config.mjs` | Build settings for the **front** half (the Vue screens). |
| `vitest.config.mjs` | Settings for **Vitest**, the tool that runs the automated tests. |
| `.gitignore` | A list of files and folders Git should **ignore** (never save to GitHub), such as `node_modules/` and `out/`. |

---

## Folders at a glance

| Folder | What it is for | Saved in Git? |
|---|---|---|
| `src/` | **All the app's source code.** The most important folder. | Yes |
| `tests/` | Automated tests that check the code works. | Yes |
| `docs/` | Written documents: decisions, research, plans, submission files. | Yes |
| `reference/` | Your hand-drawn sketches and the visual style image. | Yes |
| `scripts/` | Small helper programs used when packaging the app. | Yes |
| `node_modules/` | All downloaded libraries. Created by `npm install`. Huge, never edit. | No |
| `out/` | The **finished packaged app** (`.app`). Created by `npm run package`. | No |
| `.vite/` | Temporary build files made while the app runs. Safe to ignore. | No |
| `.worktrees/` | Extra working copies of the repo, used to work on branches side by side. | No |
| `.git/` | Git's own history database. Never touch. | — |

---

## `src/`: the app's code

### Starting points

| File | What it does |
|---|---|
| `src/main.js` | **Starts the whole app.** Opens the main window and the small floating-timer window, opens the database, and connects all the back-end pieces. |
| `src/preload.js` | Sets up the **bridge** so the front can call safe functions like `window.app.createTask(...)` and `window.vault.select()`. |
| `src/renderer.js` | **Starts the front.** Creates the Vue app, turns on Pinia (shared data), loads the styles, and shows `App.vue`. |
| `src/App.vue` | The **main screen controller.** Decides what you see: sidebar and a list view, or the Resume Packet, Timer, Checkpoint, or Break screen. |
| `src/floating.html` | The small, always-on-top **floating timer** window. |

### `src/main/`: the back half (files, database, logic)

| File | What it does |
|---|---|
| `app-handlers.js` | The **reception desk.** Receives every request from the front (create task, start session, and so on) and sends it to the right store. |
| `db.js` | Opens the SQLite database and sets up its tables. |
| `migrations/001-initial.sql` | The first **database layout**: tables for preferences, tasks, task events, sessions, and checkpoints. |
| `migrations/002-dashboard-and-resume.sql` | A later **database update**: adds supporting notes to tasks and a table for project cover colors. |
| `task-store.js` | Saves, edits, completes, reopens, and deletes **tasks**. |
| `task-event-store.js` | Records **what happened to a task** (created, completed, and so on) and writes it to the vault's activity log. |
| `session-store.js` | Handles **focus sessions**: start, pause, resume, finish, abandon, and the session history. |
| `checkpoint-store.js` | Saves the **checkpoint** you fill in after a session (what you did, next action, blocker). |
| `project-cover-store.js` | Remembers the **color** you picked for each project. |
| `task-id.js` | Makes a unique **ID** for each new task (like `^task-swf2wa`). |
| `logged-timestamp.js` | Records the exact **date, time, and timezone** of an event. |
| `markdown-tasks.js` | Reads and writes task lines in **Markdown** format. |
| `note-reader.js` | Reads a note file from your vault. |
| `section-writer.js` | Safely updates **only the app's own section** of a note. It looks for the markers `<!-- focus:tasks:start -->` and `<!-- focus:tasks:end -->` and never touches the rest of your note. |
| `vault-paths.js` | A **safety guard.** It blocks any attempt to read or write files **outside** your vault. |
| `vault-validator.js` | Checks that the folder you picked is a **real Obsidian vault** (it has a `.obsidian` folder). |
| `vault-selection-handler.js` | Opens the native Mac **"choose folder"** window for picking your vault. |
| `vault-io-handlers.js` | Handles vault read and write requests coming from the front. |
| `window-options.js` | Window **size and security settings** for the main window. |

### `src/preload/`: the bridge

| File | What it does |
|---|---|
| `app-api.js` | The list of app actions the front is allowed to call (tasks, sessions, checkpoints, preferences, and so on). |
| `vault-api.js` | The three vault actions the front may call: pick vault, read note, write section. |
| `floating-api.js` | Actions for the floating timer window. |

### `src/shared/`: code both halves use

| File | What it does |
|---|---|
| `app-schema.js` | The **names of all messages** between front and back, plus shared lists like the project cover colors. Keeps both sides in agreement. |
| `vault-selection.js` | Message names and result checks for choosing and reading the vault. |

### `src/stores/`: shared data for the screens (Pinia)

A "store" holds data that many screens need, so they all see the same information.

| File | What it holds |
|---|---|
| `vault.js` | Which vault is connected, and whether connecting worked. |
| `tasks.js` | The task lists (Inbox, Today, Completed, and so on) and task actions. |
| `session.js` | The **running focus session** and the countdown timer (running, paused, overtime). |
| `home.js` | Data for the **Home** screen: the task to resume and your projects. |

### `src/views/`: full screens

| File | The screen |
|---|---|
| `HomeView.vue` | **Home**: "continue where you left off", quick capture, and projects. |
| `InboxView.vue` | **Inbox**: all open tasks. Add, edit, and delete tasks here. |
| `TodayView.vue` | **Today**: tasks for today. |
| `UpcomingView.vue` | **Upcoming**: tasks for later. |
| `CompletedView.vue` | **Completed**: finished tasks. |
| `TrashView.vue` | **Trash**: deleted tasks. |
| `ActivityView.vue` | **Activity**: the log of task events. |
| `SessionHistoryView.vue` | **Sessions**: past focus sessions, with filters. |
| `ResumePacketView.vue` | The **Start Session** screen: previous checkpoint, next action, notes, blocker, duration, and the Start button. |
| `TimerView.vue` | Holds the **timer**, and swaps to the "End session early?" panel when you press X. |
| `CheckpointView.vue` | The form you fill in **after** finishing a session. |
| `BreakView.vue` | The **break** countdown screen. |

### `src/components/`: reusable building blocks

| File | What it is |
|---|---|
| `AppSidebar.vue` | The **left menu** (Home, Inbox, Today, and so on), including the collapse button. |
| `TimerModal.vue` | The **timer card**: task name, big countdown, and Pause, Finish, and Close buttons. |
| `QuickAbandonPanel.vue` | The **"End session early?"** panel with Back and Abandon. |
| `FloatingTimer.vue` | The small **pill-shaped timer** shown in the floating window. |
| `ResumeSection.vue` | One **box** on the Start Session screen (icon, title, and content). |
| `ProjectCover.vue` | The small **colored square or folder icon** that represents a project. |
| `IconContainer.vue` | A small **rounded background** that holds an icon. |

### `src/styles/`: how everything looks (CSS)

| File | What it styles |
|---|---|
| `main.css` | The **entry file.** It imports all the other style files in the right order. |
| `tokens.css` | **Design variables**: colors, spacing, corner roundness, font sizes, animation speeds. Change a value here and it changes everywhere. |
| `base.css` | **Basic resets** and the page background. |
| `layout.css` | The **app layout** and the sidebar. |
| `home.css` | The **Home** screen. |
| `tasks.css` | **Task lists, buttons, empty states,** and search. |
| `focus.css` | The **Start Session, Timer, quick-abandon,** and floating timer screens. |
| `workflow.css` | Shared **cards** for Checkpoint and Break, card border highlights, and reduced-motion settings. |

---

## `tests/`: automated checks

Run them all with `npm test`.

| Folder | What it tests |
|---|---|
| `tests/unit/` | The **back-half logic** and small helpers: database, stores, vault safety, Markdown writing, and a check on the style files. |
| `tests/renderer/` | The **screens and components**: that they show the right things and the buttons do the right actions. One test file per screen or component. |
| `tests/e2e/electron-smoke.mjs` | An **end-to-end** test. It opens the real packaged app and checks it starts safely. Run with `npm run test:e2e`. |
| `tests/helpers/temp-vault.js` | Creates a **throwaway fake vault** for tests, then deletes it. |

---

## `docs/`: documents

| File or folder | What it is |
|---|---|
| `PROJECT-STATUS.md` | **Where the project stands**: what is done and what is verified. |
| `PROJECT-GUIDE.md` | This file. |
| `adr/0001-use-electron-vue.md` | An **Architecture Decision Record**: why Electron and Vue were chosen over Tauri. |
| `design/visual-artifact-decisions.md` | What each sketch in `reference/` decided about the design. |
| `research/app-landscape-report.md` | Research comparing other to-do and focus apps, and what the MVP needs. |
| `research/grill-session.md` | Record of the question-and-answer session that produced the PRD and glossary. |
| `spikes/001-electron-vue-vault-selection.md` | A **spike** (small experiment) proving the app can start safely and pick a vault. |
| `spikes/002-vault-note-io.md` | A spike proving the app can read notes and edit only its own section safely. |
| `superpowers/specs/` | **Design specs**: for each feature, *what* to build and why. |
| `superpowers/plans/` | **Implementation plans**: for each feature, step by step *how* to build it. |
| `submission/` | Files for your **course submission**: the PRD (Markdown and PDF) and a sample of vault output the app generated. |

---

## `reference/`: sketches and style

| File | What it shows |
|---|---|
| `reference-visual_style.png` | The **look and mood** reference (colors and style only). |
| `sketch-1-nav-bar.jpg` | The sidebar, expanded and collapsed. |
| `sketch-2-homeno_active_tasks.jpg` | Home screen with no active task. |
| `sketch-3-timeroverflowfloating-state.jpg` | The timer, overtime state, and floating timer. |
| `sketch-4-resume-packet.jpg` | The Start Session (Resume Packet) screen. |
| `sketch-5-checkpoint-popup.jpg` | The checkpoint form after a session. |
| `sketch-6-quick-abandon.jpg` | The "End session early?" panel. |

---

## `scripts/`: helper programs

| File | What it does |
|---|---|
| `package.mjs` | Runs when you type `npm run package`. Builds the real `.app` into `out/` and checks it was actually created. |
| `package-artifact.mjs` | Helper functions for `package.mjs`: clears the old output first and checks the new app exists. |

---

## Everyday commands

Run these from inside the project folder (`cd ~/Documents/GitHub/local-productivity-system`).

| Command | What it does |
|---|---|
| `npm install` | Downloads all libraries into `node_modules/`. Run once after cloning, or after `package.json` changes. |
| `npm start` | Runs the app in **dev mode**. Changes to Vue and CSS show up right away. |
| `npm test` | Runs all automated tests once. |
| `npm run test:watch` | Re-runs tests automatically every time you save a file. |
| `npm run package` | Builds the real Mac app into `out/`. |
| `npm run test:e2e` | Builds the app, then opens it and checks it starts safely. |

---

## How one click travels through the app

Example: you type a task in Inbox and press **Add**.

1. `InboxView.vue` (screen) calls the task store.
2. `stores/tasks.js` calls `window.app.createTask(...)`.
3. `preload/app-api.js` (bridge) passes the request to the back half.
4. `main/app-handlers.js` (reception desk) receives it.
5. `main/task-store.js` saves the task in SQLite.
6. `main/task-event-store.js` writes a "task created" entry into your vault's activity note.
7. The result travels back the same way, and the Inbox list updates.
