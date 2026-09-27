# Electron/Vue Vault Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the retained Electron Forge and Vue 3 foundation, launch it with a sandboxed and context-isolated renderer, and select and validate one test Obsidian Vault.

**Architecture:** Electron main owns the native directory dialog and filesystem validation. A sandboxed preload exposes only `window.vault.select()`, validates the IPC result at runtime, and gives the Vue renderer structured data. Focused modules isolate window policy, Vault validation, IPC orchestration, bridge validation, and presentation so each behavior can follow RED-GREEN-REFACTOR.

**Tech Stack:** Node.js 26.10.0, npm 11.19.1, Electron 44.1.1, Electron Forge 7.11.2, Forge Vite plugin 7.11.2, Vite 8.2.2, Vue 3.5.42, `@vitejs/plugin-vue` 6.0.9, Vitest 5.0.1, Vue Test Utils 2.5.1, Happy DOM 20.14.5, Playwright 1.63.0, plain JavaScript.

**Spec:** `docs/superpowers/specs/2026-09-28-electron-vue-vault-selection-design.md`

## Global Constraints

- Use Electron, Vue 3 Composition API, plain JavaScript, Vite, and Electron Forge.
- Commit exact dependency versions and `package-lock.json`; use no version ranges in `package.json`.
- Load only local application content. Do not add remote URLs, telemetry, accounts, or network-dependent product behavior.
- Set `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` explicitly on the main window.
- Expose only `window.vault.select()` through `contextBridge`; never expose `ipcRenderer`, Node, filesystem, SQL, shell, or generic IPC APIs.
- Validate the IPC sender, argument count, and returned result at runtime.
- Accept only a readable and writable directory containing a `.obsidian` directory.
- Canonicalize a valid Vault path and do not modify any selected directory during validation.
- Do not persist the Vault path or implement later section-27 items in this slice.
- Keep the interface functional and accessible; defer full `DESIGN-HANDOFF.md` visual polish.
- Manually verify macOS arm64 only. A successful package proves this local target, not Windows runtime support.

## Review Focus

- A symlinked Vault path must return its canonical target rather than the symlink path; Task 2 tests this with a real symlink.
- Validation must not create a probe file or otherwise modify the selected directory; Task 2 compares directory contents before and after validation.
- An IPC call with extra arguments must be rejected before the native dialog opens; Task 3 tests malformed input.
- An IPC event from a child frame or another `webContents` must be rejected before the native dialog opens; Task 3 tests both sender dimensions.
- A malformed main-process result must not cross the bridge; Task 4 verifies that preload converts it to the generic error result.

---

## File Map

- `package.json`: exact dependencies and development, test, package, and launch scripts.
- `package-lock.json`: npm lockfile generated from exact dependencies.
- `.gitignore`: generated Electron Forge Vite output exclusion.
- `forge.config.js`: Electron Forge Vite plugin and package configuration.
- `vite.main.config.mjs`: main-process Vite build configuration.
- `vite.preload.config.mjs`: sandbox-compatible preload Vite build configuration.
- `vite.renderer.config.mjs`: Vue renderer Vite configuration.
- `vitest.config.mjs`: unit and component test discovery.
- `index.html`: local renderer entry and restrictive content security policy.
- `src/main.js`: Electron lifecycle, handler registration, and main-window creation.
- `src/main/window-options.js`: explicit main-window dimensions and security preferences.
- `src/main/vault-validator.js`: canonicalization and Vault eligibility checks.
- `src/main/vault-selection-handler.js`: sender validation, directory dialog, and result orchestration.
- `src/shared/vault-selection.js`: IPC channel, stable result values, and runtime result parser.
- `src/preload.js`: narrow `contextBridge` registration.
- `src/preload/vault-api.js`: safe bridge API around one fixed IPC invocation.
- `src/renderer.js`: Vue application bootstrap.
- `src/App.vue`: Vault-selection interaction and visible states.
- `src/styles.css`: minimal accessible spike styling.
- `tests/helpers/temp-vault.js`: temporary real filesystem fixtures.
- `tests/unit/window-options.test.js`: security-policy regression tests.
- `tests/unit/vault-validator.test.js`: real filesystem and injected-permission validation tests.
- `tests/unit/vault-selection.test.js`: runtime result parser tests.
- `tests/unit/vault-selection-handler.test.js`: sender, payload, dialog, and failure tests.
- `tests/unit/vault-api.test.js`: preload result-validation tests.
- `tests/renderer/App.test.js`: Vue user-state tests.
- `tests/e2e/electron-smoke.mjs`: real Electron/Vue launch and renderer isolation checks.
- `docs/spikes/001-electron-vue-vault-selection.md`: commands, evidence, limitations, and verdict.

