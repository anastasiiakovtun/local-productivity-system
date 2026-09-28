import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const mainPath = path.join(root, 'src/styles/main.css');

async function bundledSource() {
  const main = await readFile(mainPath, 'utf8');
  const imports = [...main.matchAll(/@import ['"](.+?)['"];/g)].map((match) => match[1]);
  const chunks = await Promise.all(
    imports.map((relativePath) => readFile(path.resolve(path.dirname(mainPath), relativePath), 'utf8')),
  );
  return { imports, source: chunks.join('') };
}

describe('split stylesheet structure', () => {
  it('locks the split stylesheet content and import order', async () => {
    const { imports, source } = await bundledSource();

    expect(imports).toEqual([
      './tokens.css',
      './base.css',
      './layout.css',
      './home.css',
      './tasks.css',
      './focus.css',
      './workflow.css',
    ]);
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      '5cefe3e9b37a9e8083e92ecd68908a702ea237c30650a0ae8583f87803a857a7',
    );
  });

  it('keeps the sidebar nav button reset and pill styling', async () => {
    const { source } = await bundledSource();
    const navItem = source.match(/\.nav-item \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(navItem).toContain('border: 0.5px solid transparent;');
    expect(navItem).toContain('background: transparent;');
    expect(navItem).toContain('border-radius: var(--radius-sm);');
    expect(navItem).toContain('width: 100%;');
  });

  it('gives cards a top-lit gradient border without a flat outline', async () => {
    const { source } = await bundledSource();

    expect(source).toContain('.home-resume-card::before');
    expect(source).toContain('.task-row::before');
    expect(source).toContain('.timer-modal::before');
    expect(source).toContain('linear-gradient(180deg,');
    expect(source).toContain('padding: 0.5px;');
    expect(source).toContain('var(--line-surface-top)');
    expect(source).toContain('var(--line-surface-bottom)');
    expect(source).toContain('-webkit-mask-composite: xor;');
    expect(source).toContain('mask-composite: exclude;');
  });
});
