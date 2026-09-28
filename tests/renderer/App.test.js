// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

const mounted = [];
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  delete window.vault;
});

function mountApp(selectResult, ioOverrides = {}) {
  window.vault = {
    select:       vi.fn().mockResolvedValue(selectResult),
    readNote:     vi.fn().mockResolvedValue({ status: 'error', reason: 'not-found' }),
    writeSection: vi.fn().mockResolvedValue({ status: 'error', reason: 'unexpected-error' }),
    ...ioOverrides,
  };
  const wrapper = mount(App);
  mounted.push(wrapper);
  return wrapper;
}

// ── Vault selection panel ────────────────────────────────────────────────────

describe('Vault selection panel', () => {
  it('shows the canonical selected Vault path', async () => {
    const wrapper = mountApp({ status: 'selected', path: '/canonical/vault' });
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain('/canonical/vault');
  });

  it('shows cancellation as a neutral state', async () => {
    const wrapper = mountApp({ status: 'cancelled' });
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe('Vault selection cancelled.');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it.each([
    ['not-directory', 'Choose a directory.'],
    ['not-readable', 'This directory is not readable.'],
    ['not-writable', 'This directory is not writable.'],
    ['missing-obsidian-directory', 'This directory does not contain a .obsidian directory.'],
    ['invalid-obsidian-directory', '.obsidian must be a directory.'],
    ['unavailable', 'This directory is unavailable.'],
  ])('shows an actionable message for %s', async (reason, message) => {
    const wrapper = mountApp({ status: 'invalid', reason });
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe(message);
  });

  it('shows a generic message for an unexpected error', async () => {
    const wrapper = mountApp({ status: 'error', reason: 'unexpected-error' });
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Vault selection failed. Try again.');
  });

  it('prevents overlapping selections while the dialog request is active', async () => {
    let resolveSelection;
    window.vault = {
      select:       vi.fn(() => new Promise((resolve) => { resolveSelection = resolve; })),
      readNote:     vi.fn(),
      writeSection: vi.fn(),
    };
    const wrapper = mount(App);
    mounted.push(wrapper);

    await wrapper.get('button').trigger('click');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button').text()).toBe('Choosing…');
    expect(window.vault.select).toHaveBeenCalledTimes(1);

    resolveSelection({ status: 'cancelled' });
    await flushPromises();
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined();
  });
});

// ── Note I/O panel ───────────────────────────────────────────────────────────

describe('Note I/O panel', () => {
  async function setupReadSuccess(wrapper, path = 'Notes/Project.md') {
    const input = wrapper.get('#note-path');
    await input.setValue(path);
    const [, readButton] = wrapper.findAll('button');
    await readButton.trigger('click');
    await flushPromises();
  }

  it('shows read-OK status after a successful readNote', async () => {
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'success', content: '# Note\n', mtime: 999 }),
    });

    await setupReadSuccess(wrapper);

    expect(wrapper.findAll('[role="status"]').at(-1).text()).toContain('Read OK');
    expect(wrapper.findAll('[role="status"]').at(-1).text()).toContain('999');
  });

  it('shows note content in the pre-element after a successful read', async () => {
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'success', content: '# Hello\n', mtime: 1 }),
    });

    await setupReadSuccess(wrapper);

    expect(wrapper.get('#note-content').text()).toContain('# Hello');
  });

  it('shows read error reason when readNote returns an error', async () => {
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'error', reason: 'not-found' }),
    });

    await setupReadSuccess(wrapper);

    expect(wrapper.get('[role="alert"]').text()).toContain('not-found');
  });

  it('shows write-OK status with new mtime after a successful writeSection', async () => {
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'success', content: '# Note\n', mtime: 100 }),
      writeSection: vi.fn().mockResolvedValue({ status: 'success', mtime: 200 }),
    });

    await setupReadSuccess(wrapper);
    await wrapper.get('#new-section').setValue('- [ ] Task\n');
    const writeButton = wrapper.findAll('button').at(-1);
    await writeButton.trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[role="status"]').at(-1).text()).toContain('Write OK');
    expect(wrapper.findAll('[role="status"]').at(-1).text()).toContain('200');
    expect(wrapper.vm.writeSection).toHaveBeenCalledWith === undefined; // api called via window
  });

  it('shows conflict message when writeSection returns conflict', async () => {
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'success', content: '# Note\n', mtime: 100 }),
      writeSection: vi.fn().mockResolvedValue({ status: 'conflict' }),
    });

    await setupReadSuccess(wrapper);
    const writeButton = wrapper.findAll('button').at(-1);
    await writeButton.trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('conflict');
  });

  it('passes mtime from last read to writeSection', async () => {
    const writeSectionMock = vi.fn().mockResolvedValue({ status: 'success', mtime: 200 });
    const wrapper = mountApp({ status: 'cancelled' }, {
      readNote: vi.fn().mockResolvedValue({ status: 'success', content: '# Note\n', mtime: 555 }),
      writeSection: writeSectionMock,
    });

    await setupReadSuccess(wrapper);
    const writeButton = wrapper.findAll('button').at(-1);
    await writeButton.trigger('click');
    await flushPromises();

    expect(writeSectionMock).toHaveBeenCalledWith('Notes/Project.md', expect.any(String), 555);
  });
});
