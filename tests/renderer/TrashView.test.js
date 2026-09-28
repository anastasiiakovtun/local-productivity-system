// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrashView from '../../src/views/TrashView.vue';

function makeTasks(...titles) {
  return titles.map((title, i) => ({
    id: `task-${i}`,
    title,
    project_label: null,
    status: 'deleted',
  }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  };
});

describe('TrashView', () => {
  it('requests the trash view', async () => {
    mount(TrashView);
    await flushPromises();
    expect(window.app.listTasks).toHaveBeenCalledWith({ view: 'trash' });
  });

  it('shows deleted tasks', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Old task', 'Removed item') });
    const w = mount(TrashView);
    await flushPromises();
    expect(w.text()).toContain('Old task');
    expect(w.text()).toContain('Removed item');
  });

  it('shows empty state when trash is empty', async () => {
    const w = mount(TrashView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
  });
});
