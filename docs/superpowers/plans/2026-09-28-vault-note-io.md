# Vault Note I/O Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that a Project note can be read through narrow IPC, that a sentinel-delimited managed section can be replaced atomically without touching the rest of the file, that child-paths outside the Vault are rejected before any file access, and that a stale write is refused when the file changed since it was read.

**Architecture:** Five focused modules — path guard, note reader, section writer, IPC handlers, and bridge schema — are each built test-first in isolation, then wired into the existing Electron main process and preload bridge. The Vault root is injected rather than global, keeping every module unit-testable without a real Electron process.

**Tech Stack:** Node.js 26.10.0, npm 11.19.1, Electron 44.1.1, Electron Forge 7.11.2, Vite 8.2.2, Vue 3.5.42, Vitest 5.0.1, plain JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-28-vault-note-io-design.md`

## Global Constraints

- Electron Forge Vite plugin; Vue 3 Composition API; plain JavaScript — no TypeScript.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` remain on all windows.
- Only `window.vault.*` methods reach the renderer; no generic IPC, Node, filesystem, or shell APIs.
- Sender and frame validated before every IPC handler touches the filesystem.
- Stack traces and absolute internal paths never returned to the renderer.
- All IPC results validated with exact-key schemas in both directions.
- Managed sections located exclusively by `<!-- focus:tasks:start -->` / `<!-- focus:tasks:end -->` sentinel lines; never by heading-level boundaries.
- Atomic writes: assemble in memory → write to `<path>.tmp` → `fs.rename` over original; remove `.tmp` on failure.
- Conflict check: refuse write when `stat().mtimeMs` differs by more than 1 ms from `expectedMtime`.
- `npm test` must pass before every commit; `npm run test:e2e` before the evidence commit.
- No remote content; no network access.
- Primary verified platform: macOS 15.6 on Apple silicon.
- Exact dependency versions and `package-lock.json` committed; no new runtime dependencies in this slice.

## Review Focus

- A note whose YAML frontmatter contains a colon-heavy value must survive a write round-trip byte-for-byte outside the sentinel block; Task 3 adds a frontmatter-heavy fixture to the round-trip integration test.
- A caller that supplies a path with a trailing separator (e.g. `Notes/`) must still be accepted or rejected consistently by the path guard; Task 1 adds a trailing-separator test case.
- A managed section whose replacement content ends without a trailing newline must not gain or lose a newline compared with the sentinel lines it sits between; Task 3 pins this with an explicit no-trailing-newline fixture.
- An `mtime` of `0` (a valid integer ≥ 0) must be accepted by the write-section IPC argument validator; Task 4 adds this edge-case assertion.
- A `.tmp` file that already exists at the target path before an atomic write attempt must be overwritten, not cause an error; Task 3 covers this with a pre-existing `.tmp` fixture.

---

## File Map

New files created by this plan:

- `src/main/vault-paths.js` — path guard: canonicalize relative path against Vault root; reject traversal and out-of-vault.
- `src/main/note-reader.js` — read an absolute in-Vault path; return content and integer mtime.
- `src/main/section-writer.js` — locate sentinel block, conflict-check, assemble, atomic-write; exports `splitSection` (pure) and `writeSection`.
- `src/main/vault-io-handlers.js` — IPC handlers for `vault:read-note` and `vault:write-section`; sender/frame/arg guards; wires path-guard + reader/writer.
- `tests/unit/vault-paths.test.js` — path-guard unit tests.
- `tests/unit/section-writer.test.js` — `splitSection` pure-function tests (no disk I/O).
- `tests/unit/vault-io.test.js` — integration tests using real temp files.
- `tests/unit/vault-io-handlers.test.js` — IPC handler injection tests.
- `tests/unit/vault-note-schema.test.js` — `parseNoteReadResult` / `parseNoteWriteResult` schema tests.

Modified files:

- `src/shared/vault-selection.js` — add `VAULT_READ_NOTE_CHANNEL`, `VAULT_WRITE_SECTION_CHANNEL`, `parseNoteReadResult`, `parseNoteWriteResult`.
- `src/preload/vault-api.js` — add `readNote` and `writeSection` bridge methods; update `Object.keys` check to `['select', 'readNote', 'writeSection']`.
- `tests/unit/vault-api.test.js` — extend with `readNote`, `writeSection`, and updated key-list tests.
- `src/main.js` — import and register vault I/O handlers, passing Vault root via a module-level variable set after selection.
- `src/App.vue` — add a minimal spike panel for `readNote` / `writeSection` manual verification.
- `docs/spikes/002-vault-note-io.md` — spike evidence report.

---

## Task 1: Path guard

**Files:**
- Create: `src/main/vault-paths.js`
- Create: `tests/unit/vault-paths.test.js`

**Interfaces:**
- Consumes: `node:path`, `node:fs/promises`.
- Produces: `guardPath(vaultRoot: string, relativePath: string) → Promise<{ status: 'ok', absolutePath: string } | { status: 'error', reason: 'traversal' | 'not-in-vault' | 'unexpected-error' }>`.

- [ ] **Step 1: Write the failing path-guard tests**

Create `tests/unit/vault-paths.test.js`:

```js
import { mkdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guardPath } from '../../src/main/vault-paths.js';

let vaultRoot;
let outsideRoot;

beforeEach(async () => {
  vaultRoot = await import('node:fs/promises').then((fs) =>
    fs.mkdtemp(path.join(os.tmpdir(), 'focus-guard-vault-')),
  );
  outsideRoot = await import('node:fs/promises').then((fs) =>
    fs.mkdtemp(path.join(os.tmpdir(), 'focus-guard-outside-')),
  );
});

afterEach(async () => {
  await rm(vaultRoot, { recursive: true, force: true });
  await rm(outsideRoot, { recursive: true, force: true });
});

describe('guardPath', () => {
  it('accepts a direct child path', async () => {
    const result = await guardPath(vaultRoot, 'Notes/Project.md');
    expect(result.status).toBe('ok');
    expect(result.absolutePath).toBe(path.join(vaultRoot, 'Notes', 'Project.md'));
  });

  it('accepts a deeply nested child path', async () => {
    const result = await guardPath(vaultRoot, 'a/b/c/note.md');
    expect(result.status).toBe('ok');
    expect(result.absolutePath).toBe(path.join(vaultRoot, 'a', 'b', 'c', 'note.md'));
  });

  it('rejects ../ traversal', async () => {
    const result = await guardPath(vaultRoot, '../secret');
    expect(result).toEqual({ status: 'error', reason: 'traversal' });
  });

  it('rejects an absolute path outside the Vault', async () => {
    const result = await guardPath(vaultRoot, outsideRoot);
    expect(result).toEqual({ status: 'error', reason: 'not-in-vault' });
  });

  it('rejects an empty string', async () => {
    const result = await guardPath(vaultRoot, '');
    expect(result).toEqual({ status: 'error', reason: 'traversal' });
  });

  it('accepts a path with a trailing separator', async () => {
    const result = await guardPath(vaultRoot, 'Notes/');
    expect(result.status).toBe('ok');
  });

  it('accepts a symlink whose target is inside the Vault', async () => {
    const realFile = path.join(vaultRoot, 'real.md');
    await import('node:fs/promises').then((fs) => fs.writeFile(realFile, ''));
    const linkPath = path.join(vaultRoot, 'link.md');
    await symlink(realFile, linkPath);

    const result = await guardPath(vaultRoot, 'link.md');
    expect(result.status).toBe('ok');
    expect(result.absolutePath).toBe(realFile);
  });

  it('rejects a symlink whose target is outside the Vault', async () => {
    const outsideFile = path.join(outsideRoot, 'secret.md');
    await import('node:fs/promises').then((fs) => fs.writeFile(outsideFile, ''));
    const linkPath = path.join(vaultRoot, 'escape.md');
    await symlink(outsideFile, linkPath);

    const result = await guardPath(vaultRoot, 'escape.md');
    expect(result).toEqual({ status: 'error', reason: 'not-in-vault' });
  });
});
```

