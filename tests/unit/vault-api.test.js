import { describe, expect, it, vi } from 'vitest';
import { createVaultApi } from '../../src/preload/vault-api.js';
import {
  VAULT_READ_NOTE_CHANNEL,
  VAULT_SELECT_CHANNEL,
  VAULT_WRITE_SECTION_CHANNEL,
} from '../../src/shared/vault-selection.js';

describe('createVaultApi', () => {
  // ── select ────────────────────────────────────────────────────────────────

  it('select: invokes only the fixed Vault-selection channel without a payload', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const api = createVaultApi(invoke);

    await expect(api.select()).resolves.toEqual({ status: 'cancelled' });
    expect(invoke).toHaveBeenCalledWith(VAULT_SELECT_CHANNEL);
  });

  it('select: converts malformed privileged output to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'selected',
      path: '/vault',
      secret: 'must not cross bridge',
    }));

    await expect(api.select()).resolves.toEqual({ status: 'error', reason: 'unexpected-error' });
  });

  it('select: converts IPC rejection to a generic error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private failure')));

    await expect(api.select()).resolves.toEqual({ status: 'error', reason: 'unexpected-error' });
  });

  // ── readNote ──────────────────────────────────────────────────────────────

  it('readNote: invokes vault:read-note with the supplied relative path', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', content: '# Hi', mtime: 100 });
    const api = createVaultApi(invoke);

    await expect(api.readNote('Notes/Project.md')).resolves.toEqual({
      status: 'success',
      content: '# Hi',
      mtime: 100,
    });
    expect(invoke).toHaveBeenCalledWith(VAULT_READ_NOTE_CHANNEL, 'Notes/Project.md');
  });

  it('readNote: converts a malformed result to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'success',
      content: '# Hi',
      mtime: 100,
      secret: 'leak',
    }));

    await expect(api.readNote('note.md')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('readNote: converts IPC rejection to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private')));

    await expect(api.readNote('note.md')).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  // ── writeSection ──────────────────────────────────────────────────────────

  it('writeSection: invokes vault:write-section with the three expected arguments', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 'success', mtime: 200 });
    const api = createVaultApi(invoke);

    await expect(api.writeSection('note.md', '- [ ] Task\n', 100)).resolves.toEqual({
      status: 'success',
      mtime: 200,
    });
    expect(invoke).toHaveBeenCalledWith(VAULT_WRITE_SECTION_CHANNEL, 'note.md', '- [ ] Task\n', 100);
  });

  it('writeSection: passes conflict result through without conversion', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({ status: 'conflict' }));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({ status: 'conflict' });
  });

  it('writeSection: converts a malformed result to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockResolvedValue({
      status: 'success',
      mtime: 200,
      leak: true,
    }));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  it('writeSection: converts IPC rejection to unexpected-error', async () => {
    const api = createVaultApi(vi.fn().mockRejectedValue(new Error('private')));

    await expect(api.writeSection('note.md', '', 100)).resolves.toEqual({
      status: 'error',
      reason: 'unexpected-error',
    });
  });

  // ── surface ───────────────────────────────────────────────────────────────

  it('exposes exactly [select, readNote, writeSection] on window.vault', () => {
    const api = createVaultApi(vi.fn());
    expect(Object.keys(api)).toEqual(['select', 'readNote', 'writeSection']);
  });
});
