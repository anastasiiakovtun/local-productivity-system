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
    startSession: vi.fn(),
    pauseSession: vi.fn(),
    resumeSession: vi.fn(),
    abandonSession: vi.fn(),
    endSession: vi.fn(),
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
