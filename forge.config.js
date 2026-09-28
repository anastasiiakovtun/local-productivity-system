const { cp } = require('node:fs/promises');
const path = require('node:path');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/*.node',
    },
  },
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
  },
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      for (const packageName of ['better-sqlite3', 'node-addon-api']) {
        await cp(
          path.join(__dirname, 'node_modules', packageName),
          path.join(buildPath, 'node_modules', packageName),
          { recursive: true },
        );
      }
    },
  },
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          { entry: 'src/main.js', config: 'vite.main.config.mjs' },
          { entry: 'src/preload.js', config: 'vite.preload.config.mjs' },
        ],
        renderer: [
          { name: 'main_window', config: 'vite.renderer.config.mjs' },
        ],
      },
    },
  ],
};
