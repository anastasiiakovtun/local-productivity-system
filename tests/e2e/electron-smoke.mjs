import assert from 'node:assert/strict';
import path from 'node:path';
import { _electron as electron } from 'playwright';
import { getPackagePaths } from '../../scripts/package-artifact.mjs';

const { executable } = getPackagePaths();
const executablePath = process.platform === 'darwin'
  ? path.join(executable, 'Contents', 'MacOS', 'Obsidian Focus Companion')
  : executable;

const electronApp = await electron.launch({ executablePath });
try {
  const window = await electronApp.firstWindow();
  assert.equal(await window.title(), 'Obsidian Focus Companion');

  const rendererBoundary = await window.evaluate(() => ({
    requireType: typeof window.require,
    processType: typeof window.process,
    vaultKeys: Object.keys(window.vault),
  }));
  assert.deepEqual(rendererBoundary, {
    requireType: 'undefined',
    processType: 'undefined',
    vaultKeys: ['select', 'readNote', 'writeSection'],
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

console.log('Packaged Electron smoke test passed: Vue rendered with isolated sandbox preferences.');