---

### Task 1: Bootstrap Forge/Vue tooling and secure window policy

**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `forge.config.js`
- Create: `vite.main.config.mjs`
- Create: `vite.preload.config.mjs`
- Create: `vite.renderer.config.mjs`
- Create: `vitest.config.mjs`
- Create: `src/main/window-options.js`
- Test: `tests/unit/window-options.test.js`

**Interfaces:**
- Consumes: absolute bundled preload path supplied by `src/main.js`.
- Produces: `createMainWindowOptions(preloadPath)` returning the options passed directly to `new BrowserWindow(...)`.

- [ ] **Step 1: Add exact tooling metadata before production code**

Create `package.json`:

```json
{
  "name": "obsidian-focus-companion",
  "productName": "Obsidian Focus Companion",
  "version": "0.1.0",
  "description": "Local-first task and focus companion for Obsidian",
  "private": true,
  "main": ".vite/build/main.js",
  "packageManager": "npm@11.19.1",
  "engines": {
    "node": ">=20.19.0"
  },
  "scripts": {
    "start": "electron-forge start",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "electron-forge package",
    "test:e2e": "npm run package && node tests/e2e/electron-smoke.mjs"
  },
  "dependencies": {
    "vue": "3.5.42"
  },
  "devDependencies": {
    "@electron-forge/cli": "7.11.2",
    "@electron-forge/plugin-vite": "7.11.2",
    "@vitejs/plugin-vue": "6.0.9",
    "@vue/test-utils": "2.5.1",
    "electron": "44.1.1",
    "happy-dom": "20.14.5",
    "playwright": "1.63.0",
    "vite": "8.2.2",
    "vitest": "5.0.1"
  }
}
```

Create `forge.config.js`:

```js
module.exports = {
  packagerConfig: {
    asar: true,
  },
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          { entry: 'src/main.js', config: 'vite.main.config.mjs' },
          { entry: 'src/preload.js', config: 'vite.preload.config.mjs' },
        ],
        renderer: [
          { name: 'main_window', config: 'vite.renderer.config.mjs' },
        ],
      },
    },
  ],
};
```

Create `vite.main.config.mjs` and `vite.preload.config.mjs` with the same minimal content:

```js
import { defineConfig } from 'vite';

export default defineConfig({});
```

Create `vite.renderer.config.mjs`:

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

Create `vitest.config.mjs`:

```js
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/renderer/**/*.test.js'],
    clearMocks: true,
  },
});
```

Append to `.gitignore`:

```gitignore

# Electron Forge Vite output
.vite/
```

Run:

```bash
npm install
```

Expected: dependencies install successfully and npm creates `package-lock.json` with exact root versions.

- [ ] **Step 2: Write the failing secure-window test**

Create `tests/unit/window-options.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { createMainWindowOptions } from '../../src/main/window-options.js';

describe('createMainWindowOptions', () => {
  it('keeps Node out of a context-isolated sandboxed renderer', () => {
    const options = createMainWindowOptions('/build/preload.js');

    expect(options.webPreferences).toEqual({
      preload: '/build/preload.js',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    });
  });

  it('enforces the minimum desktop dimensions from the design handoff', () => {
    const options = createMainWindowOptions('/build/preload.js');

    expect(options).toMatchObject({
      width: 1000,
      height: 700,
      minWidth: 960,
      minHeight: 640,
    });
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npx vitest run tests/unit/window-options.test.js
```

Expected: FAIL because `src/main/window-options.js` does not exist.

- [ ] **Step 4: Implement the minimal secure-window policy**

Create `src/main/window-options.js`:

```js
export function createMainWindowOptions(preloadPath) {
  return {
    width: 1000,
    height: 700,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npm test
```

Expected: 2 tests pass with no unexpected warnings or errors.

Commit:

```bash
git add .gitignore package.json package-lock.json forge.config.js vite.main.config.mjs vite.preload.config.mjs vite.renderer.config.mjs vitest.config.mjs src/main/window-options.js tests/unit/window-options.test.js
git commit -m "build: scaffold secure Electron Vue foundation"
```

---

### Task 2: Validate and canonicalize a real Obsidian Vault

**Files:**
- Create: `src/main/vault-validator.js`
- Create: `tests/helpers/temp-vault.js`
- Test: `tests/unit/vault-validator.test.js`

**Interfaces:**
- Consumes: `createVaultValidator(fsApi)` where `fsApi` provides promise-based `realpath`, `stat`, and `access` functions.
- Produces: `validateVault(candidatePath)` resolving to `{ status: 'selected', path }` or `{ status: 'invalid', reason }`.

- [ ] **Step 1: Write temporary Vault fixtures**