- [ ] **Step 2: Run failing test and verify RED**

Run: `npx vitest run tests/unit/vault-paths.test.js`

Expected: FAIL — `Cannot find module '../../src/main/vault-paths.js'`.

- [ ] **Step 3: Implement the path guard**

Create `src/main/vault-paths.js`:

```js
import { realpath } from 'node:fs/promises';
import path from 'node:path';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export async function guardPath(vaultRoot, relativePath) {
  try {
    // Resolve against vault root first (handles absolute paths too)
    const resolved = path.resolve(vaultRoot, relativePath);
    const normalized = path.normalize(resolved);

    // Attempt realpath to resolve symlinks for existing paths
    let canonical;
    try {
      canonical = await realpath(normalized);
    } catch {
      // Path doesn't exist yet — use normalized form for traversal check
      canonical = normalized;
    }

    const rootWithSep = vaultRoot.endsWith(path.sep) ? vaultRoot : vaultRoot + path.sep;

    if (canonical !== vaultRoot && !canonical.startsWith(rootWithSep)) {
      // Distinguish traversal (resolves above root) from out-of-vault (absolute elsewhere)
      const normalizedNoSep = normalized.endsWith(path.sep)
        ? normalized.slice(0, -1)
        : normalized;
      if (normalizedNoSep === vaultRoot || normalizedNoSep.startsWith(rootWithSep)) {
        // Resolved inside before realpath; realpath moved it out — symlink escape
        return { status: 'error', reason: 'not-in-vault' };
      }
      // Check if relative path escapes via ..
      const rel = path.relative(vaultRoot, canonical);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return { status: 'error', reason: path.isAbsolute(relativePath) ? 'not-in-vault' : 'traversal' };
      }
      return { status: 'error', reason: 'not-in-vault' };
    }

    return { status: 'ok', absolutePath: canonical };
  } catch {
    return unexpectedError();
  }
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npx vitest run tests/unit/vault-paths.test.js`

Expected: all 8 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`

Expected: all existing tests continue to pass; no regressions.

- [ ] **Step 6: Commit**

Summary of changes:
- `src/main/vault-paths.js` — path guard that canonicalizes a relative path against the Vault root, resolves symlinks, and rejects traversal, out-of-vault absolute paths, and symlink escapes.
- `tests/unit/vault-paths.test.js` — 8 tests covering all rejection cases and a trailing-separator edge case.

```bash
git add src/main/vault-paths.js tests/unit/vault-paths.test.js
git commit -m "feat: add vault path guard"
```

---

## Task 2: Schema constants and runtime parsers

**Files:**
- Modify: `src/shared/vault-selection.js`
- Create: `tests/unit/vault-note-schema.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `VAULT_READ_NOTE_CHANNEL = 'vault:read-note'`
  - `VAULT_WRITE_SECTION_CHANNEL = 'vault:write-section'`
  - `parseNoteReadResult(value)` — throws `TypeError` for invalid shapes; returns value for valid.
  - `parseNoteWriteResult(value)` — throws `TypeError` for invalid shapes; returns value for valid.

Valid shapes for `parseNoteReadResult`:
```
{ status: 'success', content: string, mtime: integer >= 0 }
{ status: 'error', reason: 'traversal' | 'not-in-vault' | 'not-found' | 'not-readable' | 'unexpected-error' }
```

Valid shapes for `parseNoteWriteResult`:
```
{ status: 'success', mtime: integer >= 0 }
{ status: 'conflict' }
{ status: 'error', reason: 'traversal' | 'not-in-vault' | 'sentinels-missing' | 'sentinels-malformed' | 'not-writable' | 'unexpected-error' }
```

- [ ] **Step 1: Write the failing schema tests**

Create `tests/unit/vault-note-schema.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  parseNoteReadResult,
  parseNoteWriteResult,
} from '../../src/shared/vault-selection.js';

describe('parseNoteReadResult', () => {
  it.each([
    [{ status: 'success', content: 'hello', mtime: 1234567890 }],
    [{ status: 'success', content: '', mtime: 0 }],
    [{ status: 'error', reason: 'traversal' }],
    [{ status: 'error', reason: 'not-in-vault' }],
    [{ status: 'error', reason: 'not-found' }],
    [{ status: 'error', reason: 'not-readable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts valid shape %#', (value) => {
    expect(parseNoteReadResult(value)).toEqual(value);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'success', content: 'x' }],                   // missing mtime
    [{ status: 'success', mtime: 100 }],                      // missing content
    [{ status: 'success', content: 'x', mtime: 1.5 }],        // non-integer mtime
    [{ status: 'success', content: 'x', mtime: -1 }],         // negative mtime
    [{ status: 'success', content: 'x', mtime: 1, extra: 1 }],// extra key
    [{ status: 'error', reason: 'unknown-reason' }],
    [{ status: 'error', reason: 'not-found', extra: 1 }],
  ])('rejects invalid shape %#', (value) => {
    expect(() => parseNoteReadResult(value)).toThrow(TypeError);
  });
});

describe('parseNoteWriteResult', () => {
  it.each([
    [{ status: 'success', mtime: 1234567890 }],
    [{ status: 'success', mtime: 0 }],
    [{ status: 'conflict' }],
    [{ status: 'error', reason: 'traversal' }],
    [{ status: 'error', reason: 'not-in-vault' }],
    [{ status: 'error', reason: 'sentinels-missing' }],
    [{ status: 'error', reason: 'sentinels-malformed' }],
    [{ status: 'error', reason: 'not-writable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts valid shape %#', (value) => {
    expect(parseNoteWriteResult(value)).toEqual(value);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'success' }],                                   // missing mtime
    [{ status: 'success', mtime: 1.5 }],                       // non-integer mtime
    [{ status: 'success', mtime: -1 }],                        // negative mtime
    [{ status: 'success', mtime: 100, extra: 1 }],             // extra key
    [{ status: 'conflict', extra: 'leak' }],                   // conflict with extra key
    [{ status: 'error', reason: 'unknown-reason' }],
  ])('rejects invalid shape %#', (value) => {
    expect(() => parseNoteWriteResult(value)).toThrow(TypeError);
  });
});
```

