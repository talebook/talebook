// @vitest-environment nuxt
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#i18n', () => ({
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
            allow: {},
            friends: [],
            show_sidebar_sys: false,
            show_network_library: true,
        },
        user: {
            is_login: false,
            is_admin: false,
        },
        messages: [],
        bootstrap: vi.fn().mockResolvedValue({ err: 'ok' }),
        hideMessage: vi.fn(),
        toggleTheme: vi.fn(),
    },
}));

vi.mock('@/stores/main', () => ({
    useMainStore: () => storeState,
}));

mockNuxtImport('useRouter', () => {
    return () => ({ push: pushMock });
});

mockNuxtImport('useRoute', () => {
    return () => ({ path: '/' });
});

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import AppHeader from '@/components/AppHeader.vue';

function mountHeader() {
    return mount(
        { components: { AppHeader }, template: '<v-app><AppHeader /></v-app>' },
        { global: { plugins: [vuetify] } },
    );
}

describe('AppHeader.vue', () => {
    beforeEach(() => {
        pushMock.mockReset();
        storeState.sys.show_network_library = true;
        storeState.user.is_login = false;
        storeState.user.is_admin = false;
    });

    it('only wraps the site title text in the clickable/pointer area, not the whole title bar', () => {
        const wrapper = mountHeader();

        const title = wrapper.find('.v-toolbar-title');
        expect(title.exists()).toBe(true);
        // 整个标题容器不应带有指针样式或点击监听，避免点击命中范围扩展到搜索框左侧空白区域
        expect(title.attributes('style') || '').not.toContain('cursor');

        const siteTitle = wrapper.find('.site-title');
        expect(siteTitle.exists()).toBe(true);
        expect(siteTitle.text()).toBe('TaleBook');
        expect(siteTitle.attributes('style')).toContain('cursor: pointer');

        wrapper.unmount();
    });

    it('navigates home when the title text is clicked', async () => {
        const wrapper = mountHeader();

        await wrapper.find('.site-title').trigger('click');
        expect(pushMock).toHaveBeenCalledWith('/');

        wrapper.unmount();
    });

    it('shows one consolidated library entry regardless of the legacy visibility setting', () => {
        const wrapper = mountHeader();

        expect(wrapper.text()).toContain('navigation.libraryBrowse');
        expect(wrapper.text()).not.toContain('navigation.localLibrary');
        expect(wrapper.text()).not.toContain('navigation.networkLibrary');
        storeState.sys.show_network_library = false;
        expect(wrapper.text()).toContain('navigation.libraryBrowse');

        wrapper.unmount();
    });

    it('puts My Reading immediately after Home for signed-in users', () => {
        storeState.user.is_login = true;
        const wrapper = mountHeader();
        const labels = wrapper.findAll('.v-list-item-title').map(item => item.text());

        expect(labels.indexOf('navigation.myReading')).toBe(labels.indexOf('navigation.home') + 1);
        expect(labels).not.toContain('navigation.readBooks');

        wrapper.unmount();
    });

    it('keeps plugin and theme management inside System Settings', () => {
        storeState.user.is_admin = true;
        const wrapper = mountHeader();
        const links = wrapper.findAllComponents({ name: 'VListItem' }).map(item => item.props('to'));

        expect(links).toContain('/admin/settings/general');
        expect(links).not.toContain('/admin/plugins');
        expect(links).not.toContain('/admin/themes');

        wrapper.unmount();
    });
});