Create `tests/helpers/temp-vault.js`:

```js
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createTempDirectory(prefix = 'focus-vault-') {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  return {
    directory,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

export async function createTempVault() {
  const fixture = await createTempDirectory();
  await mkdir(path.join(fixture.directory, '.obsidian'));
  return fixture;
}
```

- [ ] **Step 2: Write failing real-filesystem validation tests**

Create `tests/unit/vault-validator.test.js`:

```js
import { constants } from 'node:fs';
import {
  access,
  mkdir,
  readdir,
  realpath,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTempDirectory, createTempVault } from '../helpers/temp-vault.js';
import { createVaultValidator, validateVault } from '../../src/main/vault-validator.js';

const cleanups = [];
afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

async function track(createFixture) {
  const fixture = await createFixture();
  cleanups.push(fixture.cleanup);
  return fixture.directory;
}

describe('validateVault', () => {
  it('accepts a readable and writable directory containing a .obsidian directory', async () => {
    const directory = await track(createTempVault);

    await expect(validateVault(directory)).resolves.toEqual({
      status: 'selected',
      path: await realpath(directory),
    });
  });

  it('returns the canonical target for a symlinked Vault', async () => {
    const target = await track(createTempVault);
    const parent = await track(() => createTempDirectory('focus-link-'));
    const link = path.join(parent, 'linked-vault');
    await symlink(target, link, 'dir');

    await expect(validateVault(link)).resolves.toEqual({
      status: 'selected',
      path: await realpath(target),
    });
  });

  it('does not modify a valid Vault while checking it', async () => {
    const directory = await track(createTempVault);
    await writeFile(path.join(directory, 'note.md'), '# Existing note\n');
    const before = await readdir(directory);

    await validateVault(directory);

    expect(await readdir(directory)).toEqual(before);
  });

  it('rejects a file selected as the Vault', async () => {
    const directory = await track(createTempDirectory);
    const file = path.join(directory, 'note.md');
    await writeFile(file, '# Note\n');

    await expect(validateVault(file)).resolves.toEqual({
      status: 'invalid',
      reason: 'not-directory',
    });
  });

  it('rejects a directory without .obsidian', async () => {
    const directory = await track(createTempDirectory);

    await expect(validateVault(directory)).resolves.toEqual({
      status: 'invalid',
      reason: 'missing-obsidian-directory',
    });
  });

  it('rejects a .obsidian file', async () => {
    const directory = await track(createTempDirectory);
    await writeFile(path.join(directory, '.obsidian'), 'not a directory');

    await expect(validateVault(directory)).resolves.toEqual({
      status: 'invalid',
      reason: 'invalid-obsidian-directory',
    });
  });

  it('rejects an unavailable path', async () => {
    const directory = await track(createTempDirectory);

    await expect(validateVault(path.join(directory, 'missing'))).resolves.toEqual({
      status: 'invalid',
      reason: 'unavailable',
    });
  });

  it('reports a failed read-access check', async () => {
    const directory = await track(createTempVault);
    const validator = createVaultValidator({
      realpath,
      stat,
      access: async (target, mode) => {
        if (mode === constants.R_OK) throw new Error('denied');
        return access(target, mode);
      },
    });

    await expect(validator(directory)).resolves.toEqual({
      status: 'invalid',
      reason: 'not-readable',
    });
  });

  it('reports a failed write-access check', async () => {
    const directory = await track(createTempVault);
    const validator = createVaultValidator({
      realpath,
      stat,
      access: async (target, mode) => {
        if (mode === constants.W_OK) throw new Error('denied');
        return access(target, mode);
      },
    });

    await expect(validator(directory)).resolves.toEqual({
      status: 'invalid',
      reason: 'not-writable',
    });
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
npx vitest run tests/unit/vault-validator.test.js
```

Expected: FAIL because `src/main/vault-validator.js` does not exist.

- [ ] **Step 4: Implement minimal Vault validation**

Create `src/main/vault-validator.js`:

```js
import { constants } from 'node:fs';
import { access, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const defaultFsApi = { access, realpath, stat };
const invalid = (reason) => ({ status: 'invalid', reason });

export function createVaultValidator(fsApi = defaultFsApi) {
  return async function validate(candidatePath) {
    let canonicalPath;
    try {
      canonicalPath = await fsApi.realpath(candidatePath);
    } catch {
      return invalid('unavailable');
    }

    let vaultStats;
    try {
      vaultStats = await fsApi.stat(canonicalPath);
    } catch {
      return invalid('unavailable');
    }

    if (!vaultStats.isDirectory()) return invalid('not-directory');

    try {
      await fsApi.access(canonicalPath, constants.R_OK);
    } catch {
      return invalid('not-readable');
    }

    try {
      await fsApi.access(canonicalPath, constants.W_OK);
    } catch {
      return invalid('not-writable');
    }

    let obsidianStats;
    try {
      obsidianStats = await fsApi.stat(path.join(canonicalPath, '.obsidian'));
    } catch (error) {
      return invalid(error?.code === 'ENOENT' ? 'missing-obsidian-directory' : 'unavailable');
    }

    if (!obsidianStats.isDirectory()) return invalid('invalid-obsidian-directory');

    return { status: 'selected', path: canonicalPath };
  };
}

export const validateVault = createVaultValidator();
```

