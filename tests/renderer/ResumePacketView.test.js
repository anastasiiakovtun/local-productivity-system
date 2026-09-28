// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumePacketView from '../../src/views/ResumePacketView.vue';

const task = { id: '^task-abc', title: 'Write essay', project_label: 'Thesis', status: 'open', supporting_notes: null };

const stubs = {
  PhMapPinLine: { template: '<span/>' },
  PhArrowBendDownRight: { template: '<span/>' },
  PhNotePencil: { template: '<span/>' },
  PhWarningCircle: { template: '<span/>' },
  PhPencil: { template: '<span/>' },
  PhX: { template: '<span/>' },
  PhFloppyDisk: { template: '<span/>' },
  ProjectCover: { template: '<div class="project-cover-stub"/>' },
  ResumeSection: { template: '<div class="resume-section-stub"><slot/></div>', props: ['label', 'icon', 'tone'] },
};

beforeEach(() => {
  setActivePinia(createPinia());
  window.app = {
    getPreferences: vi.fn().mockResolvedValue({ status: 'success', data: { defaultFocusMinutes: 25 } }),
    getLastCheckpoint: vi.fn().mockResolvedValue({ status: 'success', data: null }),
    startSession: vi.fn().mockResolvedValue({ status: 'success', data: { session_id: 'sid-1', task_id: '^task-abc', task_title: 'Write essay', project_label: 'Thesis', planned_minutes: 25, started_occurred_at_utc: new Date().toISOString(), paused_seconds: 0, status: 'active' } }),
    editTask: vi.fn().mockResolvedValue({ status: 'success', task: { ...task, supporting_notes: 'New note.' } }),
  };
});

describe('ResumePacketView', () => {
  it('renders inside the shared centered workflow card', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.classes()).toContain('workflow-card');
  });

  it('shows task title and project label', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('Write essay');
    expect(w.text()).toContain('Thesis');
  });

  it('shows project cover', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('.project-cover-stub').exists()).toBe(true);
  });

  it('shows "No previous checkpoint" when none exists', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('No previous checkpoint');
  });

  it('shows last checkpoint outcome and status when present', async () => {
    window.app.getLastCheckpoint.mockResolvedValue({
      status: 'success',
      data: { outcome: 'Drafted intro', status: 'continue', next_action: 'Finish methods' },
    });
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('Drafted intro');
  });

  it('shows empty blocker message when no checkpoint blocker', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('No blockers');
  });

  it('shows blocker text when checkpoint has blocker', async () => {
    window.app.getLastCheckpoint.mockResolvedValue({
      status: 'success',
      data: { outcome: 'Done', status: 'continue', blocker: 'Need API key' },
    });
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('Need API key');
  });

  it('duration input defaults to defaultFocusMinutes from preferences', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('#duration-input').element.value).toBe('25');
  });

  it('Start Session button calls startSession', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs }, attrs: { onStarted: vi.fn() } });
    await flushPromises();
    await w.find('.btn-primary').trigger('click');
    await flushPromises();
    expect(window.app.startSession).toHaveBeenCalledWith('^task-abc', 25);
  });

  it('Edit Notes button shows textarea', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    await w.find('[data-action="edit-notes"]').trigger('click');
    expect(w.find('textarea[data-notes-editor]').exists()).toBe(true);
  });

  it('Cancel notes restores original value and hides textarea', async () => {
    const taskWithNotes = { ...task, supporting_notes: 'Old note.' };
    const w = mount(ResumePacketView, { props: { task: taskWithNotes }, global: { stubs } });
    await flushPromises();
    await w.find('[data-action="edit-notes"]').trigger('click');
    await w.find('textarea[data-notes-editor]').setValue('Changed but cancelled');
    await w.find('[data-action="cancel-notes"]').trigger('click');
    expect(w.find('textarea[data-notes-editor]').exists()).toBe(false);
    expect(w.text()).toContain('Old note.');
  });

  it('Save notes calls editTask with supportingNotes', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    await w.find('[data-action="edit-notes"]').trigger('click');
    await w.find('textarea[data-notes-editor]').setValue('New note.');
    await w.find('[data-action="save-notes"]').trigger('click');
    await flushPromises();
    expect(window.app.editTask).toHaveBeenCalledWith('^task-abc', { supportingNotes: 'New note.' });
  });
});
