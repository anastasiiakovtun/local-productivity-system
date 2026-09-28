// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckpointView from '../../src/views/CheckpointView.vue';
import { useSessionStore } from '../../src/stores/session.js';

beforeEach(() => {
  setActivePinia(createPinia());
  const session = useSessionStore();
  session.activeSession = {
    session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay',
    planned_minutes: 25, started_occurred_at_utc: new Date().toISOString(),
    paused_seconds: 0, status: 'active',
  };

  window.app = {
    saveCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    getActiveSession: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
  };
});

describe('CheckpointView', () => {
  it('renders inside the shared centered workflow card', () => {
    const w = mount(CheckpointView);
    expect(w.classes()).toContain('workflow-card');
  });

  it('gives each status its own selected-state class', async () => {
    const w = mount(CheckpointView);
    for (const value of ['continue', 'blocked', 'completed', 'abandoned']) {
      expect(w.find(`.status-option--${value}`).exists()).toBe(true);
    }
  });

  it('highlights blocker input only when populated', async () => {
    const w = mount(CheckpointView);
    const group = w.find('[data-blocker-group]');
    expect(group.classes()).not.toContain('has-blocker');
    await w.find('#cp-blocker').setValue('Waiting for feedback');
    expect(group.classes()).toContain('has-blocker');
  });

  it('Next Action field is shown for continue status', async () => {
    const w = mount(CheckpointView);
    expect(w.find('#cp-next-action').exists()).toBe(true);
  });

  it('Next Action field hidden for completed status', async () => {
    const w = mount(CheckpointView);
    await w.find('input[value="completed"]').trigger('change');
    // Manually set v-model
    await w.find('input[value="completed"]').setValue(true);
    // Use setData via radio change
    const radios = w.findAll('input[type="radio"]');
    for (const r of radios) {
      if (r.element.value === 'completed') {
        r.element.checked = true;
        await r.trigger('change');
      }
    }
    await flushPromises();
    // The label for next action should disappear when status=completed
    // We check via the computed — if radio triggers work
    // Simpler: set via vm
    w.vm.status = 'completed';
    await flushPromises();
    expect(w.find('#cp-next-action').exists()).toBe(false);
  });

  it('shows error when outcome is empty and form submitted', async () => {
    const w = mount(CheckpointView);
    await w.find('.btn-primary').trigger('click');
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain('Outcome is required');
    expect(window.app.saveCheckpoint).not.toHaveBeenCalled();
  });

  it('shows error when next action missing for continue status', async () => {
    const w = mount(CheckpointView);
    await w.find('#cp-outcome').setValue('Did some work');
    await w.find('.btn-primary').trigger('click');
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain('Next action is required');
    expect(window.app.saveCheckpoint).not.toHaveBeenCalled();
  });

  it('calls saveCheckpoint with correct fields on valid submit', async () => {
    const w = mount(CheckpointView);
    await w.find('#cp-outcome').setValue('Wrote the intro.');
    await w.find('#cp-next-action').setValue('Finish methods.');
    await w.find('.btn-primary').trigger('click');
    await flushPromises();
    expect(window.app.saveCheckpoint).toHaveBeenCalledWith('sid-1', expect.objectContaining({
      outcome: 'Wrote the intro.',
      status: 'continue',
      nextAction: 'Finish methods.',
    }));
  });
});
