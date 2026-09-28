// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InboxView from '../../src/views/InboxView.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    createTask: vi.fn().mockResolvedValue({ status: 'success', task: { id: '^task-new', title: 'New', project_label: null, status: 'open' } }),
    completeTask: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteTask: vi.fn().mockResolvedValue({ status: 'success' }),
    reopenTask: vi.fn().mockResolvedValue({ status: 'success' }),
  };
});

function tasks(...items) {
  return items.map((title, i) => ({ id: `^task-${i}`, title, project_label: null, status: 'open' }));
}

describe('InboxView', () => {
  it('shows capture bar on empty inbox', async () => {
    const w = mount(InboxView);
    await flushPromises();
    expect(w.find('input[aria-label="New task title"]').exists()).toBe(true);
    expect(w.find('.empty-state').exists()).toBe(true);
  });

  it('submitting the capture bar calls createTask and refreshes list', async () => {
    window.app.listTasks
      .mockResolvedValueOnce({ status: 'success', data: [] })
      .mockResolvedValueOnce({ status: 'success', data: tasks('New') });

    const w = mount(InboxView);
    await flushPromises();

    await w.find('input[aria-label="New task title"]').setValue('New');
    await w.find('form').trigger('submit');
    await flushPromises();

    expect(window.app.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: 'New' }));
    expect(window.app.listTasks).toHaveBeenCalledTimes(2);
  });

  it('Enter key in capture bar submits', async () => {
    const w = mount(InboxView);
    await flushPromises();
    await w.find('input[aria-label="New task title"]').setValue('Press Enter');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(window.app.createTask).toHaveBeenCalled();
  });

  it('empty title is not submitted', async () => {
    const w = mount(InboxView);
    await flushPromises();
    await w.find('form').trigger('submit');
    expect(window.app.createTask).not.toHaveBeenCalled();
  });

  it('complete button calls completeTask', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: tasks('Write essay') });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Complete"]').trigger('click');
    await flushPromises();
    expect(window.app.completeTask).toHaveBeenCalled();
  });

  it('delete button calls deleteTask and removes task from list', async () => {
    window.app.listTasks
      .mockResolvedValueOnce({ status: 'success', data: tasks('Write essay') })
      .mockResolvedValueOnce({ status: 'success', data: [] });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Delete"]').trigger('click');
    await flushPromises();
    expect(window.app.deleteTask).toHaveBeenCalled();
    expect(w.find('.empty-state').exists()).toBe(true);
  });

  it('project label is optional — submit without it succeeds', async () => {
    const w = mount(InboxView);
    await flushPromises();
    await w.find('input[aria-label="New task title"]').setValue('No project');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(window.app.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No project', projectLabel: null })
    );
  });
});
