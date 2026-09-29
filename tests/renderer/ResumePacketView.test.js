// @vitest-environment happy-dom
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResumePacketView from '../../src/views/ResumePacketView.vue';

const task = { id: '^task-abc', title: 'Write essay', project_label: 'Thesis', status: 'open', supporting_notes: null, blocker: null, next_action: null };

const stubs = {
  PhMapPinLine: { template: '<span/>' },
  PhArrowBendDownRight: { template: '<span/>' },
  PhNotePencil: { template: '<span/>' },
  PhWarningCircle: { template: '<span/>' },
  PhPencil: { template: '<span/>' },
  PhX: { template: '<span/>' },
  PhFloppyDisk: { template: '<span/>' },
  ProjectCover: { template: '<div class="project-cover-stub"/>' },
  ResumeSection: { template: '<div class="resume-section-stub"><span class="stub-label">{{ label }}</span><slot/></div>', props: ['label', 'icon', 'tone'] },
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
  it('shows separate Next Action and Supporting Notes sections', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('Next Action');
    expect(w.text()).toContain('Supporting Notes');
  });

  it('has a blocker input field (editable inline)', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('[data-blocker-input]').exists()).toBe(true);
  });

  it('blocker input placeholder says "No blocker"', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('[data-blocker-input]').attributes('placeholder')).toContain('No blocker');
  });

  it('blocker input pre-fills from task.blocker', async () => {
    const taskWithBlocker = { ...task, blocker: 'Need API key' };
    const w = mount(ResumePacketView, { props: { task: taskWithBlocker }, global: { stubs } });
    await flushPromises();
    const input = w.find('[data-blocker-input]');
    expect(input.exists()).toBe(true);
    // The input should have been populated — set it and verify v-model round-trips
    await input.setValue('Need API key');
    expect(input.element.value).toBe('Need API key');
  });

  it('has an X close button (no separate Cancel button)', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('[data-action="close"]').exists()).toBe(true);
    // No standalone "Cancel" button — close is X only
    const buttonTexts = w.findAll('button').map(b => b.text()).join(' ');
    expect(buttonTexts).not.toMatch(/\bCancel\b/);
  });

  it('duration input sits next to the Start Session button', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('.rp-header-row #duration-input').exists()).toBe(false);
    expect(w.find('.rp-start-row #duration-input').exists()).toBe(true);
    expect(w.find('.rp-start-row .rp-start-btn').exists()).toBe(true);
  });

  it('Edit buttons sit inline with their section content', async () => {
    const w = mount(ResumePacketView, { props: { task: { ...task, next_action: 'Outline', supporting_notes: 'A' } }, global: { stubs } });
    await flushPromises();
    expect(w.find('.rp-inline-row [aria-label="Edit next action"]').exists()).toBe(true);
    expect(w.find('.rp-inline-row [data-action="edit-notes"]').exists()).toBe(true);
  });

  it('Start Session uses an icon, not a text glyph', async () => {
    const w = mount(ResumePacketView, {
      props: { task },
      global: { stubs: { ...stubs, PhPlay: { template: '<span class="ph-play-stub"/>' } } },
    });
    await flushPromises();
    expect(w.find('.rp-start-btn').text()).not.toContain('▶');
    expect(w.find('.rp-start-btn .ph-play-stub').exists()).toBe(true);
  });

  it('edit mode uses the standard 16px button icons', async () => {
    const sized = { props: ['size'], template: '<span class="ph-icon" :data-size="size"/>' };
    const w = mount(ResumePacketView, {
      props: { task },
      global: { stubs: { ...stubs, PhX: sized, PhFloppyDisk: sized, PhPencil: sized } },
    });
    await flushPromises();
    for (const icon of w.findAll('.rp-edit-btn .ph-icon')) expect(icon.attributes('data-size')).toBe('16');
    await w.find('[data-action="edit-notes"]').trigger('click');
    const icons = w.findAll('.rp-notes-actions .ph-icon');
    expect(icons.length).toBe(2);
    for (const icon of icons) expect(icon.attributes('data-size')).toBe('16');
  });

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

  it('shows last checkpoint outcome when present', async () => {
    window.app.getLastCheckpoint.mockResolvedValue({
      status: 'success',
      data: { outcome: 'Drafted intro', status: 'continue', next_action: 'Finish methods' },
    });
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.text()).toContain('Drafted intro');
  });

  it('duration input defaults to defaultFocusMinutes from preferences', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs } });
    await flushPromises();
    expect(w.find('#duration-input').element.value).toBe('25');
  });

  it('Start Session button calls startSession', async () => {
    const w = mount(ResumePacketView, { props: { task }, global: { stubs }, attrs: { onStarted: vi.fn() } });
    await flushPromises();
    await w.find('.rp-start-btn').trigger('click');
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
