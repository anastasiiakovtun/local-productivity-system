export const VAULT_SELECT_CHANNEL = 'vault:select';

const invalidReasons = new Set([
  'not-directory',
  'not-readable',
  'not-writable',
  'missing-obsidian-directory',
  'invalid-obsidian-directory',
  'unavailable',
]);

function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function parseVaultSelectionResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid Vault selection result');
  }

  if (value.status === 'cancelled' && hasExactKeys(value, ['status'])) return value;

  if (
    value.status === 'selected' &&
    hasExactKeys(value, ['status', 'path']) &&
    typeof value.path === 'string' &&
    value.path.length > 0
  ) return value;

  if (
    value.status === 'invalid' &&
    hasExactKeys(value, ['status', 'reason']) &&
    invalidReasons.has(value.reason)
  ) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    value.reason === 'unexpected-error'
  ) return value;

  throw new TypeError('Invalid Vault selection result');
}
