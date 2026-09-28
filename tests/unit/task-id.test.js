import { describe, expect, it } from 'vitest';
import { generateTaskId } from '../../src/main/task-id.js';

describe('generateTaskId', () => {
  it('matches the ^task-<6 alphanum> format', () => {
    expect(generateTaskId()).toMatch(/^\^task-[a-z0-9]{6}$/);
  });

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateTaskId));
    expect(ids.size).toBe(100);
  });
});
