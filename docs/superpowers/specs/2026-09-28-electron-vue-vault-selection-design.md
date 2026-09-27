# Electron/Vue Vault Selection Spike Design

## Purpose

Establish the retained Electron and Vue 3 project foundation and validate the first part of the formal technical spike in `PRD.md` section 27. This slice proves that a Vue renderer can launch inside a sandboxed, context-isolated Electron window and that a user can select and validate a test Obsidian Vault through a narrow privileged boundary.

The result is a production foundation, not a disposable prototype. The Vault-selection screen and spike diagnostics may be replaced when full onboarding is built.

## Scope

This slice includes:

- An Electron Forge project using its Vite plugin.
- A Vue 3 renderer written in plain JavaScript with the Composition API.
- One local application window with explicit Electron security preferences.
- A native directory chooser for selecting one test Obsidian Vault.
- Validation that the selected directory is readable, writable, and contains a `.obsidian` directory.
- Structured renderer states for selection, cancellation, and validation failure.
- Automated unit, renderer, IPC, and Electron launch tests.
- A Forge package build and a short spike evidence report.

This slice excludes:

- Persisting the selected Vault.
- Creating or modifying Vault files.
- Reading Project notes.
- Path-containment checks for later Vault operations.
- Pinia state, SQLite, timers, notifications, shortcuts, tray behavior, and production onboarding.
- Full visual design implementation from `DESIGN-HANDOFF.md`.

## Technical foundation

Electron Forge owns development, build, and packaging. Its Vite plugin builds the main process, preload script, and renderer separately. Exact dependency versions and the npm lockfile are committed.

The renderer uses Vue 3, the Composition API, Vite, and plain JavaScript. The initial interface remains intentionally small: a heading, a short explanation, a `Choose test Vault` button, and a result message. It uses accessible labels and visible keyboard focus, but postpones full product styling.

No remote content is loaded. The main window loads only the local Vite development URL or packaged renderer assets produced by Electron Forge.

## Security boundary

The main process creates one `BrowserWindow` with these explicit preferences:

```js
{
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: path.join(__dirname, 'preload.js')
}
```

Electron Forge's Vite preload build emits `preload.js` beside the bundled main entry. The implementation resolves that build output from `__dirname`; it does not use an absolute source-tree path.

The preload script exposes one method:

```js
window.vault.select()
```

The preload method invokes one fixed IPC channel and validates the returned object against the operation's runtime result schema before releasing it to the renderer. This operation has no renderer-supplied payload. The renderer receives no `ipcRenderer`, Node API, Electron API, generic message sender, filesystem API, SQL API, or shell API.

The main-process handler verifies that the IPC event sender is the main application window before opening the dialog or returning data. Calls from any other sender are rejected.

## Vault selection flow

1. The user activates `Choose test Vault`.
2. The renderer calls `window.vault.select()` without arguments.
3. The preload method invokes the fixed `vault:select` channel.
4. The main-process handler verifies the sender.
5. Electron opens a native dialog configured for directory selection only.
6. Cancellation returns `{ status: 'cancelled' }`.
7. Selection passes the chosen path to the Vault validation module.
8. A valid Vault returns `{ status: 'selected', path: canonicalPath }`.
9. An expected validation failure returns `{ status: 'invalid', reason }`.
10. An unexpected internal failure returns `{ status: 'error', reason: 'unexpected-error' }` without a stack trace.

The native dialog can return only zero or one selected directory for this operation. If an unexpected result contains multiple paths, the handler rejects it instead of choosing one silently.

## Vault validation

A selected path is valid only when all conditions hold:

- The path resolves to an existing filesystem entry.
- The entry is a directory.
- The directory can be read.
- The directory can be written.
- `<vault>/.obsidian` exists.
- `<vault>/.obsidian` is a directory.

The validator canonicalizes the selected path with the platform filesystem API before returning it. This handles symbolic links and relative path components consistently. The app does not modify the selected directory during validation.

Expected invalid reasons are represented by stable machine-readable values:

- `not-directory`
- `not-readable`
- `not-writable`
- `missing-obsidian-directory`
- `invalid-obsidian-directory`
- `unavailable`

The renderer maps these values to concise user-facing messages. Raw filesystem errors and stack traces do not cross the preload boundary.

Read and write checks use filesystem access checks. They do not create probe files because onboarding must not modify a Vault before the user confirms the files that will be created.

## Module boundaries

- Main entry: application lifecycle and secure `BrowserWindow` creation.
- Vault validator: canonicalization and pure Vault eligibility decisions around injected filesystem operations.
- Vault IPC handler: sender validation, native dialog orchestration, and structured results.
- Preload entry: one-method `contextBridge` API.
- Vue renderer: button interaction and status presentation.
- Test helpers: temporary Vault creation and Electron launch inspection.

Each production module has one responsibility. Later spike items can add new narrow methods without widening the existing bridge.

## Error handling

Cancellation is a normal outcome and does not display an error. Known validation failures display an actionable reason and allow immediate retry. Unexpected main-process failures return a generic `unexpected-error` result and are logged in the main process without exposing internal details to the renderer.

The selection button is disabled while a request is active to prevent overlapping dialogs. The renderer restores the button after every structured result or rejected bridge call.

## Testing strategy

Implementation follows test-driven development. Each behavior receives a failing test before production code.

### Vault validator tests

Tests use temporary directories and real filesystem operations where the host platform permits:

- Accept a readable and writable directory containing a `.obsidian` directory.
- Return the canonical path for a valid Vault.
- Reject a file selected as the Vault.
- Reject a directory without `.obsidian`.
- Reject a Vault whose `.obsidian` entry is a file.
- Reject unavailable paths.
- Exercise unreadable and unwritable results through injected access behavior because privileged test environments can bypass permission bits.

### IPC tests

Tests verify:

- Cancellation maps to `{ status: 'cancelled' }`.
- One selected directory is validated and mapped to a structured result.
- Unexpected multiple selections are rejected.
- A sender other than the main window is rejected before the dialog opens.
- Internal filesystem failures do not leak stack traces or raw error details.

### Renderer tests

Component tests verify selected, cancelled, invalid, loading, and unexpected-error states. They assert visible behavior through the narrow `window.vault.select()` contract rather than Electron internals.

### Electron launch test

A packaged or Forge-started application smoke test verifies:

- The application launches and Vue content renders.
- `window.require` and renderer `window.process` are unavailable.
- The exposed bridge contains `vault.select` and no generic IPC method.
- Main-window web preferences report `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`.

Security preference construction also has a direct automated test so accidental option changes fail quickly without requiring the full launch test.

### Manual smoke test

Create a temporary test Vault containing a `.obsidian` directory, launch the app, select that directory in the native dialog, and confirm that the canonical path is shown as selected. Also select a directory without `.obsidian` and confirm that the app rejects it without modifying either directory.

## Verification outputs

Completion requires:

- Full automated test suite passes without unexpected warnings or errors.
- Electron/Vue application launches successfully on the verified macOS environment.
- Secure renderer preferences and absent Node globals are observed.
- Valid and invalid test Vault selections produce the designed states.
- Electron Forge creates a local package successfully.
- A spike report records commands, observed evidence, limitations, and the verdict for the covered section-27 items.

## Relationship to later spike work

This slice proves the first Electron security and Vault-selection boundary. Later section-27 work must reuse the configured canonical Vault path and add containment checks before reading or writing any Vault path. No later operation may accept an arbitrary absolute path directly from the renderer.
