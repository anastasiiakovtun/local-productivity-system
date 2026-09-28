# Vault Note I/O Spike Evidence

**Date:** 2026-09-28  
**Branch:** feat/vault-note-io  
**Spike items proven:** §27 items 3, 4, 5

---

## Items addressed

| §27 item | Claim | Verdict |
|---|---|---|
| A Project note can be read through narrow preload IPC. | `window.vault.readNote(relativePath)` invokes `vault:read-note`; returns `{ status, content, mtime }`. | **PROVEN** |
| A managed section can be modified without altering unrelated note content. | `window.vault.writeSection` locates HTML sentinel markers, replaces only the inner block, writes atomically; frontmatter and all other sections preserved byte-for-byte. | **PROVEN** |
| Paths outside the authorized Vault are rejected. | `guardPath` rejects `../` traversal, absolute-outside, empty string, and symlinks-out before any file access reaches the handler. | **PROVEN** |

---

## Automated evidence

- **Unit + renderer tests:** 129/129 pass (`npm test`)
- **Electron smoke test:** `vaultKeys: ['select', 'readNote', 'writeSection']`, `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` (`npm run test:e2e`)
- **Package artifact:** `out/Obsidian Focus Companion-darwin-arm64/Obsidian Focus Companion.app` produced and verified freshness-aware

### Key test suites

| Suite | Tests | Covers |
|---|---|---|
| `vault-paths.test.js` | 8 | guardPath: traversal, absolute-outside, empty, trailing sep, in-vault symlink, out-of-vault symlink |
| `vault-note-schema.test.js` | 33 | parseNoteReadResult / parseNoteWriteResult: valid shapes, extra keys, non-integer mtime, unknown reasons |
| `section-writer.test.js` | 9 | splitSection: before/inner/after, sentinels-missing, sentinels-malformed, end-of-file, start-of-file, empty inner, subheadings inside sentinels, YAML frontmatter |
| `vault-io.test.js` | 9 | readNote + writeSection: round-trip, conflict detection, sentinels-missing, atomic .tmp cleanup, pre-existing .tmp, colon-heavy YAML, no-trailing-newline |
| `vault-io-handlers.test.js` | 13 | IPC handlers: sender/frame guard, arg-count guard, empty-string guard, non-integer mtime guard, zero-mtime accepted, conflict pass-through, thrown-error sanitization |
| `vault-api.test.js` | 11 | Bridge: select/readNote/writeSection happy paths, malformed result conversion, IPC rejection conversion, exact surface keys |

---

## Key design decisions recorded

- **Sentinel format:** `<!-- focus:tasks:start -->` / `<!-- focus:tasks:end -->` on their own lines. Invisible in Obsidian's rendered view; survives user subheadings inside the managed section; works whether the section is mid-note or the final section.
- **Atomic write:** `.tmp` → `rename`; pre-existing `.tmp` files are overwritten before rename. Stale `.tmp` removed on failure.
- **Conflict detection:** mtime compared within 1 ms tolerance before write; returns `{ status: 'conflict' }` without overwriting.
- **Path guard:** canonicalizes `vaultRoot` via `realpath` first (handles macOS `/var` → `/private/var` symlink); then checks pre-realpath containment (catches `../` and absolute-outside) and post-realpath containment (catches symlink escape).
- **Vault root tracking:** `main.js` wraps `validateVault` to capture the canonical path from a successful selection into a module variable; `getVaultRoot` lambda closure over it is injected into handlers.

---

## Remaining §27 items

The following spike items are deferred per user direction to proceed directly to product implementation:

- [ ] A conflicting external edit is detected and preserved.
- [ ] A SQLite lifecycle event can be inserted and queried.
- [ ] `better-sqlite3` rebuilds and packages correctly for Electron.
- [ ] External file changes are detected without self-write loops.
- [ ] A global shortcut can be registered and conflicts reported.
- [ ] A local notification can be displayed.
- [ ] A tray/menu-bar item and compact always-on-top timer can be created.
- [ ] Active timer state survives relaunch and supports recovery.
- [ ] Logged records include date, time, UTC offset, IANA timezone, and UTC instant.
- [ ] Windows CI completes an unsigned x64 package build.

These will be addressed as inline spikes when the relevant product features are reached.