- [ ] **Step 2: Run failing test and verify RED**

Run: `npx vitest run tests/unit/vault-note-schema.test.js`

Expected: FAIL — named exports not found.

- [ ] **Step 3: Add constants and parsers to vault-selection.js**

Append to `src/shared/vault-selection.js` (after the existing `parseVaultSelectionResult` export):

```js
export const VAULT_READ_NOTE_CHANNEL = 'vault:read-note';
export const VAULT_WRITE_SECTION_CHANNEL = 'vault:write-section';

const noteReadErrorReasons = new Set([
  'traversal',
  'not-in-vault',
  'not-found',
  'not-readable',
  'unexpected-error',
]);

const noteWriteErrorReasons = new Set([
  'traversal',
  'not-in-vault',
  'sentinels-missing',
  'sentinels-malformed',
  'not-writable',
  'unexpected-error',
]);

function isNonNegativeInteger(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function parseNoteReadResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid note read result');
  }

  if (
    value.status === 'success' &&
    hasExactKeys(value, ['status', 'content', 'mtime']) &&
    typeof value.content === 'string' &&
    isNonNegativeInteger(value.mtime)
  ) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    noteReadErrorReasons.has(value.reason)
  ) return value;

  throw new TypeError('Invalid note read result');
}

export function parseNoteWriteResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid note write result');
  }

  if (
    value.status === 'success' &&
    hasExactKeys(value, ['status', 'mtime']) &&
    isNonNegativeInteger(value.mtime)
  ) return value;

  if (value.status === 'conflict' && hasExactKeys(value, ['status'])) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    noteWriteErrorReasons.has(value.reason)
  ) return value;

  throw new TypeError('Invalid note write result');
}
```

- [ ] **Step 4: Run schema tests and verify GREEN**

Run: `npx vitest run tests/unit/vault-note-schema.test.js`

Expected: all 22 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`

Expected: all tests pass; no regressions.

- [ ] **Step 6: Commit**

Summary of changes:
- `src/shared/vault-selection.js` — two new channel-name constants, `parseNoteReadResult`, `parseNoteWriteResult` with exact-key validation, integer-mtime check, and full reason allow-lists.
- `tests/unit/vault-note-schema.test.js` — 22 tests covering all valid and invalid shapes for both parsers, including zero mtime, non-integer mtime, negative mtime, conflict-with-extra-key, and unknown reasons.

```bash
git add src/shared/vault-selection.js tests/unit/vault-note-schema.test.js
git commit -m "feat: add vault note I/O schema constants and parsers"
```

---

## Task 3: Note reader and section writer

**Files:**
- Create: `src/main/note-reader.js`
- Create: `src/main/section-writer.js`
- Create: `tests/unit/section-writer.test.js`
- Create: `tests/unit/vault-io.test.js`

**Interfaces:**
- Consumes: `node:fs/promises`, `node:path`.
- Produces:
  - `readNote(absolutePath: string) → Promise<{ status: 'success', content: string, mtime: number } | { status: 'error', reason: string }>`
  - `splitSection(content: string) → { before: string, inner: string, after: string } | { status: 'error', reason: 'sentinels-missing' | 'sentinels-malformed' }`
  - `writeSection(absolutePath: string, newSectionContent: string, expectedMtime: number) → Promise<{ status: 'success', mtime: number } | { status: 'conflict' } | { status: 'error', reason: string }>`

Sentinel constants (used internally):
```js
const START_SENTINEL = '<!-- focus:tasks:start -->';
const END_SENTINEL   = '<!-- focus:tasks:end -->';
```

- [ ] **Step 1: Write the failing section-parser pure-function tests**

Create `tests/unit/section-writer.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { splitSection } from '../../src/main/section-writer.js';

const START = '<!-- focus:tasks:start -->';
const END   = '<!-- focus:tasks:end -->';

describe('splitSection', () => {
  it('splits a note with content before, inside, and after the sentinels', () => {
    const content = `# My Note\n\nSome text.\n\n${START}\n- [ ] Task A\n${END}\n\n## Other Section\n`;
    const result = splitSection(content);
    expect(result).toEqual({
      before: `# My Note\n\nSome text.\n\n${START}\n`,
      inner: '- [ ] Task A\n',
      after: `${END}\n\n## Other Section\n`,
    });
  });

  it('returns sentinels-missing when neither sentinel is present', () => {
    expect(splitSection('# No sentinels here\n')).toEqual({
      status: 'error',
      reason: 'sentinels-missing',
    });
  });

  it('returns sentinels-malformed when start sentinel present but end absent', () => {
    expect(splitSection(`Before\n${START}\ncontent\n`)).toEqual({
      status: 'error',
      reason: 'sentinels-malformed',
    });
  });

  it('returns sentinels-malformed when end sentinel appears before start sentinel', () => {
    expect(splitSection(`${END}\n${START}\ncontent\n`)).toEqual({
      status: 'error',
      reason: 'sentinels-malformed',
    });
  });

  it('handles sentinels at the start of the file (no before-content)', () => {
    const content = `${START}\n- [ ] First task\n${END}\n`;
    const result = splitSection(content);
    expect(result).toEqual({
      before: `${START}\n`,
      inner: '- [ ] First task\n',
      after: `${END}\n`,
    });
  });

  it('handles sentinels at the end of the file (no after-content)', () => {
    const content = `# Note\n\n${START}\n- [ ] Last\n${END}`;
    const result = splitSection(content);
    expect(result).toEqual({
      before: `# Note\n\n${START}\n`,
      inner: '- [ ] Last\n',
      after: END,
    });
  });

  it('preserves YAML frontmatter above the start sentinel verbatim', () => {
    const content = `---\ntitle: Proj\nstatus: active\n---\n\n## Tasks\n\n${START}\n- [ ] Task\n${END}\n`;
    const result = splitSection(content);
    expect(result.before).toBe(`---\ntitle: Proj\nstatus: active\n---\n\n## Tasks\n\n${START}\n`);
    expect(result.inner).toBe('- [ ] Task\n');
  });

  it('preserves user subheadings inside the managed section in inner', () => {
    const content = `${START}\n### Active\n- [ ] A\n### Done\n- [x] B\n${END}\n`;
    const result = splitSection(content);
    expect(result.inner).toBe('### Active\n- [ ] A\n### Done\n- [x] B\n');
  });

  it('handles empty inner content between sentinels', () => {
    const content = `${START}\n${END}\n`;
    const result = splitSection(content);
    expect(result).toEqual({
      before: `${START}\n`,
      inner: '',
      after: `${END}\n`,
    });
  });
});
```

- [ ] **Step 2: Run failing section-parser tests and verify RED**

Run: `npx vitest run tests/unit/section-writer.test.js`

Expected: FAIL — `Cannot find module '../../src/main/section-writer.js'`.

- [ ] **Step 3: Implement note reader**

Create `src/main/note-reader.js`:

```js
import { readFile, stat } from 'node:fs/promises';

