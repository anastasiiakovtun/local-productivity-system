import { describe, expect, it, vi } from 'vitest';
import { createVaultIoHandlers } from '../../src/main/vault-io-handlers.js';

function setup(overrides = {}) {
  const mainFrame = {};
  const webContents = { mainFrame };
  const mainWindow = { webContents };

  const guardPath    = vi.fn().mockResolvedValue({ status: 'ok', absolutePath: '/vault/note.md' });
  const readNote     = vi.fn().mockResolvedValue({ status: 'success', content: '# Hi', mtime: 100 });
  const writeSection = vi.fn().mockResolvedValue({ status: 'success', mtime: 200 });
  const logger       = { error: vi.fn() };

  const deps = {
    getMainWindow: () => mainWindow,
    getVaultRoot:  () => '/vault',
    guardPath,
    readNote,
    writeSection,
    logger,
    ...overrides,
  };

  const { handleReadNote, handleWriteSection } = createVaultIoHandlers(deps);
  const event = { sender: webContents, senderFrame: mainFrame };

  return { handleReadNote, handleWriteSection, event, guardPath, readNote, writeSection, logger, mainWindow };
}

describe('handleReadNote', () => {
  it('reads a valid in-vault path and returns the result', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote(ctx.event, 'Notes/Project.md');
    expect(result).toEqual({ status: 'success', content: '# Hi', mtime: 100 });
    expect(ctx.guardPath).toHaveBeenCalledWith('/vault', 'Notes/Project.md');
    expect(ctx.readNote).toHaveBeenCalledWith('/vault/note.md');
  });

  it('rejects extra arguments before calling guardPath', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote(ctx.event, 'Notes/Project.md', 'extra');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a wrong sender', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote({ sender: {}, senderFrame: ctx.event.senderFrame }, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a child frame', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote({ sender: ctx.event.sender, senderFrame: {} }, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a traversal path and returns traversal error', async () => {
    const ctx = setup({
      guardPath: vi.fn().mockResolvedValue({ status: 'error', reason: 'traversal' }),
    });
    const result = await ctx.handleReadNote(ctx.event, '../secret');
    expect(result).toEqual({ status: 'error', reason: 'traversal' });
    expect(ctx.readNote).not.toHaveBeenCalled();
  });

  it('rejects an empty-string path before calling guardPath', async () => {
    const ctx = setup();
    const result = await ctx.handleReadNote(ctx.event, '');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('sanitizes thrown errors', async () => {
    const ctx = setup({
      readNote: vi.fn().mockRejectedValue(new Error('private detail')),
    });
    const result = await ctx.handleReadNote(ctx.event, 'note.md');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});

describe('handleWriteSection', () => {
  it('writes a valid in-vault path and returns success', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'success', mtime: 200 });
    expect(ctx.writeSection).toHaveBeenCalledWith('/vault/note.md', '- [ ] Task\n', 100);
  });

  it('rejects wrong argument count (too few)', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n');
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('rejects a non-integer mtime', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 1.5);
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.guardPath).not.toHaveBeenCalled();
  });

  it('accepts mtime of 0', async () => {
    const ctx = setup();
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 0);
    expect(result.status).toBe('success');
    expect(ctx.writeSection).toHaveBeenCalledWith('/vault/note.md', '- [ ] Task\n', 0);
  });

  it('propagates conflict without conversion', async () => {
    const ctx = setup({
      writeSection: vi.fn().mockResolvedValue({ status: 'conflict' }),
    });
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'conflict' });
  });

  it('sanitizes thrown errors', async () => {
    const ctx = setup({
      writeSection: vi.fn().mockRejectedValue(new Error('private')),
    });
    const result = await ctx.handleWriteSection(ctx.event, 'note.md', '- [ ] Task\n', 100);
    expect(result).toEqual({ status: 'error', reason: 'unexpected-error' });
    expect(ctx.logger.error).toHaveBeenCalled();
  });
});
