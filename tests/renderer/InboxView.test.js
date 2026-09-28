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

beforeEach(() => {
  window.app.editTask = vi.fn().mockResolvedValue({ status: 'success', task: {} });
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

  it('each task row shows a Focus button', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: tasks('Write essay') });
    const w = mount(InboxView);
    await flushPromises();
    expect(w.find('button[aria-label="Focus"]').exists()).toBe(true);
  });

  it('Focus button emits focus event with the task object', async () => {
    const task = { id: '^task-0', title: 'Write essay', project_label: null, status: 'open' };
    window.app.listTasks.mockResolvedValue({ status: 'success', data: [task] });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Focus"]').trigger('click');
    expect(w.emitted('focus')).toHaveLength(1);
    expect(w.emitted('focus')[0][0]).toMatchObject({ id: '^task-0', title: 'Write essay' });
  });

  it('each task row shows an Edit button', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: tasks('Write essay') });
    const w = mount(InboxView);
    await flushPromises();
    expect(w.find('button[aria-label="Edit"]').exists()).toBe(true);
  });

  it('clicking Edit opens an inline form with current title and project', async () => {
    const task = { id: '^task-0', title: 'Write essay', project_label: 'Thesis', status: 'open' };
    window.app.listTasks.mockResolvedValue({ status: 'success', data: [task] });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Edit"]').trigger('click');
    await flushPromises();
    expect(w.find('input[aria-label="Edit title"]').element.value).toBe('Write essay');
    expect(w.find('input[aria-label="Edit project"]').element.value).toBe('Thesis');
  });

  it('empty title disables Save in the edit form', async () => {
    const task = { id: '^task-0', title: 'Write essay', project_label: null, status: 'open' };
    window.app.listTasks.mockResolvedValue({ status: 'success', data: [task] });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Edit"]').trigger('click');
    await w.find('input[aria-label="Edit title"]').setValue('');
    await flushPromises();
    expect(w.find('button[aria-label="Save edit"]').element.disabled).toBe(true);
  });

  it('Cancel edit dismisses the form without calling editTask', async () => {
    window.app.listTasks.mockResolvedValue({ status: 'success', data: tasks('Write essay') });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Edit"]').trigger('click');
    await w.find('button[aria-label="Cancel edit"]').trigger('click');
    await flushPromises();
    expect(w.find('input[aria-label="Edit title"]').exists()).toBe(false);
    expect(window.app.editTask).not.toHaveBeenCalled();
  });

  it('Save calls editTask and refreshes the list', async () => {
    const task = { id: '^task-0', title: 'Old title', project_label: null, status: 'open' };
    window.app.listTasks
      .mockResolvedValueOnce({ status: 'success', data: [task] })
      .mockResolvedValueOnce({ status: 'success', data: [{ ...task, title: 'New title' }] });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Edit"]').trigger('click');
    await w.find('input[aria-label="Edit title"]').setValue('New title');
    await w.find('button[aria-label="Save edit"]').trigger('click');
    await flushPromises();
    expect(window.app.editTask).toHaveBeenCalledWith('^task-0', expect.objectContaining({ title: 'New title' }));
    expect(window.app.listTasks).toHaveBeenCalledTimes(2);
    expect(w.find('input[aria-label="Edit title"]').exists()).toBe(false);
  });

  it('Save keeps form open and shows error on failure', async () => {
    window.app.editTask.mockResolvedValueOnce({ status: 'error', reason: 'not-found' });
    window.app.listTasks.mockResolvedValue({ status: 'success', data: tasks('Write essay') });
    const w = mount(InboxView);
    await flushPromises();
    await w.find('button[aria-label="Edit"]').trigger('click');
    await w.find('input[aria-label="Edit title"]').setValue('Changed');
    await w.find('button[aria-label="Save edit"]').trigger('click');
    await flushPromises();
    expect(w.find('input[aria-label="Edit title"]').exists()).toBe(true);
    expect(w.find('[role="alert"]').text()).toContain('not-found');
  });
});
