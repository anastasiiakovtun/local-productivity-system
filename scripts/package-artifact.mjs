import { access, rm } from 'node:fs/promises';
import path from 'node:path';

const platformNames = {
  darwin: 'darwin',
  linux: 'linux',
  win32: 'win32',
};

export function getPackagePaths(root = process.cwd()) {
  const targetDirectory = path.resolve(
    root,
    'out',
    `Obsidian Focus Companion-${platformNames[process.platform]}-${process.arch}`,
  );
  const executable = process.platform === 'darwin'
    ? path.join(targetDirectory, 'Obsidian Focus Companion.app')
    : process.platform === 'win32'
      ? path.join(targetDirectory, 'Obsidian Focus Companion.exe')
      : path.join(targetDirectory, 'obsidian-focus-companion');

  return { targetDirectory, executable };
}

export async function preparePackageOutput(root = process.cwd()) {
  const { targetDirectory } = getPackagePaths(root);
  await rm(targetDirectory, { recursive: true, force: true });
}

export async function verifyPackageOutput(root = process.cwd()) {
  const { executable } = getPackagePaths(root);
  await access(executable);
  return executable;
}
