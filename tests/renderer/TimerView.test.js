// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimerView from '../../src/views/TimerView.vue';
import { useSessionStore } from '../../src/stores/session.js';

function makeSession(overrides = {}) {
  return {
    session_id: 'sid-1',
    task_id: '^task-abc',
    task_title: 'Write essay',
    project_label: null,
    planned_minutes: 25,
    started_occurred_at_utc: new Date().toISOString(),
    paused_seconds: 0,
    status: 'active',
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    pauseSession:   vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'paused', paused_at_utc: new Date().toISOString() }) }),
    resumeSession:  vi.fn().mockResolvedValue({ status: 'success', data: makeSession() }),
    abandonSession: vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'abandoned' }) }),
    getActiveSession: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
  };
});

const stubs = {
  TimerModal: {
    template: '<div class="timer-modal-stub" role="dialog"><slot/></div>',
    emits: ['finish', 'request-abandon', 'minimize'],
    props: ['showFloatingToggle'],
  },
  QuickAbandonPanel: {
    template: '<div class="quick-abandon-stub"><slot/></div>',
    emits: ['back', 'confirm'],
  },
  PhPause: { template: '<span/>' },
  PhPlay: { template: '<span/>' },
  PhX: { template: '<span/>' },
  PhMinus: { template: '<span/>' },
  ProjectCover: { template: '<div/>' },
};

function mountWithSession(sessionOverrides = {}) {
  const session = useSessionStore();
  session.activeSession = makeSession(sessionOverrides);
  session.timerState = sessionOverrides.status === 'paused' ? 'paused' : 'running';
  session.secondsRemaining = 1200;
  return mount(TimerView, { global: { stubs } });
}

describe('TimerView', () => {
  it('renders TimerModal when no quick-abandon', () => {
    const w = mountWithSession();
    expect(w.find('.timer-modal-stub').exists()).toBe(true);
    expect(w.find('.quick-abandon-stub').exists()).toBe(false);
  });

  it('switches to QuickAbandonPanel on request-abandon', async () => {
    const w = mountWithSession();
    const modal = w.findComponent(stubs.TimerModal);
    modal.vm.$emit('request-abandon');
    await flushPromises();
    expect(w.find('.quick-abandon-stub').exists()).toBe(true);
    expect(w.find('.timer-modal-stub').exists()).toBe(false);
  });

  it('returns to modal when QuickAbandonPanel emits back', async () => {
    const w = mountWithSession();
    w.findComponent(stubs.TimerModal).vm.$emit('request-abandon');
    await flushPromises();
    w.findComponent(stubs.QuickAbandonPanel).vm.$emit('back');
    await flushPromises();
    expect(w.find('.timer-modal-stub').exists()).toBe(true);
  });

  it('calls abandonSessionWithOutcome and emits abandoned when confirm fires', async () => {
    window.app.abandonSessionWithOutcome = vi.fn().mockResolvedValue({ status: 'success', data: makeSession({ status: 'abandoned' }) });
    const w = mountWithSession();
    w.findComponent(stubs.TimerModal).vm.$emit('request-abandon');
    await flushPromises();
    w.findComponent(stubs.QuickAbandonPanel).vm.$emit('confirm', 'Ran out of time');
    await flushPromises();
    expect(window.app.abandonSessionWithOutcome).toHaveBeenCalledWith('sid-1', 'Ran out of time');
    expect(w.emitted('abandoned')).toBeTruthy();
  });

  it('finish emits end', async () => {
    const w = mountWithSession();
    w.findComponent(stubs.TimerModal).vm.$emit('finish');
    await flushPromises();
    expect(w.emitted('end')).toBeTruthy();
  });

  it('declares and forwards the minimize event without a Vue warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const w = mountWithSession();

    w.findComponent(stubs.TimerModal).vm.$emit('minimize');
    await flushPromises();

    expect(w.emitted('minimize')).toBeTruthy();
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Component emitted event "minimize"'),
    );
    warn.mockRestore();
  });
});
