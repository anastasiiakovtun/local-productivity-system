import {
  parseVaultSelectionResult,
  VAULT_SELECT_CHANNEL,
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
  });
}
