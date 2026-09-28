// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import IconContainer from '../../src/components/IconContainer.vue';

describe('IconContainer', () => {
  it('renders its slot inside a sized icon container', () => {
    const wrapper = mount(IconContainer, {
      props: { size: 48 },
      slots: { default: '<svg aria-label="Example icon" />' },
    });

    expect(wrapper.classes()).toContain('icon-container');
    expect(wrapper.attributes('style')).toContain('--icon-container-size: 48px');
    expect(wrapper.find('svg').exists()).toBe(true);
  });
});