export async function readNote(absolutePath) {
  try {
    const [content, stats] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ]);
    return {
      status: 'success',
      content,
      mtime: Math.round(stats.mtimeMs),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'error', reason: 'not-found' };
    if (error?.code === 'EACCES') return { status: 'error', reason: 'not-readable' };
    return { status: 'error', reason: 'unexpected-error' };
  }
}
```

- [ ] **Step 4: Implement section writer**

Create `src/main/section-writer.js`:

```js
import { rename, rm, stat, writeFile } from 'node:fs/promises';

const START_SENTINEL = '<!-- focus:tasks:start -->';
const END_SENTINEL   = '<!-- focus:tasks:end -->';

export function splitSection(content) {
  const startIdx = content.indexOf(START_SENTINEL);
  const endIdx   = content.indexOf(END_SENTINEL);

  if (startIdx === -1 && endIdx === -1) {
    return { status: 'error', reason: 'sentinels-missing' };
  }
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return { status: 'error', reason: 'sentinels-malformed' };
  }

  // before = everything up to and including the start sentinel line's newline
  const afterStart = startIdx + START_SENTINEL.length;
  const beforeEnd  = afterStart + (content[afterStart] === '\n' ? 1 : 0);
  const before     = content.slice(0, beforeEnd);

  // after = end sentinel line through end of string
  const after = content.slice(endIdx);

  // inner = content between start sentinel line and end sentinel line
  const inner = content.slice(beforeEnd, endIdx);

  return { before, inner, after };
}

export async function writeSection(absolutePath, newSectionContent, expectedMtime) {
  const tmpPath = absolutePath + '.tmp';

  try {
    const stats = await stat(absolutePath);
    if (Math.abs(Math.round(stats.mtimeMs) - expectedMtime) > 1) {
      return { status: 'conflict' };
    }
  } catch (error) {
    if (error?.code === 'ENOENT') return { status: 'error', reason: 'not-found' };
    return { status: 'error', reason: 'unexpected-error' };
  }

  let content;
  try {
    const { readFile } = await import('node:fs/promises');
    content = await readFile(absolutePath, 'utf8');
  } catch {
    return { status: 'error', reason: 'not-readable' };
  }

  const split = splitSection(content);
  if (split.status === 'error') return split;

  const replacement = split.before + newSectionContent + split.after;

  try {
    await writeFile(tmpPath, replacement, 'utf8');
    await rename(tmpPath, absolutePath);
    const newStats = await stat(absolutePath);
    return { status: 'success', mtime: Math.round(newStats.mtimeMs) };
  } catch (error) {
    try { await rm(tmpPath, { force: true }); } catch { /* ignore */ }
    if (error?.code === 'EACCES') return { status: 'error', reason: 'not-writable' };
    return { status: 'error', reason: 'unexpected-error' };
  }
}
```

- [ ] **Step 5: Run section-parser tests and verify GREEN**

Run: `npx vitest run tests/unit/section-writer.test.js`

Expected: all 9 tests pass.

- [ ] **Step 6: Write the failing integration tests**

Create `tests/unit/vault-io.test.js`:

```js
import { utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNote } from '../../src/main/note-reader.js';
import { writeSection } from '../../src/main/section-writer.js';
import { createTempDirectory } from '../helpers/temp-vault.js';

const START = '<!-- focus:tasks:start -->';
const END   = '<!-- focus:tasks:end -->';

let fixture;

beforeEach(async () => {
  fixture = await createTempDirectory('focus-io-');
});

afterEach(async () => {
  await fixture.cleanup();
});

function noteFile(name = 'Project.md') {
  return path.join(fixture.directory, name);
}

describe('readNote', () => {
  it('returns content and integer mtime for an existing file', async () => {
    const filePath = noteFile();
    await writeFile(filePath, '# Hello\n');

    const result = await readNote(filePath);

    expect(result.status).toBe('success');
    expect(result.content).toBe('# Hello\n');
    expect(Number.isInteger(result.mtime)).toBe(true);
    expect(result.mtime).toBeGreaterThan(0);
  });

  it('returns not-found for a missing file', async () => {
    const result = await readNote(noteFile('nonexistent.md'));
    expect(result).toEqual({ status: 'error', reason: 'not-found' });
  });
});