- [ ] **Step 5: Verify GREEN, run the full suite, and commit**

Run:

```bash
npx vitest run tests/unit/vault-validator.test.js
npm test
```

Expected: all Vault tests and the full suite pass.

Commit:

```bash
git add src/main/vault-validator.js tests/helpers/temp-vault.js tests/unit/vault-validator.test.js
git commit -m "feat: validate Obsidian vault directories"
```

---

### Task 3: Define safe results and guarded main-process IPC

**Files:**
- Create: `src/shared/vault-selection.js`
- Create: `src/main/vault-selection-handler.js`
- Test: `tests/unit/vault-selection.test.js`
- Test: `tests/unit/vault-selection-handler.test.js`

**Interfaces:**
- Produces: `VAULT_SELECT_CHANNEL` with value `vault:select`.
- Produces: `parseVaultSelectionResult(value)` returning a validated structured result or throwing `TypeError`.
- Produces: `createVaultSelectionHandler(dependencies)` returning the function registered with `ipcMain.handle`.
- Produces: `registerVaultSelectionHandler(dependencies)` registering exactly one handler for `vault:select`.

- [ ] **Step 1: Write failing runtime-result tests**

Create `tests/unit/vault-selection.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { parseVaultSelectionResult } from '../../src/shared/vault-selection.js';

describe('Vault selection result schema', () => {
  it.each([
    [{ status: 'cancelled' }],
    [{ status: 'selected', path: '/vault' }],
    [{ status: 'invalid', reason: 'not-readable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts a complete supported result', (result) => {
    expect(parseVaultSelectionResult(result)).toEqual(result);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'selected', path: '' }],
    [{ status: 'selected', path: '/vault', secret: 'leak' }],
    [{ status: 'invalid', reason: 'raw-system-error' }],
    [{ status: 'error', reason: 'permission-denied' }],
  ])('rejects malformed or excessive result data', (result) => {
    expect(() => parseVaultSelectionResult(result)).toThrow(TypeError);
  });
});
```

- [ ] **Step 2: Run the result test and verify RED**

Run:

```bash
npx vitest run tests/unit/vault-selection.test.js
```

Expected: FAIL because `src/shared/vault-selection.js` does not exist.

- [ ] **Step 3: Implement the result parser**

Create `src/shared/vault-selection.js`:

```js
export const VAULT_SELECT_CHANNEL = 'vault:select';

const invalidReasons = new Set([
  'not-directory',
  'not-readable',
  'not-writable',
  'missing-obsidian-directory',
  'invalid-obsidian-directory',
  'unavailable',
]);

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function parseVaultSelectionResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid Vault selection result');
  }

  if (value.status === 'cancelled' && hasExactKeys(value, ['status'])) return value;

  if (
    value.status === 'selected' &&
    hasExactKeys(value, ['status', 'path']) &&
    typeof value.path === 'string' &&
    value.path.length > 0
  ) return value;

  if (
    value.status === 'invalid' &&
    hasExactKeys(value, ['status', 'reason']) &&
    invalidReasons.has(value.reason)
  ) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    value.reason === 'unexpected-error'
  ) return value;

  throw new TypeError('Invalid Vault selection result');
}
```

Run:

```bash
npx vitest run tests/unit/vault-selection.test.js
```

Expected: runtime-result tests pass.

- [ ] **Step 4: Write failing guarded-handler tests**

