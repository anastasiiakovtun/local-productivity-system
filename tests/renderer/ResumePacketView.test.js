// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumePacketView from '../../src/views/ResumePacketView.vue';

const task = { id: '^task-abc', title: 'Write essay', project_label: 'Thesis', status: 'open' };

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    getPreferences: vi.fn().mockResolvedValue({ status: 'success', data: { defaultFocusMinutes: 25 } }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    startSession: vi.fn().mockResolvedValue({ status: 'success', data: { session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay', project_label: 'Thesis', planned_minutes: 25, started_occurred_at_utc: new Date().toISOString(), paused_seconds: 0, status: 'active' } }),
  };
});

describe('ResumePacketView', () => {
  it('shows task title and project label', async () => {
    const w = mount(ResumePacketView, { props: { task } });
    await flushPromises();
    expect(w.text()).toContain('Write essay');
    expect(w.text()).toContain('Thesis');
  });

  it('shows "No previous checkpoint" when none exists', async () => {
    const w = mount(ResumePacketView, { props: { task } });
    await flushPromises();
    expect(w.text()).toContain('No previous checkpoint');
  });

  it('shows last checkpoint outcome and status when present', async () => {
    window.app.getLastCheckpoint.mockResolvedValue({
      status: 'success',
      data: { outcome: 'Drafted intro', status: 'continue', next_action: 'Finish methods' },
    });
    const w = mount(ResumePacketView, { props: { task } });
    await flushPromises();
    expect(w.text()).toContain('Drafted intro');
    expect(w.text()).toContain('continue');
  });

  it('duration input defaults to defaultFocusMinutes from preferences', async () => {
    const w = mount(ResumePacketView, { props: { task } });
    await flushPromises();
    expect(w.find('#duration-input').element.value).toBe('25');
  });

  it('Start Session button calls startSession', async () => {
    const w = mount(ResumePacketView, { props: { task }, attrs: { onStarted: vi.fn() } });
    await flushPromises();
    await w.find('.btn-primary').trigger('click');
    await flushPromises();
    expect(window.app.startSession).toHaveBeenCalledWith('^task-abc', 25);
  });
});
