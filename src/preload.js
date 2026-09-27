import { contextBridge, ipcRenderer } from 'electron';
import { createVaultApi } from './preload/vault-api.js';

contextBridge.exposeInMainWorld(
  'vault',
  createVaultApi((channel) => ipcRenderer.invoke(channel)),
);
