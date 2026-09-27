import { access, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNote } from '../../src/main/note-reader.js';
import { writeSection } from '../../src/main/section-writer.js';
import { createTempDirectory } from '../helpers/temp-vault.js';

const START = '<!-- focus:tasks:start -->';
const END   = '<!-- focus:tasks:end -->';

let fixture;

beforeEach(async () => {
  fixture = await createTempDirectory('focus-io-');
});

afterEach(async () => {
  await fixture.cleanup();
});

function noteFile(name = 'Project.md') {
  return path.join(fixture.directory, name);
}

describe('readNote', () => {
  it('returns content and integer mtime for an existing file', async () => {
    const filePath = noteFile();
    await writeFile(filePath, '# Hello\n');

    const result = await readNote(filePath);

    expect(result.status).toBe('success');
    expect(result.content).toBe('# Hello\n');
    expect(Number.isInteger(result.mtime)).toBe(true);
    expect(result.mtime).toBeGreaterThan(0);
  });

  it('returns not-found for a missing file', async () => {
    const result = await readNote(noteFile('nonexistent.md'));
    expect(result).toEqual({ status: 'error', reason: 'not-found' });
  });
});

describe('writeSection', () => {
  it('round-trips: replaces section content; bytes outside sentinels unchanged', async () => {
    const filePath = noteFile();
    const original =
      '---\ntitle: My Project\nstatus: active\n---\n\n## Overview\n\nSome context.\n\n' +
      `${START}\n- [ ] Old task\n${END}\n\n## Notes\n\nMore notes here.\n`;
    await writeFile(filePath, original);

    const read1 = await readNote(filePath);
    expect(read1.status).toBe('success');

    const writeResult = await writeSection(filePath, '- [ ] New task\n', read1.mtime);
    expect(writeResult.status).toBe('success');
    expect(Number.isInteger(writeResult.mtime)).toBe(true);

    const read2 = await readNote(filePath);
    expect(read2.status).toBe('success');
    expect(read2.content).toContain('- [ ] New task');
    expect(read2.content).not.toContain('- [ ] Old task');
    expect(read2.content).toContain('---\ntitle: My Project\nstatus: active\n---');
    expect(read2.content).toContain('## Overview\n\nSome context.');
    expect(read2.content).toContain('## Notes\n\nMore notes here.');
  });

  it('returns conflict when mtime changes between read and write', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    // Simulate external edit: set mtime 2 seconds in the future
    const futureMs = (read.mtime + 2000) / 1000;
    await utimes(filePath, futureMs, futureMs);

    const result = await writeSection(filePath, '- [ ] New\n', read.mtime);
    expect(result).toEqual({ status: 'conflict' });
  });

  it('returns sentinels-missing when file has no sentinels', async () => {
    const filePath = noteFile();
    await writeFile(filePath, '# No sentinels\n\nPlain content.\n');

    const read = await readNote(filePath);
    const result = await writeSection(filePath, '- [ ] Task\n', read.mtime);
    expect(result).toEqual({ status: 'error', reason: 'sentinels-missing' });
  });

  it('writes atomically: .tmp file is absent after a successful write', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    await writeSection(filePath, '- [ ] Updated\n', read.mtime);

    await expect(access(filePath + '.tmp')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('handles a pre-existing .tmp file without error', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);
    await writeFile(filePath + '.tmp', 'stale tmp content');

    const read = await readNote(filePath);
    const result = await writeSection(filePath, '- [ ] Fresh\n', read.mtime);
    expect(result.status).toBe('success');

    await expect(access(filePath + '.tmp')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('preserves YAML frontmatter with colon-heavy values byte-for-byte', async () => {
    const frontmatter = '---\ntitle: "Key: Value: More: Colons"\naliases: ["a: b", "c: d"]\n---\n\n';
    const filePath = noteFile();
    await writeFile(filePath, `${frontmatter}${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    await writeSection(filePath, '- [ ] Updated\n', read.mtime);

    const read2 = await readNote(filePath);
    expect(read2.content.startsWith(frontmatter)).toBe(true);
  });

  it('handles replacement content with no trailing newline', async () => {
    const filePath = noteFile();
    await writeFile(filePath, `${START}\n- [ ] Task\n${END}\n`);

    const read = await readNote(filePath);
    const result = await writeSection(filePath, '- [ ] No newline', read.mtime);
    expect(result.status).toBe('success');

    const read2 = await readNote(filePath);
    expect(read2.content).toBe(`${START}\n- [ ] No newline${END}\n`);
  });
});
