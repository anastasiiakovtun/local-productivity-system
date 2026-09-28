// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ProjectCover from '../../src/components/base/ProjectCover.vue';

const stubs = {
  PhFolderSimple: { template: '<svg data-icon="folder" />' },
};

describe('ProjectCover', () => {
  it('renders a solid color tile', () => {
    const wrapper = mount(ProjectCover, {
      props: { projectLabel: 'Thesis', color: '#2dd4bf', size: 36 },
      global: { stubs },
    });
    expect(wrapper.classes()).toContain('project-cover-color');
    expect(wrapper.attributes('style')).toContain('background-color: #2dd4bf');
    expect(wrapper.attributes('style')).toContain('--project-cover-size: 36px');
  });

  it('renders a neutral FolderSimple fallback', () => {
    const wrapper = mount(ProjectCover, {
      props: { projectLabel: 'Thesis', color: null },
      global: { stubs },
    });
    expect(wrapper.classes()).toContain('project-cover-neutral');
    expect(wrapper.find('svg[data-icon="folder"]').exists()).toBe(true);
  });
});