Create `tests/unit/vault-selection-handler.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createVaultSelectionHandler } from '../../src/main/vault-selection-handler.js';

function setup(overrides = {}) {
  const mainFrame = {};
  const webContents = { mainFrame };
  const mainWindow = { webContents };
  const dialog = {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/vault'] }),
  };
  const validateVault = vi.fn().mockResolvedValue({ status: 'selected', path: '/vault' });
  const logger = { error: vi.fn() };
  const dependencies = {
    dialog,
    getMainWindow: () => mainWindow,
    validateVault,
    logger,
    ...overrides,
  };
  return {
    handler: createVaultSelectionHandler(dependencies),
    event: { sender: webContents, senderFrame: mainFrame },
    dialog,
    validateVault,
    logger,
    mainWindow,
  };
}

describe('createVaultSelectionHandler', () => {
  it('returns cancelled without validating a path', async () => {
    const context = setup({
      dialog: { showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }) },
    });

    await expect(context.handler(context.event)).resolves.toEqual({ status: 'cancelled' });
    expect(context.validateVault).not.toHaveBeenCalled();
  });

  it('validates one selected directory', async () => {
    const context = setup();

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'selected',
      path: '/vault',
    });
    expect(context.dialog.showOpenDialog).toHaveBeenCalledWith(context.mainWindow, {
      title: 'Choose test Obsidian Vault',
      properties: ['openDirectory'],
    });
    expect(context.validateVault).toHaveBeenCalledWith('/vault');
  });

  it('rejects multiple selected paths', async () => {
    const context = setup({
      dialog: {
        showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/one', '/two'] }),
      },
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.validateVault).not.toHaveBeenCalled();
  });

  it('rejects a different webContents before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler({ sender: {}, senderFrame: context.event.senderFrame })).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('rejects a child frame before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler({ sender: context.event.sender, senderFrame: {} })).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('rejects extra arguments before opening the dialog', async () => {
    const context = setup();

    await expect(context.handler(context.event, '/arbitrary/path')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.dialog.showOpenDialog).not.toHaveBeenCalled();
  });

  it('sanitizes internal failures', async () => {
    const failure = new Error('private path details');
    const context = setup({
      dialog: { showOpenDialog: vi.fn().mockRejectedValue(failure) },
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
    expect(context.logger.error).toHaveBeenCalledWith('Vault selection failed', failure);
  });

  it('sanitizes malformed validator output', async () => {
    const context = setup({
      validateVault: vi.fn().mockResolvedValue({ status: 'selected', path: '/vault', leak: true }),
    });

    await expect(context.handler(context.event)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });
});
```

- [ ] **Step 5: Run the handler test and verify RED**

Run:

```bash
npx vitest run tests/unit/vault-selection-handler.test.js
```

Expected: FAIL because `src/main/vault-selection-handler.js` does not exist.

- [ ] **Step 6: Implement the guarded handler**

Create `src/main/vault-selection-handler.js`:

```js
import {
  parseVaultSelectionResult,
  VAULT_SELECT_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export function createVaultSelectionHandler({ dialog, getMainWindow, validateVault, logger = console }) {
  return async function selectVault(event, ...args) {
    const mainWindow = getMainWindow();
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame ||
      args.length !== 0
    ) return unexpectedError();

    try {
      const selection = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose test Obsidian Vault',
        properties: ['openDirectory'],
      });

      if (selection.canceled) return { status: 'cancelled' };
      if (!Array.isArray(selection.filePaths) || selection.filePaths.length !== 1) {
        return unexpectedError();
      }

      return parseVaultSelectionResult(await validateVault(selection.filePaths[0]));
    } catch (error) {
      logger.error('Vault selection failed', error);
      return unexpectedError();
    }
  };
}

export function registerVaultSelectionHandler({ ipcMain, ...dependencies }) {
  ipcMain.handle(VAULT_SELECT_CHANNEL, createVaultSelectionHandler(dependencies));
}
```

- [ ] **Step 7: Verify GREEN, run the full suite, and commit**

Run:

```bash
npx vitest run tests/unit/vault-selection.test.js tests/unit/vault-selection-handler.test.js
npm test
```

Expected: result, handler, and full suites pass.

Commit:

```bash
git add src/shared/vault-selection.js src/main/vault-selection-handler.js tests/unit/vault-selection.test.js tests/unit/vault-selection-handler.test.js
git commit -m "feat: guard vault selection IPC"
```

---

### Task 4: Expose the narrow bridge and render Vault-selection states

**Files:**
- Create: `src/preload/vault-api.js`
- Create: `src/preload.js`
- Create: `index.html`
- Create: `src/renderer.js`
- Create: `src/App.vue`
- Create: `src/styles.css`
- Test: `tests/unit/vault-api.test.js`
- Test: `tests/renderer/App.test.js`

**Interfaces:**
- Consumes: `invoke(channel)` from Electron preload and `parseVaultSelectionResult` from the shared schema.
- Produces: `createVaultApi(invoke)` returning only `{ select() }`.
- Produces: `window.vault.select()` for the Vue renderer.

- [ ] **Step 1: Write the failing bridge API test**

