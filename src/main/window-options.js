export function createMainWindowOptions(preloadPath) {
  return {
    width: 1000,
    height: 700,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}
