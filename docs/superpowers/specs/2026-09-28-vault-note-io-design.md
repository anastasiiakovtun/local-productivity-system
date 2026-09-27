# Vault Note I/O Spike Design

## Purpose

Validate the second part of the formal technical spike in `PRD.md` section 27. This slice proves that a
Project note can be read from the configured Vault through a narrow IPC channel, that a managed section
delimited by HTML sentinel comments can be replaced without disturbing any other content in the file,
that child paths outside the configured Vault root are rejected before any file access occurs, and that
a write is refused when the file has changed since it was read.

The results are production-quality modules. The Vault-note I/O modules and IPC handlers built here
remain in place as the backbone for Task management in later slices.

## Scope

### Included

- A path-guard module that canonicalizes a caller-supplied relative path against a configured Vault root
  and rejects any path that resolves outside the root.
- A note-reader module that reads an absolute in-Vault path and returns the file content together with
  its last-modified timestamp.
- A section-writer module that locates the managed section between sentinel comments, replaces its
  content atomically, and refuses the write when the file has been modified since it was read.
- Two narrow IPC channels: `vault:read-note` and `vault:write-section`.
- Preload bridge additions: `window.vault.readNote(relativePath)` and
  `window.vault.writeSection(relativePath, sectionHeading, newContent, mtime)`.
- Automated unit tests covering path-guard, section parsing, conflict detection, atomic write, and
  bridge schema validation.
- Integration tests using real temporary files.
- A Forge package build and a spike evidence report (`docs/spikes/002-vault-note-io.md`).

### Excluded

- File watcher and self-write suppression (later spike item).
- Conflict-resolution UI (later spike item; this slice returns `{ status: 'conflict' }` only).
- SQLite, Pinia, timers, notifications, shortcuts, and tray behavior.
- Full product UI screens or visual design from `DESIGN-HANDOFF.md`.
- Windows runtime verification (macOS arm64 only for this spike).
- Vault-root persistence (the configured root is passed in from the test harness; persistence is
  a later concern).

## Sentinel markers

The managed Tasks section is delimited by a pair of HTML comment sentinels:

```
<!-- focus:tasks:start -->
... managed Tasks content ...
<!-- focus:tasks:end -->
```

The sentinels must appear on their own lines with no leading or trailing content on those lines.
They are invisible in Obsidian's rendered view. They survive user-added subheadings inside the Tasks
section and work whether Tasks is the final section in the note or not. The application locates the
managed section exclusively by searching for these exact sentinel strings; it never uses heading-level
boundaries for section location.

## Path guard

### Purpose

Prevent any operation from reaching a file outside the configured Vault root regardless of what the
caller supplies.

### Inputs and outputs

```
guardPath(vaultRoot: string, relativePath: string) → { status: 'ok', absolutePath: string }
                                                    | { status: 'error', reason: 'traversal' | 'not-in-vault' | 'unexpected-error' }
```

- `vaultRoot` is the absolute canonical Vault root (already validated by the Vault-selection spike).
- `relativePath` is the caller-supplied path; it may be any string.
- The implementation resolves `relativePath` against `vaultRoot` using `path.resolve`, then
  canonicalizes the result with `fs.realpath` when the path exists, falling back to
  `path.normalize` when it does not (to reject traversal even for paths not yet on disk).
- A result path is accepted only when it starts with `vaultRoot + path.sep` or equals `vaultRoot`.
- Symlinks that point outside the Vault are caught because `realpath` resolves them before the
  prefix check.
- Empty strings, absolute paths, and `..` sequences are covered by the same logic without special
  casing.

### Rejected inputs

| Input | Reason returned |
|---|---|
| `../secret` | `traversal` |
| Absolute path outside Vault | `not-in-vault` |
| Symlink pointing outside Vault | `not-in-vault` |
| Empty string | `traversal` |

## Note reader

### Purpose

Read a Vault file and return its content and last-modified timestamp.

### Inputs and outputs

```
readNote(absolutePath: string) → { status: 'success', content: string, mtime: number }
                                | { status: 'error', reason: 'not-found' | 'not-readable' | 'unexpected-error' }
```

- `absolutePath` has already passed the path guard.
- `mtime` is the integer milliseconds value of `fs.stat().mtimeMs`, rounded with `Math.round` to avoid
  floating-point comparisons.
- The reader returns the raw UTF-8 string. It does not parse Markdown.

## Section writer

### Purpose

Replace the content between sentinel markers atomically and refuse the write when the file has changed
since it was read.

### Inputs and outputs

```
writeSection(absolutePath: string, newSectionContent: string, expectedMtime: number)
  → { status: 'success', mtime: number }
  | { status: 'conflict' }
  | { status: 'error', reason: 'sentinels-missing' | 'sentinels-malformed' | 'not-writable' | 'unexpected-error' }
```

