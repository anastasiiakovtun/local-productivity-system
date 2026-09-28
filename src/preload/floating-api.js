const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingTimer', {
  getState:   () => ipcRenderer.invoke('floating:get-state'),
  pause:      () => ipcRenderer.invoke('floating:pause'),
  resume:     () => ipcRenderer.invoke('floating:resume'),
  focusMain:  () => ipcRenderer.invoke('floating:focus-main'),
});
