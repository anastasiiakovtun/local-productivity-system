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
      '3845418c0efc9ab8849de93a6240c32ca5a55b3fbe22a95285b02ec1761e393b',
    );
  });

  it('does not require remote assets when offline', async () => {
    const { source } = await bundledSource();

    expect(source).not.toMatch(/@import\s+url\(['"]?https?:\/\//);
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

  it('defines every radius token it uses', async () => {
    const { source } = await bundledSource();
    const used = new Set([...source.matchAll(/var\((--radius-[\w-]+)\)/g)].map((match) => match[1]));
    const defined = new Set([...source.matchAll(/(--radius-[\w-]+)\s*:/g)].map((match) => match[1]));

    expect([...used].filter((token) => !defined.has(token))).toEqual([]);
  });

  it('vertically centers icon and label inside secondary and danger buttons', async () => {
    const { source } = await bundledSource();

    for (const selector of ['.btn-secondary', '.btn-danger']) {
      const rule = source.match(new RegExp(`\\n\\${selector} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      expect(rule).toContain('display: inline-flex;');
      expect(rule).toContain('align-items: center;');
    }
  });

  it('centers the quick-abandon action row', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.quick-abandon-actions \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('justify-content: center;');
  });

  it('keeps the timer display centered in the space below the top row', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.timer-display--centered \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('flex: 1;');
    expect(rule).toContain('align-items: center;');
    expect(rule).toContain('justify-content: center;');
  });

  it('keeps the Home empty state in normal flow so Go to Today follows it', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.home-empty-card \.empty-state \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('position: static;');
    expect(rule).toContain('transform: none;');
  });

  it('spaces the Go to Today button away from the empty-state message', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.home-empty-card > \.btn-primary \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('margin-top: var(--space-5);');
  });

  it('spaces the Home empty-state icon, title and message apart', async () => {
    const { source } = await bundledSource();
    const stack = source.match(/\.home-empty-card \.empty-state \{([^}]*)\}/)?.[1] ?? '';
    const title = source.match(/\.home-empty-card \.empty-state h3 \{([^}]*)\}/)?.[1] ?? '';

    expect(stack).toContain('gap: var(--space-4);');
    expect(title).toContain('margin-bottom: var(--space-2);');
  });

  it('right-aligns the Start Session and timer control rows', async () => {
    const { source } = await bundledSource();
    const start = source.match(/\.rp-start-row \{([^}]*)\}/)?.[1] ?? '';
    const timer = source.match(/\.timer-modal-controls--end \{([^}]*)\}/)?.[1] ?? '';

    expect(start).toContain('justify-content: flex-end;');
    expect(timer).toContain('justify-content: flex-end;');
  });

  it('centers icon and label in every shared button style', async () => {
    const { source } = await bundledSource();

    for (const selector of ['.btn-primary', '.btn-icon']) {
      const rule = source.match(new RegExp(`\\n\\${selector} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? '';
      expect(rule).toContain('display: inline-flex;');
      expect(rule).toContain('align-items: center;');
    }
  });

  it('gives task-row icon buttons one fixed size', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\n\.btn-icon \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(rule).toContain('width: 32px;');
    expect(rule).toContain('height: 32px;');
  });

  it('uses the app text size for the capture project field', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\n\.capture-project \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(rule).not.toContain('var(--text-sm)');
  });

  it('does not let the generic h2 margin offset the resume packet title', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.resume-packet \.rp-title \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('margin: 0;');
  });

  it('gives every resume section icon the same rectangular container', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.resume-section-icon \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('--icon-container-size: 24px;');
    expect(rule).toContain('border-radius: var(--radius-xs);');
  });

  it('makes the resume packet Edit button visible', async () => {
    const { source } = await bundledSource();
    const rule = source.match(/\.rp-edit-btn \{([^}]*)\}/)?.[1] ?? '';

    expect(rule).toContain('color: var(--color-accent);');
    expect(rule).toContain('font-size: var(--text-md);');
    expect(rule).toContain('min-height: 28px;');
  });

  it('renders resume section content and edit mode at the app text size', async () => {
    const { source } = await bundledSource();
    const ruleFor = (selector) => source.match(new RegExp(`${selector.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`))?.[1] ?? '';

    expect(ruleFor('.resume-section-body')).toContain('font-size: var(--text-md);');
    for (const selector of ['.rp-notes-editor', '.rp-notes-display', '.rp-notes-list', '.rp-notes-btn', '.rp-blocker-input']) {
      expect(ruleFor(selector)).not.toContain('var(--text-sm)');
    }
  });
});
