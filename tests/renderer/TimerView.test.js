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

function mountWithSession(sessionOverrides = {}) {
  const session = useSessionStore();
  session.activeSession = makeSession(sessionOverrides);
  session.timerState = sessionOverrides.status === 'paused' ? 'paused' : 'running';
  session.secondsRemaining = 1200;
  return mount(TimerView);
}

describe('TimerView', () => {
  it('displays task title', () => {
    const w = mountWithSession();
    expect(w.text()).toContain('Write essay');
  });

  it('shows countdown when running', () => {
    const w = mountWithSession();
    expect(w.find('.timer-display').text()).toMatch(/\d{2}:\d{2}/);
    expect(w.find('.timer-display').classes()).not.toContain('overflow');
  });

  it('Pause button calls pauseSession', async () => {
    const w = mountWithSession();
    await w.find('button[class*="btn-secondary"]').trigger('click');
    await flushPromises();
    expect(window.app.pauseSession).toHaveBeenCalled();
  });

  it('Resume button shown when paused, calls resumeSession', async () => {
    const w = mountWithSession({ status: 'paused' });
    await w.find('button[class*="btn-secondary"]').trigger('click');
    await flushPromises();
    expect(window.app.resumeSession).toHaveBeenCalled();
  });

  it('shows overflow label when timerState is overflow', () => {
    const session = useSessionStore();
    session.activeSession = makeSession();
    session.timerState = 'overflow';
    session.elapsedOverflow = 120;
    const w = mount(TimerView);
    expect(w.find('.timer-display').classes()).toContain('overflow');
    expect(w.text()).toContain('Overflow');
  });

  it('Abandon button calls abandonSession', async () => {
    const w = mountWithSession();
    await w.find('.btn-danger').trigger('click');
    await flushPromises();
    expect(window.app.abandonSession).toHaveBeenCalled();
  });
});