describe('writeSection', () => {
  it('round-trips: replaces section content; bytes outside sentinels unchanged', async () => {
    const filePath = noteFile();
    const original =
      '---\ntitle: My Project\nstatus: active\n---\n\n## Overview\n\nSome context.\n\n' +
      `${START}\n- [ ] Old task\n${END}\n\n## Notes\n\nMore notes here.\n`;
    await writeFile(filePath, original);

    const read1 = await readNote(filePath);
    expect(read1.status).toBe('success');

    const writeResult = await writeSection(filePath, '- [ ] New task\n', read1.mtime);
    expect(writeResult.status).toBe('success');
    expect(Number.isInteger(writeResult.mtime)).toBe(true);

    const read2 = await readNote(filePath);
    expect(read2.status).toBe('success');
    expect(read2.content).toContain('- [ ] New task');
    expect(read2.content).not.toContain('- [ ] Old task');

    // Content outside sentinels is byte-for-byte unchanged
    expect(read2.content).toContain('---\ntitle: My Project\nstatus: active\n---');
    expect(read2.content).toContain('## Overview\n\nSome context.');
    expect(read2.content).toContain('## Notes\n\nMore notes here.');
  });

  it('returns conflict when mtime changes between read and write', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    // Simulate an external edit by touching the file's mtime 2 seconds into the future
    const futureMs = (read.mtime + 2000) / 1000;
    await utimes(filePath, futureMs, futureMs);

    const result = await writeSection(filePath, '- [ ] New\n', read.mtime);
    expect(result).toEqual({ status: 'conflict' });
  });

  it('returns sentinels-missing when file has no sentinels', async () => {
    const filePath = noteFile();
    await writeFile(filePath, '# No sentinels\n\nPlain content.\n');

    const read = await readNote(filePath);
    const result = await writeSection(filePath, '- [ ] Task\n', read.mtime);
    expect(result).toEqual({ status: 'error', reason: 'sentinels-missing' });
  });

  it('writes atomically: .tmp file is absent after a successful write', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    await writeSection(filePath, '- [ ] Updated\n', read.mtime);

    const { access } = await import('node:fs/promises');
    await expect(access(filePath + '.tmp')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('handles a pre-existing .tmp file without error', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);
    await writeFile(filePath + '.tmp', 'stale tmp content');

    const read = await readNote(filePath);
    const result = await writeSection(filePath, '- [ ] Fresh\n', read.mtime);
    expect(result.status).toBe('success');

    const { access } = await import('node:fs/promises');
    await expect(access(filePath + '.tmp')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('preserves YAML frontmatter with colon-heavy values byte-for-byte', async () => {
    const frontmatter = '---\ntitle: "Key: Value: More: Colons"\naliases: ["a: b", "c: d"]\n---\n\n';
    const filePath = noteFile();
    await writeFile(filePath, `${frontmatter}${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    await writeSection(filePath, '- [ ] Updated\n', read.mtime);

    const read2 = await readNote(filePath);
    expect(read2.content.startsWith(frontmatter)).toBe(true);
  });

  it('handles replacement content with no trailing newline', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    // newContent has no trailing newline
    const result = await writeSection(filePath, '- [ ] No newline', read.mtime);
    expect(result.status).toBe('success');

    const read2 = await readNote(filePath);
    expect(read2.content).toBe(`${START}\n- [ ] No newline${END}\n`);
  });
});
```

- [ ] **Step 7: Run integration tests and verify GREEN**

Run: `npx vitest run tests/unit/vault-io.test.js`

Expected: all tests pass.

- [ ] **Step 8: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 9: Commit**

Summary of changes:
- `src/main/note-reader.js` — reads an absolute path; returns content and integer mtime; maps `ENOENT` and `EACCES` to structured errors.
- `src/main/section-writer.js` — exports `splitSection` (pure: locates sentinels, returns before/inner/after or error) and `writeSection` (conflict-checks mtime, replaces section, atomic `.tmp`→rename write, removes `.tmp` on failure).
- `tests/unit/section-writer.test.js` — 9 pure-function tests for `splitSection` covering all error cases, boundary positions, frontmatter, user subheadings, and empty inner content.
- `tests/unit/vault-io.test.js` — 7 integration tests using real temp files: `readNote` happy/not-found, round-trip write, conflict, sentinels-missing, atomic `.tmp` cleanup, pre-existing `.tmp`, frontmatter colon-safety, and no-trailing-newline.

```bash
git add src/main/note-reader.js src/main/section-writer.js \
        tests/unit/section-writer.test.js tests/unit/vault-io.test.js
git commit -m "feat: add note reader and sentinel section writer"
```

---

## Task 4: IPC handlers

**Files:**
- Create: `src/main/vault-io-handlers.js`
- Create: `tests/unit/vault-io-handlers.test.js`

**Interfaces:**
- Consumes: `guardPath` from `src/main/vault-paths.js`, `readNote` from `src/main/note-reader.js`, `writeSection` from `src/main/section-writer.js`, `VAULT_READ_NOTE_CHANNEL`, `VAULT_WRITE_SECTION_CHANNEL` from `src/shared/vault-selection.js`.
- Produces: `createVaultIoHandlers({ getMainWindow, getVaultRoot, guardPath, readNote, writeSection, logger })` — returns `{ handleReadNote, handleWriteSection }`. `registerVaultIoHandlers({ ipcMain, ...dependencies })` — registers both channels.

- [ ] **Step 1: Write the failing IPC handler tests**

Create `tests/unit/vault-io-handlers.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createVaultIoHandlers } from '../../src/main/vault-io-handlers.js';

function setup(overrides = {}) {
  const mainFrame = {};
  const webContents = { mainFrame };
  const mainWindow = { webContents };

  const guardPath = vi.fn().mockResolvedValue({ status: 'ok', absolutePath: '/vault/note.md' });
  const readNote  = vi.fn().mockResolvedValue({ status: 'success', content: '# Hi', mtime: 100 });
  const writeSection = vi.fn().mockResolvedValue({ status: 'success', mtime: 200 });
  const logger    = { error: vi.fn() };

  const deps = {
    getMainWindow: () => mainWindow,
    getVaultRoot:  () => '/vault',
    guardPath,
    readNote,
    writeSection,
    logger,
    ...overrides,
  };

  const { handleReadNote, handleWriteSection } = createVaultIoHandlers(deps);
  const event = { sender: webContents, senderFrame: mainFrame };

  return { handleReadNote, handleWriteSection, event, guardPath, readNote, writeSection, logger, mainWindow };
}

describe('handleReadNote', () => {
  it('reads a valid in-vault path and returns the result', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote(ctx.event, 'Notes/Project.md');
    expect(result).toEqual({ status: 'success', content: '# Hi', mtime: 100 });
    expect(ctx.guardPath).toHaveBeenCalledWith('/vault', 'Notes/Project.md');
    expect(ctx.readNote).toHaveBeenCalledWith('/vault/note.md');
  });

  it('rejects extra arguments before calling guardPath', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote(ctx.event, 'Notes/Project.md', 'extra');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a wrong sender', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote({ sender: {}, senderFrame: ctx.event.senderFrame }, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a child frame', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote({ sender: ctx.event.sender, senderFrame: {} }, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a traversal path and returns traversal error', async () => {
    const ctx = setup({
      guardPath: vi.fn().mockResolvedValue({ status: 'error', reason: 'traversal' }),
    });
    const result = await ctx.handleReadNote(ctx.event, '../secret');
    expect(result).toEqual({ status: 'error', reason: 'traversal' });
    expect(ctx.readNote).not.toHaveBeenCalled();
  });

  it('rejects an empty-string path', async () => {
    const ctx = setup({
      guardPath: vi.fn().mockResolvedValue({ status: 'error', reason: 'traversal' }),
    });
    const result = await ctx.handleReadNote(ctx.event, '');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('sanitizes thrown errors', async () => {
    const ctx = setup({
      readNote: vi.fn().mockRejectedValue(new Error('private detail')),
    });
    const result = await ctx.handleReadNote(ctx.event, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});

describe('handleWriteSection', () => {
  it('writes a valid in-vault path and returns success', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'success', mtime: 200 });
    expect(ctx.writeSection).toHaveBeenCalledWith('/vault/note.md', '- [ ] Task\n', 100);
  });

  it('rejects wrong argument count', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a non-integer mtime', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 1.5);
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('accepts mtime of 0', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 0);
    expect(result.status).toBe('success');
    expect(ctx.writeSection).toHaveBeenCalledWith('/vault/note.md', '- [ ] Task\n', 0);
  });

  it('propagates conflict without conversion', async () => {
    const ctx = setup({
      writeSection: vi.fn().mockResolvedValue({ status: 'conflict' }),
    });
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'conflict' });
  });

  it('sanitizes thrown errors', async () => {
    const ctx = setup({
      writeSection: vi.fn().mockRejectedValue(new Error('private')),
    });
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing handler tests and verify RED**

Run: `npx vitest run tests/unit/vault-io-handlers.test.js`

Expected: FAIL — `Cannot find module '../../src/main/vault-io-handlers.js'`.

- [ ] **Step 3: Implement the IPC handlers**

Create `src/main/vault-io-handlers.js`:

```js
import {
  VAULT_READ_NOTE_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

function isSenderValid(event, mainWindow) {
  return (
    mainWindow &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

export function createVaultIoHandlers({
  getMainWindow,
  getVaultRoot,
  guardPath,
  readNote,
  writeSection,
  logger = console,
}) {
  async function handleReadNote(event, ...args) {
    const mainWindow = getMainWindow();
    if (!isSenderValid(event, mainWindow)) return unexpectedError();
    if (args.length !== 1) return unexpectedError();
    const [relativePath] = args;
    if (typeof relativePath !== 'string' || relativePath.length === 0) return unexpectedError();

    try {
      const guard = await guardPath(getVaultRoot(), relativePath);
      if (guard.status !== 'ok') return { status: 'error', reason: guard.reason };
      return await readNote(guard.absolutePath);
    } catch (error) {
      logger.error('vault:read-note failed', error);
      return unexpectedError();
    }
  }

  async function handleWriteSection(event, ...args) {
    const mainWindow = getMainWindow();
    if (!isSenderValid(event, mainWindow)) return unexpectedError();
    if (args.length !== 3) return unexpectedError();
    const [relativePath, newContent, mtime] = args;
    if (typeof relativePath !== 'string' || relativePath.length === 0) return unexpectedError();
    if (typeof newContent !== 'string') return unexpectedError();
    if (!Number.isInteger(mtime) || mtime < 0) return unexpectedError();

    try {
      const guard = await guardPath(getVaultRoot(), relativePath);
      if (guard.status !== 'ok') return { status: 'error', reason: guard.reason };
      return await writeSection(guard.absolutePath, newContent, mtime);
    } catch (error) {
      logger.error('vault:write-section failed', error);
      return unexpectedError();
    }
  }

  return { handleReadNote, handleWriteSection };
}

export function registerVaultIoHandlers({ ipcMain, ...dependencies }) {
  const { handleReadNote, handleWriteSection } = createVaultIoHandlers(dependencies);
  ipcMain.handle(VAULT_READ_NOTE_CHANNEL, handleReadNote);
  ipcMain.handle(VAULT_WRITE_SECTION_CHANNEL, handleWriteSection);
}
```

- [ ] **Step 4: Run handler tests and verify GREEN**

Run: `npx vitest run tests/unit/vault-io-handlers.test.js`

Expected: all 13 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

Summary of changes:
- `src/main/vault-io-handlers.js` — IPC handlers for `vault:read-note` and `vault:write-section`; sender/frame guard, argument count and type validation, path guard, error sanitization; `registerVaultIoHandlers` wires both channels.
- `tests/unit/vault-io-handlers.test.js` — 13 injection-style tests covering correct operation, extra-arg rejection, wrong-sender, child-frame, traversal, empty-string path, zero mtime, conflict pass-through, and error sanitization for both handlers.

```bash
git add src/main/vault-io-handlers.js tests/unit/vault-io-handlers.test.js
git commit -m "feat: add vault note I/O IPC handlers"
```

---

## Task 5: Preload bridge extension

**Files:**
- Modify: `src/preload/vault-api.js`
- Modify: `tests/unit/vault-api.test.js`

**Interfaces:**
- Consumes: `parseNoteReadResult`, `parseNoteWriteResult`, `VAULT_READ_NOTE_CHANNEL`, `VAULT_WRITE_SECTION_CHANNEL` from `src/shared/vault-selection.js`.
- Produces: `createVaultApi(invoke)` now returns `{ select, readNote, writeSection }`. `window.vault` exposes exactly `['select', 'readNote', 'writeSection']`.

- [ ] **Step 1: Extend the failing vault-api tests**

Replace the existing `tests/unit/vault-api.test.js` entirely:

```js
import { describe, expect, it, vi } from 'vitest';
import { createVaultApi } from '../../src/preload/vault-api.js';
import {
  VAULT_READ_NOTE_CHANNEL,
  VAULT_SELECT_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../../src/shared/vault-selection.js';

describe('createVaultApi', () => {
  // ── select ────────────────────────────────────────────────────────────────

  it('select: invokes only the fixed Vault-selection channel without a payload', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const api = createVaultApi(invoke);

    await expect(api.select()).resolves.toEqual({ status: 'cancelled' });
    expect(invoke).toHaveBeenCalledWith(VAULT_SELECT_CHANNEL);
  });

  it('select: converts malformed privileged output to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'selected',
      path: '/vault',
      secret: 'must not cross bridge',
    }));

    await expect(api.select()).resolves.toEqual({ status: 'error', reason: 'unexpected-error' });
  });

  it('select: converts IPC rejection to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private failure')));

    await expect(api.select()).resolves.toEqual({ status: 'error', reason: 'unexpected-error' });
  });

  // ── readNote ──────────────────────────────────────────────────────────────

  it('readNote: invokes vault:read-note with the supplied relative path', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', content: '# Hi', mtime: 100 });
    const api = createVaultApi(invoke);

    await expect(api.readNote('Notes/Project.md')).resolves.toEqual({
      status: 'success',
      content: '# Hi',
      mtime: 100,
    });
    expect(invoke).toHaveBeenCalledWith(VAULT_READ_NOTE_CHANNEL, 'Notes/Project.md');
  });

  it('readNote: converts a malformed result to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'success',
      content: '# Hi',
      mtime: 100,
      secret: 'leak',
    }));

    await expect(api.readNote('note.md')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('readNote: converts IPC rejection to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private')));

    await expect(api.readNote('note.md')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  // ── writeSection ──────────────────────────────────────────────────────────

  it('writeSection: invokes vault:write-section with the three expected arguments', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', mtime: 200 });
    const api = createVaultApi(invoke);

    await expect(api.writeSection('note.md', '- [ ] Task\n', 100)).resolves.toEqual({
      status: 'success',
      mtime: 200,
    });
    expect(invoke).toHaveBeenCalledWith(VAULT_WRITE_SECTION_CHANNEL, 'note.md', '- [ ] Task\n', 100);
  });

  it('writeSection: passes conflict result through without conversion', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({ status: 'conflict' }));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({ status: 'conflict' });
  });

  it('writeSection: converts a malformed result to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'success',
      mtime: 200,
      leak: true,
    }));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('writeSection: converts IPC rejection to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private')));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  // ── surface ───────────────────────────────────────────────────────────────

  it('exposes exactly [select, readNote, writeSection] on window.vault', () => {
    const api = createVaultApi(vi.fn());
    expect(Object.keys(api)).toEqual(['select', 'readNote', 'writeSection']);
  });
});
```

- [ ] **Step 2: Run failing bridge tests and verify RED**

Run: `npx vitest run tests/unit/vault-api.test.js`

Expected: tests for `readNote`, `writeSection`, and the updated key list fail.

- [ ] **Step 3: Extend the preload vault API**

Replace `src/preload/vault-api.js` entirely:

```js
import {
  parseNoteReadResult,
  parseNoteWriteResult,
  parseVaultSelectionResult,
  VAULT_READ_NOTE_CHANNEL,
  VAULT_SELECT_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export function createVaultApi(invoke) {
  return Object.freeze({
    async select() {
      try {
        return parseVaultSelectionResult(await invoke(VAULT_SELECT_CHANNEL));
      } catch {
        return unexpectedError();
      }
    },

    async readNote(relativePath) {
      try {
        return parseNoteReadResult(await invoke(VAULT_READ_NOTE_CHANNEL, relativePath));
      } catch {
        return unexpectedError();
      }
    },

    async writeSection(relativePath, newContent, mtime) {
      try {
        return parseNoteWriteResult(
          await invoke(VAULT_WRITE_SECTION_CHANNEL, relativePath, newContent, mtime),
        );
      } catch {
        return unexpectedError();
      }
    },
  });
}
```

- [ ] **Step 4: Run bridge tests and verify GREEN**

Run: `npx vitest run tests/unit/vault-api.test.js`

Expected: all 11 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

Summary of changes:
- `src/preload/vault-api.js` — adds `readNote` and `writeSection` bridge methods, each validating the IPC result through the schema parsers before returning; `Object.freeze` exposes exactly three methods.
- `tests/unit/vault-api.test.js` — replaces the three existing tests with 11 tests covering `select`, `readNote`, `writeSection` (happy paths, malformed result, IPC rejection, conflict pass-through), and the three-key surface check.

```bash
git add src/preload/vault-api.js tests/unit/vault-api.test.js
git commit -m "feat: extend preload bridge with readNote and writeSection"
```

---

## Task 6: Wire into Electron main process and add spike UI

**Files:**
- Modify: `src/main.js`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `registerVaultIoHandlers` from `src/main/vault-io-handlers.js`, `guardPath` from `src/main/vault-paths.js`, `readNote` from `src/main/note-reader.js`, `writeSection` from `src/main/section-writer.js`.
- Produces: running Electron app where `window.vault.readNote` and `window.vault.writeSection` work against the most recently selected Vault root.

- [ ] **Step 1: Wire the handlers into main.js**

Replace `src/main.js` entirely:

```js
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { readNote } from './main/note-reader.js';
import { registerVaultIoHandlers } from './main/vault-io-handlers.js';
import { guardPath } from './main/vault-paths.js';
import { registerVaultSelectionHandler } from './main/vault-selection-handler.js';
import { validateVault } from './main/vault-validator.js';
import { writeSection } from './main/section-writer.js';
import { createMainWindowOptions } from './main/window-options.js';

app.enableSandbox();

let mainWindow = null;
let vaultRoot = null;

function createWindow() {
  mainWindow = new BrowserWindow(
    createMainWindowOptions(path.join(__dirname, 'preload.js')),
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerVaultSelectionHandler({
    ipcMain,
    dialog,
    getMainWindow: () => mainWindow,
    validateVault: async (candidatePath) => {
      const result = await validateVault(candidatePath);
      if (result.status === 'selected') vaultRoot = result.path;
      return result;
    },
  });

  registerVaultIoHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    getVaultRoot:  () => vaultRoot,
    guardPath,
    readNote,
    writeSection,
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 2: Add minimal spike panel to App.vue for manual verification**

Replace `src/App.vue` entirely:

```vue
<script setup>
import { computed, ref } from 'vue';

// ── Vault selection ────────────────────────────────────────────────────────

const vaultResult = ref(null);
const isSelecting = ref(false);

const invalidMessages = {
  'not-directory':             'Choose a directory.',
  'not-readable':              'This directory is not readable.',
  'not-writable':              'This directory is not writable.',
  'missing-obsidian-directory':'This directory does not contain a .obsidian directory.',
  'invalid-obsidian-directory':'.obsidian must be a directory.',
  unavailable:                 'This directory is unavailable.',
};

const vaultMessage = computed(() => {
  if (!vaultResult.value) return null;
  if (vaultResult.value.status === 'selected') return `Vault: ${vaultResult.value.path}`;
  if (vaultResult.value.status === 'cancelled') return 'Vault selection cancelled.';
  if (vaultResult.value.status === 'invalid') return invalidMessages[vaultResult.value.reason];
  return 'Vault selection failed. Try again.';
});

const isVaultError = computed(() =>
  vaultResult.value?.status === 'invalid' || vaultResult.value?.status === 'error',
);

const vaultPath = computed(() =>
  vaultResult.value?.status === 'selected' ? vaultResult.value.path : null,
);

async function chooseVault() {
  if (isSelecting.value) return;
  isSelecting.value = true;
  try {
    vaultResult.value = await window.vault.select();
  } catch {
    vaultResult.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isSelecting.value = false;
  }
}

// ── Note I/O ───────────────────────────────────────────────────────────────

const relativePath = ref('');
const readResult   = ref(null);
const writeContent = ref('- [ ] Spike task ^task-001\n');
const writeResult  = ref(null);
const lastMtime    = ref(null);

async function readNote() {
  readResult.value = null;
  writeResult.value = null;
  const result = await window.vault.readNote(relativePath.value);
  readResult.value = result;
  if (result.status === 'success') lastMtime.value = result.mtime;
}

async function writeSection() {
  if (lastMtime.value === null) return;
  writeResult.value = null;
  const result = await window.vault.writeSection(
    relativePath.value,
    writeContent.value,
    lastMtime.value,
  );
  writeResult.value = result;
  if (result.status === 'success') lastMtime.value = result.mtime;
}
</script>

<template>
  <main class="shell">
    <!-- Vault selection -->
    <section class="panel" aria-labelledby="vault-heading">
      <p class="eyebrow">Spike 001 · Vault selection</p>
      <h1 id="vault-heading">Connect a test Obsidian Vault</h1>
      <p class="description">
        Choose a readable and writable Vault directory containing <code>.obsidian</code>.
      </p>
      <button type="button" :disabled="isSelecting" @click="chooseVault">
        {{ isSelecting ? 'Choosing…' : 'Choose test Vault' }}
      </button>
      <p v-if="vaultMessage" :role="isVaultError ? 'alert' : 'status'" class="result">
        {{ vaultMessage }}
      </p>
    </section>

    <!-- Note I/O -->
    <section class="panel" aria-labelledby="io-heading">
      <p class="eyebrow">Spike 002 · Note I/O</p>
      <h2 id="io-heading">Read and modify a managed section</h2>
      <p class="description">
        Enter a path relative to the Vault root. Read the note, then replace the
        <code>focus:tasks</code> managed section.
      </p>

      <label class="field-label" for="rel-path">Relative path</label>
      <input
        id="rel-path"
        v-model="relativePath"
        class="field-input"
        type="text"
        placeholder="Notes/MyProject.md"
        :disabled="!vaultPath"
      />

      <div class="button-row">
        <button type="button" :disabled="!vaultPath || !relativePath" @click="readNote">
          Read note
        </button>
      </div>

      <template v-if="readResult">
        <p
          :role="readResult.status === 'success' ? 'status' : 'alert'"
          class="result"
        >
          <template v-if="readResult.status === 'success'">
            Read OK — mtime {{ readResult.mtime }} —
            {{ readResult.content.length }} chars
          </template>
          <template v-else>
            Read failed: {{ readResult.reason }}
          </template>
        </p>

        <template v-if="readResult.status === 'success'">
          <label class="field-label" for="write-content">Replacement section content</label>
          <textarea
            id="write-content"
            v-model="writeContent"
            class="field-textarea"
            rows="4"
          />
          <div class="button-row">
            <button type="button" :disabled="lastMtime === null" @click="writeSection">
              Write section
            </button>
          </div>
        </template>
      </template>

      <p
        v-if="writeResult"
        :role="writeResult.status === 'success' ? 'status' : 'alert'"
        class="result"
      >
        <template v-if="writeResult.status === 'success'">
          Write OK — new mtime {{ writeResult.mtime }}
        </template>
        <template v-else-if="writeResult.status === 'conflict'">
          Conflict — file changed externally. Re-read before writing.
        </template>
        <template v-else>
          Write failed: {{ writeResult.reason }}
        </template>
      </p>
    </section>
  </main>
</template>
```

- [ ] **Step 3: Update styles.css for the new input fields**

Replace `src/styles.css` entirely:

```css
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f5f5f7;
  background: #0f0f13;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button { font: inherit; }

.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.panel {
  width: min(600px, 100%);
  padding: 32px;
  border: 1px solid rgba(245, 245, 247, 0.08);
  border-radius: 16px;
  background: #1a1a20;
}

.eyebrow  { margin: 0 0 8px; color: #2dd4bf; font-size: 12px; }
h1        { margin: 0; font-size: 28px; }
h2        { margin: 0; font-size: 22px; }
.description { color: #9ca3af; }

.field-label { display: block; margin: 12px 0 4px; font-size: 12px; color: #9ca3af; }
.field-input,
.field-textarea {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(245, 245, 247, 0.12);
  border-radius: 8px;
  background: #0f0f13;
  color: #f5f5f7;
  font: inherit;
  font-size: 13px;
}
.field-textarea { resize: vertical; }
.field-input:focus,
.field-textarea:focus {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.button-row { margin-top: 12px; }

button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #0f0f13;
  background: #2dd4bf;
  font-weight: 600;
  cursor: pointer;
}
button:disabled { cursor: wait; opacity: 0.65; }
button:focus-visible { outline: 2px solid #2dd4bf; outline-offset: 3px; }

.result { margin: 16px 0 0; overflow-wrap: anywhere; }
[role="alert"] { color: #f59e0b; }
```

- [ ] **Step 4: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

Summary of changes:
- `src/main.js` — imports and registers `vault-io-handlers`; captures the validated Vault root from the selection handler and passes it via `getVaultRoot` closure to the I/O handlers.
- `src/App.vue` — retains Spike 001 vault-selection panel; adds Spike 002 note-I/O panel with relative-path input, read-note trigger, read result display (mtime + char count), replacement-content textarea, write-section trigger, and conflict/error feedback.
- `src/styles.css` — adds `field-label`, `field-input`, `field-textarea`, and `button-row` styles; adjusts shell to column layout to accommodate two panels.

```bash
git add src/main.js src/App.vue src/styles.css
git commit -m "feat: wire vault note I/O into Electron and add spike panel"
```

---

## Task 7: Spike evidence and final verification

**Files:**
- Create: `docs/spikes/002-vault-note-io.md`

- [ ] **Step 1: Run the full automated suite and record results**

Run: `npm test`

Record the exact test-file count and total test count from the output.

- [ ] **Step 2: Run the end-to-end test**

Run: `npm run test:e2e`

Record the `Electron package verified:` line and the `Electron smoke test passed:` line.

- [ ] **Step 3: Launch and exercise the spike manually**

Run: `npm start`

In the Obsidian Focus Companion window:

1. Choose a test Vault that has a note containing the sentinel markers:
   ```
   <!-- focus:tasks:start -->
   - [ ] Original task ^task-001
   <!-- focus:tasks:end -->
   ```
2. Enter the note's path relative to the Vault root in the "Relative path" field.
3. Click **Read note**. Confirm the status line shows `Read OK — mtime <N> — <M> chars`.
4. Edit the replacement content in the textarea.
5. Click **Write section**. Confirm `Write OK — new mtime <N2>`.
6. Open the note file in a text editor and confirm:
   - The content between the sentinels is the replacement content.
   - All content outside the sentinels (YAML frontmatter, headings, paragraphs) is unchanged.
7. Without re-reading, click **Write section** again. Confirm `Conflict — file changed externally. Re-read before writing.` **or** (more likely because mtime is fresh) write succeeds again.
8. To test conflict: touch the file's mtime externally between read and write. Confirm `Conflict`.
9. Enter a traversal path such as `../secret`. Confirm the result shows an error (not a system path).
10. Quit the application.

- [ ] **Step 4: Write the spike evidence report**

Create `docs/spikes/002-vault-note-io.md` with the observed outputs from steps 1–3 above.
The report must follow the same structure as `docs/spikes/001-electron-vue-vault-selection.md`:

```markdown
# Spike 002: Vault note I/O — read and sentinel-section write

## Question

Can a Project note be read through a narrow IPC channel, can a managed section
delimited by `<!-- focus:tasks:start -->` / `<!-- focus:tasks:end -->` sentinel
comments be replaced atomically without touching the rest of the file, are paths
outside the Vault root rejected before any file access occurs, and is a write
refused when the file has changed since it was last read?

## Environment

[Record macOS version, architecture, Node version, npm version, Electron version,
Electron Forge version from the actual run.]

## Automated evidence

[Record the npm test summary line: N test files, N tests, duration.
Record the npm run test:e2e success lines: package verified path and smoke test passed line.]

## Manual evidence

[Record what was observed for each of the manual steps in Step 3 above.
Use actual path values, mtime numbers, and char counts from the run.
Do not copy expected values from the plan — record only what was observed.]

## Limitations

- File watcher and self-write suppression are not covered (later spike item).
- Conflict-resolution UI is not covered; this slice returns the conflict result only.
- SQLite, Pinia, timers, notifications, shortcuts, and tray behavior are not covered.
- Windows runtime behavior is not verified; macOS arm64 only.

## Verdict: VALIDATED

[Or PARTIAL/INVALIDATED if any required observation failed — describe the failure.]

## Recommendation for the real build

Keep the sentinel-based managed-section model and path guard as-is. Wire the Vault root
from the persisted onboarding configuration (later slice). Add a conflict-resolution UI
before any feature that writes managed sections can ship.
```

- [ ] **Step 5: Run the final full suite**

Run: `npm test && npm run test:e2e`

Expected: all tests pass, package produced, smoke test passes.

- [ ] **Step 6: Commit**

```bash
git add docs/spikes/002-vault-note-io.md
git commit -m "docs: validate vault note I/O spike"
```

---
