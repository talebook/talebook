// @vitest-environment nuxt
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        locales: { value: [{ code: 'zh-CN', name: '简体中文' }] },
        setLocale: vi.fn(),
        t: (key: string) => key,
    }),
}));

const { pushMock, storeState } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    storeState: {
        theme: 'light',
        sys: {
            title: 'TaleBook',
            books: 0,
            authors: 0,
            publishers: 0,
            tags: 0,
            formats: 0,
            series: 0,
            friends: [],
            show_sidebar_sys: false,
        },
        user: {
            is_login: false,
            is_admin: false,
            avatar: '',
        },
        toggleTheme: vi.fn(),
    },
}));

vi.mock('@/stores/main', () => ({
    useMainStore: () => storeState,
}));

mockNuxtImport('useRouter', () => {
    return () => ({ push: pushMock });
});

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import BuiltinThemeHeader from '@/components/themes/BuiltinThemeHeader.vue';

function mountHeader() {
    return mount(
        { components: { BuiltinThemeHeader }, template: '<v-app><BuiltinThemeHeader variant="minimal" /></v-app>' },
        { global: { plugins: [vuetify] } },
    );
}

describe('BuiltinThemeHeader.vue', () => {
    beforeEach(() => {
        pushMock.mockClear();
        window.innerWidth = 1280;
        window.dispatchEvent(new Event('resize'));
    });

    it('submits the search term with the backend-supported name query', async () => {
        const wrapper = mountHeader();
        const input = wrapper.find('.tb-theme-hn-search input');

        await input.setValue('  百年 & 孤独  ');
        await wrapper.find('.tb-theme-hn-search').trigger('submit');

        expect(pushMock).toHaveBeenCalledWith({
            path: '/search',
            query: { name: '百年 & 孤独' },
        });
        wrapper.unmount();
    });

    it('does not navigate for an empty search term', async () => {
        const wrapper = mountHeader();
        const input = wrapper.find('.tb-theme-hn-search input');

        await input.setValue('   ');
        await wrapper.find('.tb-theme-hn-search').trigger('submit');

        expect(pushMock).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
