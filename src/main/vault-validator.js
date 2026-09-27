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