- `newSectionContent` is the replacement text that goes **between** the two sentinel lines. It must not
  include the sentinel lines themselves; the writer always reinserts the exact original sentinel strings.
- `expectedMtime` is the value returned by the most recent `readNote` call. If `stat().mtimeMs` differs
  by more than 1 ms at write time, the function returns `{ status: 'conflict' }` without modifying the
  file.
- `{ status: 'sentinels-missing' }` is returned when neither sentinel is present in the file.
- `{ status: 'sentinels-malformed' }` is returned when the start sentinel appears but the end sentinel
  is absent or appears before the start sentinel.
- The atomic write protocol is:
  1. Assemble the full replacement document in memory.
  2. Write to `<absolutePath>.tmp`.
  3. `fs.rename` the `.tmp` file over the original (atomic on POSIX; best-effort on Windows).
  4. Return `{ status: 'success', mtime }` where `mtime` is the new file's `mtimeMs`.
- The `.tmp` file is removed on failure before returning the error result.

### Section splitting

Given a note with the sentinels present:

```
<everything before start sentinel line (inclusive of the line itself)>
<start sentinel line>
<replaced content>
<end sentinel line>
<everything after end sentinel line (inclusive of the line itself)>
```

The reassembly preserves:

- Every byte before the start-sentinel line.
- The start-sentinel line verbatim.
- The new section content (caller-supplied).
- The end-sentinel line verbatim.
- Every byte after the end-sentinel line.

Trailing newlines, YAML frontmatter, headings, and any other content outside the sentinel block are
never touched.

## IPC channels

### `vault:read-note`

**Invoked by:** `window.vault.readNote(relativePath)`

**Main-process flow:**
1. Validate sender identity (same as the existing `vault:select` guard: `event.sender` must be
   `mainWindow.webContents` and `event.senderFrame` must be `mainWindow.webContents.mainFrame`).
2. Accept exactly one argument: `relativePath` (non-empty string).
3. Call `guardPath(vaultRoot, relativePath)`.
4. On guard success, call `readNote(absolutePath)`.
5. Return the result directly.

**Structured results:**

```
{ status: 'success', content: string, mtime: number }
{ status: 'error', reason: 'traversal' | 'not-in-vault' | 'not-found' | 'not-readable' | 'unexpected-error' }
```

Unexpected thrown errors are caught and converted to `{ status: 'error', reason: 'unexpected-error' }`.
Stack traces and internal paths never reach the renderer.

### `vault:write-section`

**Invoked by:** `window.vault.writeSection(relativePath, newContent, mtime)`

**Main-process flow:**
1. Same sender guard as above.
2. Accept exactly three arguments: `relativePath` (non-empty string), `newContent` (string),
   `mtime` (integer ≥ 0).
3. Call `guardPath(vaultRoot, relativePath)`.
4. On guard success, call `writeSection(absolutePath, newContent, mtime)`.
5. Return the result directly.

**Structured results:**

```
{ status: 'success', mtime: number }
{ status: 'conflict' }
{ status: 'error', reason: 'traversal' | 'not-in-vault' | 'sentinels-missing' | 'sentinels-malformed' | 'not-writable' | 'unexpected-error' }
```

### Schema constants

Add to `src/shared/vault-selection.js`:

```js
export const VAULT_READ_NOTE_CHANNEL = 'vault:read-note';
export const VAULT_WRITE_SECTION_CHANNEL = 'vault:write-section';
```

## Preload bridge

Extend `src/preload/vault-api.js` with two additional methods. The final
`contextBridge.exposeInMainWorld` call exposes:

```js
{
  select:       async ()                                    → structured result,
  readNote:     async (relativePath)                        → structured result,
  writeSection: async (relativePath, newContent, mtime)     → structured result,
}
```

Each new method:
- Calls `ipcRenderer.invoke` with the correct channel name and arguments.
- Validates the IPC result with `parseNoteReadResult` or `parseNoteWriteResult` (new parsers in
  `src/shared/vault-selection.js`) before returning.
- Converts any thrown error or schema violation to `{ status: 'error', reason: 'unexpected-error' }`.

## Runtime schema

Add to `src/shared/vault-selection.js`:

```js
export function parseNoteReadResult(value) { ... }
// Accepts: { status: 'success', content: string, mtime: number (integer ≥ 0) }
//          { status: 'error', reason: one of the defined strings }
// Throws TypeError for anything else.

export function parseNoteWriteResult(value) { ... }
// Accepts: { status: 'success', mtime: number (integer ≥ 0) }
//          { status: 'conflict' }
//          { status: 'error', reason: one of the defined strings }
// Throws TypeError for anything else.
```

