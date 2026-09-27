import { describe, expect, it } from 'vitest';
import {
  parseNoteReadResult,
  parseNoteWriteResult,
} from '../../src/shared/vault-selection.js';

describe('parseNoteReadResult', () => {
  it.each([
    [{ status: 'success', content: 'hello', mtime: 1234567890 }],
    [{ status: 'success', content: '', mtime: 0 }],
    [{ status: 'error', reason: 'traversal' }],
    [{ status: 'error', reason: 'not-in-vault' }],
    [{ status: 'error', reason: 'not-found' }],
    [{ status: 'error', reason: 'not-readable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts valid shape %#', (value) => {
    expect(parseNoteReadResult(value)).toEqual(value);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'success', content: 'x' }],                    // missing mtime
    [{ status: 'success', mtime: 100 }],                       // missing content
    [{ status: 'success', content: 'x', mtime: 1.5 }],         // non-integer mtime
    [{ status: 'success', content: 'x', mtime: -1 }],          // negative mtime
    [{ status: 'success', content: 'x', mtime: 1, extra: 1 }], // extra key
    [{ status: 'error', reason: 'unknown-reason' }],
    [{ status: 'error', reason: 'not-found', extra: 1 }],
  ])('rejects invalid shape %#', (value) => {
    expect(() => parseNoteReadResult(value)).toThrow(TypeError);
  });
});

describe('parseNoteWriteResult', () => {
  it.each([
    [{ status: 'success', mtime: 1234567890 }],
    [{ status: 'success', mtime: 0 }],
    [{ status: 'conflict' }],
    [{ status: 'error', reason: 'traversal' }],
    [{ status: 'error', reason: 'not-in-vault' }],
    [{ status: 'error', reason: 'sentinels-missing' }],
    [{ status: 'error', reason: 'sentinels-malformed' }],
    [{ status: 'error', reason: 'not-writable' }],
    [{ status: 'error', reason: 'unexpected-error' }],
  ])('accepts valid shape %#', (value) => {
    expect(parseNoteWriteResult(value)).toEqual(value);
  });

  it.each([
    [null],
    [{}],
    [{ status: 'success' }],                                    // missing mtime
    [{ status: 'success', mtime: 1.5 }],                        // non-integer mtime
    [{ status: 'success', mtime: -1 }],                         // negative mtime
    [{ status: 'success', mtime: 100, extra: 1 }],              // extra key
    [{ status: 'conflict', extra: 'leak' }],                    // conflict with extra key
    [{ status: 'error', reason: 'unknown-reason' }],
  ])('rejects invalid shape %#', (value) => {
    expect(() => parseNoteWriteResult(value)).toThrow(TypeError);
  });
});
