import { describe, expect, it } from 'vitest';
import { splitSection } from '../../src/main/section-writer.js';

const START = '<!-- focus:tasks:start -->';
const END   = '<!-- focus:tasks:end -->';

describe('splitSection', () => {
  it('splits a note with content before, inside, and after the sentinels', () => {
    const content = `# My Note\n\nSome text.\n\n${START}\n- [ ] Task A\n${END}\n\n## Other Section\n`;
    const result = splitSection(content);
    expect(result).toEqual({
      before: `# My Note\n\nSome text.\n\n${START}\n`,
      inner: '- [ ] Task A\n',
      after: `${END}\n\n## Other Section\n`,
    });
  });

  it('returns sentinels-missing when neither sentinel is present', () => {
    expect(splitSection('# No sentinels here\n')).toEqual({
      status: 'error',
      reason: 'sentinels-missing',
    });
  });

  it('returns sentinels-malformed when start sentinel present but end absent', () => {
    expect(splitSection(`Before\n${START}\ncontent\n`)).toEqual({
      status: 'error',
      reason: 'sentinels-malformed',
    });
  });

  it('returns sentinels-malformed when end sentinel appears before start sentinel', () => {
    expect(splitSection(`${END}\n${START}\ncontent\n`)).toEqual({
      status: 'error',
      reason: 'sentinels-malformed',
    });
  });

  it('handles sentinels at the start of the file (no before-content)', () => {
    const content = `${START}\n- [ ] First task\n${END}\n`;
    expect(splitSection(content)).toEqual({
      before: `${START}\n`,
      inner: '- [ ] First task\n',
      after: `${END}\n`,
    });
  });

  it('handles sentinels at the end of the file (no after-content)', () => {
    const content = `# Note\n\n${START}\n- [ ] Last\n${END}`;
    expect(splitSection(content)).toEqual({
      before: `# Note\n\n${START}\n`,
      inner: '- [ ] Last\n',
      after: END,
    });
  });

  it('preserves YAML frontmatter above the start sentinel verbatim', () => {
    const content = `---\ntitle: Proj\nstatus: active\n---\n\n## Tasks\n\n${START}\n- [ ] Task\n${END}\n`;
    const result = splitSection(content);
    expect(result.before).toBe(`---\ntitle: Proj\nstatus: active\n---\n\n## Tasks\n\n${START}\n`);
    expect(result.inner).toBe('- [ ] Task\n');
  });

  it('preserves user subheadings inside the managed section in inner', () => {
    const content = `${START}\n### Active\n- [ ] A\n### Done\n- [x] B\n${END}\n`;
    const result = splitSection(content);
    expect(result.inner).toBe('### Active\n- [ ] A\n### Done\n- [x] B\n');
  });

  it('handles empty inner content between sentinels', () => {
    const content = `${START}\n${END}\n`;
    expect(splitSection(content)).toEqual({
      before: `${START}\n`,
      inner: '',
      after: `${END}\n`,
    });
  });
});