Exact-key validation (same approach as `parseVaultSelectionResult`) prevents extra fields from
crossing the bridge.

## Test plan

### Unit: path guard (`tests/unit/vault-paths.test.js`)

- Accepts a direct child path.
- Accepts a deeply nested child path.
- Rejects `../` traversal.
- Rejects an absolute path outside the Vault.
- Rejects an empty string.
- Resolves a symlink whose target is inside the Vault (uses `fs.symlink` in a temp directory).
- Rejects a symlink whose target is outside the Vault.

### Unit: section parser (`tests/unit/section-writer.test.js`)

Pure function tests (no disk I/O). Extract a `splitSection(content)` pure function that returns
`{ before, inner, after }` or a structured error. Test:

- Both sentinels present, content between them.
- Start sentinel present, end sentinel absent → `sentinels-malformed`.
- Neither sentinel present → `sentinels-missing`.
- End sentinel appears before start sentinel → `sentinels-malformed`.
- Sentinels present at start of file (no before-content).
- Sentinels present at end of file (no after-content).
- Frontmatter above start sentinel preserved verbatim.
- User subheadings inside the managed section preserved in `inner`.

### Integration: read and write (`tests/unit/vault-io.test.js`)

Uses real temp files via `tests/helpers/temp-vault.js`.

- `readNote` returns content and numeric mtime for an existing file.
- `readNote` returns `not-found` for a missing file.
- `writeSection` round-trips: read → replace section → read again; content outside sentinels unchanged.
- `writeSection` returns `conflict` when mtime changes between read and write.
- `writeSection` returns `sentinels-missing` when file has no sentinels.
- `writeSection` writes atomically: `.tmp` file absent after a successful write.

### Unit: IPC handlers (`tests/unit/vault-io-handlers.test.js`)

Same injection pattern as `vault-selection-handler.test.js`.

- `vault:read-note` handler rejects extra arguments.
- `vault:read-note` handler rejects a wrong sender.
- `vault:read-note` handler rejects traversal paths.
- `vault:write-section` handler rejects wrong argument count.
- `vault:write-section` handler rejects non-integer mtime.
- `vault:write-section` handler propagates `conflict` without conversion.
- Both handlers convert unexpected thrown errors to `unexpected-error`.

### Unit: bridge parsers (`tests/unit/vault-note-schema.test.js`)

- `parseNoteReadResult` accepts every valid success and error shape.
- `parseNoteReadResult` rejects missing fields, extra fields, and wrong types.
- `parseNoteWriteResult` accepts every valid success, conflict, and error shape.
- `parseNoteWriteResult` rejects missing fields, extra fields, and wrong types.
- `parseNoteWriteResult` rejects `conflict` with extra fields.

### Unit: preload API (`tests/unit/vault-api.test.js` — extend existing)

- `readNote` invokes `vault:read-note` with the supplied path.
- `readNote` converts a malformed result to `unexpected-error`.
- `writeSection` invokes `vault:write-section` with the three expected arguments.
- `writeSection` converts IPC rejection to `unexpected-error`.
- `window.vault` exposes exactly `['select', 'readNote', 'writeSection']`.

## Spike evidence

`docs/spikes/002-vault-note-io.md` records:

- Environment: macOS version, arch, Node, npm, Electron, Electron Forge.
- Automated evidence: full `npm test` summary, `npm run test:e2e` output, package path.
- Manual evidence: a real Project note read through `window.vault.readNote`, a sentinel-bounded section
  replaced, unrelated content confirmed unchanged by diff, and a conflict refused when the file is
  modified externally between read and write.
- Limitations: watcher self-suppression, conflict-resolution UI, SQLite, and Windows runtime are not
  covered.
- Verdict: VALIDATED or PARTIAL/INVALIDATED with evidence.

## Security invariants

All invariants from the first spike remain in force:

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Only `window.vault.*` methods are exposed; no generic IPC, Node, or filesystem APIs reach the
  renderer.
- The sender and frame are validated before any IPC handler calls into the file system.
- Stack traces and absolute internal paths are never returned to the renderer.
- All results crossing the bridge are validated against exact-key schemas in both directions.
- Every write is confined to the canonical Vault path returned by the path guard.

## Constraints carried from the first spike

- Electron Forge with its Vite plugin; Vue 3 Composition API; plain JavaScript.
- Exact dependency versions and `package-lock.json` committed.
- `npm test` must pass with zero failures before each commit.
- `npm run test:e2e` (Forge package + Electron smoke test) must pass before the spike-evidence commit.
- No remote content is loaded. No network access required.
- Primary verified platform: macOS 15.6 on Apple silicon.
