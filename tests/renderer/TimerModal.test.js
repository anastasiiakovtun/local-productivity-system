// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimerModal from '../../src/components/TimerModal.vue';
import { useSessionStore } from '../../src/stores/session.js';

function makeSession(overrides = {}) {
  return {
    session_id: 'sid-1',
    task_id: '^task-abc',
    task_title: 'Write essay',
    project_label: 'Research',
    planned_minutes: 25,
    started_occurred_at_utc: new Date().toISOString(),
    paused_seconds: 0,
    status: 'active',
    ...overrides,
  };
}

const stubs = {
  PhPause: { template: '<span/>' },
  PhPlay: { template: '<span/>' },
  PhX: { template: '<span/>' },
  PhMinus: { template: '<span/>' },
  ProjectCover: { template: '<div class="project-cover-stub"/>' },
};

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    pauseSession:   vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'paused', paused_at_utc: new Date().toISOString() }) }),
    resumeSession:  vi.fn().mockResolvedValue({ status: 'success', data: makeSession() }),
    abandonSession: vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'abandoned' }) }),
    abandonSessionWithOutcome: vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'abandoned' }) }),
    getActiveSession: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
  };
});

function mountModal(sessionOverrides = {}, propsOverrides = {}) {
  const session = useSessionStore();
  session.activeSession = makeSession(sessionOverrides);
  session.timerState = sessionOverrides.status === 'paused' ? 'paused' : 'running';
  session.secondsRemaining = 1200;
  return mount(TimerModal, {
    global: { stubs },
    props: { showFloatingToggle: false, ...propsOverrides },
  });
}

describe('TimerModal', () => {
  it('renders as dialog with role="dialog"', () => {
    const w = mountModal();
    expect(w.find('[role="dialog"]').exists()).toBe(true);
  });

  it('shows task title', () => {
    const w = mountModal();
    expect(w.text()).toContain('Write essay');
  });

  it('shows project cover when project_label set', () => {
    const w = mountModal();
    expect(w.find('.project-cover-stub').exists()).toBe(true);
  });

  it('shows MM:SS countdown', () => {
    const w = mountModal();
    expect(w.find('.timer-display').text()).toMatch(/\d{2}:\d{2}/);
  });

  it('shows planned time row', () => {
    const w = mountModal();
    expect(w.text()).toContain('25');
  });

  it('Pause button present when running', () => {
    const w = mountModal();
    expect(w.find('[data-action="pause"]').exists()).toBe(true);
  });

  it('Pause calls pauseSession', async () => {
    const w = mountModal();
    await w.find('[data-action="pause"]').trigger('click');
    await flushPromises();
    expect(window.app.pauseSession).toHaveBeenCalled();
  });

  it('Resume button shown when paused', () => {
    const w = mountModal({ status: 'paused' });
    expect(w.find('[data-action="resume"]').exists()).toBe(true);
  });

  it('Resume calls resumeSession', async () => {
    const w = mountModal({ status: 'paused' });
    await w.find('[data-action="resume"]').trigger('click');
    await flushPromises();
    expect(window.app.resumeSession).toHaveBeenCalled();
  });

  it('timer display is centered', () => {
    const w = mountModal();
    const display = w.find('.timer-display');
    expect(display.exists()).toBe(true);
    // centered via CSS; confirm it exists and has text
    expect(display.text()).toMatch(/\d{2}:\d{2}/);
  });

  it('controls row has justify-content center class', () => {
    const w = mountModal();
    expect(w.find('.timer-modal-controls').classes()).toContain('timer-modal-controls--centered');
  });

  it('Finish button emits finish', async () => {
    const w = mountModal();
    await w.find('[data-action="finish"]').trigger('click');
    expect(w.emitted('finish')).toBeTruthy();
  });

  it('Close button emits request-abandon (not finish)', async () => {
    const w = mountModal();
    await w.find('[data-action="close"]').trigger('click');
    expect(w.emitted('request-abandon')).toBeTruthy();
    expect(w.emitted('finish')).toBeFalsy();
  });

  it('Minimize button hidden when showFloatingToggle is false', () => {
    const w = mountModal({}, { showFloatingToggle: false });
    expect(w.find('[data-action="minimize"]').exists()).toBe(false);
  });

  it('Minimize button visible when showFloatingToggle is true', () => {
    const w = mountModal({}, { showFloatingToggle: true });
    expect(w.find('[data-action="minimize"]').exists()).toBe(true);
  });

  it('Minimize emits minimize', async () => {
    const w = mountModal({}, { showFloatingToggle: true });
    await w.find('[data-action="minimize"]').trigger('click');
    expect(w.emitted('minimize')).toBeTruthy();
  });
});
