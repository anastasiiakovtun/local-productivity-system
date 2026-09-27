import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

const electronApp = await electron.launch({ args: ['.'], cwd: process.cwd() });
try {
  const window = await electronApp.firstWindow();
  await window.locator('h1').waitFor();
  assert.equal(await window.locator('h1').textContent(), 'Connect a test Obsidian Vault');

  const rendererBoundary = await window.evaluate(() => ({
    requireType: typeof window.require,
    processType: typeof window.process,
    vaultKeys: Object.keys(window.vault),
  }));
  assert.deepEqual(rendererBoundary, {
    requireType: 'undefined',
    processType: 'undefined',
    vaultKeys: ['select'],
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

console.log('Electron smoke test passed: Vue rendered with isolated sandbox preferences.');
