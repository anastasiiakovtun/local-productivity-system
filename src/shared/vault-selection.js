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

export const VAULT_READ_NOTE_CHANNEL = 'vault:read-note';
export const VAULT_WRITE_SECTION_CHANNEL = 'vault:write-section';

const noteReadErrorReasons = new Set([
  'traversal',
  'not-in-vault',
  'not-found',
  'not-readable',
  'unexpected-error',
]);

const noteWriteErrorReasons = new Set([
  'traversal',
  'not-in-vault',
  'sentinels-missing',
  'sentinels-malformed',
  'not-writable',
  'unexpected-error',
]);

function isNonNegativeInteger(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function parseNoteReadResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid note read result');
  }

  if (
    value.status === 'success' &&
    hasExactKeys(value, ['status', 'content', 'mtime']) &&
    typeof value.content === 'string' &&
    isNonNegativeInteger(value.mtime)
  ) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    noteReadErrorReasons.has(value.reason)
  ) return value;

  throw new TypeError('Invalid note read result');
}

export function parseNoteWriteResult(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid note write result');
  }

  if (
    value.status === 'success' &&
    hasExactKeys(value, ['status', 'mtime']) &&
    isNonNegativeInteger(value.mtime)
  ) return value;

  if (value.status === 'conflict' && hasExactKeys(value, ['status'])) return value;

  if (
    value.status === 'error' &&
    hasExactKeys(value, ['status', 'reason']) &&
    noteWriteErrorReasons.has(value.reason)
  ) return value;

  throw new TypeError('Invalid note write result');
}
