import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';

const platformNames = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'win32',
};

const targetDirectory = path.resolve(
  'out',
  `Obsidian Focus Companion-${platformNames[process.platform]}-${process.arch}`,
);
const executable = process.platform === 'darwin'
  ? path.join(targetDirectory, 'Obsidian Focus Companion.app')
  : process.platform === 'win32'
    ? path.join(targetDirectory, 'Obsidian Focus Companion.exe')
    : path.join(targetDirectory, 'obsidian-focus-companion');

await access(executable);
assert.ok(executable.startsWith(path.resolve('out')));
console.log(`Electron package verified: ${executable}`);