Create `tests/unit/vault-api.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { createVaultApi } from '../../src/preload/vault-api.js';
import { VAULT_SELECT_CHANNEL } from '../../src/shared/vault-selection.js';

describe('createVaultApi', () => {
  it('invokes only the fixed Vault-selection channel without a payload', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const api = createVaultApi(invoke);

    await expect(api.select()).resolves.toEqual({ status: 'cancelled' });
    expect(invoke).toHaveBeenCalledWith(VAULT_SELECT_CHANNEL);
    expect(Object.keys(api)).toEqual(['select']);
  });

  it('converts malformed privileged output to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'selected',
      path: '/vault',
      secret: 'must not cross bridge',
    }));

    await expect(api.select()).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('converts IPC rejection to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private failure')));

    await expect(api.select()).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });
});
```

- [ ] **Step 2: Run the bridge test and verify RED**

Run:

```bash
npx vitest run tests/unit/vault-api.test.js
```

Expected: FAIL because `src/preload/vault-api.js` does not exist.

- [ ] **Step 3: Implement and expose the narrow bridge**

Create `src/preload/vault-api.js`:

```js
import {
  parseVaultSelectionResult,
  VAULT_SELECT_CHANNEL,
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
  });
}
```

Create `src/preload.js`:

```js
import { contextBridge, ipcRenderer } from 'electron';
import { createVaultApi } from './preload/vault-api.js';

contextBridge.exposeInMainWorld(
  'vault',
  createVaultApi((channel) => ipcRenderer.invoke(channel)),
);
```

Run:

```bash
npx vitest run tests/unit/vault-api.test.js
```

Expected: bridge API tests pass.

- [ ] **Step 4: Write failing renderer behavior tests**

Create `tests/renderer/App.test.js`:

```js
// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

const mounted = [];
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  delete window.vault;
});

function mountApp(result) {
  window.vault = { select: vi.fn().mockResolvedValue(result) };
  const wrapper = mount(App);
  mounted.push(wrapper);
  return wrapper;
}

describe('App', () => {
  it('shows the canonical selected Vault path', async () => {
    const wrapper = mountApp({ status: 'selected', path: '/canonical/vault' });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toContain('/canonical/vault');
  });

  it('shows cancellation as a neutral state', async () => {
    const wrapper = mountApp({ status: 'cancelled' });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('Vault selection cancelled.');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it.each([
    ['not-directory', 'Choose a directory.'],
    ['not-readable', 'This directory is not readable.'],
    ['not-writable', 'This directory is not writable.'],
    ['missing-obsidian-directory', 'This directory does not contain a .obsidian directory.'],
    ['invalid-obsidian-directory', '.obsidian must be a directory.'],
    ['unavailable', 'This directory is unavailable.'],
  ])('shows an actionable message for %s', async (reason, message) => {
    const wrapper = mountApp({ status: 'invalid', reason });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe(message);
  });

  it('shows a generic message for an unexpected error', async () => {
    const wrapper = mountApp({ status: 'error', reason: 'unexpected-error' });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Vault selection failed. Try again.');
  });

  it('prevents overlapping selections while the dialog request is active', async () => {
    let resolveSelection;
    window.vault = {
      select: vi.fn(() => new Promise((resolve) => { resolveSelection = resolve; })),
    };
    const wrapper = mount(App);
    mounted.push(wrapper);

    await wrapper.get('button').trigger('click');

    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button').text()).toBe('Choosing…');
    expect(window.vault.select).toHaveBeenCalledTimes(1);

    resolveSelection({ status: 'cancelled' });
    await flushPromises();
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run the renderer test and verify RED**

Run:

```bash
npx vitest run tests/renderer/App.test.js
```

Expected: FAIL because `src/App.vue` does not exist.

- [ ] **Step 6: Implement the minimal Vue renderer**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Obsidian Focus Companion</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/renderer.js"></script>
  </body>
</html>
```

Create `src/renderer.js`:

```js
import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

createApp(App).mount('#app');
```

Create `src/App.vue`:

