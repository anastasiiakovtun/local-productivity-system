import { contextBridge, ipcRenderer } from 'electron';
import { createVaultApi } from './preload/vault-api.js';
import { createAppApi } from './preload/app-api.js';

const invoke = (...args) => ipcRenderer.invoke(...args);

contextBridge.exposeInMainWorld('vault', createVaultApi(invoke));
contextBridge.exposeInMainWorld('app', createAppApi(invoke));
