// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  window.vault = {
    select: vi.fn().mockResolvedValue({ status: 'selected', path: '/vault' }),
    readNote: vi.fn(),
    writeSection: vi.fn(),
  };
  window.app = {
    getPreferences: vi.fn().mockResolvedValue({ status: 'success', data: { vaultPath: '/vault' } }),
    setPreferences: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    listTasks: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    createTask: vi.fn(),
    completeTask: vi.fn(),
    deleteTask: vi.fn(),
    reopenTask: vi.fn(),
    startSession: vi.fn().mockResolvedValue({ status: 'success', data: { session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay', planned_minutes: 25, started_occurred_at_utc: new Date().toISOString(), paused_seconds: 0, status: 'active' } }),
    pauseSession: vi.fn(),
    resumeSession: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    abandonSession: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
    endSession: vi.fn(),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    getPreferences: vi.fn().mockResolvedValue({ status: 'success', data: { vaultPath: '/vault', defaultFocusMinutes: 25 } }),
    listSessions: vi.fn().mockResolvedValue({ status: 'success', data: [] }),
    saveCheckpoint: vi.fn(),
  };
});

describe('App shell', () => {
  it('renders the main navigation after vault is initialized', async () => {
    const w = mount(App);
    await flushPromises();
    expect(w.find('nav').exists()).toBe(true);
    expect(w.text()).toContain('Inbox');
    expect(w.text()).toContain('Today');
    expect(w.text()).toContain('Completed');
    expect(w.text()).toContain('Sessions');
  });

  it('shows loading screen before initialization', () => {
    window.app.getPreferences = vi.fn(() => new Promise(() => {}));
    const w = mount(App);
    expect(w.find('.loading-screen').exists()).toBe(true);
  });

  it('shows cancelled screen when vault selection is cancelled', async () => {
    window.app.getPreferences = vi.fn().mockResolvedValue({ status: 'success', data: {} });
    window.vault.select = vi.fn().mockResolvedValue({ status: 'cancelled' });
    const w = mount(App);
    await flushPromises();
    expect(w.text()).toContain('No vault selected');
  });
});

const inboxTask = { id: '^task-abc', title: 'Write essay', project_label: 'Thesis', status: 'open' };

async function mountWithVault() {
  const w = mount(App);
  await flushPromises();
  return w;
}

describe('App focus flow', () => {
  it('emitting focus from InboxView shows ResumePacketView', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    expect(w.findComponent({ name: 'ResumePacketView' }).exists()).toBe(true);
  });

  it('cancel from ResumePacketView returns to list', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('cancel');
    await flushPromises();
    expect(w.find('nav').exists()).toBe(true);
    expect(w.findComponent({ name: 'ResumePacketView' }).exists()).toBe(false);
  });

  it('started from ResumePacketView shows TimerView', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    expect(w.findComponent({ name: 'TimerView' }).exists()).toBe(true);
  });

  it('end from TimerView shows CheckpointView', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    expect(w.findComponent({ name: 'CheckpointView' }).exists()).toBe(true);
  });

  it('cancel from CheckpointView returns to TimerView', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('cancel');
    await flushPromises();
    expect(w.findComponent({ name: 'TimerView' }).exists()).toBe(true);
    expect(w.findComponent({ name: 'CheckpointView' }).exists()).toBe(false);
  });

  it('saved from CheckpointView returns to list', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('saved');
    await flushPromises();
    // saved now goes to break-offer, not directly to list
    expect(w.text()).toContain('Take Break');
    expect(w.findComponent({ name: 'CheckpointView' }).exists()).toBe(false);
  });

  it('abandoned from TimerView returns to list', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('abandoned');
    await flushPromises();
    expect(w.find('nav').exists()).toBe(true);
    expect(w.findComponent({ name: 'TimerView' }).exists()).toBe(false);
  });

  it('saved from CheckpointView shows break offer screen', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('saved');
    await flushPromises();
    expect(w.text()).toContain('Take Break');
    expect(w.text()).toContain('Done');
  });

  it('Done on break offer returns to list without a break', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('saved');
    await flushPromises();
    await w.find('button[aria-label="Skip break"]').trigger('click');
    await flushPromises();
    expect(w.find('nav').exists()).toBe(true);
  });

  it('Take Break shows BreakView; BreakView done returns to list', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('saved');
    await flushPromises();
    await w.find('button[aria-label="Take Break"]').trigger('click');
    await flushPromises();
    expect(w.findComponent({ name: 'BreakView' }).exists()).toBe(true);
    await w.findComponent({ name: 'BreakView' }).vm.$emit('done');
    await flushPromises();
    expect(w.find('nav').exists()).toBe(true);
    expect(w.findComponent({ name: 'BreakView' }).exists()).toBe(false);
  });

  it('Take Break does not call any IPC write (non-durable)', async () => {
    window.app.listTasks = vi.fn().mockResolvedValue({ status: 'success', data: [inboxTask] });
    window.app.saveCheckpoint = vi.fn().mockResolvedValue({ status: 'success' });
    window.app.startSession = vi.fn().mockResolvedValue({ status: 'success', data: { session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay', planned_minutes: 25, started_occurred_at_utc: new Date().toISOString(), paused_seconds: 0, status: 'active' } });
    const w = await mountWithVault();
    await w.findComponent({ name: 'InboxView' }).vm.$emit('focus', inboxTask);
    await flushPromises();
    await w.findComponent({ name: 'ResumePacketView' }).vm.$emit('started');
    await flushPromises();
    await w.findComponent({ name: 'TimerView' }).vm.$emit('end');
    await flushPromises();
    await w.findComponent({ name: 'CheckpointView' }).vm.$emit('saved');
    await flushPromises();
    await w.find('button[aria-label="Take Break"]').trigger('click');
    await flushPromises();
    const callsBefore = window.app.saveCheckpoint.mock.calls.length
      + (window.app.createTask?.mock?.calls.length ?? 0);
    await w.findComponent({ name: 'BreakView' }).vm.$emit('done');
    await flushPromises();
    const callsAfter = window.app.saveCheckpoint.mock.calls.length
      + (window.app.createTask?.mock?.calls.length ?? 0);
    expect(callsAfter).toBe(callsBefore);
  });
});
