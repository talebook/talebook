import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('$t', (key: string) => key);

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        locale: { value: 'zh-CN' },
        locales: { value: [{ code: 'zh-CN', name: '简体中文' }] },
        setLocale: vi.fn(),
        t: (key: string) => key,
    }),
}));

const { backendMock, pushMock, storeState } = vi.hoisted(() => ({
    backendMock: vi.fn().mockResolvedValue({ err: 'ok', total: 0 }),
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

mockNuxtImport('useNuxtApp', () => {
    return () => ({ $backend: backendMock });
});

const vuetify = createVuetify({ components, directives });
global.ResizeObserver = require('resize-observer-polyfill');

import AppHeader from '@/components/AppHeader.vue';

function mountHeader() {
    return mount(
        { components: { AppHeader }, template: '<v-app><AppHeader /></v-app>' },
        { global: { plugins: [vuetify], mocks: { $t: (key: string) => key } } },
    );
}

describe('AppHeader.vue', () => {
    beforeEach(() => {
        pushMock.mockReset();
        storeState.sys.show_network_library = true;
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

    it('shows the network library link by default', () => {
        const wrapper = mountHeader();

        expect(wrapper.text()).toContain('navigation.networkLibrary');

        wrapper.unmount();
    });

    it('hides the network library link when disabled', () => {
        storeState.sys.show_network_library = false;
        const wrapper = mountHeader();

        expect(wrapper.text()).not.toContain('navigation.networkLibrary');

        wrapper.unmount();
    });

    it('shows the private AI SKILL center in navigation for signed-in users', () => {
        storeState.user.is_login = true;
        const wrapper = mountHeader();

        expect(wrapper.text()).toContain('navigation.aiSkills');

        wrapper.unmount();
        storeState.user.is_login = false;
    });
});
