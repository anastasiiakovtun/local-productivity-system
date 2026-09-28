// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import BreakView from '../../src/views/BreakView.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BreakView', () => {
  it('shows countdown in MM:SS format', async () => {
    const w = mount(BreakView, { props: { breakMinutes: 5 } });
    expect(w.find('.break-timer').text()).toMatch(/\d{2}:\d{2}/);
  });

  it('End Break button emits done immediately', async () => {
    const w = mount(BreakView, { props: { breakMinutes: 1 } });
    await w.find('button[aria-label="End Break"]').trigger('click');
    await flushPromises();
    expect(w.emitted('done')).toHaveLength(1);
  });

  it('counts down to zero and shows Break complete', async () => {
    const w = mount(BreakView, { props: { breakMinutes: 1 } });
    vi.advanceTimersByTime(61 * 1000);
    await flushPromises();
    expect(w.text()).toContain('Break complete');
  });

  it('Done button after completion emits done', async () => {
    const w = mount(BreakView, { props: { breakMinutes: 1 } });
    vi.advanceTimersByTime(61 * 1000);
    await flushPromises();
    await w.find('button[aria-label="Done"]').trigger('click');
    expect(w.emitted('done')).toHaveLength(1);
  });
});
