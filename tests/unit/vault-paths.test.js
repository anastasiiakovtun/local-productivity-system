import { mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { guardPath } from '../../src/main/vault-paths.js';

let vaultRoot;
let outsideRoot;

beforeEach(async () => {
  // realpath canonicalizes /var → /private/var on macOS; spec requires a canonical root
  vaultRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'focus-guard-vault-')));
  outsideRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'focus-guard-outside-')));
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
    await writeFile(realFile, '');
    const linkPath = path.join(vaultRoot, 'link.md');
    await symlink(realFile, linkPath);

    const result = await guardPath(vaultRoot, 'link.md');
    expect(result.status).toBe('ok');
    expect(result.absolutePath).toBe(realFile);
  });

  it('rejects a symlink whose target is outside the Vault', async () => {
    const outsideFile = path.join(outsideRoot, 'secret.md');
    await writeFile(outsideFile, '');
    const linkPath = path.join(vaultRoot, 'escape.md');
    await symlink(outsideFile, linkPath);

    const result = await guardPath(vaultRoot, 'escape.md');
    expect(result).toEqual({ status: 'error', reason: 'not-in-vault' });
  });
});
