import {
  parseNoteReadResult,
  parseNoteWriteResult,
  parseVaultSelectionResult,
  VAULT_READ_NOTE_CHANNEL,
  VAULT_SELECT_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../shared/vault-selection.js';

const unexpectedError = () => ({ status: 'error', reason: 'unexpected-error' });

export function createVaultApi(invoke) {
  return Object.freeze({
    async select() {
      try {
        return parseVaultSelectionResult(await invoke(VAULT_SELECT_CHANNEL));
      } catch {
        return unexpectedError();
      }
    },

    async readNote(relativePath) {
      try {
        return parseNoteReadResult(await invoke(VAULT_READ_NOTE_CHANNEL, relativePath));
      } catch {
        return unexpectedError();
      }
    },

    async writeSection(relativePath, newContent, mtime) {
      try {
        return parseNoteWriteResult(
          await invoke(VAULT_WRITE_SECTION_CHANNEL, relativePath, newContent, mtime),
        );
      } catch {
        return unexpectedError();
      }
    },
  });
}
