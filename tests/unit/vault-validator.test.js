import { constants } from 'node:fs';
import {
  access,
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
