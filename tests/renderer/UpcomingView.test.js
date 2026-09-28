// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UpcomingView from '../../src/views/UpcomingView.vue';

function makeTasks(...titles) {
  return titles.map((title, i) => ({
    id: `task-${i}`,
    title,
    project_label: null,
    status: 'open',
    start_date: '2099-01-01',
  }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    completeTask: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteTask: vi.fn().mockResolvedValue({ status: 'success' }),
  };
});

describe('UpcomingView', () => {
  it('requests the upcoming view', async () => {
    mount(UpcomingView);
    await flushPromises();
    expect(window.app.listTasks).toHaveBeenCalledWith({ view: 'upcoming' });
  });

  it('shows upcoming tasks', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Future thing', 'Later task') });
    const w = mount(UpcomingView);
    await flushPromises();
    expect(w.text()).toContain('Future thing');
    expect(w.text()).toContain('Later task');
  });

  it('shows empty state when no upcoming tasks', async () => {
    const w = mount(UpcomingView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
  });
});
