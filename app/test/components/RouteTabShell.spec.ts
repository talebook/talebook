// @vitest-environment nuxt
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { describe, expect, it, vi } from 'vitest';

vi.mock('#i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        t: (key: string) => key,
    }),
}));

const routeState = { path: '/library/network' };

mockNuxtImport('useRoute', () => () => routeState);

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import RouteTabShell from '@/components/RouteTabShell.vue';

describe('RouteTabShell', () => {
    it('uses route-backed tabs and marks the current path', () => {
        const wrapper = mount(RouteTabShell, {
            props: {
                title: '书库浏览',
                tabs: [
                    { label: '本地书库', to: '/library/local' },
                    { label: '网络书库', to: '/library/network' },
                ],
            },
            slots: { default: '<div data-testid="content">content</div>' },
            global: { plugins: [vuetify] },
        });
        const tabs = wrapper.findAllComponents({ name: 'VTab' });

        expect(tabs.map(tab => tab.props('to'))).toEqual(['/library/local', '/library/network']);
        expect(wrapper.findComponent({ name: 'VTabs' }).props('modelValue')).toBe('/library/network');
        expect(wrapper.get('[data-testid="content"]').text()).toBe('content');

        wrapper.unmount();
    });
});
