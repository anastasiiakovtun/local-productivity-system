// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompletedView from '../../src/views/CompletedView.vue';

function makeTasks(...titles) {
  return titles.map((title, i) => ({ id: `^task-${i}`, title, project_label: null, status: 'completed' }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    completeTask: vi.fn(),
    deleteTask: vi.fn(),
    reopenTask: vi.fn().mockResolvedValue({ status: 'success' }),
    createTask: vi.fn(),
  };
});

describe('CompletedView', () => {
  it('Reopen uses an icon, not a text glyph', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Read book') });
    const w = mount(CompletedView);
    await flushPromises();
    const button = w.find('button[aria-label="Reopen"]');
    expect(button.text()).toBe('');
    expect(button.find('svg').exists()).toBe(true);
  });

  it('shows completed tasks', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Read book', 'Write notes') });
    const w = mount(CompletedView);
    await flushPromises();
    expect(w.text()).toContain('Read book');
    expect(w.text()).toContain('Write notes');
  });

  it('reopen button calls reopenTask', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Task') });
    const w = mount(CompletedView);
    await flushPromises();
    await w.find('button[aria-label="Reopen"]').trigger('click');
    await flushPromises();
    expect(window.app.reopenTask).toHaveBeenCalled();
  });

  it('search input filters the list client-side', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Alpha task', 'Beta task') });
    const w = mount(CompletedView);
    await flushPromises();
    await w.find('input[aria-label="Search"]').setValue('Alpha');
    await flushPromises();
    expect(w.text()).toContain('Alpha task');
    expect(w.text()).not.toContain('Beta task');
  });

  it('shows empty state when no completed tasks', async () => {
    const w = mount(CompletedView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
    expect(w.find('.empty-state .icon-container').exists()).toBe(true);
  });
});
