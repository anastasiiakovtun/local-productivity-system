# Spike 001: Electron/Vue launch and Vault selection

## Question

Can the retained Electron Forge and Vue 3 foundation launch with renderer sandboxing and context isolation enabled, then select and validate a local Obsidian Vault through one narrow preload method?

## Environment

- macOS 15.6 (build 24G84)
- Apple arm64
- Node.js 26.10.0
- npm 11.19.1
- Electron 44.1.1
- Electron Forge 7.11.2

## Automated evidence

`npm test` passed 42 tests across 6 files.

`npm run test:e2e` packaged the application and printed:

```text
Electron package verified: /Users/admin/Documents/GitHub/local-productivity-system/.worktrees/electron-vault-selection/out/Obsidian Focus Companion-darwin-arm64/Obsidian Focus Companion.app
Electron smoke test passed: Vue rendered with isolated sandbox preferences.
```

The real Electron smoke test observed:

- Vue rendered the expected Vault-selection heading.
- `window.require` and `window.process` were absent from the renderer.
- `window.vault` exposed only `select`.
- `nodeIntegration` was `false`.
- `contextIsolation` was `true`.
- `sandbox` was `true`.

Forge 7.11.2 initially exited successfully without producing a package under Node.js 26.10.0. The cause was the known `extract-zip@2` incompatibility. An npm override to `@electron-internal/extract-zip@1.0.3` fixed packaging, and an explicit artifact check now prevents a false-positive package result.

## Manual evidence

A native directory dialog selected the disposable valid Vault. The application displayed its canonical path:

```text
/private/var/folders/jz/fdmd5j_d5l91dd5_pjl_9kxh0000gn/T/obsidian-focus-valid.qVmgV3
```

Selecting a disposable directory without `.obsidian` displayed:

```text
This directory does not contain a .obsidian directory.
```

Cancelling the native dialog displayed the neutral status:

```text
Vault selection cancelled.
```

A filesystem inspection after these checks found only the original `.obsidian` directory in the valid Vault and no entries in the invalid directory. Validation created no files or directories. Both disposable directories were then removed.

## Limitations

This spike does not persist the Vault, read Project notes, enforce containment for later child paths, modify Markdown, or verify Windows runtime behavior.

## Verdict: VALIDATED

The first Electron/Vue security gate and test-Vault selection behavior are validated on the recorded macOS arm64 environment.

## Recommendation for the real build

Keep this scaffold and narrow bridge. Add configured-Vault persistence and canonical child-path containment before implementing Project-note reads.
