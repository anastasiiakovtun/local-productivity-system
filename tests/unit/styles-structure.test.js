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
  it('preserves the pre-refactor stylesheet byte-for-byte and import order', async () => {
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
      '6b1399796a2071e185f0cab4c0cc171564a41eeb27a5c4f100806fb5f7e5f74d',
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
});
