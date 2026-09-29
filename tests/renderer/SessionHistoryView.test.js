// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SessionHistoryView from '../../src/views/SessionHistoryView.vue';

function makeSessions(...overrides) {
  return overrides.map((o, i) => ({
    session_id: `sid-${i}`,
    task_id: `^task-${i}`,
    task_title: o.task_title ?? 'Write essay',
    started_local_date: o.started_local_date ?? '2026-09-28',
    planned_minutes: 25,
    actual_seconds: o.actual_seconds ?? 1500,
    overflow_seconds: 0,
    status: o.status ?? 'ended',
    checkpoint_status: o.checkpoint_status ?? 'continue',
    outcome: o.outcome ?? 'Made progress.',
    next_action: o.next_action ?? 'Keep going.',
  }));
}

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    listSessions: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
  };
});

describe('SessionHistoryView', () => {
  it('filter bar uses shared classes instead of inline styles', async () => {
    const w = mount(SessionHistoryView);
    await flushPromises();
    expect(w.find('.session-filters').exists()).toBe(true);
    expect(w.find('.session-filters [style]').exists()).toBe(false);
    expect(w.find('.session-filters').attributes('style')).toBeUndefined();
  });

  it('shows session rows with task title and date', async () => {
    window.app.listSessions.mockResolvedValue({ status: 'success', data: makeSessions({ task_title: 'Write thesis' }) });
    const w = mount(SessionHistoryView);
    await flushPromises();
    expect(w.text()).toContain('Write thesis');
    expect(w.text()).toContain('2026-09-28');
  });

  it('expanding a row shows outcome and next action', async () => {
    window.app.listSessions.mockResolvedValue({
      status: 'success',
      data: makeSessions({ outcome: 'Drafted intro.', next_action: 'Finish methods.' }),
    });
    const w = mount(SessionHistoryView);
    await flushPromises();
    await w.find('.session-row').trigger('click');
    await flushPromises();
    expect(w.text()).toContain('Drafted intro.');
    expect(w.text()).toContain('Finish methods.');
  });

  it('shows empty state when no sessions', async () => {
    const w = mount(SessionHistoryView);
    await flushPromises();
    expect(w.find('.empty-state').exists()).toBe(true);
    expect(w.find('.empty-state .icon-container').exists()).toBe(true);
  });

  it('filter button calls listSessions with the current filters', async () => {
    const w = mount(SessionHistoryView);
    await flushPromises();
    window.app.listSessions.mockResolvedValue({ status: 'success', data: [] });
    await w.find('button').trigger('click');
    await flushPromises();
    expect(window.app.listSessions).toHaveBeenCalledTimes(2);
  });

  it('shows abandoned badge for abandoned sessions', async () => {
    window.app.listSessions.mockResolvedValue({
      status: 'success',
      data: makeSessions({ status: 'abandoned', checkpoint_status: null, outcome: null, next_action: null }),
    });
    const w = mount(SessionHistoryView);
    await flushPromises();
    expect(w.find('.badge-abandoned').exists()).toBe(true);
  });
});
