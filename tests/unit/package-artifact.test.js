import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTempDirectory } from '../helpers/temp-vault.js';
import {
  getPackagePaths,
  preparePackageOutput,
} from '../../scripts/package-artifact.mjs';

describe('preparePackageOutput', () => {
  it('removes a stale package target before Forge runs', async () => {
    const fixture = await createTempDirectory('focus-package-');
    try {
      const { executable } = getPackagePaths(fixture.directory);
      await mkdir(executable, { recursive: true });
      await writeFile(path.join(executable, 'stale-marker'), 'stale');

      await preparePackageOutput(fixture.directory);

      await expect(access(executable)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await fixture.cleanup();
    }
  });
});
