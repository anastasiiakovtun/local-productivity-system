import {
  VAULT_READ_NOTE_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

function isSenderValid(event, mainWindow) {
  return (
    mainWindow &&
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  );
}

export function createVaultIoHandlers({
  getMainWindow,
  getVaultRoot,
  guardPath,
  readNote,
  writeSection,
  logger = console,
}) {
  async function handleReadNote(event, ...args) {
    const mainWindow = getMainWindow();
    if (!isSenderValid(event, mainWindow)) return unexpectedError();
    if (args.length !== 1) return unexpectedError();
    const [relativePath] = args;
    if (typeof relativePath !== 'string' || relativePath.length === 0) return unexpectedError();

    try {
      const guard = await guardPath(getVaultRoot(), relativePath);
      if (guard.status !== 'ok') return { status: 'error', reason: guard.reason };
      return await readNote(guard.absolutePath);
    } catch (error) {
      logger.error('vault:read-note failed', error);
      return unexpectedError();
    }
  }

  async function handleWriteSection(event, ...args) {
    const mainWindow = getMainWindow();
    if (!isSenderValid(event, mainWindow)) return unexpectedError();
    if (args.length !== 3) return unexpectedError();
    const [relativePath, newContent, mtime] = args;
    if (typeof relativePath !== 'string' || relativePath.length === 0) return unexpectedError();
    if (typeof newContent !== 'string') return unexpectedError();
    if (!Number.isInteger(mtime) || mtime < 0) return unexpectedError();

    try {
      const guard = await guardPath(getVaultRoot(), relativePath);
      if (guard.status !== 'ok') return { status: 'error', reason: guard.reason };
      return await writeSection(guard.absolutePath, newContent, mtime);
    } catch (error) {
      logger.error('vault:write-section failed', error);
      return unexpectedError();
    }
  }

  return { handleReadNote, handleWriteSection };
}

export function registerVaultIoHandlers({ ipcMain, ...dependencies }) {
  const { handleReadNote, handleWriteSection } = createVaultIoHandlers(dependencies);
  ipcMain.handle(VAULT_READ_NOTE_CHANNEL, handleReadNote);
  ipcMain.handle(VAULT_WRITE_SECTION_CHANNEL, handleWriteSection);
}
