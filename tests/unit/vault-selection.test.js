import { describe, expect, it } from 'vitest';
import { parseVaultSelectionResult } from '../../src/shared/vault-selection.js';

describe('Vault selection result schema', () => {
  it.each([
    [{ status: 'cancelled' }],
    [{ status: 'selected', path: '/vault' }],
    [{ status: 'invalid', reason: 'not-readable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts a complete supported result', (result) => {
    expect(parseVaultSelectionResult(result)).toEqual(result);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'selected', path: '' }],
    [{ status: 'selected', path: '/vault', secret: 'leak' }],
    [{ status: 'invalid', reason: 'raw-system-error' }],
    [{ status: 'error', reason: 'permission-denied' }],
  ])('rejects malformed or excessive result data', (result) => {
    expect(() => parseVaultSelectionResult(result)).toThrow(TypeError);
  });
});
