import { describe, expect, it } from 'vitest';
import {
  formatTaskLine,
  insertTaskLine,
  parseTaskLine,
  removeTaskLine,
  replaceTaskLine,
} from '../../src/main/markdown-tasks.js';

describe('parseTaskLine', () => {
  it('parses an open task', () => {
    expect(parseTaskLine('- [ ] Write essay ^task-abc123')).toEqual({
      done: false,
      title: 'Write essay',
      id: '^task-abc123',
    });
  });

  it('parses a completed task', () => {
    expect(parseTaskLine('- [x] Read chapter ^task-def456')).toEqual({
      done: true,
      title: 'Read chapter',
      id: '^task-def456',
    });
  });

  it('returns null for a non-task line', () => {
    expect(parseTaskLine('## Heading')).toBeNull();
    expect(parseTaskLine('Some plain text')).toBeNull();
    expect(parseTaskLine('')).toBeNull();
  });
});

describe('formatTaskLine', () => {
  it('formats an open task', () => {
    expect(formatTaskLine({ title: 'Write essay', id: '^task-abc123', done: false }))
      .toBe('- [ ] Write essay ^task-abc123');
  });

  it('formats a completed task', () => {
    expect(formatTaskLine({ title: 'Read chapter', id: '^task-def456', done: true }))
      .toBe('- [x] Read chapter ^task-def456');
  });

  it('round-trips through parseTaskLine', () => {
    const task = { title: 'Do something', id: '^task-xyz789', done: false };
    expect(parseTaskLine(formatTaskLine(task))).toEqual(task);
  });
});

describe('insertTaskLine', () => {
  it('appends the new line to the inner content', () => {
    const inner = '- [ ] Existing ^task-aaa111\n';
    const result = insertTaskLine(inner, '- [ ] New task ^task-bbb222');
    expect(result).toBe('- [ ] Existing ^task-aaa111\n- [ ] New task ^task-bbb222\n');
  });

  it('works on empty inner content', () => {
    expect(insertTaskLine('', '- [ ] First ^task-ccc333')).toBe('- [ ] First ^task-ccc333\n');
  });
});

describe('removeTaskLine', () => {
  it('removes only the line with the matching ID', () => {
    const inner = '- [ ] Task A ^task-aaa111\n- [ ] Task B ^task-bbb222\n';
    expect(removeTaskLine(inner, '^task-aaa111')).toBe('- [ ] Task B ^task-bbb222\n');
  });

  it('leaves the content unchanged when ID is not found', () => {
    const inner = '- [ ] Task A ^task-aaa111\n';
    expect(removeTaskLine(inner, '^task-zzz999')).toBe('- [ ] Task A ^task-aaa111\n');
  });
});

describe('replaceTaskLine', () => {
  it('replaces only the line with the matching ID', () => {
    const inner = '- [ ] Task A ^task-aaa111\n- [ ] Task B ^task-bbb222\n';
    const result = replaceTaskLine(inner, '^task-aaa111', '- [x] Task A done ^task-aaa111');
    expect(result).toBe('- [x] Task A done ^task-aaa111\n- [ ] Task B ^task-bbb222\n');
  });

  it('leaves content unchanged when ID is not found', () => {
    const inner = '- [ ] Task A ^task-aaa111\n';
    expect(replaceTaskLine(inner, '^task-zzz999', '- [x] Other ^task-zzz999'))
      .toBe('- [ ] Task A ^task-aaa111\n');
  });
});
