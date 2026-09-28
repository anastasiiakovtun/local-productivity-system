// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ResumeSection from '../../src/components/ResumeSection.vue';

const stubs = {
  PhMapPinLine: { template: '<span/>' },
  PhArrowBendDownRight: { template: '<span/>' },
  PhNotePencil: { template: '<span/>' },
  PhWarningCircle: { template: '<span/>' },
};

describe('ResumeSection', () => {
  it('renders label', () => {
    const w = mount(ResumeSection, {
      props: { label: 'Previous Checkpoint' },
      global: { stubs },
      slots: { default: '<p>Some content</p>' },
    });
    expect(w.text()).toContain('Previous Checkpoint');
  });

  it('renders slot content', () => {
    const w = mount(ResumeSection, {
      props: { label: 'Context' },
      global: { stubs },
      slots: { default: '<p class="slot-child">Context body</p>' },
    });
    expect(w.find('.slot-child').exists()).toBe(true);
  });

  it('renders icon container when icon prop set', () => {
    const w = mount(ResumeSection, {
      props: { label: 'Blocker', icon: 'warning' },
      global: { stubs },
      slots: { default: '<p/>' },
    });
    expect(w.find('.resume-section-icon').exists()).toBe(true);
  });

  it('applies tone class for blocked', () => {
    const w = mount(ResumeSection, {
      props: { label: 'Blocker', tone: 'blocked' },
      global: { stubs },
      slots: { default: '<p/>' },
    });
    expect(w.find('.resume-section').classes()).toContain('tone-blocked');
  });
});
