// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeView from '../../src/views/HomeView.vue';
import { PROJECT_COVER_COLORS } from '../../src/shared/app-schema.js';

const resumeTask = {
  id: '^task-1',
  title: 'Write chapter',
  project_label: 'Thesis',
  outcome: 'Drafted the opening.',
  next_action: 'Review citations.',
  color: '#2dd4bf',
};

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    getHomeResume: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    listProjects: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    setProjectCover: vi.fn().mockResolvedValue({ status: 'success' }),
    createTask: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  };
});

describe('HomeView', () => {
  it('shows the newest resumable task and emits Resume', async () => {
    window.app.getHomeResume.mockResolvedValue({ status: 'success', data: resumeTask });
    const wrapper = mount(HomeView);
    await flushPromises();
    expect(wrapper.text()).toContain('Continue where you left off');
    expect(wrapper.text()).toContain('Write chapter');
    expect(wrapper.text()).toContain('Drafted the opening.');
    expect(wrapper.text()).toContain('Review citations.');
    await wrapper.find('button[aria-label="Resume Write chapter"]').trigger('click');
    expect(wrapper.emitted('resume')).toEqual([[resumeTask]]);
  });

  it('shows empty state and emits Go to Today', async () => {
    const wrapper = mount(HomeView);
    await flushPromises();
    expect(wrapper.text()).toContain('Nothing to resume');
    expect(wrapper.find('.empty-state .icon-container').exists()).toBe(true);
    await wrapper.find('button[aria-label="Go to Today"]').trigger('click');
    expect(wrapper.emitted('go-today')).toHaveLength(1);
  });

  it('quick captures a task without navigating away', async () => {
    const wrapper = mount(HomeView);
    await flushPromises();
    await wrapper.find('input[aria-label="Quick task title"]').setValue('Plan review');
    await wrapper.find('input[aria-label="Quick project label"]').setValue('Thesis');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(window.app.createTask).toHaveBeenCalledWith({ title: 'Plan review', projectLabel: 'Thesis' });
    expect(wrapper.emitted('task-created')).toHaveLength(1);
    expect(wrapper.find('input[aria-label="Quick task title"]').element.value).toBe('');
  });

  it('selects a predefined project cover color', async () => {
    window.app.listProjects.mockResolvedValue({
      status: 'success',
      data: [{ label: 'Thesis', color: null }],
    });
    const wrapper = mount(HomeView);
    await flushPromises();
    await wrapper.find('button[aria-label="Change cover for Thesis"]').trigger('click');
    await wrapper.find(`button[data-color="${PROJECT_COVER_COLORS[1]}"]`).trigger('click');
    await flushPromises();
    expect(window.app.setProjectCover).toHaveBeenCalledWith('Thesis', PROJECT_COVER_COLORS[1]);
  });
});
