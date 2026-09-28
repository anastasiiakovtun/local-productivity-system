// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityView from '../../src/views/ActivityView.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTaskEvents: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  };
});

describe('ActivityView', () => {
  it('calls listTaskEvents on mount', async () => {
    mount(ActivityView);
    await flushPromises();
    expect(window.app.listTaskEvents).toHaveBeenCalled();
  });

  it('shows event entries', async () => {
    window.app.listTaskEvents.mockResolvedValue({
      status: 'success',
      data: [
        { event_id: '1', event_type: 'created', task_title: 'Write report', local_date: '2026-09-29', local_time: '10:00' },
        { event_id: '2', event_type: 'completed', task_title: 'Deep work', local_date: '2026-09-29', local_time: '11:00' },
      ],
    });
    const w = mount(ActivityView);
    await flushPromises();
    expect(w.text()).toContain('Write report');
    expect(w.text()).toContain('Deep work');
  });

  it('shows empty state when no activity', async () => {
    const w = mount(ActivityView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
  });
});
