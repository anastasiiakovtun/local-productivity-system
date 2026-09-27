import { describe, expect, it } from 'vitest';
import { createMainWindowOptions } from '../../src/main/window-options.js';

describe('createMainWindowOptions', () => {
  it('keeps Node out of a context-isolated sandboxed renderer', () => {
    const options = createMainWindowOptions('/build/preload.js');

    expect(options.webPreferences).toEqual({
      preload: '/build/preload.js',
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    });
  });

  it('enforces the minimum desktop dimensions from the design handoff', () => {
    const options = createMainWindowOptions('/build/preload.js');

    expect(options).toMatchObject({
      width: 1000,
      height: 700,
      minWidth: 960,
      minHeight: 640,
    });
  });
});
