import { describe, expect, it, vi } from 'vitest';
import { createVaultApi } from '../../src/preload/vault-api.js';
import { VAULT_SELECT_CHANNEL } from '../../src/shared/vault-selection.js';

describe('createVaultApi', () => {
  it('invokes only the fixed Vault-selection channel without a payload', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const api = createVaultApi(invoke);

    await expect(api.select()).resolves.toEqual({ status: 'cancelled' });
    expect(invoke).toHaveBeenCalledWith(VAULT_SELECT_CHANNEL);
    expect(Object.keys(api)).toEqual(['select']);
  });

  it('converts malformed privileged output to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'selected',
      path: '/vault',
      secret: 'must not cross bridge',
    }));

    await expect(api.select()).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('converts IPC rejection to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private failure')));

    await expect(api.select()).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });
});
