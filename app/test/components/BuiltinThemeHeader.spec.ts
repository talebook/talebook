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
            books: 1,
            publishers: 1,
            authors: 1,
            tags: 1,
            formats: 1,
            series: 1,
            users: 1,
            version: 'test',
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

function mountHeader(variant: 'light-gray' | 'minimal' | 'graphite' | 'brass' | 'warm-red') {
    return mount(BuiltinThemeHeader, {
        props: { variant },
        global: { plugins: [vuetify] },
    });
}

describe('BuiltinThemeHeader.vue search', () => {
    beforeEach(() => {
        pushMock.mockReset();
    });

    it('uses the search API name query parameter for every shared themed header', async () => {
        const wrapper = mountHeader('minimal');

        await wrapper.get('input[type="search"]').setValue('  百年  ');
        await wrapper.get('form').trigger('submit');

        expect(pushMock).toHaveBeenCalledWith({
            path: '/search',
            query: { name: '百年' },
        });
        wrapper.unmount();
    });

    it('keeps the light-gray field prefix inside the name query value', async () => {
        const wrapper = mountHeader('light-gray');
        const header = wrapper.vm as unknown as {
            search: string;
            searchCategory: string;
            doSearch: () => void;
        };

        header.search = 'author:  加西亚';
        header.searchCategory = 'title';
        header.doSearch();

        expect(pushMock).toHaveBeenCalledWith({
            path: '/search',
            query: { name: 'title:加西亚' },
        });
        wrapper.unmount();
    });

    it('does not navigate for blank input', async () => {
        const wrapper = mountHeader('minimal');

        await wrapper.get('input[type="search"]').setValue('   ');
        await wrapper.get('form').trigger('submit');

        expect(pushMock).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