```vue
<script setup>
import { computed, ref } from 'vue';

const result = ref(null);
const isSelecting = ref(false);

const invalidMessages = {
  'not-directory': 'Choose a directory.',
  'not-readable': 'This directory is not readable.',
  'not-writable': 'This directory is not writable.',
  'missing-obsidian-directory': 'This directory does not contain a .obsidian directory.',
  'invalid-obsidian-directory': '.obsidian must be a directory.',
  unavailable: 'This directory is unavailable.',
};

const message = computed(() => {
  if (!result.value) return null;
  if (result.value.status === 'selected') return `Selected Vault: ${result.value.path}`;
  if (result.value.status === 'cancelled') return 'Vault selection cancelled.';
  if (result.value.status === 'invalid') return invalidMessages[result.value.reason];
  return 'Vault selection failed. Try again.';
});

const isError = computed(() => result.value?.status === 'invalid' || result.value?.status === 'error');

async function chooseVault() {
  if (isSelecting.value) return;
  isSelecting.value = true;
  try {
    result.value = await window.vault.select();
  } catch {
    result.value = { status: 'error', reason: 'unexpected-error' };
  } finally {
    isSelecting.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <section class="panel" aria-labelledby="vault-heading">
      <p class="eyebrow">Technical spike</p>
      <h1 id="vault-heading">Connect a test Obsidian Vault</h1>
      <p class="description">
        Choose a readable and writable Vault directory containing <code>.obsidian</code>.
      </p>
      <button type="button" :disabled="isSelecting" @click="chooseVault">
        {{ isSelecting ? 'Choosing…' : 'Choose test Vault' }}
      </button>
      <p v-if="message" :role="isError ? 'alert' : 'status'" class="result">
        {{ message }}
      </p>
    </section>
  </main>
</template>
```

