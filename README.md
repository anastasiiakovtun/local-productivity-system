# Obsidian Focus Companion

Obsidian Focus Companion is a local-first Electron desktop app that combines task management with adjustable focus sessions. Tasks and session checkpoints remain readable in an Obsidian vault as Markdown, while SQLite stores queryable application state and history.

## Features

- Create, edit, complete, reopen, and delete tasks.
- Review Inbox, Today, and Completed task views.
- Start adjustable focus sessions from a Resume Packet.
- Pause, resume, finish, or abandon a session.
- Record a structured Checkpoint after a finished session.
- Review completed and abandoned sessions in Session History.
- Log task lifecycle events and focus sessions to Obsidian-compatible Markdown.

## Requirements

- macOS 15.6 or later on Apple silicon (verified development platform).
- Node.js 20.19.0 or later.
- npm 11.19.1 (version declared by `packageManager`).
- An existing Obsidian vault that is readable and writable.

Windows has not been manually verified.

## Product and submission evidence

- [Product requirements](PRD.md)
- [Grill evidence record](docs/research/grill-session.md)
- [Competitive app research](docs/research/app-landscape-report.md)
- [Design handoff](DESIGN-HANDOFF.md)
- [Visual artifact decisions](docs/design/visual-artifact-decisions.md)
- [Architecture decision](docs/adr/0001-use-electron-vue.md)

## Setup

Clone the repository, enter it, and install dependencies:

```bash
git clone https://github.com/anastasiiakovtun/local-productivity-system.git
cd local-productivity-system
npm install
```

`better-sqlite3` is a native dependency. Electron Forge rebuilds it for the bundled Electron runtime when needed.

## Run

Start the app in development mode:

```bash
npm start
```

Run automated tests:

```bash
npm test
```

Run tests continuously while developing:

```bash
npm run test:watch
```

Create and verify a platform package:

```bash
npm run package
```

Run the packaged-app smoke test:

```bash
npm run test:e2e
```

## Obsidian vault configuration

1. Create or open a vault in Obsidian so its root contains a `.obsidian/` directory.
2. Run `npm start`.
3. Select the vault root when the native directory picker opens. Select the folder that contains `.obsidian/`, not the `.obsidian/` folder itself.
4. Grant filesystem access if macOS requests it.

The selected path is saved locally and reused on later launches. The app validates that the vault exists, is readable and writable, and contains `.obsidian/`.

The app creates and manages these Markdown files under the vault:

```text
Productivity/
├── Inbox.md
├── Activity.md
└── Focus Logs/
    └── <task-id>.md
```

- `Inbox.md` contains task checkboxes inside `<!-- focus:tasks:start -->` and `<!-- focus:tasks:end -->` markers.
- `Activity.md` contains append-only task lifecycle entries.
- `Focus Logs/<task-id>.md` contains completed Checkpoints and abandoned-session entries.

Do not remove or duplicate the task-section markers in `Inbox.md`. Content outside the markers remains user-managed.

## Dependencies

### Runtime

- Electron 44
- Vue 3
- Pinia 4
- `better-sqlite3` 13

### Development and testing

- Electron Forge 7 with its Vite plugin
- Vite 8
- Vitest 5 and happy-dom
- Vue Test Utils 2
- Playwright 1.63
- `@electron/rebuild` 4

Exact versions are locked in `package-lock.json`.

## Local data

Application state and session history are stored in `focus.db` under Electron's per-user application-data directory. Vault Markdown remains the human-readable projection for task events and focus logs.
