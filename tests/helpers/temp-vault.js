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
