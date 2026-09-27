import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  preparePackageOutput,
  verifyPackageOutput,
} from './package-artifact.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const forgeCli = path.join(
  projectRoot,
  'node_modules',
  '@electron-forge',
  'cli',
  'dist',
  'electron-forge.js',
);

await preparePackageOutput(projectRoot);

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [forgeCli, 'package'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  child.once('error', reject);
  child.once('close', resolve);
});

if (exitCode !== 0) process.exit(exitCode ?? 1);

const executable = await verifyPackageOutput(projectRoot);
console.log(`Electron package verified: ${executable}`);
