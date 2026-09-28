// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AppSidebar from '../../src/components/layout/AppSidebar.vue';

const iconStubs = {
  PhHouse: { template: '<svg data-icon="house" />' },
  PhTray: { template: '<svg data-icon="tray" />' },
  PhCalendarBlank: { template: '<svg data-icon="calendar" />' },
  PhCheckCircle: { template: '<svg data-icon="check" />' },
  PhClockCounterClockwise: { template: '<svg data-icon="history" />' },
  PhSidebarSimple: { template: '<svg data-icon="sidebar" />' },
  ProjectCover: {
    template: '<span class="project-cover-tile" :class="color ? \'project-cover-color\' : \'project-cover-neutral\'" :style="color ? { backgroundColor: color } : {}"><slot /></span>',
    props: ['projectLabel', 'color', 'size'],
  },
};

function mountSidebar(props = {}) {
  return mount(AppSidebar, {
    props: { activeView: 'home', collapsed: false, projects: [], ...props },
    global: { stubs: iconStubs },
  });
}

describe('AppSidebar', () => {
  it('renders expanded navigation in product order with matching icons', () => {
    const wrapper = mountSidebar();
    expect(wrapper.classes()).toContain('sidebar-expanded');
    const items = wrapper.findAll('.nav-item');
    expect(items.map(item => item.text())).toEqual(['Home', 'Inbox', 'Today', 'Completed', 'Sessions']);
    expect(items.map(item => item.find('svg').attributes('data-icon'))).toEqual([
      'house', 'tray', 'calendar', 'check', 'history',
    ]);
  });

  it('hides visual labels when collapsed while preserving accessible names', () => {
    const wrapper = mountSidebar({ collapsed: true });
    expect(wrapper.classes()).toContain('sidebar-collapsed');
    expect(wrapper.findAll('.nav-label')).toHaveLength(0);
    expect(wrapper.findAll('.nav-item').map(item => item.attributes('aria-label'))).toEqual([
      'Home', 'Inbox', 'Today', 'Completed', 'Sessions',
    ]);
  });

  it('emits collapse once', async () => {
    const wrapper = mountSidebar();
    await wrapper.find('button[aria-label="Collapse sidebar"]').trigger('click');
    expect(wrapper.emitted('toggle-collapse')).toHaveLength(1);
  });

  it('marks the active navigation item as current', () => {
    const wrapper = mountSidebar({ activeView: 'today' });
    expect(wrapper.find('button[aria-label="Today"]').attributes('aria-current')).toBe('page');
    expect(wrapper.find('button[aria-label="Home"]').attributes('aria-current')).toBeUndefined();
  });

  it('emits navigation and project selection', async () => {
    const wrapper = mountSidebar({
      projects: [
        { label: 'Thesis', color: '#2dd4bf' },
        { label: 'Fallback', color: null },
      ],
    });
    await wrapper.find('button[aria-label="Inbox"]').trigger('click');
    await wrapper.find('button[aria-label="Project Thesis"]').trigger('click');
    expect(wrapper.emitted('navigate')).toEqual([['inbox']]);
    expect(wrapper.emitted('select-project')).toEqual([['Thesis']]);
    const thesisButton = wrapper.find('[data-project="Thesis"]');
    const fallbackButton = wrapper.find('[data-project="Fallback"]');
    expect(thesisButton.find('.project-cover-tile').attributes('style')).toContain('#2dd4bf');
    expect(fallbackButton.find('.project-cover-tile').classes()).toContain('project-cover-neutral');
  });
});
