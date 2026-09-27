// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

const mounted = [];
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  delete window.vault;
});

function mountApp(result) {
  window.vault = { select: vi.fn().mockResolvedValue(result) };
  const wrapper = mount(App);
  mounted.push(wrapper);
  return wrapper;
}

describe('App', () => {
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
      select: vi.fn(() => new Promise((resolve) => { resolveSelection = resolve; })),
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
