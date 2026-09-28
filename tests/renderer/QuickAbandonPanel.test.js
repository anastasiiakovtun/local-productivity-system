// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickAbandonPanel from '../../src/components/timer/QuickAbandonPanel.vue';

const stubs = {
  PhArrowLeft: { template: '<span/>' },
  PhStopCircle: { template: '<span/>' },
};

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('QuickAbandonPanel', () => {
  it('renders abandon form', () => {
    const w = mount(QuickAbandonPanel, { global: { stubs } });
    expect(w.find('textarea, input[type="text"]').exists()).toBe(true);
  });

  it('Back button emits back', async () => {
    const w = mount(QuickAbandonPanel, { global: { stubs } });
    await w.find('[data-action="back"]').trigger('click');
    expect(w.emitted('back')).toBeTruthy();
  });

  it('Confirm with empty input emits confirm with null outcome', async () => {
    const w = mount(QuickAbandonPanel, { global: { stubs } });
    await w.find('[data-action="confirm"]').trigger('click');
    await flushPromises();
    expect(w.emitted('confirm')).toBeTruthy();
    expect(w.emitted('confirm')[0][0]).toBeNull();
  });

  it('Confirm with non-empty input emits confirm with that string', async () => {
    const w = mount(QuickAbandonPanel, { global: { stubs } });
    const input = w.find('textarea, input[type="text"]');
    await input.setValue('Ran out of time');
    await w.find('[data-action="confirm"]').trigger('click');
    await flushPromises();
    expect(w.emitted('confirm')[0][0]).toBe('Ran out of time');
  });

  it('Escape key emits back', async () => {
    const w = mount(QuickAbandonPanel, { global: { stubs }, attachTo: document.body });
    await w.trigger('keydown', { key: 'Escape' });
    expect(w.emitted('back')).toBeTruthy();
    w.unmount();
  });
});