Create `src/styles.css`:

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
.shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.panel { width: min(560px, 100%); padding: 32px; border: 1px solid rgba(245, 245, 247, 0.08); border-radius: 16px; background: #1a1a20; }
.eyebrow { margin: 0 0 8px; color: #2dd4bf; font-size: 12px; }
h1 { margin: 0; font-size: 28px; }
.description { color: #9ca3af; }
button { min-height: 40px; padding: 0 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #0f0f13; background: #2dd4bf; font-weight: 600; cursor: pointer; }
button:disabled { cursor: wait; opacity: 0.65; }
button:focus-visible { outline: 2px solid #2dd4bf; outline-offset: 3px; }
.result { margin: 16px 0 0; overflow-wrap: anywhere; }
[role="alert"] { color: #f59e0b; }
```

- [ ] **Step 7: Verify GREEN, run the full suite, and commit**

Run:

```bash
npx vitest run tests/unit/vault-api.test.js tests/renderer/App.test.js
npm test
```

Expected: bridge, renderer, and full suites pass without unexpected warnings or errors.

Commit:

```bash
git add index.html src/preload.js src/preload/vault-api.js src/renderer.js src/App.vue src/styles.css tests/unit/vault-api.test.js tests/renderer/App.test.js
git commit -m "feat: add secure vault selection screen"
```

---

### Task 5: Wire Electron lifecycle and prove the real security boundary

**Files:**
- Create: `src/main.js`
- Create: `tests/e2e/electron-smoke.mjs`

**Interfaces:**
- Consumes: `createMainWindowOptions`, `registerVaultSelectionHandler`, and `validateVault` from prior tasks.
- Produces: runnable Electron application and observable renderer isolation evidence.

- [ ] **Step 1: Write the failing Electron smoke test**

Create `tests/e2e/electron-smoke.mjs`:

```js
import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

const electronApp = await electron.launch({ args: ['.'], cwd: process.cwd() });
try {
  const window = await electronApp.firstWindow();
  await window.locator('h1').waitFor();
  assert.equal(await window.locator('h1').textContent(), 'Connect a test Obsidian Vault');

  const rendererBoundary = await window.evaluate(() => ({
    requireType: typeof window.require,
    processType: typeof window.process,
    vaultKeys: Object.keys(window.vault),
  }));
  assert.deepEqual(rendererBoundary, {
    requireType: 'undefined',
    processType: 'undefined',
    vaultKeys: ['select'],
  });

  const preferences = await electronApp.evaluate(({ BrowserWindow }) => {
    const [mainWindow] = BrowserWindow.getAllWindows();
    const webPreferences = mainWindow.webContents.getLastWebPreferences();
    return {
      nodeIntegration: webPreferences.nodeIntegration,
      contextIsolation: webPreferences.contextIsolation,
      sandbox: webPreferences.sandbox,
    };
  });
  assert.deepEqual(preferences, {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  });
} finally {
  await electronApp.close();
}

console.log('Electron smoke test passed: Vue rendered with isolated sandbox preferences.');
```

- [ ] **Step 2: Run package plus smoke test and verify RED**

Run:

```bash
npm run test:e2e
```

Expected: FAIL because `.vite/build/main.js` cannot be built without `src/main.js`.

- [ ] **Step 3: Implement Electron lifecycle and handler wiring**

Create `src/main.js`:

```js
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { createMainWindowOptions } from './main/window-options.js';
import { registerVaultSelectionHandler } from './main/vault-selection-handler.js';
import { validateVault } from './main/vault-validator.js';

app.enableSandbox();

let mainWindow = null;

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
    validateVault,
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

- [ ] **Step 4: Verify GREEN with real Electron and full automated suite**

Run:

```bash
npm test
npm run test:e2e
```

Expected:

```text
Electron smoke test passed: Vue rendered with isolated sandbox preferences.
```

Also expect all Vitest tests to pass and Electron Forge packaging to complete successfully.

- [ ] **Step 5: Launch the development application**

Run:

```bash
npm start
```

Expected: a native Electron window opens and displays `Connect a test Obsidian Vault` with a `Choose test Vault` button. Confirm DevTools show no renderer or preload errors, then quit the application.

- [ ] **Step 6: Commit the runnable foundation**

```bash
git add src/main.js tests/e2e/electron-smoke.mjs
git commit -m "feat: launch sandboxed Electron Vue app"
```

---

### Task 6: Exercise Vault selection manually and record spike evidence

**Files:**
- Create: `docs/spikes/001-electron-vue-vault-selection.md`

**Interfaces:**
- Consumes: runnable app and actual automated/manual outputs from Tasks 1-5.
- Produces: evidence-backed verdict for the covered section-27 requirements.

- [ ] **Step 1: Create valid and invalid disposable directories outside the repository**

Run:

```bash
VALID_VAULT="$(mktemp -d "$TMPDIR/obsidian-focus-valid.XXXXXX")"
INVALID_VAULT="$(mktemp -d "$TMPDIR/obsidian-focus-invalid.XXXXXX")"
mkdir "$VALID_VAULT/.obsidian"
printf '%s\n' "$VALID_VAULT" "$INVALID_VAULT"
```

Expected: two absolute temporary paths print. Only the valid path contains `.obsidian`.

- [ ] **Step 2: Verify valid selection through the native dialog**

Run:

```bash
npm start
```

In the application:

1. Activate `Choose test Vault` with the keyboard.
2. Select the printed valid path.
3. Confirm the app displays `Selected Vault:` followed by its canonical path.
4. Confirm no file or directory was added to the temporary Vault.

- [ ] **Step 3: Verify invalid selection and cancellation**

In the same application:

1. Activate `Choose test Vault` and select the printed invalid path.
2. Confirm the app displays `This directory does not contain a .obsidian directory.`
3. Activate `Choose test Vault`, cancel the native dialog, and confirm `Vault selection cancelled.` appears without an alert state.
4. Quit the application.

- [ ] **Step 4: Remove disposable test directories**

Run:

```bash
rm -rf "$VALID_VAULT" "$INVALID_VAULT"
```

Expected: both temporary directories are removed. Never run this command if either variable is empty; inspect the printed values first.

- [ ] **Step 5: Write the evidence-backed spike report**

Create `docs/spikes/001-electron-vue-vault-selection.md` with these sections and actual observed outputs from this execution:

```markdown
# Spike 001: Electron/Vue launch and Vault selection

## Question

Can the retained Electron Forge and Vue 3 foundation launch with renderer sandboxing and context isolation enabled, then select and validate a local Obsidian Vault through one narrow preload method?

## Environment

Record the exact macOS version, architecture, Node version, npm version, Electron version, and Electron Forge version used for verification.

## Automated evidence

Record the final `npm test` summary, the `npm run test:e2e` success line, and the generated package path. State that the smoke test observed Vue rendering, absent renderer Node globals, the single `vault.select` bridge method, and the three required web preferences.

## Manual evidence

Record the canonical path result for the disposable valid Vault, the missing-`.obsidian` rejection for the invalid directory, the neutral cancellation result, and confirmation that validation created no files.

## Limitations

State that this spike does not persist the Vault, read Project notes, enforce containment for later child paths, modify Markdown, or verify Windows runtime behavior.

## Verdict: VALIDATED

State that the first Electron/Vue security gate and test-Vault selection behavior are validated on the recorded macOS arm64 environment. If any required observation failed, use `PARTIAL` or `INVALIDATED` instead and describe the failure rather than claiming validation.

## Recommendation for the real build

Keep this scaffold and narrow bridge. Add configured-Vault persistence and canonical child-path containment before implementing Project-note reads.
```

Do not copy expected output as evidence. Record only output observed during this run.

- [ ] **Step 6: Run final verification**

Run:

```bash
npm test
npm run test:e2e
git status --short
```

Expected: all automated tests pass, Electron smoke test prints its success line, packaging succeeds, and only the new spike report remains uncommitted.

- [ ] **Step 7: Commit the spike verdict**

```bash
git add docs/spikes/001-electron-vue-vault-selection.md
git commit -m "docs: validate Electron vault selection spike"
```

- [ ] **Step 8: Confirm final repository state**

Run:

```bash
git status --short
git log -7 --oneline
```

Expected: working tree is clean and recent history contains the six implementation commits plus the earlier design-spec commit.
