// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FloatingTimer from '../../src/components/FloatingTimer.vue';
import { useSessionStore } from '../../src/stores/session.js';

function makeSession(overrides = {}) {
  return {
    session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay',
    project_label: 'Research', planned_minutes: 25,
    started_occurred_at_utc: new Date().toISOString(), paused_seconds: 0, status: 'active',
    ...overrides,
  };
}

const stubs = {
  PhPause: { template: '<span/>' },
  PhPlay: { template: '<span/>' },
  PhArrowsIn: { template: '<span/>' },
  ProjectCover: { template: '<div class="project-cover-stub"/>' },
};

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    pauseSession:   vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'paused' }) }),
    resumeSession:  vi.fn().mockResolvedValue({ status: 'success', data: makeSession() }),
    abandonSessionWithOutcome: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getActiveSession: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
  };
});

describe('FloatingTimer', () => {
  it('shows task title and time', () => {
    const session = useSessionStore();
    session.activeSession = makeSession();
    session.timerState = 'running';
    session.secondsRemaining = 900;
    const w = mount(FloatingTimer, { global: { stubs } });
    expect(w.text()).toContain('Write essay');
    expect(w.find('.timer-display').text()).toMatch(/\d{2}:\d{2}/);
  });

  it('shows project cover', () => {
    const session = useSessionStore();
    session.activeSession = makeSession();
    session.timerState = 'running';
    session.secondsRemaining = 900;
    const w = mount(FloatingTimer, { global: { stubs } });
    expect(w.find('.project-cover-stub').exists()).toBe(true);
  });

  it('pause button calls pauseSession', async () => {
    const session = useSessionStore();
    session.activeSession = makeSession();
    session.timerState = 'running';
    session.secondsRemaining = 900;
    const { flushPromises } = await import('@vue/test-utils');
    const w = mount(FloatingTimer, { global: { stubs } });
    await w.find('[data-action="pause"]').trigger('click');
    await flushPromises();
    expect(window.app.pauseSession).toHaveBeenCalled();
  });

  it('resume button shown when paused', () => {
    const session = useSessionStore();
    session.activeSession = makeSession({ status: 'paused' });
    session.timerState = 'paused';
    session.secondsRemaining = 900;
    const w = mount(FloatingTimer, { global: { stubs } });
    expect(w.find('[data-action="resume"]').exists()).toBe(true);
  });

  it('restore button emits restore', async () => {
    const session = useSessionStore();
    session.activeSession = makeSession();
    session.timerState = 'running';
    session.secondsRemaining = 900;
    const w = mount(FloatingTimer, { global: { stubs } });
    await w.find('[data-action="restore"]').trigger('click');
    expect(w.emitted('restore')).toBeTruthy();
  });
});
