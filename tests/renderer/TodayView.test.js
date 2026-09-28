// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TodayView from '../../src/views/TodayView.vue';

function makeTasks(...titles) {
  return titles.map((title, i) => ({ id: `^task-${i}`, title, project_label: null, status: 'open' }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    completeTask: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteTask: vi.fn().mockResolvedValue({ status: 'success' }),
    reopenTask: vi.fn().mockResolvedValue({ status: 'success' }),
    createTask: vi.fn(),
  };
});

describe('TodayView', () => {
  it('shows tasks from listTasks("today")', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Do laundry', 'Study') });
    const w = mount(TodayView);
    await flushPromises();
    expect(w.text()).toContain('Do laundry');
    expect(w.text()).toContain('Study');
  });

  it('complete button calls completeTask', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Task A') });
    const w = mount(TodayView);
    await flushPromises();
    await w.find('button[aria-label="Complete"]').trigger('click');
    await flushPromises();
    expect(window.app.completeTask).toHaveBeenCalled();
  });

  it('delete button calls deleteTask', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Task A') });
    const w = mount(TodayView);
    await flushPromises();
    await w.find('button[aria-label="Delete"]').trigger('click');
    await flushPromises();
    expect(window.app.deleteTask).toHaveBeenCalled();
  });

  it('shows empty state when no tasks', async () => {
    const w = mount(TodayView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
    expect(w.find('.empty-state .icon-container').exists()).toBe(true);
  });

  it('each task row shows a Focus button', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: makeTasks('Write essay') });
    const w = mount(TodayView);
    await flushPromises();
    expect(w.find('button[aria-label="Focus"]').exists()).toBe(true);
  });

  it('Focus button emits focus event with the task object', async () => {
    const task = { id: '^task-0', title: 'Write essay', project_label: null, status: 'open' };
    window.app.listTasks.mockResolvedValue({ status: 'success', data: [task] });
    const w = mount(TodayView);
    await flushPromises();
    await w.find('button[aria-label="Focus"]').trigger('click');
    expect(w.emitted('focus')).toHaveLength(1);
    expect(w.emitted('focus')[0][0]).toMatchObject({ id: '^task-0', title: 'Write essay' });
  });
});
